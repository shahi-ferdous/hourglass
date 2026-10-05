import { DateTime } from "luxon";
import type { GridSlot } from "./grid";

export interface DisplayCell {
  isoUtc: string;
  dateTime: DateTime;
  dateKey: string; // display-local "YYYY-MM-DD"
  timeKey: string; // display-local "HH:mm"
}

export interface DisplayColumn {
  dateKey: string;
  /** e.g. "Mon, Oct 5" */
  label: string;
  weekdayLabel: string;
  dayLabel: string;
}

export interface DisplayMatrix {
  columns: DisplayColumn[];
  /** Sorted unique display-local times of day present anywhere in the grid. */
  rowTimes: string[];
  cellsByKey: Map<string, DisplayCell>;
}

/**
 * Re-buckets a poll's canonical (host-local) slot grid into whatever
 * calendar dates and times of day they land on in `displayTimezone`. A
 * slot's identity (its UTC instant) never changes — only which column/row
 * it's drawn in changes with the viewer's chosen zone. This is why a
 * distant viewer can see the grid split or shift across a different set of
 * calendar days than the host originally picked.
 */
export function buildDisplayMatrix(
  slots: GridSlot[],
  displayTimezone: string,
): DisplayMatrix {
  const cells: DisplayCell[] = slots.map((s) => {
    const local = s.dateTime.setZone(displayTimezone);
    return {
      isoUtc: s.isoUtc,
      dateTime: local,
      dateKey: local.toISODate()!,
      timeKey: local.toFormat("HH:mm"),
    };
  });

  const dateKeys = [...new Set(cells.map((c) => c.dateKey))].sort();
  const rowTimes = [...new Set(cells.map((c) => c.timeKey))].sort();
  const cellsByKey = new Map(cells.map((c) => [`${c.dateKey}|${c.timeKey}`, c]));

  const columns: DisplayColumn[] = dateKeys.map((dateKey) => {
    const dt = DateTime.fromISO(dateKey, { zone: displayTimezone });
    return {
      dateKey,
      label: dt.toFormat("ccc, LLL d"),
      weekdayLabel: dt.toFormat("ccc"),
      dayLabel: dt.toFormat("LLL d"),
    };
  });

  return { columns, rowTimes, cellsByKey };
}

export function formatTimeOfDay(timeKey: string): string {
  const [hour, minute] = timeKey.split(":").map(Number);
  return DateTime.fromObject({ hour, minute }).toFormat("h:mm a");
}
