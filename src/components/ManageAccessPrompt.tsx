"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getErrorMessage } from "@/lib/api-client";
import { KeyRoundIcon } from "lucide-react";

interface ManageAccessPromptProps {
  pollId: string;
}

/**
 * Lets someone on the plain participant link get into the host dashboard by
 * proving they know the host password — the recovery path for a host who
 * lost their manage link/cookie (see requireHost in authorize.ts). Only
 * rendered when the poll actually has a host password set.
 */
export function ManageAccessPrompt({ pollId }: ManageAccessPromptProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <KeyRoundIcon className="size-3.5" />
        Manage this poll
      </Button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/polls/${pollId}/verify-host-password`, { password });
      router.push(`/p/${pollId}/manage`);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center"
    >
      <Input
        type="password"
        placeholder="Host password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        className="sm:max-w-48"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={submitting || !password}>
          {submitting ? "Checking…" : "Manage poll"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-destructive sm:ml-2">{error}</p>}
    </form>
  );
}
