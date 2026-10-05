import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "@/components/HeroVideo";
import { SupportButton } from "@/components/SupportButton";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BuiltForTeams } from "@/components/landing/BuiltForTeams";
import { Faq } from "@/components/landing/Faq";
import { SupportSection } from "@/components/landing/SupportSection";
import { HourglassIcon, ArrowRightIcon, GlobeIcon } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-heading font-semibold">
          <HourglassIcon className="size-5" />
          Hourglass
        </div>
        <div className="flex items-center gap-2">
          <SupportButton />
          <Button asChild size="sm">
            <Link href="/create">Schedule Meeting</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b">
          <div
            className="bg-grid-pattern absolute inset-0"
            style={{
              maskImage:
                "radial-gradient(ellipse 85% 65% at 50% 20%, black 35%, transparent 85%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 85% 65% at 50% 20%, black 35%, transparent 85%)",
            }}
          />

          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <GlobeIcon className="size-3.5" />
                Built for teams spread across time zones
              </span>

              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Find a meeting time, without the back-and-forth.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground text-balance">
                Share your availability, see it overlap with everyone else&apos;s across
                time zones, and lock in a time — no account required for you or anyone
                you invite.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/create">
                    Schedule Meeting
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No sign-up for you or your invitees · Free
              </p>
            </div>

            <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
              <div className="aspect-square overflow-hidden rounded-2xl border bg-card shadow-xl">
                <HeroVideo />
              </div>
            </div>
          </div>
        </section>

        <HowItWorks />
        <BuiltForTeams />
        <Faq />
        <SupportSection />
      </main>
    </div>
  );
}
