"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, getErrorMessage } from "@/lib/api-client";

interface DeletePollDialogProps {
  pollId: string;
  hasHostPassword: boolean;
  onDeleted: () => void;
}

export function DeletePollDialog({ pollId, hasHostPassword, onDeleted }: DeletePollDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      if (hasHostPassword) {
        await api.post(`/api/polls/${pollId}/verify-host-password`, { password });
      }
      await api.delete(`/api/polls/${pollId}`);
      toast.success("Poll deleted");
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete the poll."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          Delete poll
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this poll?</DialogTitle>
          <DialogDescription>
            This removes the poll and every response. This can&apos;t be undone from here.
          </DialogDescription>
        </DialogHeader>
        {hasHostPassword && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-host-password">Host password</Label>
            <Input
              id="delete-host-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy || (hasHostPassword && !password)}
          >
            {busy ? "Deleting…" : "Delete poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
