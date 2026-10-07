import Link from "next/link";
import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeartIcon } from "lucide-react";
import { GUMROAD_URL } from "@/lib/links";
import type { VariantProps } from "class-variance-authority";

interface SupportButtonProps {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  /** Subtle periodic bounce to draw the eye — only for reactive, in-the-moment
   * placements (e.g. right after creating a poll), not persistent chrome
   * like the nav bar, where constant motion would just be noise. */
  jump?: boolean;
  /** "blue" recolors the button while keeping its filled/outline style.
   * Used everywhere except the homepage, which keeps the neutral look. */
  tone?: "neutral" | "blue";
}

// `!` (important) so the color wins over the variant's own bg/border/text
// classes regardless of how they're merged.
const BLUE_TONE: Record<"filled" | "outline", string> = {
  filled: "!bg-blue-600 !text-white hover:!bg-blue-700 dark:!bg-blue-500 dark:hover:!bg-blue-600",
  outline:
    "!border-blue-600 !text-blue-600 hover:!bg-blue-50 hover:!text-blue-700 dark:!border-blue-400 dark:!text-blue-400 dark:hover:!bg-blue-950",
};

export function SupportButton({
  variant = "outline",
  size = "sm",
  className,
  jump = false,
  tone = "neutral",
}: SupportButtonProps) {
  const isOutline = variant === "outline" || variant === "ghost" || variant === "link";
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn(
        tone === "blue" && BLUE_TONE[isOutline ? "outline" : "filled"],
        jump && "motion-safe:animate-hg-jump",
        className,
      )}
    >
      <Link href={GUMROAD_URL} target="_blank" rel="noopener noreferrer">
        <HeartIcon className="size-4" />
        Support this project
      </Link>
    </Button>
  );
}
