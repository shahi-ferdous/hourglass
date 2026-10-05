import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { participants, polls } from "@/db/schema";
import { generateBearerToken, generateParticipantId, generatePollId } from "@/lib/auth/ids";
import { hashPassword } from "@/lib/auth/passwords";
import { setBearerTokenCookie } from "@/lib/auth/cookies";
import { hashBearerToken } from "@/lib/auth/tokens";
import { replaceParticipantSlots } from "@/lib/db/availability";
import { env } from "@/lib/env";
import { withErrorHandling } from "@/lib/errors/handle";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { createPollSchema } from "@/lib/validation/poll";

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "poll-create", RATE_LIMITS.pollCreate);

  const body = createPollSchema.parse(await req.json());

  const pollId = generatePollId();
  const hostParticipantId = generateParticipantId();
  const hostToken = generateBearerToken();

  const [viewPasswordHash, hostPasswordHash] = await Promise.all([
    body.viewPassword ? hashPassword(body.viewPassword) : Promise.resolve(null),
    body.hostPassword ? hashPassword(body.hostPassword) : Promise.resolve(null),
  ]);

  const window = {
    windowDates: body.windowDates,
    windowStartMinute: body.windowStartMinute,
    windowEndMinute: body.windowEndMinute,
    slotMinutes: body.slotMinutes,
    hostTimezone: body.hostTimezone,
  };

  await db.transaction(async (tx) => {
    await tx.insert(polls).values({
      id: pollId,
      title: body.title,
      description: body.description ?? null,
      location: body.location ?? null,
      meetingUrl: body.meetingUrl ?? null,
      hostTimezone: body.hostTimezone,
      windowDates: body.windowDates,
      windowStartMinute: body.windowStartMinute,
      windowEndMinute: body.windowEndMinute,
      slotMinutes: body.slotMinutes,
      viewPasswordHash,
      hostPasswordHash,
    });

    await tx.insert(participants).values({
      id: hostParticipantId,
      pollId,
      isHost: true,
      displayName: body.hostName,
      accessTokenHash: hashBearerToken(hostToken),
    });

    await replaceParticipantSlots(
      tx,
      pollId,
      hostParticipantId,
      body.hostAvailability,
      window,
    );
  });

  const response = NextResponse.json(
    {
      pollId,
      participantId: hostParticipantId,
      shareUrl: `${env.appOrigin}/p/${pollId}`,
      manageUrl: `${env.appOrigin}/p/${pollId}/manage/${hostToken}`,
    },
    { status: 201 },
  );
  setBearerTokenCookie(response, pollId, hostToken);
  return response;
});
