import { DateTime } from "luxon";

/** A wall-clock moment in a specific zone. */
export interface ConvertInput {
  zone: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  time: string;
}

export interface Converted {
  dateTime: DateTime<true>;
  /** Calendar days the target date is ahead of (+) or behind (−) the source date. */
  dayDelta: number;
  /** e.g. "UTC+5:30". */
  offsetLabel: string;
  /** e.g. "BST", or "GMT+6" where the zone has no common abbreviation. */
  abbreviation: string;
  isDaytime: boolean;
  /** 9:00–17:59 local, any weekday. */
  isWorkHours: boolean;
}

/** The input as a real instant, or null while the fields are incomplete/invalid. */
export function toDateTime(input: ConvertInput): DateTime<true> | null {
  const dt = DateTime.fromISO(`${input.date}T${input.time}`, { zone: input.zone });
  return dt.isValid ? dt : null;
}

/**
 * True when the typed wall-clock time doesn't exist in the source zone
 * (a spring-forward DST gap) and luxon moved it to the next valid time.
 */
export function wasShiftedByDst(input: ConvertInput, dt: DateTime): boolean {
  return dt.toFormat("HH:mm") !== input.time.slice(0, 5);
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${m.toString().padStart(2, "0")}` : ""}`;
}

export function convertTime(source: DateTime<true>, targetZone: string): Converted {
  const target = source.setZone(targetZone) as DateTime<true>;
  const dayDelta = Math.round(
    DateTime.utc(target.year, target.month, target.day).diff(
      DateTime.utc(source.year, source.month, source.day),
      "days",
    ).days,
  );
  return {
    dateTime: target,
    dayDelta,
    offsetLabel: formatOffset(target.offset),
    abbreviation: target.offsetNameShort ?? "",
    isDaytime: target.hour >= 6 && target.hour < 18,
    isWorkHours: target.hour >= 9 && target.hour < 18,
  };
}

export function formatClock(dt: DateTime, hour12: boolean): string {
  return dt.toFormat(hour12 ? "h:mm a" : "HH:mm");
}

/** "Same day", "Tomorrow", "Yesterday", "+2 days"… */
export function describeDayDelta(delta: number): string {
  if (delta === 0) return "Same day";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return delta > 0 ? `+${delta} days` : `${delta} days`;
}
