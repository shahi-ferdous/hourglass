"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { AvailabilityPresetToolbar } from "@/components/AvailabilityPresetToolbar";
import { buildSlotGrid } from "@/lib/time/grid";
import { minutesToTimeInputValue, timeInputValueToMinutes } from "@/lib/time/format";
import { detectLocalTimezone } from "@/lib/time/timezones";
import { api, getErrorMessage } from "@/lib/api-client";
import { normalizeUrlInput } from "@/lib/utils";
import { ShareScreen } from "./ShareScreen";
import { ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STEPS = ["Details", "Dates", "Availability", "Review & share"] as const;

interface CreateResult {
  pollId: string;
  shareUrl: string;
  manageUrl: string;
}

export function CreatePollWizard() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostTimezone, setHostTimezone] = useState("UTC");
  useEffect(() => {
    // Client-only detection — seeding this in useState's initializer would
    // mismatch the server-rendered value (see useDetectedTimezone.ts).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHostTimezone(detectLocalTimezone());
  }, []);

  const [windowDates, setWindowDates] = useState<string[]>([]);
  const [windowStartMinute, setWindowStartMinute] = useState(9 * 60);
  const [windowEndMinute, setWindowEndMinute] = useState(17 * 60);
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(30);
  const [hostAvailability, setHostAvailability] = useState<Set<string>>(new Set());

  const [viewPassword, setViewPassword] = useState("");
  const [hostPassword, setHostPassword] = useState("");

  const slots = useMemo(
    () =>
      buildSlotGrid({
        windowDates,
        windowStartMinute,
        windowEndMinute,
        slotMinutes,
        hostTimezone,
      }),
    [windowDates, windowStartMinute, windowEndMinute, slotMinutes, hostTimezone],
  );

  if (result) {
    return <ShareScreen {...result} />;
  }

  const canGoNext = (() => {
    if (step === 0) return title.trim().length > 0 && hostName.trim().length > 0;
    if (step === 1) return windowDates.length > 0;
    if (step === 2) return windowEndMinute > windowStartMinute;
    return true;
  })();

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const data = await api.post<CreateResult>("/api/polls", {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        meetingUrl: meetingUrl.trim() ? normalizeUrlInput(meetingUrl) : undefined,
        hostName: hostName.trim(),
        hostTimezone,
        windowDates,
        windowStartMinute,
        windowEndMinute,
        slotMinutes,
        hostAvailability: [...hostAvailability],
        viewPassword: viewPassword.trim() || undefined,
        hostPassword: hostPassword.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create the poll. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <StepIndicator current={step} />

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {step === 0 && (
            <DetailsStep
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              location={location}
              setLocation={setLocation}
              meetingUrl={meetingUrl}
              setMeetingUrl={setMeetingUrl}
              hostName={hostName}
              setHostName={setHostName}
              hostTimezone={hostTimezone}
              setHostTimezone={setHostTimezone}
            />
          )}
          {step === 1 && <DatePicker value={windowDates} onChange={setWindowDates} />}
          {step === 2 && (
            <AvailabilityStep
              windowStartMinute={windowStartMinute}
              setWindowStartMinute={setWindowStartMinute}
              windowEndMinute={windowEndMinute}
              setWindowEndMinute={setWindowEndMinute}
              slotMinutes={slotMinutes}
              setSlotMinutes={setSlotMinutes}
              slots={slots}
              hostTimezone={hostTimezone}
              hostAvailability={hostAvailability}
              setHostAvailability={setHostAvailability}
            />
          )}
          {step === 3 && (
            <ReviewStep
              title={title}
              hostName={hostName}
              hostTimezone={hostTimezone}
              windowDates={windowDates}
              slotCount={hostAvailability.size}
              viewPassword={viewPassword}
              setViewPassword={setViewPassword}
              hostPassword={hostPassword}
              setHostPassword={setHostPassword}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canGoNext}>
            Continue
            <ArrowRightIcon className="size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create & get link"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={
              "flex size-6 items-center justify-center rounded-full text-xs font-medium " +
              (i === current
                ? "bg-primary text-primary-foreground"
                : i < current
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground")
            }
          >
            {i + 1}
          </span>
          <span className={i === current ? "font-medium" : "text-muted-foreground"}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">—</span>}
        </li>
      ))}
    </ol>
  );
}

function DetailsStep({
  title,
  setTitle,
  description,
  setDescription,
  location,
  setLocation,
  meetingUrl,
  setMeetingUrl,
  hostName,
  setHostName,
  hostTimezone,
  setHostTimezone,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  meetingUrl: string;
  setMeetingUrl: (v: string) => void;
  hostName: string;
  setHostName: (v: string) => void;
  hostTimezone: string;
  setHostTimezone: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">What are you scheduling?</Label>
        <Input
          id="title"
          placeholder="Product team sync"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Anything participants should know"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            placeholder="Office, city, etc."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meetingUrl">Meeting link (optional)</Label>
          <Input
            id="meetingUrl"
            placeholder="https://meet.google.com/…"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            type="url"
            maxLength={2000}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hostName">Your name</Label>
          <Input
            id="hostName"
            placeholder="Jane"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hostTimezone">Your time zone</Label>
          <TimezoneSelect id="hostTimezone" value={hostTimezone} onChange={setHostTimezone} />
        </div>
      </div>
    </div>
  );
}

function AvailabilityStep({
  windowStartMinute,
  setWindowStartMinute,
  windowEndMinute,
  setWindowEndMinute,
  slotMinutes,
  setSlotMinutes,
  slots,
  hostTimezone,
  hostAvailability,
  setHostAvailability,
}: {
  windowStartMinute: number;
  setWindowStartMinute: (v: number) => void;
  windowEndMinute: number;
  setWindowEndMinute: (v: number) => void;
  slotMinutes: 15 | 30 | 60;
  setSlotMinutes: (v: 15 | 30 | 60) => void;
  slots: ReturnType<typeof buildSlotGrid>;
  hostTimezone: string;
  hostAvailability: Set<string>;
  setHostAvailability: (v: Set<string>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startTime">Earliest time</Label>
          <Input
            id="startTime"
            type="time"
            value={minutesToTimeInputValue(windowStartMinute)}
            onChange={(e) => setWindowStartMinute(timeInputValueToMinutes(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endTime">Latest time</Label>
          <Input
            id="endTime"
            type="time"
            value={minutesToTimeInputValue(windowEndMinute)}
            onChange={(e) => setWindowEndMinute(timeInputValueToMinutes(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slotMinutes">Time slots</Label>
          <select
            id="slotMinutes"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value) as 15 | 30 | 60)}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Now mark when you&apos;re available</p>
        <AvailabilityPresetToolbar
          slots={slots}
          hostTimezone={hostTimezone}
          selected={hostAvailability}
          onChange={setHostAvailability}
        />
        <AvailabilityGrid
          mode="edit"
          ariaLabel="Your availability"
          slots={slots}
          displayTimezone={hostTimezone}
          selected={hostAvailability}
          onChange={setHostAvailability}
        />
      </div>
    </div>
  );
}

function ReviewStep({
  title,
  hostName,
  hostTimezone,
  windowDates,
  slotCount,
  viewPassword,
  setViewPassword,
  hostPassword,
  setHostPassword,
}: {
  title: string;
  hostName: string;
  hostTimezone: string;
  windowDates: string[];
  slotCount: number;
  viewPassword: string;
  setViewPassword: (v: string) => void;
  hostPassword: string;
  setHostPassword: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium">{title || "Untitled poll"}</p>
        <p className="text-muted-foreground">
          Hosted by {hostName || "you"} · {hostTimezone}
        </p>
        <p className="text-muted-foreground">
          {windowDates.length} date{windowDates.length === 1 ? "" : "s"} · {slotCount} slot
          {slotCount === 1 ? "" : "s"} marked available
        </p>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-fit">
            Advanced: passwords
            <ChevronDownIcon className="size-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="viewPassword">Require a password to view/respond</Label>
            <Input
              id="viewPassword"
              type="password"
              placeholder="Leave blank for no password"
              value={viewPassword}
              onChange={(e) => setViewPassword(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Anyone with the link will need this password before they can see or respond to
              the poll.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hostPassword">Host password (extra protection)</Label>
            <Input
              id="hostPassword"
              type="password"
              placeholder="Leave blank for no extra password"
              value={hostPassword}
              onChange={(e) => setHostPassword(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              An additional check required only to delete the poll — useful if you&apos;re on
              a shared device. Your manage link always works for everyday hosting tasks, even
              if you forget this password.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
