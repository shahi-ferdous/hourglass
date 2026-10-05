"use client";

import { Button } from "@/components/ui/button";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { useDetectedTimezone } from "@/lib/time/useDetectedTimezone";
import { cn } from "@/lib/utils";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";

interface TimezoneSwitcherProps {
  hostTimezone: string;
  hostName?: string | null;
  value: string;
  onChange: (tz: string) => void;
}

export function TimezoneSwitcher({
  hostTimezone,
  hostName,
  value,
  onChange,
}: TimezoneSwitcherProps) {
  const localTz = useDetectedTimezone();
  const [showMore, setShowMore] = useState(false);

  const isLocal = value === localTz;
  const isHost = value === hostTimezone;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <GlobeIcon className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">Showing times in:</span>
      <div className="flex items-center gap-1 rounded-md border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={isLocal ? "default" : "ghost"}
          className={cn("h-7 px-2 text-xs")}
          onClick={() => onChange(localTz)}
        >
          My time
        </Button>
        {hostTimezone !== localTz && (
          <Button
            type="button"
            size="sm"
            variant={isHost ? "default" : "ghost"}
            className={cn("h-7 px-2 text-xs")}
            onClick={() => onChange(hostTimezone)}
          >
            {hostName ? `${hostName}'s time` : "Host's time"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={!isLocal && !isHost ? "default" : "ghost"}
          className={cn("h-7 px-2 text-xs")}
          onClick={() => setShowMore((v) => !v)}
        >
          Other…
        </Button>
      </div>
      {showMore && (
        <div className="w-56">
          <TimezoneSelect value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
