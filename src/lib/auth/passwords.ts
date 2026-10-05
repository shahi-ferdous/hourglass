import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id, library defaults (id variant, 19 MiB memory, 2 passes) — used
 * only for the two human-chosen passwords (poll view password, host
 * password). Hardcoded rather than env-configurable to keep this simple
 * and avoid a misconfiguration footgun.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword);
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plainPassword);
  } catch {
    // Malformed/foreign hash string — treat as a failed verification
    // rather than letting the error propagate.
    return false;
  }
}
