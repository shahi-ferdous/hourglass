"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime, IANAZone } from "luxon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalogClock } from "@/components/AnalogClock";
import { PlacePicker } from "@/components/converter/PlacePicker";
import { cn } from "@/lib/utils";
import { detectLocalTimezone } from "@/lib/time/timezones";
import {
  findPlaceForZone,
  QUICK_ADD_ZONES,
  type Place,
} from "@/lib/time/places";
import {
  convertTime,
  describeDayDelta,
  formatClock,
  toDateTime,
  wasShiftedByDst,
} from "@/lib/time/convert";
import {
  ArrowRightLeftIcon,
  CheckIcon,
  LinkIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  XIcon,
} from "lucide-react";

const STORAGE_KEY = "hg_tzconverter";
const DEFAULT_TARGET_ZONES = ["Europe/London", "America/New_York", "Asia/Tokyo"];

interface State {
  from: Place;
  date: string;
  time: string;
  targets: Place[];
  hour12: boolean;
}

function isZone(value: string | null | undefined): value is string {
  return !!value && IANAZone.isValidZone(value);
}

function nowIn(zone: string) {
  const now = DateTime.now().setZone(zone);
  return { date: now.toISODate()!, time: now.toFormat("HH:mm") };
}

function localeUses12Hour(): boolean {
  try {
    return !!new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12;
  } catch {
    return true;
  }
}

/** Starting state: URL (shared link) → saved preferences → the visitor's own zone. */
function loadInitialState(): State {
  const params = new URLSearchParams(window.location.search);
  let saved: { to?: string[]; hour12?: boolean } = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    // Storage unavailable or corrupted — fall back to defaults.
  }

  const fromParam = params.get("from");
  const fromZone = isZone(fromParam) ? fromParam : detectLocalTimezone();
  const now = nowIn(fromZone);

  const at = params.get("at");
  const atMatch = at ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(at) : null;
  const atValid = atMatch ? DateTime.fromISO(at!).isValid : false;

  const toParam = params.get("to");
  const toZones = (toParam !== null ? toParam.split(",") : (saved.to ?? DEFAULT_TARGET_ZONES))
    .filter(isZone)
    .filter((z, i, all) => z !== fromZone && all.indexOf(z) === i);

  return {
    from: findPlaceForZone(fromZone),
    date: atValid ? atMatch![1]! : now.date,
    time: atValid ? atMatch![2]! : now.time,
    targets: toZones.map(findPlaceForZone),
    hour12: typeof saved.hour12 === "boolean" ? saved.hour12 : localeUses12Hour(),
  };
}

export function TimeZoneConverter() {
  const [state, setState] = useState<State | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // Browser-only inputs (URL, storage, Intl) — can't be read during SSR
    // without a hydration mismatch, so state starts empty and fills after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadInitialState());
  }, []);

  // Mirror state into the URL (shareable) and storage (remembered).
  useEffect(() => {
    if (!state) return;
    const params = new URLSearchParams();
    params.set("from", state.from.zone);
    params.set("at", `${state.date}T${state.time}`);
    if (state.targets.length > 0) params.set("to", state.targets.map((t) => t.zone).join(","));
    else params.set("to", "");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ to: state.targets.map((t) => t.zone), hour12: state.hour12 }),
      );
    } catch {
      // Private mode etc. — the URL still carries the state.
    }
  }, [state]);

  const source = useMemo(
    () => (state ? toDateTime({ zone: state.from.zone, date: state.date, time: state.time }) : null),
    [state],
  );

  if (!state) return <ConverterSkeleton />;

  const update = (patch: Partial<State>) => setState((s) => (s ? { ...s, ...patch } : s));

  function addTarget(place: Place) {
    setState((s) => {
      if (!s || place.zone === s.from.zone || s.targets.some((t) => t.zone === place.zone)) return s;
      return { ...s, targets: [...s.targets, place] };
    });
    setAdding(false);
  }

  function makeReference(place: Place) {
    if (!state || !source) return;
    // Keep the same instant: the new reference shows its own wall-clock time.
    const local = source.setZone(place.zone);
    setState({
      ...state,
      from: place,
      date: local.toISODate()!,
      time: local.toFormat("HH:mm"),
      targets: state.targets.map((t) => (t.zone === place.zone ? state.from : t)),
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — copy the address bar instead.");
    }
  }

  const quickAdds = QUICK_ADD_ZONES.filter(
    (z) => z !== state.from.zone && !state.targets.some((t) => t.zone === z),
  );
  const shifted = source ? wasShiftedByDst({ zone: state.from.zone, date: state.date, time: state.time }, source) : false;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">From</p>
            <HourToggle hour12={state.hour12} onChange={(hour12) => update({ hour12 })} />
          </div>

          <PlacePicker
            key={state.from.zone}
            label="From"
            value={state.from}
            onChange={(from) =>
              setState((s) =>
                s
                  ? {
                      ...s,
                      from,
                      targets: s.targets.filter((t) => t.zone !== from.zone),
                    }
                  : s,
              )
            }
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              type="date"
              aria-label="Date"
              value={state.date}
              onChange={(e) => update({ date: e.target.value })}
              className="h-9"
            />
            <Input
              type="time"
              aria-label="Time"
              value={state.time}
              onChange={(e) => update({ time: e.target.value })}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              className="col-span-2 h-9 sm:col-span-1"
              onClick={() => update(nowIn(state.from.zone))}
            >
              Now
            </Button>
          </div>

          {source && (
            <p className="text-xs text-muted-foreground">
              {source.toFormat("cccc, LLLL d, yyyy")} · {formatClock(source, state.hour12)} ·{" "}
              {convertTime(source, state.from.zone).offsetLabel}
              {shifted && " · adjusted — that time doesn't exist on this date (clocks skip forward)"}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Compare with {state.targets.length > 0 && <span className="text-muted-foreground">({state.targets.length})</span>}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
            <LinkIcon className="size-3.5" />
            Copy link
          </Button>
        </div>

        {!source && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Enter a valid date and time to see the conversions.
          </p>
        )}

        {source &&
          state.targets.map((place) => (
            <ResultRow
              key={place.zone}
              place={place}
              source={source}
              hour12={state.hour12}
              onMakeReference={() => makeReference(place)}
              onRemove={() =>
                update({ targets: state.targets.filter((t) => t.zone !== place.zone) })
              }
            />
          ))}

        {source && state.targets.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add a place to see what time it is there.
          </p>
        )}

        {adding ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Add a place</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel"
                  onClick={() => setAdding(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <PlacePicker label="Add" value={null} onChange={addTarget} />
            </CardContent>
          </Card>
        ) : (
          <Button type="button" variant="outline" className="w-full" onClick={() => setAdding(true)}>
            <PlusIcon className="size-4" />
            Add a place
          </Button>
        )}

        {quickAdds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Quick add:</span>
            {quickAdds.map((zone) => {
              const place = findPlaceForZone(zone);
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => addTarget(place)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <PlusIcon className="size-3" />
                  {place.city}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  place,
  source,
  hour12,
  onMakeReference,
  onRemove,
}: {
  place: Place;
  source: DateTime<true>;
  hour12: boolean;
  onMakeReference: () => void;
  onRemove: () => void;
}) {
  const c = convertTime(source, place.zone);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-3 sm:px-4">
      <AnalogClock
        hour={c.dateTime.hour}
        minute={c.dateTime.minute}
        isDaytime={c.isDaytime}
        size={52}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium">{place.city}</span>
          {place.countryName && (
            <span className="truncate text-xs text-muted-foreground">{place.countryName}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{c.dateTime.toFormat("ccc, LLL d")}</span>
          {c.dayDelta !== 0 ? (
            <Badge variant="secondary">{describeDayDelta(c.dayDelta)}</Badge>
          ) : null}
          <span>
            {c.offsetLabel}
            {c.abbreviation && !c.abbreviation.startsWith("UTC") && !c.abbreviation.startsWith("GMT")
              ? ` · ${c.abbreviation}`
              : ""}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              c.isWorkHours && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {c.isDaytime ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
            {c.isWorkHours ? "Work hours" : c.isDaytime ? "Daytime" : "Night"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="font-heading text-xl font-semibold tabular-nums sm:text-3xl">
          {formatClock(c.dateTime, hour12)}
        </span>
        <div className="ml-1 flex flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Use ${place.city} as the starting place`}
            title="Use as starting place"
            onClick={onMakeReference}
          >
            <ArrowRightLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${place.city}`}
            title="Remove"
            onClick={onRemove}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HourToggle({
  hour12,
  onChange,
}: {
  hour12: boolean;
  onChange: (hour12: boolean) => void;
}) {
  return (
    <div role="group" aria-label="Time format" className="flex items-center gap-0.5 rounded-md border p-0.5">
      {[
        { label: "12h", value: true },
        { label: "24h", value: false },
      ].map((opt) => (
        <Button
          key={opt.label}
          type="button"
          size="sm"
          variant={hour12 === opt.value ? "default" : "ghost"}
          aria-pressed={hour12 === opt.value}
          className="h-6 px-2 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {hour12 === opt.value && <CheckIcon className="size-3" />}
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

function ConverterSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
