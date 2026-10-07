import { cn } from "@/lib/utils";
import type { SlotPerson } from "@/lib/slot-people";

interface SlotPeopleProps {
  people: SlotPerson[];
  /** Marks this person's chip as "You". */
  viewerId?: string | null;
  className?: string;
}

/** The names of the people free at a slot, as wrapping chips. */
export function SlotPeople({ people, viewerId, className }: SlotPeopleProps) {
  if (people.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No one is available.</p>;
  }

  // The viewer first, so "You" is easy to spot.
  const ordered = [...people].sort(
    (a, b) => Number(b.id === viewerId) - Number(a.id === viewerId),
  );

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {ordered.map((p) => (
        <li
          key={p.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
        >
          <span className="truncate">{p.id === viewerId ? "You" : p.name}</span>
          {p.isHost && <span className="text-muted-foreground">· Host</span>}
        </li>
      ))}
    </ul>
  );
}
