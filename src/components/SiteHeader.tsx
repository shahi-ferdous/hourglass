"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SupportButton } from "@/components/SupportButton";
import { cn } from "@/lib/utils";
import { GlobeIcon, MenuIcon, XIcon } from "lucide-react";

/**
 * Top bar for the marketing pages. On desktop the actions sit in a row; on
 * mobile they collapse into a menu — except "Support this project", which
 * stays visible beside the menu button at every width.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const menuId = useId();
  const containerRef = useRef<HTMLElement>(null);
  // The menu is "open for" the path it was opened on, so navigating
  // anywhere closes it without needing an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenFor(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const onConverter = pathname === "/timezone-converter";

  return (
    <header
      ref={containerRef}
      className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-6"
    >
      <Link href="/" aria-label="Hourglass — home" className="flex shrink-0 items-center">
        {/* Phones: just the icon, so the row has room for Support + menu.
            From `sm` up: the full logo, with a text-recolored variant for dark mode. */}
        <Image
          src="/brand/hourglass-mark.svg"
          alt=""
          width={36}
          height={36}
          unoptimized
          priority
          className="size-9 sm:hidden"
        />
        <Image
          src="/brand/hourglass-logo.svg"
          alt="Hourglass"
          width={600}
          height={125}
          unoptimized
          priority
          className="hidden h-9 w-auto sm:block dark:sm:hidden"
        />
        <Image
          src="/brand/hourglass-logo-dark.svg"
          alt="Hourglass"
          width={600}
          height={125}
          unoptimized
          priority
          className="hidden h-9 w-auto dark:sm:block"
        />
      </Link>

      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={cn("hidden md:inline-flex", onConverter && "bg-muted")}
        >
          <Link href="/timezone-converter" aria-current={onConverter ? "page" : undefined}>
            <GlobeIcon className="size-3.5" />
            Time Zone Converter
          </Link>
        </Button>

        <SupportButton compactOnNarrow />

        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/create">Schedule Meeting</Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
        </Button>
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label="Main"
          className="absolute inset-x-6 top-full flex flex-col gap-1 rounded-xl border bg-popover p-2 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 md:hidden"
        >
          <Button
            asChild
            variant={onConverter ? "secondary" : "ghost"}
            className="h-10 justify-start"
          >
            <Link href="/timezone-converter" onClick={() => setOpenFor(null)}>
              <GlobeIcon className="size-4" />
              Time Zone Converter
            </Link>
          </Button>
          <Button asChild className="h-10 justify-start">
            <Link href="/create" onClick={() => setOpenFor(null)}>
              Schedule Meeting
            </Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
