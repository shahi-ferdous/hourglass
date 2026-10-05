"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface HeroVideoProps {
  className?: string;
}

/**
 * Autoplays unless the viewer prefers reduced motion, in which case it just
 * sits on its first frame — imperative .play()/.pause() rather than the
 * `autoPlay` attribute, since toggling that attribute after mount doesn't
 * reliably start/stop playback in the browser.
 */
export function HeroVideo({ className }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!prefersReducedMotion) {
      videoRef.current?.play().catch(() => {
        // Autoplay can still be blocked by the browser — fine, the poster
        // frame is a reasonable static fallback.
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", className)}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Hourglass product preview"
    >
      <source src="/video/hourglass-hero.webm" type="video/webm" />
      <source src="/video/hourglass-hero.mp4" type="video/mp4" />
    </video>
  );
}
