import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { availabilitySlots } from "@/db/schema";
import { buildSlotGridUtcSet, isSlotInGrid, type PollWindow } from "@/lib/time/grid";
import { badRequestError } from "@/lib/errors/api-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = typeof db | PgTransaction<any, any, any>;

/**
 * Replaces a participant's entire availability with `isoInstants`. Always a
 * full delete + insert, never a diff — this is what makes concurrent
 * submissions from different participants trivially non-conflicting (each
 * write only ever touches its own participant's rows).
 */
export async function replaceParticipantSlots(
  executor: DbOrTx,
  pollId: string,
  participantId: string,
  isoInstants: string[],
  window: PollWindow,
): Promise<void> {
  const grid = buildSlotGridUtcSet(window);
  for (const iso of isoInstants) {
    if (!isSlotInGrid(iso, grid)) {
      throw badRequestError(
        "One or more selected times fall outside this poll's date range. Please refresh and try again.",
      );
    }
  }

  await executor
    .delete(availabilitySlots)
    .where(eq(availabilitySlots.participantId, participantId));

  if (isoInstants.length === 0) return;

  const uniqueIso = [...new Set(isoInstants)];
  await executor
    .insert(availabilitySlots)
    .values(
      uniqueIso.map((iso) => ({
        pollId,
        participantId,
        slotStartAt: new Date(iso),
      })),
    )
    .onConflictDoNothing();
}

/**
 * Removes any existing availability that falls outside a poll's (possibly
 * just-narrowed) window — called after a host edits dates/times so stale
 * out-of-bounds slots don't linger.
 */
export async function trimSlotsOutsideWindow(
  pollId: string,
  window: PollWindow,
): Promise<void> {
  const grid = buildSlotGridUtcSet(window);
  const rows = await db
    .select({ id: availabilitySlots.id, slotStartAt: availabilitySlots.slotStartAt })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.pollId, pollId));

  const staleIds = rows
    .filter((row) => !isSlotInGrid(row.slotStartAt.toISOString(), grid))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    await db.delete(availabilitySlots).where(inArray(availabilitySlots.id, staleIds));
  }
}

export interface OverlapSlot {
  slotStartAt: Date;
  count: number;
  participantIds: string[];
}

/** Per-slot participant counts for a poll, via a single grouped query. */
export async function computeOverlap(pollId: string): Promise<OverlapSlot[]> {
  return db
    .select({
      slotStartAt: availabilitySlots.slotStartAt,
      count: sql<number>`count(*)::int`,
      participantIds: sql<string[]>`array_agg(${availabilitySlots.participantId})`,
    })
    .from(availabilitySlots)
    .where(and(eq(availabilitySlots.pollId, pollId)))
    .groupBy(availabilitySlots.slotStartAt)
    .orderBy(availabilitySlots.slotStartAt);
}
