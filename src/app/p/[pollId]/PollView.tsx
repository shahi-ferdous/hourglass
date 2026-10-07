"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewPasswordGate } from "@/components/ViewPasswordGate";
import { TimezoneSwitcher } from "@/components/TimezoneSwitcher";
import { ResponseEditor } from "@/components/ResponseEditor";
import { BestTimesList } from "@/components/BestTimesList";
import { RosterList, type RosterParticipant } from "@/components/RosterList";
import { SupportButton } from "@/components/SupportButton";
import { ManageAccessPrompt } from "@/components/ManageAccessPrompt";
import { api, ApiClientError, getErrorMessage } from "@/lib/api-client";
import { buildSlotGrid } from "@/lib/time/grid";
import { detectLocalTimezone } from "@/lib/time/timezones";
import type { OverlapResponse, PublicPollResponse } from "@/lib/types";
import { CalendarIcon, CopyIcon, LinkIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";

type Stage =
  | { kind: "loading" }
  | { kind: "gate" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; poll: PublicPollResponse };

export function PollView({ pollId }: { pollId: string }) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [overlap, setOverlap] = useState<OverlapResponse | null>(null);
  const [displayTimezone, setDisplayTimezone] = useState("UTC");
  useEffect(() => {
    // Client-only detection — see useDetectedTimezone.ts for why this
    // can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayTimezone(detectLocalTimezone());
  }, []);

  const loadPoll = useCallback(async () => {
    try {
      const data = await api.get<PublicPollResponse>(`/api/polls/${pollId}`);
      setStage(data.requiresViewPassword ? { kind: "gate" } : { kind: "ready", poll: data });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStage({ kind: "not_found" });
      } else {
        setStage({
          kind: "error",
          message: getErrorMessage(err, "Something went wrong."),
        });
      }
    }
  }, [pollId]);

  const loadOverlap = useCallback(async () => {
    try {
      const data = await api.get<OverlapResponse>(`/api/polls/${pollId}/overlap`);
      setOverlap(data);
    } catch {
      // Silent — the poll header fetch already surfaces auth/not-found errors.
    }
  }, [pollId]);

  useEffect(() => {
    // Deliberate plain fetch-in-effect (no SWR/React Query) to keep
    // dependencies minimal — the setState happens after an await, so this
    // is the standard async-fetch pattern despite the lint rule's naive
    // static check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPoll();
  }, [loadPoll]);

  useEffect(() => {
    if (stage.kind !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverlap();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadOverlap();
    }, 20000);
    return () => clearInterval(interval);
  }, [stage.kind, loadOverlap]);

  if (stage.kind === "loading") return <LoadingState />;
  if (stage.kind === "not_found") return <NotFoundState />;
  if (stage.kind === "error") return <ErrorState message={stage.message} />;
  if (stage.kind === "gate") {
    return (
      <ViewPasswordGate
        pollId={pollId}
        title="This poll"
        onUnlocked={loadPoll}
      />
    );
  }

  return (
    <PollContent
      pollId={pollId}
      poll={stage.poll}
      overlap={overlap}
      displayTimezone={displayTimezone}
      onTimezoneChange={setDisplayTimezone}
      onReload={() => {
        loadPoll();
        loadOverlap();
      }}
    />
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that poll</h1>
      <p className="text-muted-foreground">
        The link may be wrong, or the poll may have been removed.
      </p>
      <Button asChild variant="outline">
        <Link href="/create">Create your own poll</Link>
      </Button>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function PollContent({
  pollId,
  poll,
  overlap,
  displayTimezone,
  onTimezoneChange,
  onReload,
}: {
  pollId: string;
  poll: PublicPollResponse;
  overlap: OverlapResponse | null;
  displayTimezone: string;
  onTimezoneChange: (tz: string) => void;
  onReload: () => void;
}) {
  const [savedResponseUrl, setSavedResponseUrl] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const slots = buildSlotGrid({
    windowDates: poll.windowDates ?? [],
    windowStartMinute: poll.windowStartMinute ?? 0,
    windowEndMinute: poll.windowEndMinute ?? 0,
    slotMinutes: poll.slotMinutes ?? 30,
    hostTimezone: poll.hostTimezone ?? "UTC",
  });

  const viewerId = poll.viewerParticipantId ?? null;

  const respondents: RosterParticipant[] = useMemo(() => {
    if (!overlap) return [];
    const byPerson = new Map<string, string[]>();
    for (const s of overlap.slots) {
      for (const id of s.participantIds) {
        const list = byPerson.get(id);
        if (list) list.push(s.startAt);
        else byPerson.set(id, [s.startAt]);
      }
    }
    return overlap.participants.map((p) => ({ ...p, slots: byPerson.get(p.id) ?? [] }));
  }, [overlap]);

  const viewer = respondents.find((r) => r.id === viewerId) ?? null;
  const savedSlots = useMemo(() => viewer?.slots ?? [], [viewer]);

  // Everyone except the viewer — their own marks are drawn on top.
  const others = useMemo(() => {
    const counts = new Map<string, number>();
    const hostSlots = new Set<string>();
    let total = 0;
    for (const r of respondents) {
      if (r.id === viewerId) continue;
      total += 1;
      for (const iso of r.slots) {
        counts.set(iso, (counts.get(iso) ?? 0) + 1);
        if (r.isHost) hostSlots.add(iso);
      }
    }
    return { counts, total, hostSlots, hostName: poll.hostName };
  }, [respondents, viewerId, poll.hostName]);

  const isClosed = poll.status === "closed";
  const isHost = poll.viewerIsHost === true;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {isHost && (
        <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm">
          You&apos;re the host of this poll.{" "}
          <Link href={`/p/${pollId}/manage`} className="font-medium underline underline-offset-2">
            Go to your dashboard →
          </Link>
        </div>
      )}

      {!isHost && poll.hasHostPassword && <ManageAccessPrompt pollId={pollId} />}

      <PollHeader poll={poll} displayTimezone={displayTimezone} />

      {poll.finalStartAt && poll.finalEndAt && (
        <FinalTimeBanner
          startAt={poll.finalStartAt}
          endAt={poll.finalEndAt}
          displayTimezone={displayTimezone}
          meetingUrl={poll.meetingUrl}
        />
      )}

      {isClosed && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This poll is closed. Responses can no longer be added or changed.
        </div>
      )}

      <TimezoneSwitcher
        hostTimezone={poll.hostTimezone ?? "UTC"}
        hostName={poll.hostName}
        value={displayTimezone}
        onChange={onTimezoneChange}
      />

      <ResponseEditor
        pollId={pollId}
        participantId={viewerId}
        savedName={viewer?.displayName ?? ""}
        savedSlots={savedSlots}
        slots={slots}
        displayTimezone={displayTimezone}
        closed={isClosed}
        others={others}
        onSaved={({ responseUrl }) => {
          if (responseUrl) setSavedResponseUrl(responseUrl);
          setJustSaved(true);
          onReload();
        }}
      />

      {savedResponseUrl && <SavedLinkReminder responseUrl={savedResponseUrl} />}

      {justSaved && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            Thanks for responding! Hourglass is free to use.
          </p>
          <SupportButton variant="default" tone="blue" jump />
        </div>
      )}

      {overlap && overlap.totalParticipants > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Best overlapping times ({overlap.totalParticipants} response
            {overlap.totalParticipants === 1 ? "" : "s"} so far)
          </p>
          <BestTimesList
            slots={overlap.slots}
            totalParticipants={overlap.totalParticipants}
            slotMinutes={poll.slotMinutes ?? 30}
            displayTimezone={displayTimezone}
          />
        </div>
      )}

      {respondents.length > 0 && (
        <RosterList
          pollId={pollId}
          participants={respondents}
          slots={slots}
          displayTimezone={displayTimezone}
        />
      )}
    </div>
  );
}

function PollHeader({
  poll,
  displayTimezone,
}: {
  poll: PublicPollResponse;
  displayTimezone: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{poll.title}</h1>
        <Badge variant={poll.status === "closed" ? "secondary" : "default"}>
          {poll.status === "closed" ? "Closed" : "Open"}
        </Badge>
      </div>
      {poll.hostName && (
        <p className="text-muted-foreground">Hosted by {poll.hostName}</p>
      )}
      {poll.description && <p>{poll.description}</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {poll.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-4" />
            {poll.location}
          </span>
        )}
        {poll.meetingUrl && (
          <a
            href={poll.meetingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 underline underline-offset-2"
          >
            <LinkIcon className="size-4" />
            Meeting link
          </a>
        )}
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon className="size-4" />
          {poll.windowDates?.length ?? 0} date{(poll.windowDates?.length ?? 0) === 1 ? "" : "s"}{" "}
          under consideration
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Times below are shown in {displayTimezone.replace(/_/g, " ")}.
      </p>
    </div>
  );
}

function FinalTimeBanner({
  startAt,
  endAt,
  displayTimezone,
  meetingUrl,
}: {
  startAt: string;
  endAt: string;
  displayTimezone: string;
  meetingUrl?: string | null;
}) {
  const start = DateTime.fromISO(startAt, { zone: "utc" }).setZone(displayTimezone);
  const end = DateTime.fromISO(endAt, { zone: "utc" }).setZone(displayTimezone);
  return (
    <div className="flex flex-col gap-1 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <ShieldCheckIcon className="size-4" />
        Meeting time selected
      </div>
      <p className="font-medium">
        {start.toFormat("cccc, LLLL d")} · {start.toFormat("h:mm a")}–{end.toFormat("h:mm a")}
      </p>
      {meetingUrl && (
        <a href={meetingUrl} target="_blank" rel="noopener noreferrer nofollow" className="w-fit text-sm underline underline-offset-2">
          Join meeting
        </a>
      )}
    </div>
  );
}

function SavedLinkReminder({ responseUrl }: { responseUrl: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(responseUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <p>
        Using a different device later? Save this link to view or edit your response without
        re-entering your name:
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5">
          {responseUrl}
        </code>
        <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={copy}>
          <CopyIcon className="size-3.5" />
          Copy
        </Button>
      </div>
    </div>
  );
}
