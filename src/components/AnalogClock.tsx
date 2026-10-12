import { cn } from "@/lib/utils";

interface AnalogClockProps {
  hour: number;
  minute: number;
  /** When given, draws a second hand (used by live clocks). */
  second?: number;
  /** Night faces are tinted, so day/night reads at a glance. */
  isDaytime?: boolean;
  /** Pixel size of the (square) clock. */
  size?: number;
  className?: string;
}

/**
 * A minimal analog face. Decorative: every place it's used already shows the
 * same time as text, so it's hidden from assistive tech.
 */
export function AnalogClock({
  hour,
  minute,
  second,
  isDaytime = true,
  size = 56,
  className,
}: AnalogClockProps) {
  const minuteAngle = minute * 6 + (second ?? 0) * 0.1;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const hand = "transition-transform duration-500 ease-out motion-reduce:transition-none";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        className={cn(
          "stroke-border",
          isDaytime ? "fill-card" : "fill-muted",
        )}
        strokeWidth="3"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1="50"
            y1={major ? 9 : 11}
            x2="50"
            y2={major ? 18 : 15}
            transform={`rotate(${i * 30} 50 50)`}
            className="stroke-muted-foreground"
            strokeWidth={major ? 3 : 1.5}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="29"
        className={cn("stroke-foreground", hand)}
        style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: "50px 50px" }}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="17"
        className={cn("stroke-foreground", hand)}
        style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: "50px 50px" }}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {second !== undefined && (
        <line
          x1="50"
          y1="56"
          x2="50"
          y2="14"
          className="stroke-blue-500"
          style={{ transform: `rotate(${second * 6}deg)`, transformOrigin: "50px 50px" }}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      <circle cx="50" cy="50" r="3.5" className="fill-foreground" />
    </svg>
  );
}
