import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { requireViewAccess } from "@/lib/auth/authorize";
import { computeOverlap } from "@/lib/db/availability";
import { getPollOrThrow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireViewAccess(req, pollId, poll);

  const [overlap, roster] = await Promise.all([
    computeOverlap(pollId),
    db
      .select({
        id: participants.id,
        displayName: participants.displayName,
        isHost: participants.isHost,
        timezone: participants.timezone,
      })
      .from(participants)
      .where(eq(participants.pollId, pollId)),
  ]);

  const hostParticipantId = roster.find((p) => p.isHost)?.id ?? null;

  return NextResponse.json({
    totalParticipants: roster.length,
    hostParticipantId,
    // Time zones are only shared once a meeting time is selected — they feed
    // the "meeting time in everyone's zone" card, and nothing else needs them.
    participants: roster.map((p) => ({
      ...p,
      timezone: poll.finalStartAt ? p.timezone : null,
    })),
    slots: overlap.map((s) => ({
      startAt: s.slotStartAt.toISOString(),
      count: s.count,
      participantIds: s.participantIds,
    })),
  });
});
