"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalogClock } from "@/components/AnalogClock";
import { useDetectedTimezone } from "@/lib/time/useDetectedTimezone";
import { convertTime, describeDayDelta } from "@/lib/time/convert";
import { zoneToCity } from "@/lib/time/places";
import { ArrowRightIcon, MoonIcon, SunIcon } from "lucide-react";

const SAMPLE_CITIES = [
  { city: "New York", zone: "America/New_York" },
  { city: "London", zone: "Europe/London" },
  { city: "Dubai", zone: "Asia/Dubai" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
  { city: "Sydney", zone: "Australia/Sydney" },
];

export function CompareTimeZones() {
  const localZone = useDetectedTimezone();
  // null until mounted: "now" and the visitor's zone only exist in the
  // browser, so the server render (and first paint) shows a placeholder.
  const [now, setNow] = useState<DateTime<true> | null>(null);

  useEffect(() => {
    const tick = () => setNow(DateTime.now() as DateTime<true>);
    // Browser-only clock read (see comment above).
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const local = now ? (now.setZone(localZone) as DateTime<true>) : null;
  const rows = SAMPLE_CITIES.filter((c) => c.zone !== localZone).slice(0, 4);
  const localInfo = local ? convertTime(local, localZone) : null;

  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="mb-12 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Compare Time Zones</h2>
          <p className="text-muted-foreground">
            See what time it is anywhere, at the moment you choose.
          </p>
        </div>

        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {local && localInfo ? (
            <>
              <div className="flex items-center gap-5 rounded-2xl border bg-card p-5 sm:gap-6 sm:p-6">
                <AnalogClock
                  hour={local.hour}
                  minute={local.minute}
                  second={local.second}
                  isDaytime={localInfo.isDaytime}
                  size={96}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Your time · {zoneToCity(localZone)}
                  </span>
                  <span className="font-heading text-4xl font-semibold tabular-nums sm:text-5xl">
                    {local.toFormat("h:mm a")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {local.toFormat("cccc, LLLL d")} · {localInfo.offsetLabel}
                  </span>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => {
                  const c = convertTime(local, row.zone);
                  return (
                    <li
                      key={row.zone}
                      className="flex items-center gap-4 rounded-2xl border bg-card p-4"
                    >
                      <AnalogClock
                        hour={c.dateTime.hour}
                        minute={c.dateTime.minute}
                        second={c.dateTime.second}
                        isDaytime={c.isDaytime}
                        size={60}
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{row.city}</span>
                        <span className="font-heading text-2xl font-semibold tabular-nums">
                          {c.dateTime.toFormat("h:mm a")}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {c.isDaytime ? (
                            <SunIcon className="size-3.5" />
                          ) : (
                            <MoonIcon className="size-3.5" />
                          )}
                          {c.offsetLabel}
                          {c.dayDelta !== 0 && (
                            <Badge variant="secondary">{describeDayDelta(c.dayDelta)}</Badge>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="flex flex-col gap-3" aria-hidden>
              <Skeleton className="h-36 w-full rounded-2xl" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/timezone-converter">
              Open Time Zone Converter
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
