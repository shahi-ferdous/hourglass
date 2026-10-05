import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants, polls } from "@/db/schema";
import {
  hasViewAccess,
  requireHost,
  requireHostWithPassword,
  resolveParticipant,
} from "@/lib/auth/authorize";
import { getPollOrThrow } from "@/lib/db/polls";
import { trimSlotsOutsideWindow } from "@/lib/db/availability";
import { hashPassword } from "@/lib/auth/passwords";
import { withErrorHandling } from "@/lib/errors/handle";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { updatePollSchema } from "@/lib/validation/poll";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);

  if (!(await hasViewAccess(req, pollId, poll))) {
    return NextResponse.json({
      id: poll.id,
      title: poll.title,
      requiresViewPassword: true,
    });
  }

  const [hostRow] = await db
    .select({ displayName: participants.displayName })
    .from(participants)
    .where(and(eq(participants.pollId, pollId), eq(participants.isHost, true)))
    .limit(1);
  const viewer = await resolveParticipant(req, pollId);

  return NextResponse.json({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    location: poll.location,
    meetingUrl: poll.meetingUrl,
    hostTimezone: poll.hostTimezone,
    hostName: hostRow?.displayName ?? null,
    windowDates: poll.windowDates,
    windowStartMinute: poll.windowStartMinute,
    windowEndMinute: poll.windowEndMinute,
    slotMinutes: poll.slotMinutes,
    status: poll.status,
    finalStartAt: poll.finalStartAt,
    finalEndAt: poll.finalEndAt,
    requiresViewPassword: false,
    hasHostPassword: poll.hostPasswordHash !== null,
    viewerParticipantId: viewer?.id ?? null,
    viewerIsHost: viewer?.isHost ?? false,
  });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireHost(req, pollId);

  const body = updatePollSchema.parse(await req.json());

  const nextWindow = {
    windowDates: body.windowDates ?? poll.windowDates,
    windowStartMinute: body.windowStartMinute ?? poll.windowStartMinute,
    windowEndMinute: body.windowEndMinute ?? poll.windowEndMinute,
    slotMinutes: poll.slotMinutes,
    hostTimezone: poll.hostTimezone,
  };

  const updates: Partial<typeof polls.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.location !== undefined) updates.location = body.location;
  if (body.meetingUrl !== undefined) updates.meetingUrl = body.meetingUrl;
  if (body.windowDates !== undefined) updates.windowDates = body.windowDates;
  if (body.windowStartMinute !== undefined) updates.windowStartMinute = body.windowStartMinute;
  if (body.windowEndMinute !== undefined) updates.windowEndMinute = body.windowEndMinute;

  if (body.viewPassword !== undefined) {
    updates.viewPasswordHash = body.viewPassword
      ? await hashPassword(body.viewPassword)
      : null;
  }
  if (body.hostPassword !== undefined) {
    updates.hostPasswordHash = body.hostPassword
      ? await hashPassword(body.hostPassword)
      : null;
  }

  await db.update(polls).set(updates).where(eq(polls.id, pollId));

  const windowChanged =
    body.windowDates !== undefined ||
    body.windowStartMinute !== undefined ||
    body.windowEndMinute !== undefined;
  if (windowChanged) {
    await trimSlotsOutsideWindow(pollId, nextWindow);
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireHostWithPassword(req, pollId, poll);

  await db
    .update(polls)
    .set({ deletedAt: new Date() })
    .where(eq(polls.id, pollId));

  return NextResponse.json({ ok: true });
});

