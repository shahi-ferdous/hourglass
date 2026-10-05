"use client";

import { Button } from "@/components/ui/button";
import type { GridSlot } from "@/lib/time/grid";

interface Preset {
  label: string;
  startMinute: number;
  endMinute: number;
}

const PRESETS: Preset[] = [
  { label: "Morning", startMinute: 6 * 60, endMinute: 12 * 60 },
  { label: "Afternoon", startMinute: 12 * 60, endMinute: 17 * 60 },
  { label: "Evening", startMinute: 17 * 60, endMinute: 22 * 60 },
];

interface AvailabilityPresetToolbarProps {
  slots: GridSlot[];
  hostTimezone: string;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * "Do not force the host to configure each day individually" — these
 * buttons union a time-of-day range across every date already in the
 * grid, so marking "every weekday 9–5" is one click instead of N.
 */
export function AvailabilityPresetToolbar({
  slots,
  hostTimezone,
  selected,
  onChange,
}: AvailabilityPresetToolbarProps) {
  function applyPreset(preset: Preset) {
    const next = new Set(selected);
    for (const slot of slots) {
      const local = slot.dateTime.setZone(hostTimezone);
      const minuteOfDay = local.hour * 60 + local.minute;
      if (minuteOfDay >= preset.startMinute && minuteOfDay < preset.endMinute) {
        next.add(slot.isoUtc);
      }
    }
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(slots.map((s) => s.isoUtc)));
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset(preset)}
        >
          + {preset.label}
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={selectAll}>
        Select all
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
        Clear
      </Button>
    </div>
  );
}
