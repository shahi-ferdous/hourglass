"use client";

import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AvailabilityGrid, type HeatOverlay } from "@/components/AvailabilityGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, getErrorMessage } from "@/lib/api-client";
import type { GridSlot } from "@/lib/time/grid";

interface ResponseEditorProps {
  pollId: string;
  /** null until this viewer has saved a response. */
  participantId: string | null;
  savedName: string;
  /** ISO UTC instants from the viewer's saved response. */
  savedSlots: string[];
  slots: GridSlot[];
  displayTimezone: string;
  /** The poll is closed — nothing can be changed. */
  closed?: boolean;
  /** Other people's availability, for the optional overlay. */
  others: HeatOverlay;
  heading?: string;
  /** Whether the viewer is the poll host (tags their chip in the inspector). */
  isHost?: boolean;
  onSaved: (result: { responseUrl?: string }) => void;
}

/**
 * Mark-your-availability flow shared by the public poll page and the host
 * dashboard. A brand-new respondent lands straight on an empty grid; once a
 * response is saved the grid locks until "Change response" is pressed.
 */
export function ResponseEditor({
  pollId,
  participantId,
  savedName,
  savedSlots,
  slots,
  displayTimezone,
  closed = false,
  others,
  heading = "Mark your available times",
  isHost = false,
  onSaved,
}: ResponseEditorProps) {
  const nameId = useId();
  const [changing, setChanging] = useState(false);
  const [draftSlots, setDraftSlots] = useState<Set<string>>(new Set());
  const [draftName, setDraftName] = useState("");
  const [showOthers, setShowOthers] = useState(false);
  const [saving, setSaving] = useState(false);

  const savedSet = useMemo(() => new Set(savedSlots), [savedSlots]);
  const isNew = participantId === null;
  const editing = !closed && (isNew || changing);
  const canOverlay = others.total > 0;

  function startChanging() {
    setDraftSlots(new Set(savedSlots));
    setDraftName(savedName);
    setChanging(true);
  }

  async function handleSave() {
    const name = draftName.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (participantId) {
        await api.patch(`/api/polls/${pollId}/participants/${participantId}`, {
          displayName: name,
          slots: [...draftSlots],
        });
        toast.success("Your response has been updated");
        onSaved({});
      } else {
        const res = await api.post<{ participantId: string; responseUrl: string }>(
          `/api/polls/${pollId}/participants`,
          { displayName: name, slots: [...draftSlots] },
        );
        toast.success("Your response has been saved");
        onSaved({ responseUrl: res.responseUrl });
      }
      setChanging(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save your response."));
    } finally {
      setSaving(false);
    }
  }

  const toggle = canOverlay ? (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <span>Show others&apos; availability</span>
      <Switch size="sm" checked={showOthers} onCheckedChange={setShowOthers} />
    </label>
  ) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{heading}</p>
        <p className="text-xs text-muted-foreground">
          {editing
            ? "Click or tap the times you're free. On a computer you can also click and drag to mark several at once."
            : closed
              ? "This poll is closed, so responses can't be changed."
              : "Your response is saved. Press Change response to edit it."}
        </p>
      </div>

      <AvailabilityGrid
        mode="edit"
        ariaLabel="Your availability"
        slots={slots}
        displayTimezone={displayTimezone}
        selected={editing ? draftSlots : savedSet}
        onChange={setDraftSlots}
        disabled={!editing}
        heat={showOthers && canOverlay ? others : undefined}
        headerAction={toggle}
        self={participantId ? { id: participantId, name: savedName, isHost } : undefined}
      />

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor={nameId}>Your name</Label>
            <Input
              id={nameId}
              placeholder="Your name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || !draftName.trim()}>
              {saving ? "Saving…" : isNew ? "Save my response" : "Update my response"}
            </Button>
            {!isNew && (
              <Button variant="outline" disabled={saving} onClick={() => setChanging(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        !closed && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Responding as <span className="font-medium text-foreground">{savedName}</span>
            </p>
            <Button variant="outline" onClick={startChanging}>
              Change response
            </Button>
          </div>
        )
      )}
    </div>
  );
}
