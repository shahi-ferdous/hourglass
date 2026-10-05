"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { minutesToTimeInputValue, timeInputValueToMinutes } from "@/lib/time/format";
import { api, getErrorMessage } from "@/lib/api-client";
import { normalizeUrlInput } from "@/lib/utils";
import type { ManageResponse } from "@/lib/types";

interface PollSettingsFormProps {
  pollId: string;
  poll: ManageResponse["poll"];
  onSaved: () => void;
}

export function PollSettingsForm({ pollId, poll, onSaved }: PollSettingsFormProps) {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description ?? "");
  const [location, setLocation] = useState(poll.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(poll.meetingUrl ?? "");
  const [windowDates, setWindowDates] = useState(poll.windowDates);
  const [windowStartMinute, setWindowStartMinute] = useState(poll.windowStartMinute);
  const [windowEndMinute, setWindowEndMinute] = useState(poll.windowEndMinute);

  const [viewPasswordInput, setViewPasswordInput] = useState("");
  const [clearViewPassword, setClearViewPassword] = useState(false);
  const [hostPasswordInput, setHostPasswordInput] = useState("");
  const [clearHostPassword, setClearHostPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/api/polls/${pollId}`, {
        title,
        description: description || null,
        location: location || null,
        meetingUrl: meetingUrl ? normalizeUrlInput(meetingUrl) : null,
        windowDates,
        windowStartMinute,
        windowEndMinute,
        viewPassword: clearViewPassword ? null : viewPasswordInput || undefined,
        hostPassword: clearHostPassword ? null : hostPasswordInput || undefined,
      });
      toast.success("Settings saved");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-title">Title</Label>
          <Input id="settings-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-description">Description</Label>
          <Textarea
            id="settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-location">Location</Label>
            <Input
              id="settings-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-meetingUrl">Meeting link</Label>
            <Input
              id="settings-meetingUrl"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Dates</Label>
          <DatePicker value={windowDates} onChange={setWindowDates} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-start">Earliest time</Label>
            <Input
              id="settings-start"
              type="time"
              value={minutesToTimeInputValue(windowStartMinute)}
              onChange={(e) => setWindowStartMinute(timeInputValueToMinutes(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-end">Latest time</Label>
            <Input
              id="settings-end"
              type="time"
              value={minutesToTimeInputValue(windowEndMinute)}
              onChange={(e) => setWindowEndMinute(timeInputValueToMinutes(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Changing dates or times removes any existing responses that fall outside the new
          range.
        </p>

        <PasswordField
          label="View password"
          hint={poll.hasViewPassword ? "Currently set." : "Not currently set."}
          value={viewPasswordInput}
          onChange={setViewPasswordInput}
          clear={clearViewPassword}
          onClear={setClearViewPassword}
          canClear={poll.hasViewPassword}
        />
        <PasswordField
          label="Host password"
          hint={poll.hasHostPassword ? "Currently set." : "Not currently set."}
          value={hostPasswordInput}
          onChange={setHostPasswordInput}
          clear={clearHostPassword}
          onClear={setClearHostPassword}
          canClear={poll.hasHostPassword}
        />

        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  label,
  hint,
  value,
  onChange,
  clear,
  onClear,
  canClear,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  clear: boolean;
  onClear: (v: boolean) => void;
  canClear: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">
        <Input
          type="password"
          placeholder="Leave blank to keep unchanged"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={clear}
          maxLength={200}
        />
        {canClear && (
          <Button
            type="button"
            variant={clear ? "secondary" : "outline"}
            size="sm"
            onClick={() => onClear(!clear)}
          >
            {clear ? "Will remove" : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}
