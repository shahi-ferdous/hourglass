import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Bearer tokens (participant/host access tokens) are ~192-bit random
 * secrets, not guessable human passwords — a fast, timing-safe HMAC is the
 * correct primitive here, not a slow KDF like Argon2id (reserved for the
 * two human passwords in passwords.ts).
 */
export function hashBearerToken(rawToken: string): string {
  return createHmac("sha256", env.tokenPepper).update(rawToken).digest("hex");
}

export function verifyBearerToken(rawToken: string, storedHash: string): boolean {
  const computed = Buffer.from(hashBearerToken(rawToken), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
