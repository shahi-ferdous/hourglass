"use client";

import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import type { OverlapResponse } from "@/lib/types";

interface BestTimesListProps {
  slots: OverlapResponse["slots"];
  totalParticipants: number;
  slotMinutes: number;
  displayTimezone: string;
  maxItems?: number;
}

export function BestTimesList({
  slots,
  totalParticipants,
  slotMinutes,
  displayTimezone,
  maxItems = 6,
}: BestTimesListProps) {
  const ranked = [...slots]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.startAt.localeCompare(b.startAt))
    .slice(0, maxItems);

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No overlapping availability yet — check back once more people respond.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {ranked.map((slot) => {
        const start = DateTime.fromISO(slot.startAt, { zone: "utc" }).setZone(displayTimezone);
        const end = start.plus({ minutes: slotMinutes });
        const isUnanimous = slot.count === totalParticipants;
        return (
          <li
            key={slot.startAt}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span>
              {start.toFormat("ccc, LLL d")} · {start.toFormat("h:mm a")}–{end.toFormat("h:mm a")}
            </span>
            <Badge variant={isUnanimous ? "default" : "secondary"}>
              {slot.count}/{totalParticipants} available
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
