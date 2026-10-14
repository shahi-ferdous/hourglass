"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClosedPollNotice, FinalTimeBanner } from "@/components/FinalTimeBanner";
import { renderInvitationPng } from "@/lib/invitation-card";
import {
  buildMeetingSummary,
  summaryToText,
  type MeetingSummary,
} from "@/lib/time/meeting-summary";
import { CopyIcon, DownloadIcon } from "lucide-react";

interface MeetingSummaryCardProps {
  poll: {
    title: string;
    location?: string | null;
    meetingUrl?: string | null;
    hostTimezone: string;
    status: "active" | "closed";
    finalStartAt?: string | null;
    finalEndAt?: string | null;
  };
  participants: { displayName: string; isHost: boolean; timezone: string | null }[];
  /** The viewer's currently selected display time zone (for the banner). */
  displayTimezone: string;
  /** Hosts get an extra hint about people whose time zone isn't recorded yet. */
  isHost?: boolean;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "meeting"
  );
}

/**
 * Host dashboard card for a finished poll: the "closed" notice, then one card
 * with the selected meeting time on a dark header over the list of every
 * attendee's local time, with a copyable text summary and a downloadable
 * invitation image.
 */
export function MeetingSummaryCard({
  poll,
  participants,
  displayTimezone,
  isHost = false,
}: MeetingSummaryCardProps) {
  const [downloading, setDownloading] = useState(false);
  const closed = poll.status === "closed";
  const { finalStartAt, finalEndAt } = poll;

  const summary = useMemo<MeetingSummary | null>(() => {
    if (!finalStartAt || !finalEndAt) return null;
    return buildMeetingSummary({
      title: poll.title,
      startAt: finalStartAt,
      endAt: finalEndAt,
      hostTimezone: poll.hostTimezone,
      location: poll.location,
      meetingUrl: poll.meetingUrl,
      participants: participants.map((p) => ({
        name: p.displayName,
        isHost: p.isHost,
        timezone: p.timezone,
      })),
    });
  }, [poll, participants, finalStartAt, finalEndAt]);

  if (!closed && !summary) return null;

  async function copyText() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summaryToText(summary));
      toast.success("Meeting details copied");
    } catch {
      toast.error("Couldn't copy — try again.");
    }
  }

  async function downloadInvitation() {
    if (!summary) return;
    setDownloading(true);
    try {
      const blob = await renderInvitationPng(summary);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(summary.title)}-invitation.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Couldn't create the invitation image. Try again, or copy the details as text.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {closed && <ClosedPollNotice />}

      {summary && finalStartAt && finalEndAt && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <FinalTimeBanner
            tone="dark"
            startAt={finalStartAt}
            endAt={finalEndAt}
            displayTimezone={displayTimezone}
            meetingUrl={poll.meetingUrl}
          />

          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Time zones</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={copyText}>
                  <CopyIcon className="size-3.5" />
                  Copy details
                </Button>
                <Button type="button" size="sm" disabled={downloading} onClick={downloadInvitation}>
                  <DownloadIcon className="size-3.5" />
                  {downloading ? "Preparing…" : "Download Invitation"}
                </Button>
              </div>
            </div>

            <ul className="flex flex-col divide-y rounded-md border bg-background">
              {summary.zones.map((z) => (
                <li
                  key={z.zone}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {z.city}
                      <span className="text-xs font-normal text-muted-foreground">
                        {z.offsetLabel}
                      </span>
                      {z.isHostZone && <Badge variant="outline">Host</Badge>}
                    </span>
                    {z.names.length > 0 && (
                      <span className="text-xs text-muted-foreground">{z.names.join(", ")}</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:items-end">
                    <span className="font-medium tabular-nums">{z.timeRange}</span>
                    <span className="text-xs text-muted-foreground">{z.dateLabel}</span>
                  </div>
                </li>
              ))}
            </ul>

            {summary.unknown.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Time zone not recorded for {summary.unknown.join(", ")}.
                {isHost && " It's saved the next time they update their response."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
