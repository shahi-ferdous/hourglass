"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { api, getErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
import type { GridSlot } from "@/lib/time/grid";
import { ChevronDownIcon, ChevronRightIcon, XIcon } from "lucide-react";

export interface RosterParticipant {
  id: string;
  displayName: string;
  isHost: boolean;
  /** ISO UTC instants this person marked as free. */
  slots: string[];
  lastSeenAt?: string;
}

interface RosterListProps {
  pollId: string;
  participants: RosterParticipant[];
  slots: GridSlot[];
  displayTimezone: string;
  /** Host dashboard only: shows "Remove" buttons. */
  canRemove?: boolean;
  onChanged?: () => void;
}

/**
 * Everyone who has responded. Click a name to expand a read-only grid of
 * just that person's availability below their row; close it with the X or
 * by clicking the name again. Used on both the public poll page and the
 * host dashboard.
 */
export function RosterList({
  pollId,
  participants,
  slots,
  displayTimezone,
  canRemove = false,
  onChanged,
}: RosterListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Responses</p>
      <ul className="flex flex-col divide-y rounded-md border">
        {participants.map((p) => (
          <RosterRow
            key={p.id}
            pollId={pollId}
            participant={p}
            slots={slots}
            displayTimezone={displayTimezone}
            canRemove={canRemove}
            isOpen={openId === p.id}
            onToggle={() => setOpenId((cur) => (cur === p.id ? null : p.id))}
            onClose={() => setOpenId(null)}
            onChanged={() => {
              setOpenId(null);
              onChanged?.();
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function RosterRow({
  pollId,
  participant,
  slots,
  displayTimezone,
  canRemove,
  isOpen,
  onToggle,
  onClose,
  onChanged,
}: {
  pollId: string;
  participant: RosterParticipant;
  slots: GridSlot[];
  displayTimezone: string;
  canRemove: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const personSlots = useMemo(() => new Set(participant.slots), [participant.slots]);
  const panelId = `roster-panel-${participant.id}`;

  async function handleRemove() {
    setRemoving(true);
    try {
      await api.delete(`/api/polls/${pollId}/participants/${participant.id}`);
      toast.success(`Removed ${participant.displayName}'s response`);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't remove that response."));
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="-mx-1 flex min-w-0 max-w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isOpen ? (
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium">{participant.displayName}</span>
          {participant.isHost && <Badge variant="outline">Host</Badge>}
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-muted-foreground">
          <span>
            {participant.slots.length} slot{participant.slots.length === 1 ? "" : "s"}
          </span>
          {participant.lastSeenAt && (
            <span className="hidden sm:inline">
              Last active {DateTime.fromISO(participant.lastSeenAt).toRelative()}
            </span>
          )}
          {canRemove &&
            !participant.isHost &&
            (confirming ? (
              <Button size="sm" variant="destructive" disabled={removing} onClick={handleRemove}>
                Confirm remove
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                Remove
              </Button>
            ))}
        </div>
      </div>

      {isOpen && (
        <div id={panelId} className="mx-3 mb-3 flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{participant.displayName}&apos;s availability</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={`Close ${participant.displayName}'s availability`}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          {participant.slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {participant.displayName} hasn&apos;t marked any times as free.
            </p>
          ) : (
            <AvailabilityGrid
              mode="view"
              ariaLabel={`${participant.displayName}'s availability`}
              slots={slots}
              displayTimezone={displayTimezone}
              selected={personSlots}
              personName={participant.displayName}
            />
          )}
        </div>
      )}
    </li>
  );
}
