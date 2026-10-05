import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Stateless, signed session tokens for the view-password gate and the
 * elevated host-password gate. Unlike bearer tokens (session.ts vs.
 * tokens.ts) these carry no DB row — the signature alone is the proof, so
 * there's nothing to look up and nothing to revoke besides rotating
 * TOKEN_PEPPER.
 */

type SessionKind = "view" | "hostpw";

interface SessionPayload {
  pollId: string;
  kind: SessionKind;
  exp: number; // unix seconds
}

const VIEW_SESSION_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days
// The host-password session now doubles as a full recovery credential (see
// requireHost in authorize.ts) for a host who lost their manage link/cookie,
// not just a momentary elevation before a delete — so it's long-lived like
// the other credentials, not an hour.
const HOSTPW_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string): string {
  return createHmac("sha256", env.tokenPepper)
    .update(payload)
    .digest("base64url");
}

function ttlFor(kind: SessionKind): number {
  return kind === "view" ? VIEW_SESSION_TTL_SECONDS : HOSTPW_SESSION_TTL_SECONDS;
}

export function createSessionToken(pollId: string, kind: SessionKind): {
  token: string;
  maxAgeSeconds: number;
} {
  const maxAgeSeconds = ttlFor(kind);
  const payload: SessionPayload = {
    pollId,
    kind,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = sign(encodedPayload);
  return { token: `${encodedPayload}.${signature}`, maxAgeSeconds };
}

export function verifySessionToken(
  token: string | undefined,
  pollId: string,
  kind: SessionKind,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
  } catch {
    return false;
  }

  if (payload.pollId !== pollId || payload.kind !== kind) return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}
