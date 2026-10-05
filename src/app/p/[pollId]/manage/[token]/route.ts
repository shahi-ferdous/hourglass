import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { hashBearerToken } from "@/lib/auth/tokens";
import { setBearerTokenCookie } from "@/lib/auth/cookies";
import { env } from "@/lib/env";

interface RouteParams {
  params: Promise<{ pollId: string; token: string }>;
}

/**
 * The host's private "manage link" — a magic link. Visiting it proves
 * possession of the token, so this route's only job is to translate that
 * into the usual `hg_token_*` cookie and land on the clean dashboard URL;
 * every request after this uses the cookie, never the raw token again.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { pollId, token } = await params;

  const hash = hashBearerToken(token);
  const [row] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.pollId, pollId),
        eq(participants.accessTokenHash, hash),
        eq(participants.isHost, true),
      ),
    )
    .limit(1);

  // Built from our own configured APP_ORIGIN, not the request's Host header
  // — the two can disagree (e.g. behind a proxy, or a client using a raw IP
  // vs. hostname), and since the just-set cookie is scoped to whichever
  // host this redirect lands on, drifting from APP_ORIGIN here would
  // silently strand the cookie on the wrong host.
  const destination = new URL(`/p/${pollId}/manage`, env.appOrigin);
  if (!row) {
    destination.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  setBearerTokenCookie(response, pollId, token);
  return response;
}
