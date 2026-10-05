import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { hashBearerToken } from "@/lib/auth/tokens";
import { setBearerTokenCookie } from "@/lib/auth/cookies";
import { env } from "@/lib/env";

interface RouteParams {
  params: Promise<{ pollId: string; participantId: string; token: string }>;
}

/**
 * A participant's private response link — the cross-device / lost-cookie
 * recovery path. Same pattern as the host manage-link: trade a one-time
 * proof of token possession for the ordinary `hg_token_*` cookie.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { pollId, participantId, token } = await params;

  const hash = hashBearerToken(token);
  const [row] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.pollId, pollId),
        eq(participants.id, participantId),
        eq(participants.accessTokenHash, hash),
      ),
    )
    .limit(1);

  // See the manage-link route for why this is built from APP_ORIGIN rather
  // than the request's Host header.
  const destination = new URL(`/p/${pollId}`, env.appOrigin);
  if (!row) {
    destination.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  setBearerTokenCookie(response, pollId, token);
  return response;
}
