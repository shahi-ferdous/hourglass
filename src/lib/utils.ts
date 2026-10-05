export { cn } from "cn";

/**
 * Pasting a bare link like "meet.google.com/abc-defg" (no protocol) is the
 * overwhelmingly common case for a "meeting link" field — nobody means to
 * type something other than http(s) here, so assume https:// rather than
 * bouncing them to a generic validation error for it.
 */
export function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
