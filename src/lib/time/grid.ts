import { DateTime } from "luxon";

/**
 * The inputs that define a poll's canonical slot grid. Shared between
 * server-side validation and client-side rendering — this file has no
 * "server-only" guard and must stay free of secrets/DB access.
 */
export interface PollWindow {
  /** Host-local calendar dates, "YYYY-MM-DD". */
  windowDates: string[];
  /** Minutes since local midnight, host-local wall clock. */
  windowStartMinute: number;
  windowEndMinute: number;
  slotMinutes: number;
  /** IANA zone name — the canonical zone the grid is constructed in. */
  hostTimezone: string;
}

export interface GridSlot {
  /** The slot's start instant. */
  dateTime: DateTime<true>;
  /** UTC ISO string — the form stored in the DB and sent over the wire. */
  isoUtc: string;
}

/**
 * Builds the ordered, canonical list of slot-start instants for a poll.
 * Each host-local date is resolved independently via `.set()` (a
 * wall-clock reinterpretation, not elapsed-duration math), so a slot at
 * "9:00 AM" means literally 9:00 on the clock on that date even across a
 * DST transition — not "540 minutes of real time after local midnight."
 */
export function buildSlotGrid(window: PollWindow): GridSlot[] {
  const slots: GridSlot[] = [];

  for (const dateStr of window.windowDates) {
    const day = DateTime.fromISO(dateStr, { zone: window.hostTimezone });
    if (!day.isValid) continue;

    for (
      let minuteOfDay = window.windowStartMinute;
      minuteOfDay < window.windowEndMinute;
      minuteOfDay += window.slotMinutes
    ) {
      const dt = day.set({
        hour: Math.floor(minuteOfDay / 60),
        minute: minuteOfDay % 60,
        second: 0,
        millisecond: 0,
      });
      if (!dt.isValid) continue;
      slots.push({ dateTime: dt, isoUtc: dt.toUTC().toISO() });
    }
  }

  return slots.sort((a, b) => a.dateTime.toMillis() - b.dateTime.toMillis());
}

export function buildSlotGridUtcSet(window: PollWindow): Set<string> {
  return new Set(buildSlotGrid(window).map((s) => s.isoUtc));
}

/** True if `isoUtc` is exactly one of this poll's canonical grid slots. */
export function isSlotInGrid(isoUtc: string, grid: Set<string>): boolean {
  const normalized = DateTime.fromISO(isoUtc, { zone: "utc" });
  if (!normalized.isValid) return false;
  return grid.has(normalized.toISO());
}

/** A slot's end instant, for display only (duration too short for DST to matter). */
export function slotEnd(dateTime: DateTime, slotMinutes: number): DateTime {
  return dateTime.plus({ minutes: slotMinutes });
}
