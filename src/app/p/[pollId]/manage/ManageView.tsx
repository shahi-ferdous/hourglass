"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { TimezoneSwitcher } from "@/components/TimezoneSwitcher";
import { PollSettingsForm } from "./PollSettingsForm";
import { RosterList } from "./RosterList";
import { DeletePollDialog } from "./DeletePollDialog";
import { api, ApiClientError, getErrorMessage } from "@/lib/api-client";
import { buildSlotGrid } from "@/lib/time/grid";
import { detectLocalTimezone } from "@/lib/time/timezones";
import type { ManageResponse } from "@/lib/types";
import { CopyIcon, LinkIcon, MapPinIcon } from "lucide-react";

type Stage =
  | { kind: "loading" }
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ManageResponse };

export function ManageView({ pollId }: { pollId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [displayTimezone, setDisplayTimezone] = useState("UTC");
  useEffect(() => {
    // Client-only detection — see useDetectedTimezone.ts for why this
    // can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayTimezone(detectLocalTimezone());
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ManageResponse>(`/api/polls/${pollId}/manage`);
      setStage({ kind: "ready", data });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStage({ kind: "not_found" });
      } else if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setStage({ kind: "unauthorized" });
      } else {
        setStage({
          kind: "error",
          message: getErrorMessage(err, "Something went wrong."),
        });
      }
    }
  }, [pollId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (stage.kind === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (stage.kind === "not_found") {
    return (
      <CenteredMessage title="We couldn't find that poll">
        The link may be wrong, or the poll may have been removed.
      </CenteredMessage>
    );
  }
  if (stage.kind === "unauthorized") {
    return (
      <CenteredMessage title="You need the host link">
        Open this poll using the manage link you saved when you created it.
      </CenteredMessage>
    );
  }
  if (stage.kind === "error") {
    return <CenteredMessage title="Something went wrong">{stage.message}</CenteredMessage>;
  }

  return (
    <ManageContent
      pollId={pollId}
      data={stage.data}
      displayTimezone={displayTimezone}
      onTimezoneChange={setDisplayTimezone}
      onReload={load}
      onDeleted={() => router.push("/")}
    />
  );
}

function CenteredMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{children}</p>
      <Button asChild variant="outline">
        <Link href="/create">Create a new poll</Link>
      </Button>
    </div>
  );
}

function ManageContent({
  pollId,
  data,
  displayTimezone,
  onTimezoneChange,
  onReload,
  onDeleted,
}: {
  pollId: string;
  data: ManageResponse;
  displayTimezone: string;
  onTimezoneChange: (tz: string) => void;
  onReload: () => void;
  onDeleted: () => void;
}) {
  const { poll, participants } = data;
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const slots = useMemo(
    () =>
      buildSlotGrid({
        windowDates: poll.windowDates,
        windowStartMinute: poll.windowStartMinute,
        windowEndMinute: poll.windowEndMinute,
        slotMinutes: poll.slotMinutes,
        hostTimezone: poll.hostTimezone,
      }),
    [poll],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of participants) {
      for (const iso of p.slots) map.set(iso, (map.get(iso) ?? 0) + 1);
    }
    return map;
  }, [participants]);

  const host = useMemo(() => participants.find((p) => p.isHost), [participants]);
  const hostSlots = useMemo(() => new Set(host?.slots ?? []), [host]);

  const rankedSlots = useMemo(
    () =>
      [...counts.entries()]
        .map(([startAt, count]) => ({ startAt, count }))
        .sort((a, b) => b.count - a.count || a.startAt.localeCompare(b.startAt)),
    [counts],
  );

  async function runAction(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      onReload();
    } catch (err) {
      toast.error(getErrorMessage(err, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${pollId}` : `/p/${pollId}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{poll.title}</h1>
            <Badge variant={poll.status === "closed" ? "secondary" : "default"}>
              {poll.status === "closed" ? "Closed" : "Open"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {participants.length} response{participants.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            Settings
          </Button>
          {poll.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                runAction(() => api.post(`/api/polls/${pollId}/close`), "Poll closed")
              }
            >
              Close poll
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                runAction(() => api.post(`/api/polls/${pollId}/reopen`), "Poll reopened")
              }
            >
              Reopen poll
            </Button>
          )}
          <DeletePollDialog
            pollId={pollId}
            hasHostPassword={poll.hasHostPassword}
            onDeleted={onDeleted}
          />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6 text-sm">
          <p className="font-medium">Share link</p>
          <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 p-2">
            <code className="min-w-0 flex-1 truncate">{shareUrl}</code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied");
              }}
            >
              <CopyIcon className="size-3.5" />
              Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
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
          </div>
        </CardContent>
      </Card>

      {showSettings && (
        <PollSettingsForm
          pollId={pollId}
          poll={poll}
          onSaved={() => {
            setShowSettings(false);
            onReload();
          }}
        />
      )}

      <TimezoneSwitcher
        hostTimezone={poll.hostTimezone}
        hostName={host?.displayName}
        value={displayTimezone}
        onChange={onTimezoneChange}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Availability heatmap</p>
        <AvailabilityGrid
          mode="heatmap"
          ariaLabel="Availability heatmap"
          slots={slots}
          displayTimezone={displayTimezone}
          counts={counts}
          totalParticipants={participants.length}
          hostSlots={hostSlots}
          hostName={host?.displayName}
        />
      </div>

      <FinalizeSection
        pollId={pollId}
        ranked={rankedSlots}
        totalParticipants={participants.length}
        slotMinutes={poll.slotMinutes}
        displayTimezone={displayTimezone}
        finalStartAt={poll.finalStartAt}
        finalEndAt={poll.finalEndAt}
        busy={busy}
        runAction={runAction}
      />

      <RosterList pollId={pollId} participants={participants} onChanged={onReload} />
    </div>
  );
}

function FinalizeSection({
  pollId,
  ranked,
  totalParticipants,
  slotMinutes,
  displayTimezone,
  finalStartAt,
  finalEndAt,
  busy,
  runAction,
}: {
  pollId: string;
  ranked: { startAt: string; count: number }[];
  totalParticipants: number;
  slotMinutes: number;
  displayTimezone: string;
  finalStartAt: string | null;
  finalEndAt: string | null;
  busy: boolean;
  runAction: (action: () => Promise<void>, successMessage?: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Best overlapping times</p>
      {finalStartAt && finalEndAt && (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Meeting time selected:{" "}
            {DateTime.fromISO(finalStartAt, { zone: "utc" })
              .setZone(displayTimezone)
              .toFormat("ccc, LLL d · h:mm a")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              runAction(
                () => api.delete(`/api/polls/${pollId}/finalize`),
                "Cleared final time",
              )
            }
          >
            Clear
          </Button>
        </div>
      )}
      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No responses yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranked.slice(0, 8).map((slot) => {
            const start = DateTime.fromISO(slot.startAt, { zone: "utc" }).setZone(displayTimezone);
            const end = start.plus({ minutes: slotMinutes });
            const isSelected = finalStartAt === slot.startAt;
            return (
              <li
                key={slot.startAt}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {start.toFormat("ccc, LLL d")} · {start.toFormat("h:mm a")}–
                  {end.toFormat("h:mm a")}{" "}
                  <span className="text-muted-foreground">
                    ({slot.count}/{totalParticipants})
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={isSelected ? "secondary" : "outline"}
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      () =>
                        api.post(`/api/polls/${pollId}/finalize`, {
                          startAt: slot.startAt,
                          endAt: end.toUTC().toISO(),
                        }),
                      "Meeting time set",
                    )
                  }
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
