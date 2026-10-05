"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";

function toKey(date: Date): string {
  return DateTime.fromJSDate(date).toISODate()!;
}
function fromKey(key: string): Date {
  return DateTime.fromISO(key).toJSDate();
}

interface DatePickerProps {
  value: string[];
  onChange: (dates: string[]) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [pickMode, setPickMode] = useState<"multiple" | "range">("multiple");
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    value[0] ? fromKey(value[0]) : new Date(),
  );

  const selectedDates = value.map(fromKey);

  function selectWholeMonth() {
    const start = DateTime.fromJSDate(visibleMonth).startOf("month");
    const end = start.endOf("month");
    const keys = new Set(value);
    for (let d = start; d <= end; d = d.plus({ days: 1 })) {
      keys.add(d.toISODate()!);
    }
    onChange([...keys].sort());
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={pickMode} onValueChange={(v) => setPickMode(v as "multiple" | "range")}>
          <TabsList>
            <TabsTrigger value="multiple">Specific days</TabsTrigger>
            <TabsTrigger value="range">Date range</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button type="button" variant="outline" size="sm" onClick={selectWholeMonth}>
          Select whole month
        </Button>
      </div>

      {pickMode === "multiple" ? (
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={(dates) => onChange((dates ?? []).map(toKey).sort())}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          className="rounded-lg border w-fit"
        />
      ) : (
        <Calendar
          mode="range"
          selected={rangeFromKeys(value)}
          onSelect={(range) => onChange(keysFromRange(range))}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          className="rounded-lg border w-fit"
        />
      )}

      <p className="text-sm text-muted-foreground">
        {value.length === 0
          ? "No dates selected yet."
          : `${value.length} date${value.length === 1 ? "" : "s"} selected.`}
      </p>
    </div>
  );
}

function rangeFromKeys(value: string[]): DateRange | undefined {
  if (value.length === 0) return undefined;
  const sorted = [...value].sort();
  return { from: fromKey(sorted[0]!), to: fromKey(sorted[sorted.length - 1]!) };
}

function keysFromRange(range: DateRange | undefined): string[] {
  if (!range?.from) return [];
  const to = range.to ?? range.from;
  const start = DateTime.fromJSDate(range.from).startOf("day");
  const end = DateTime.fromJSDate(to).startOf("day");
  const keys: string[] = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    keys.push(d.toISODate()!);
  }
  return keys;
}
