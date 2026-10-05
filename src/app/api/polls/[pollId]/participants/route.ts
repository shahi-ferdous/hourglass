import { NextRequest, NextResponse } from "next/server";
import { requireViewAccess } from "@/lib/auth/authorize";
import { generateBearerToken, generateParticipantId } from "@/lib/auth/ids";
import { hashBearerToken } from "@/lib/auth/tokens";
import { setBearerTokenCookie } from "@/lib/auth/cookies";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { replaceParticipantSlots } from "@/lib/db/availability";
import { getPollOrThrow, pollToWindow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";
import { conflictError } from "@/lib/errors/api-error";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import { submitParticipantSchema } from "@/lib/validation/participant";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireViewAccess(req, pollId, poll);
  enforceRateLimit(req, "participant-submit", RATE_LIMITS.participantSubmit);

  if (poll.status === "closed") {
    throw conflictError(
      "This poll is closed and no longer accepting responses. The host may still reopen it.",
    );
  }

  const body = submitParticipantSchema.parse(await req.json());

  const participantId = generateParticipantId();
  const token = generateBearerToken();

  await db.transaction(async (tx) => {
    await tx.insert(participants).values({
      id: participantId,
      pollId,
      isHost: false,
      displayName: body.displayName,
      accessTokenHash: hashBearerToken(token),
    });
    await replaceParticipantSlots(
      tx,
      pollId,
      participantId,
      body.slots,
      pollToWindow(poll),
    );
  });

  const response = NextResponse.json(
    {
      participantId,
      responseUrl: `${env.appOrigin}/p/${pollId}/r/${participantId}/${token}`,
    },
    { status: 201 },
  );
  setBearerTokenCookie(response, pollId, token);
  return response;
});
