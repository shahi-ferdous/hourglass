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
}

export function SupportButton({
  variant = "outline",
  size = "sm",
  className,
  jump = false,
}: SupportButtonProps) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn(jump && "motion-safe:animate-hg-jump", className)}
    >
      <Link href={GUMROAD_URL} target="_blank" rel="noopener noreferrer">
        <HeartIcon className="size-4" />
        Support this project
      </Link>
    </Button>
  );
}
