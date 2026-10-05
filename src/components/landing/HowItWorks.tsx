"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarPlusIcon,
  LinkIcon,
  UsersRoundIcon,
  CheckCircle2Icon,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: CalendarPlusIcon,
    title: "Pick your dates",
    body: "Choose candidate dates and times, and mark when you're free. It takes under a minute.",
  },
  {
    icon: LinkIcon,
    title: "Share one link",
    body: "Send the link anywhere — Slack, email, WhatsApp. No account needed to respond.",
  },
  {
    icon: UsersRoundIcon,
    title: "Watch it fill in",
    body: "Everyone marks their own availability, converted to their own time zone automatically.",
  },
  {
    icon: CheckCircle2Icon,
    title: "Lock in the time",
    body: "See exactly when everyone overlaps, pick a time, and share the final meeting details.",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active]!;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24">
      <div className="mb-12 flex flex-col gap-2 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <p className="text-muted-foreground">Four steps, no learning curve.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center">
        <ol className="flex flex-col gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  active === i
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    active === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "font-heading text-sm font-medium whitespace-nowrap",
                    active === i ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div
          key={active}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 rounded-2xl border bg-card p-8 duration-300 sm:p-10"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <step.icon className="size-6" />
          </div>
          <h3 className="mt-5 font-heading text-xl font-semibold">{step.title}</h3>
          <p className="mt-2 max-w-md text-muted-foreground">{step.body}</p>
        </div>
      </div>
    </section>
  );
}
