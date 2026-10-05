import "server-only";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { forbiddenError } from "@/lib/errors/api-error";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense for cookie-authenticated mutating requests. SameSite=Lax on
 * our cookies is the primary defense (blocks the cookie on cross-site
 * POST/PATCH/DELETE); this Origin/Referer check is cheap defense-in-depth
 * for browser edge cases where SameSite alone isn't airtight. Deliberately
 * no double-submit token — redundant given the above.
 */
export function assertSameOrigin(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return;

  const appOrigin = env.appOrigin;
  const origin = req.headers.get("origin");
  if (origin) {
    if (origin !== appOrigin) throw csrfRejection();
    return;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    if (referer === appOrigin || referer.startsWith(`${appOrigin}/`)) return;
    throw csrfRejection();
  }

  // Neither header present on a mutating request — reject rather than
  // guess. Real browsers always send at least one on same-origin fetches.
  throw csrfRejection();
}

function csrfRejection() {
  return forbiddenError(
    "This request could not be verified. Please refresh the page and try again.",
  );
}
