import "server-only";
import { schedule } from "node-cron";
import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { polls } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Hard-deletes polls past their soft-delete grace period. `ON DELETE
 * CASCADE` on participants/availability_slots means removing the poll row
 * is the whole cleanup — nothing else to do here.
 */
export async function purgeDeletedPolls(): Promise<number> {
  const cutoff = new Date(Date.now() - env.deleteGraceDays * 24 * 60 * 60 * 1000);
  const removed = await db
    .delete(polls)
    .where(and(isNotNull(polls.deletedAt), lt(polls.deletedAt, cutoff)))
    .returning({ id: polls.id });
  return removed.length;
}

let started = false;

/** Runs once a day, in-process — no separate cron container needed. */
export function startPurgeScheduler(): void {
  if (started) return;
  started = true;

  schedule("17 3 * * *", async () => {
    try {
      const count = await purgeDeletedPolls();
      if (count > 0) {
        console.log(`[purge] Removed ${count} poll(s) past their deletion grace period.`);
      }
    } catch (err) {
      console.error("[purge] Failed to purge deleted polls:", err);
    }
  });
}
