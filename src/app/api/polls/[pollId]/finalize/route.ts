import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { polls } from "@/db/schema";
import { requireHost } from "@/lib/auth/authorize";
import { getPollOrThrow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";
import { assertSameOrigin } from "@/lib/security/csrf";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { finalizePollSchema } from "@/lib/validation/poll";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId } = await params;
  await getPollOrThrow(pollId);
  await requireHost(req, pollId);

  const body = finalizePollSchema.parse(await req.json());

  await db
    .update(polls)
    .set({
      finalStartAt: new Date(body.startAt),
      finalEndAt: new Date(body.endAt),
      updatedAt: new Date(),
    })
    .where(eq(polls.id, pollId));

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "mutation", RATE_LIMITS.mutationBackstop);
  const { pollId } = await params;
  await getPollOrThrow(pollId);
  await requireHost(req, pollId);

  await db
    .update(polls)
    .set({ finalStartAt: null, finalEndAt: null, updatedAt: new Date() })
    .where(eq(polls.id, pollId));

  return NextResponse.json({ ok: true });
});
