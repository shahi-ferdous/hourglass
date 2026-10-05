import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { requireParticipant, resolveParticipant } from "@/lib/auth/authorize";
import { replaceParticipantSlots } from "@/lib/db/availability";
import { getPollOrThrow, pollToWindow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";
import { conflictError, forbiddenError, notFoundError } from "@/lib/errors/api-error";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { updateParticipantSchema } from "@/lib/validation/participant";

interface RouteParams {
  params: Promise<{ pollId: string; participantId: string }>;
}

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId, participantId } = await params;
  const poll = await getPollOrThrow(pollId);
  const requester = await requireParticipant(req, pollId);

  if (requester.id !== participantId) {
    throw forbiddenError("You can only edit your own response.");
  }
  if (poll.status === "closed") {
    throw conflictError(
      "This poll is closed, so responses can no longer be edited. The host may still reopen it.",
    );
  }

  const body = updateParticipantSchema.parse(await req.json());

  if (body.displayName !== undefined) {
    await db
      .update(participants)
      .set({ displayName: body.displayName, updatedAt: new Date() })
      .where(eq(participants.id, participantId));
  }
  if (body.slots !== undefined) {
    await replaceParticipantSlots(
      db,
      pollId,
      participantId,
      body.slots,
      pollToWindow(poll),
    );
  }
  await db
    .update(participants)
    .set({ lastSeenAt: new Date() })
    .where(eq(participants.id, participantId));

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId, participantId } = await params;
  await getPollOrThrow(pollId);

  const [target] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.pollId, pollId)))
    .limit(1);
  if (!target) throw notFoundError("That response no longer exists.");

  if (target.isHost) {
    throw forbiddenError(
      "The host can't be removed as a participant this way — delete the whole poll instead.",
    );
  }

  const requester = await resolveParticipant(req, pollId);
  const isSelf = requester?.id === participantId;
  const isHost = requester?.isHost === true;
  if (!isSelf && !isHost) {
    throw forbiddenError("You don't have permission to remove that response.");
  }

  await db.delete(participants).where(eq(participants.id, participantId));
  return NextResponse.json({ ok: true });
});
