"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api-client";
import { LockIcon } from "lucide-react";

interface ViewPasswordGateProps {
  pollId: string;
  title: string;
  onUnlocked: () => void;
}

export function ViewPasswordGate({ pollId, title, onUnlocked }: ViewPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/polls/${pollId}/verify-view-password`, { password });
      onUnlocked();
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <LockIcon className="size-5" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">This poll is password-protected.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="gate-password">Password</Label>
              <Input
                id="gate-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || !password}>
              {submitting ? "Checking…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
