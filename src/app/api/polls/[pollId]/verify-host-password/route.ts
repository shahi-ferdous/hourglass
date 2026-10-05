import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/passwords";
import { setHostPasswordSessionCookie } from "@/lib/auth/cookies";
import { requireViewAccess } from "@/lib/auth/authorize";
import { getPollOrThrow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";
import { unauthorizedError, badRequestError } from "@/lib/errors/api-error";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { verifyPasswordSchema } from "@/lib/validation/poll";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

/**
 * Deliberately does NOT require an existing host token: this is also how a
 * host who lost their manage link/cookie gets back in, by proving they know
 * the host password instead (see requireHost in authorize.ts). Anyone who
 * can already view the poll may attempt it, rate-limited per poll+IP.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireViewAccess(req, pollId, poll);
  enforceRateLimit(req, `host-password:${pollId}`, RATE_LIMITS.passwordVerify);

  if (!poll.hostPasswordHash) {
    throw badRequestError("This poll doesn't have a host password set.");
  }

  const { password } = verifyPasswordSchema.parse(await req.json());
  const valid = await verifyPassword(password, poll.hostPasswordHash);
  if (!valid) {
    throw unauthorizedError("Incorrect password. Please try again.");
  }

  const response = NextResponse.json({ ok: true });
  setHostPasswordSessionCookie(response, pollId);
  return response;
});
