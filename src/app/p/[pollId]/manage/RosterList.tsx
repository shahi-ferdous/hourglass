"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, getErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
import type { ManageParticipant } from "@/lib/types";

interface RosterListProps {
  pollId: string;
  participants: ManageParticipant[];
  onChanged: () => void;
}

export function RosterList({ pollId, participants, onChanged }: RosterListProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Responses</p>
      <ul className="flex flex-col divide-y rounded-md border">
        {participants.map((p) => (
          <RosterRow key={p.id} pollId={pollId} participant={p} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function RosterRow({
  pollId,
  participant,
  onChanged,
}: {
  pollId: string;
  participant: ManageParticipant;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

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
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span>{participant.displayName}</span>
        {participant.isHost && <Badge variant="outline">Host</Badge>}
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          {participant.slots.length} slot{participant.slots.length === 1 ? "" : "s"}
        </span>
        <span className="hidden sm:inline">
          Last active {DateTime.fromISO(participant.lastSeenAt).toRelative()}
        </span>
        {!participant.isHost &&
          (confirming ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={removing}
              onClick={handleRemove}
            >
              Confirm remove
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          ))}
      </div>
    </li>
  );
}
