import "server-only";
import { customAlphabet, nanoid } from "nanoid";

// Unambiguous, URL-safe alphabet for IDs that humans might read/type back
// (poll IDs appear in share links). Excludes visually confusable chars
// (0/O, 1/I/l, etc.) and the underscore/hyphen nanoid otherwise includes.
const readableAlphabet =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const readableId = customAlphabet(readableAlphabet, 32);

/** Public poll ID, used directly in URLs. ~14 chars, non-guessable. */
export function generatePollId(): string {
  return readableId(14);
}

/** Non-secret participant ID — safe to show in the host roster. */
export function generateParticipantId(): string {
  return readableId(10);
}

/**
 * A high-entropy bearer secret (~192 bits from nanoid's default 64-symbol
 * alphabet). Never stored raw — only its HMAC hash (see tokens.ts) — and
 * delivered to the browser solely via an HttpOnly cookie or a one-time
 * private link.
 */
export function generateBearerToken(): string {
  return nanoid(32);
}
