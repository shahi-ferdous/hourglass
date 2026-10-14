import { DateTime } from "luxon";
import { ShieldCheckIcon } from "lucide-react";

/** "Meeting time selected" card — shared by the public poll page and the host dashboard. */
export function FinalTimeBanner({
  startAt,
  endAt,
  displayTimezone,
  meetingUrl,
  tone = "default",
}: {
  startAt: string;
  endAt: string;
  displayTimezone: string;
  meetingUrl?: string | null;
  /** "dark" is a borderless dark block meant to sit at the top of a larger card. */
  tone?: "default" | "dark";
}) {
  const dark = tone === "dark";
  const start = DateTime.fromISO(startAt, { zone: "utc" }).setZone(displayTimezone);
  const end = DateTime.fromISO(endAt, { zone: "utc" }).setZone(displayTimezone);
  return (
    <div
      className={
        dark
          ? "flex flex-col gap-1 bg-neutral-900 px-5 py-4 text-white dark:bg-neutral-800"
          : "flex flex-col gap-1 rounded-md border border-primary/30 bg-primary/5 px-4 py-3"
      }
    >
      <div
        className={
          dark
            ? "flex items-center gap-2 text-sm font-medium text-neutral-300"
            : "flex items-center gap-2 text-sm font-medium text-primary"
        }
      >
        <ShieldCheckIcon className="size-4" />
        Meeting time selected
      </div>
      <p className={dark ? "text-lg font-semibold" : "font-medium"}>
        {start.toFormat("cccc, LLLL d")} · {start.toFormat("h:mm a")}–{end.toFormat("h:mm a")}
      </p>
      {meetingUrl && (
        <a
          href={meetingUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={dark ? "mt-1 w-fit text-sm text-neutral-200 underline underline-offset-2" : "w-fit text-sm underline underline-offset-2"}
        >
          Join meeting
        </a>
      )}
    </div>
  );
}

export function ClosedPollNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {children ?? "This poll is closed. Responses can no longer be added or changed."}
    </div>
  );
}
