import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireHost } from "@/lib/auth/authorize";
import { getPollOrThrow } from "@/lib/db/polls";
import { withErrorHandling } from "@/lib/errors/handle";

interface RouteParams {
  params: Promise<{ pollId: string }>;
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { pollId } = await params;
  const poll = await getPollOrThrow(pollId);
  await requireHost(req, pollId);

  const roster = await db.query.participants.findMany({
    where: eq(participants.pollId, pollId),
    with: { availabilitySlots: true },
  });

  return NextResponse.json({
    poll: {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      location: poll.location,
      meetingUrl: poll.meetingUrl,
      hostTimezone: poll.hostTimezone,
      windowDates: poll.windowDates,
      windowStartMinute: poll.windowStartMinute,
      windowEndMinute: poll.windowEndMinute,
      slotMinutes: poll.slotMinutes,
      status: poll.status,
      finalStartAt: poll.finalStartAt,
      finalEndAt: poll.finalEndAt,
      hasViewPassword: poll.viewPasswordHash !== null,
      hasHostPassword: poll.hostPasswordHash !== null,
      createdAt: poll.createdAt,
      closedAt: poll.closedAt,
    },
    participants: roster
      .sort((a, b) => (a.isHost === b.isHost ? 0 : a.isHost ? -1 : 1))
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        isHost: p.isHost,
        timezone: p.timezone,
        lastSeenAt: p.lastSeenAt,
        slots: p.availabilitySlots.map((s) => s.slotStartAt.toISOString()),
      })),
  });
});
