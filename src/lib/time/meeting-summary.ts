import { DateTime } from "luxon";
import { convertTime } from "./convert";
import { zoneToCity } from "./places";

export interface SummaryParticipant {
  name: string;
  isHost: boolean;
  /** IANA zone the person responded from, or null if never recorded. */
  timezone: string | null;
}

export interface MeetingSummaryInput {
  title: string;
  /** ISO UTC instants of the chosen slot. */
  startAt: string;
  endAt: string;
  hostTimezone: string;
  participants: SummaryParticipant[];
  location?: string | null;
  meetingUrl?: string | null;
}

export interface ZoneGroup {
  zone: string;
  city: string;
  /** e.g. "UTC+5:30". */
  offsetLabel: string;
  /** e.g. "Wed, Oct 14". */
  dateLabel: string;
  /** e.g. "8:00 PM–9:00 PM", with "(+1 day)" if it ends on the next local date. */
  timeRange: string;
  names: string[];
  isHostZone: boolean;
}

export interface MeetingSummary {
  title: string;
  location: string | null;
  meetingUrl: string | null;
  /** The headline: the meeting in the host's own zone. */
  primary: { dateLong: string; timeRange: string; zoneLabel: string };
  /** One entry per distinct time zone, earliest UTC offset first. */
  zones: ZoneGroup[];
  /** People whose time zone was never recorded (responded before it was captured). */
  unknown: string[];
}

function localRange(start: DateTime, end: DateTime): string {
  const range = `${start.toFormat("h:mm a")}–${end.toFormat("h:mm a")}`;
  const days = Math.round(
    DateTime.utc(end.year, end.month, end.day).diff(
      DateTime.utc(start.year, start.month, start.day),
      "days",
    ).days,
  );
  return days > 0 ? `${range} (+${days} day${days === 1 ? "" : "s"})` : range;
}

function byHostThenName(a: SummaryParticipant, b: SummaryParticipant) {
  return Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name);
}

export function buildMeetingSummary(input: MeetingSummaryInput): MeetingSummary {
  const start = DateTime.fromISO(input.startAt, { zone: "utc" }) as DateTime<true>;
  const end = DateTime.fromISO(input.endAt, { zone: "utc" }) as DateTime<true>;

  const people = [...input.participants].sort(byHostThenName);
  const byZone = new Map<string, string[]>();
  const unknown: string[] = [];

  for (const p of people) {
    const zone = p.isHost ? input.hostTimezone : p.timezone;
    if (!zone) {
      unknown.push(p.name);
      continue;
    }
    const names = byZone.get(zone);
    if (names) names.push(p.name);
    else byZone.set(zone, [p.name]);
  }
  // The host's zone is always listed, even if the host row is missing.
  if (!byZone.has(input.hostTimezone)) byZone.set(input.hostTimezone, []);

  const zones: ZoneGroup[] = [...byZone.entries()]
    .map(([zone, names]) => {
      const s = convertTime(start, zone);
      const e = end.setZone(zone);
      const group: ZoneGroup = {
        zone,
        city: zoneToCity(zone),
        offsetLabel: s.offsetLabel,
        dateLabel: s.dateTime.toFormat("ccc, LLL d"),
        timeRange: localRange(s.dateTime, e),
        names,
        isHostZone: zone === input.hostTimezone,
      };
      return { group, offset: s.dateTime.offset };
    })
    .sort((a, b) => a.offset - b.offset || a.group.zone.localeCompare(b.group.zone))
    .map(({ group }) => group);

  const host = convertTime(start, input.hostTimezone);
  const hostEnd = end.setZone(input.hostTimezone);

  return {
    title: input.title,
    location: input.location?.trim() || null,
    meetingUrl: input.meetingUrl?.trim() || null,
    primary: {
      dateLong: host.dateTime.toFormat("cccc, LLLL d, yyyy"),
      timeRange: localRange(host.dateTime, hostEnd),
      zoneLabel: `${zoneToCity(input.hostTimezone)}, ${host.offsetLabel}`,
    },
    zones,
    unknown,
  };
}

/** Plain-text version for pasting into chat/email. */
export function summaryToText(summary: MeetingSummary): string {
  const lines: string[] = [summary.title];
  if (summary.location) lines.push(`Location: ${summary.location}`);
  if (summary.meetingUrl) lines.push(`Meeting link: ${summary.meetingUrl}`);
  lines.push("");

  for (const z of summary.zones) {
    const who = z.names.length > 0 ? ` — ${z.names.join(", ")}` : "";
    lines.push(`${z.zone} (${z.offsetLabel})${who}`);
    lines.push(`  ${z.dateLabel} · ${z.timeRange}`);
    lines.push("");
  }

  if (summary.unknown.length > 0) {
    lines.push(`Time zone not recorded — ${summary.unknown.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
