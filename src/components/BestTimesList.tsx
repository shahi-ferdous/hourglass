"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlotPeople } from "@/components/SlotPeople";
import type { SlotPerson } from "@/lib/slot-people";
import type { OverlapResponse } from "@/lib/types";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";

interface BestTimesListProps {
  slots: OverlapResponse["slots"];
  totalParticipants: number;
  slotMinutes: number;
  displayTimezone: string;
  /** Who is free at each slot — shown when a row is expanded. */
  peopleBySlot: Map<string, SlotPerson[]>;
  /** Marks the viewer's own chip as "You". */
  viewerId?: string | null;
  /** How many slots to show before "Show more". */
  initialCount?: number;
}

export function BestTimesList({
  slots,
  totalParticipants,
  slotMinutes,
  displayTimezone,
  peopleBySlot,
  viewerId,
  initialCount = 3,
}: BestTimesListProps) {
  const [expanded, setExpanded] = useState(false);
  const [openSlot, setOpenSlot] = useState<string | null>(null);

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
          const isOpen = openSlot === slot.startAt;
          return (
            <li key={slot.startAt} className="rounded-md border text-sm">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenSlot(isOpen ? null : slot.startAt)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isOpen ? (
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    {start.toFormat("ccc, LLL d")} · {start.toFormat("h:mm a")}–
                    {end.toFormat("h:mm a")}
                  </span>
                </span>
                <Badge variant={isUnanimous ? "default" : "secondary"} className="shrink-0">
                  {slot.count}/{totalParticipants} available
                </Badge>
              </button>
              {isOpen && (
                <div className="border-t px-3 py-2.5">
                  <SlotPeople people={peopleBySlot.get(slot.startAt) ?? []} viewerId={viewerId} />
                </div>
              )}
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
