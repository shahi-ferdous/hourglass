import { SupportButton } from "@/components/SupportButton";
import { HourglassIcon } from "lucide-react";

export function SupportSection() {
  return (
    <section className="border-t">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <HourglassIcon className="size-5" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Support this project
        </h2>
        <p className="max-w-md text-muted-foreground">
          Hourglass is free, with no account required and no ads. If it saved you some
          back-and-forth, consider chipping in to keep it running and improving.
        </p>
        <SupportButton variant="default" size="lg" />
      </div>
    </section>
  );
}
