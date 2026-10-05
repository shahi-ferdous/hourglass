"use client";

import { useEffect, useState } from "react";
import { detectLocalTimezone } from "./timezones";

/**
 * The viewer's IANA time zone, detected client-side only. Starts as "UTC"
 * and updates after mount — `Intl` reports the server process's zone during
 * SSR, which almost never matches the browser's, so seeding this directly
 * from `detectLocalTimezone()` in `useState`'s initializer causes a
 * hydration mismatch (or a controlled <Select> that renders as empty).
 */
export function useDetectedTimezone(): string {
  const [tz, setTz] = useState("UTC");
  useEffect(() => {
    // Syncing from a browser API (Intl) — the textbook useEffect case the
    // lint rule below can't distinguish from a data-fetch anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTz(detectLocalTimezone());
  }, []);
  return tz;
}
