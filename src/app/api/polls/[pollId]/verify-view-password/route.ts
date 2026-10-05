import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/passwords";
import { setViewSessionCookie } from "@/lib/auth/cookies";
import { getPollOrThrow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";
import { unauthorizedError } from "@/lib/errors/api-error";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { verifyPasswordSchema } from "@/lib/validation/poll";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  const { pollId } = await params;
  enforceRateLimit(req, `view-password:${pollId}`, RATE_LIMITS.passwordVerify);

  const poll = await getPollOrThrow(pollId);
  const { password } = verifyPasswordSchema.parse(await req.json());

  if (!poll.viewPasswordHash) {
    return NextResponse.json({ ok: true });
  }

  const valid = await verifyPassword(password, poll.viewPasswordHash);
  if (!valid) {
    throw unauthorizedError("Incorrect password. Please try again.");
  }

  const response = NextResponse.json({ ok: true });
  setViewSessionCookie(response, pollId);
  return response;
});
