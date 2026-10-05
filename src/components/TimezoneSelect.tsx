"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTimezones } from "@/lib/time/timezones";

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  id?: string;
}

export function TimezoneSelect({ value, onChange, id }: TimezoneSelectProps) {
  const zones = useMemo(() => listTimezones(), []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select a time zone" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {zones.map((tz) => (
          <SelectItem key={tz.value} value={tz.value}>
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
