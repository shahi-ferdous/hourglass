"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  /** Secondary text, matched by search and shown muted on the right. */
  hint?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Accessible name for the trigger. */
  ariaLabel: string;
  className?: string;
  /** Optional controlled open state, e.g. to open the city list right after a country is picked. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * A select with a type-to-filter box (↑/↓ to move, Enter to choose, Esc to
 * close). The stock Radix Select has no search, which is unusable for a
 * list as long as the world's countries.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  disabled,
  ariaLabel,
  className,
  open: openProp,
  onOpenChange,
}: SearchableSelectProps) {
  const listId = useId();
  const [innerOpen, setInnerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const open = openProp ?? innerOpen;
  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(`${o.label} ${o.hint ?? ""}`).includes(q));
  }, [options, query]);

  const active = Math.min(activeIdx, Math.max(filtered.length - 1, 0));

  function setOpen(next: boolean) {
    if (next) setActiveIdx(Math.max(options.findIndex((o) => o.value === value), 0));
    else setQuery("");
    setInnerOpen(next);
    onOpenChange?.(next);
  }

  function choose(option: SearchableOption) {
    onChange(option.value);
    setOpen(false);
  }

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(Math.min(active + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[active];
      if (option) choose(option);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 text-left text-sm transition-colors",
            "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 gap-0 p-0"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          )}
          {filtered.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => choose(option)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm",
                i === active && "bg-muted",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <CheckIcon
                  className={cn("size-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")}
                />
                <span className="truncate">{option.label}</span>
              </span>
              {option.hint && (
                <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
