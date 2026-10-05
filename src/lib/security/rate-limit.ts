import "server-only";
import { tooManyRequestsError } from "@/lib/errors/api-error";

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_ENTRY_AGE_MS = 60 * 60 * 1000; // comfortably longer than any window below

let cleanupTimer: ReturnType<typeof setInterval> | undefined;
function ensureCleanupScheduled() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > MAX_ENTRY_AGE_MS) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}

/**
 * Fixed-window, in-process rate limiter. Sufficient for a single-instance
 * self-hosted deployment — state resets on restart and doesn't coordinate
 * across replicas. If this app is ever horizontally scaled, swap this for
 * a Redis-backed limiter; nothing else in the app depends on it staying
 * in-process.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  ensureCleanupScheduled();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/**
 * Client IP from the X-Forwarded-For header set by the reverse proxy in
 * front of this app (Caddy, in the provided docker-compose.yml). This is
 * only trustworthy when the app is reachable exclusively through that
 * proxy — never expose the app container's port directly to the internet.
 */
export function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export const RATE_LIMITS = {
  passwordVerify: { limit: 10, windowMs: 15 * 60 * 1000 },
  pollCreate: { limit: 20, windowMs: 60 * 60 * 1000 },
  participantSubmit: { limit: 30, windowMs: 60 * 60 * 1000 },
  mutationBackstop: { limit: 120, windowMs: 60 * 1000 },
} as const;

export function enforceRateLimit(
  req: Request,
  routeKey: string,
  config: { limit: number; windowMs: number },
) {
  const key = `${routeKey}:${clientIp(req)}`;
  if (!checkRateLimit(key, config.limit, config.windowMs)) {
    throw tooManyRequestsError();
  }
}
