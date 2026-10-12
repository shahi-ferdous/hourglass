import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { TimeZoneConverter } from "@/components/converter/TimeZoneConverter";

export const metadata: Metadata = {
  title: "Time Zone Converter — Hourglass",
  description:
    "Pick a time in one city and instantly see what time it is in others. Compare as many countries and cities as you like — free, no sign-up.",
};

export default function TimeZoneConverterPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pt-6 pb-20 sm:pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Time Zone Converter</h1>
          <p className="text-muted-foreground">
            Pick a time in one place and see what it is everywhere else.
          </p>
        </div>
        <TimeZoneConverter />
      </main>
    </div>
  );
}
