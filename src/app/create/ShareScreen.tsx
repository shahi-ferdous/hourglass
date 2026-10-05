"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupportButton } from "@/components/SupportButton";
import { CheckCircle2Icon, CopyIcon, ShieldAlertIcon } from "lucide-react";

interface ShareScreenProps {
  pollId: string;
  shareUrl: string;
  manageUrl: string;
}

export function ShareScreen({ shareUrl, manageUrl }: ShareScreenProps) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.3 },
      disableForReducedMotion: true,
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2Icon className="size-10 text-primary" />
        <h1 className="text-2xl font-semibold">Your poll is ready</h1>
        <p className="text-muted-foreground">Share the link below with everyone you want to invite.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium">Share link</p>
          <CopyRow value={shareUrl} />
        </CardContent>
      </Card>

      <Alert>
        <ShieldAlertIcon className="size-4" />
        <AlertTitle>Save your manage link now</AlertTitle>
        <AlertDescription className="flex min-w-0 flex-col gap-3">
          <span>
            This link is how you&apos;ll edit, review responses, and manage this poll later.
            It only works in this browser unless you save it — there&apos;s no account or
            email recovery.
          </span>
          <CopyRow value={manageUrl} />
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href={manageUrl}>Go to your poll</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/create">Schedule another meeting</Link>
        </Button>
        <SupportButton variant="default" jump />
      </div>
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — please copy it manually.");
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 p-2">
      <code className="min-w-0 flex-1 truncate text-sm">{value}</code>
      <Button type="button" size="sm" variant="secondary" onClick={copy}>
        <CopyIcon className="size-3.5" />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
