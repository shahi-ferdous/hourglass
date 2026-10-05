import { DateTime } from "luxon";

const FALLBACK_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export interface TimezoneOption {
  value: string;
  label: string;
  offsetMinutes: number;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}${m ? `:${m.toString().padStart(2, "0")}` : ""}`;
}

let cached: TimezoneOption[] | null = null;

export function listTimezones(): TimezoneOption[] {
  if (cached) return cached;

  const names: string[] =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : FALLBACK_ZONES;

  cached = names
    .map((tz) => {
      const offsetMinutes = DateTime.now().setZone(tz).offset;
      return {
        value: tz,
        label: `${tz.replace(/_/g, " ")} (UTC${formatOffset(offsetMinutes)})`,
        offsetMinutes,
      };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value));

  return cached;
}

export function detectLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
