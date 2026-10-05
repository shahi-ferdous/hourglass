import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { polls, type Poll } from "@/db/schema";
import { notFoundError } from "@/lib/errors/api-error";
import type { PollWindow } from "@/lib/time/grid";

/** Fetches a poll that hasn't been (soft-)deleted, or throws a friendly 404. */
export async function getPollOrThrow(pollId: string): Promise<Poll> {
  const [poll] = await db
    .select()
    .from(polls)
    .where(and(eq(polls.id, pollId), isNull(polls.deletedAt)))
    .limit(1);
  if (!poll) throw notFoundError();
  return poll;
}

export function pollToWindow(poll: Poll): PollWindow {
  return {
    windowDates: poll.windowDates,
    windowStartMinute: poll.windowStartMinute,
    windowEndMinute: poll.windowEndMinute,
    slotMinutes: poll.slotMinutes,
    hostTimezone: poll.hostTimezone,
  };
}

export function requiresViewPassword(poll: Pick<Poll, "viewPasswordHash">) {
  return poll.viewPasswordHash !== null;
}
