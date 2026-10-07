"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OverlapResponse } from "@/lib/types";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

interface BestTimesListProps {
  slots: OverlapResponse["slots"];
  totalParticipants: number;
  slotMinutes: number;
  displayTimezone: string;
  /** How many slots to show before "Show more". */
  initialCount?: number;
}

export function BestTimesList({
  slots,
  totalParticipants,
  slotMinutes,
  displayTimezone,
  initialCount = 3,
}: BestTimesListProps) {
  const [expanded, setExpanded] = useState(false);

  // A slot only one person can make isn't an "overlap" — skip it.
  const ranked = [...slots]
    .filter((s) => s.count >= 2)
    .sort((a, b) => b.count - a.count || a.startAt.localeCompare(b.startAt));

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No overlapping times yet — a time shows up here once at least two people are free at the
        same time.
      </p>
    );
  }

  const visible = expanded ? ranked : ranked.slice(0, initialCount);
  const hiddenCount = ranked.length - initialCount;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {visible.map((slot) => {
          const start = DateTime.fromISO(slot.startAt, { zone: "utc" }).setZone(displayTimezone);
          const end = start.plus({ minutes: slotMinutes });
          const isUnanimous = slot.count === totalParticipants;
          return (
            <li
              key={slot.startAt}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {start.toFormat("ccc, LLL d")} · {start.toFormat("h:mm a")}–{end.toFormat("h:mm a")}
              </span>
              <Badge variant={isUnanimous ? "default" : "secondary"} className="shrink-0">
                {slot.count}/{totalParticipants} available
              </Badge>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="size-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-4" />
              Show {hiddenCount} more
            </>
          )}
        </Button>
      )}
    </div>
  );
}
