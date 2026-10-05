import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

const BEARER_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

function tokenCookieName(pollId: string) {
  return `hg_token_${pollId}`;
}
function viewCookieName(pollId: string) {
  return `hg_view_${pollId}`;
}
function hostpwCookieName(pollId: string) {
  return `hg_hostpw_${pollId}`;
}

// --- Bearer token (participant / host identity) ---

export function readBearerToken(
  req: NextRequest,
  pollId: string,
): string | undefined {
  return req.cookies.get(tokenCookieName(pollId))?.value;
}

export function setBearerTokenCookie(
  res: NextResponse,
  pollId: string,
  rawToken: string,
) {
  res.cookies.set(tokenCookieName(pollId), rawToken, {
    ...baseCookieOptions,
    maxAge: BEARER_TOKEN_MAX_AGE_SECONDS,
  });
}

// --- View-password session ---

export function hasViewSession(req: NextRequest, pollId: string): boolean {
  const token = req.cookies.get(viewCookieName(pollId))?.value;
  return verifySessionToken(token, pollId, "view");
}

export function setViewSessionCookie(res: NextResponse, pollId: string) {
  const { token, maxAgeSeconds } = createSessionToken(pollId, "view");
  res.cookies.set(viewCookieName(pollId), token, {
    ...baseCookieOptions,
    maxAge: maxAgeSeconds,
  });
}

// --- Elevated host-password session (delete-poll gate only) ---

export function hasHostPasswordSession(
  req: NextRequest,
  pollId: string,
): boolean {
  const token = req.cookies.get(hostpwCookieName(pollId))?.value;
  return verifySessionToken(token, pollId, "hostpw");
}

export function setHostPasswordSessionCookie(
  res: NextResponse,
  pollId: string,
) {
  const { token, maxAgeSeconds } = createSessionToken(pollId, "hostpw");
  res.cookies.set(hostpwCookieName(pollId), token, {
    ...baseCookieOptions,
    maxAge: maxAgeSeconds,
  });
}
