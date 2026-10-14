import type { MeetingSummary } from "@/lib/time/meeting-summary";
import { SITE_HOST } from "@/lib/links";

/**
 * Draws the shareable "invitation" image — a clean card with a dark header
 * (title and meeting time) over a light body (details and everyone's local
 * times), Hourglass-branded — using plain Canvas 2D — no image library, so there
 * is nothing to add to the lockfile. The canvas/image factories are injected
 * so the same code runs in the browser and under a test canvas.
 */

type Ctx = CanvasRenderingContext2D;

export interface InvitationDeps {
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
  loadImage: (src: string) => Promise<CanvasImageSource & { width: number; height: number }>;
  /** CSS font-family lists, e.g. "'__Geist_1a2b', system-ui, sans-serif". */
  fonts: { heading: string; body: string };
  /** Logo with a light wordmark, drawn on the dark header. */
  logoSrc: string;
  markSrc: string;
  siteHost?: string;
}

// Logical (CSS-pixel) layout; everything is multiplied by SCALE for the PNG.
const SCALE = 2;
const W = 540;
const OUTER = 28;
const CARD_X = OUTER;
const CARD_W = W - OUTER * 2;
const PAD = 34;
const INNER_X = CARD_X + PAD;
const INNER_W = CARD_W - PAD * 2;
const RADIUS = 24;

const INK = "#090808";
const MUTED = "#6B6A68";
const FAINT = "#A19F9B";
const HAIR = "#E7E5E0";
const BACKDROP = "#EEEDE9";
const CARD = "#FFFFFF";
// Dark header palette.
const ON_DARK = "#FFFFFF";
const ON_DARK_MUTED = "#B4B2AE";
const ON_DARK_FAINT = "#85837F";
const DARK_HAIR = "rgba(255, 255, 255, 0.14)";

function setFont(ctx: Ctx, weight: number, size: number, family: string) {
  ctx.font = `${weight} ${size}px ${family}`;
}

/** Word-wraps to `maxLines`, ellipsizing the last line; breaks over-long words. */
function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const push = (s: string) => lines.push(s);

  for (const word of words) {
    let w = word;
    // A single word wider than the line: split it by characters.
    while (!fits(w) && w.length > 1) {
      let cut = w.length - 1;
      while (cut > 1 && !fits(w.slice(0, cut))) cut--;
      if (line) {
        push(line);
        line = "";
      }
      push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const next = line ? `${line} ${w}` : w;
    if (fits(next)) line = next;
    else {
      if (line) push(line);
      line = w;
    }
  }
  if (line) push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1]!;
    while (last.length > 1 && !fits(`${last}…`)) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines.length > 0 ? lines : [""];
}

function ellipsize(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Letter-spaced text (canvas `letterSpacing` isn't supported everywhere). */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: "left" | "right") {
  const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let cursor = align === "right" ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i]!;
  });
  ctx.textAlign = prevAlign;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface Assets {
  logo: CanvasImageSource & { width: number; height: number };
  mark: CanvasImageSource & { width: number; height: number };
}

interface Layout {
  /** Total logical height of the image. */
  height: number;
  /** Where the dark header ends (card-relative to the canvas top). */
  darkBottom: number;
}

/** Lays out (and, when `draw`, paints) the card. */
function paint(
  ctx: Ctx,
  summary: MeetingSummary,
  deps: InvitationDeps,
  assets: Assets,
  draw: boolean,
  layout: Layout,
): Layout {
  const { heading, body } = deps.fonts;
  const siteHost = deps.siteHost ?? SITE_HOST;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const cardTop = OUTER;
  const cardBottomFor = (h: number) => h - OUTER;

  if (draw) {
    ctx.fillStyle = BACKDROP;
    ctx.fillRect(0, 0, W, layout.height);

    // Card with a soft shadow.
    ctx.save();
    ctx.shadowColor = "rgba(20, 18, 14, 0.12)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = CARD;
    roundRect(ctx, CARD_X, cardTop, CARD_W, cardBottomFor(layout.height) - cardTop, RADIUS);
    ctx.fill();
    ctx.restore();

    // Dark header, clipped to the card's rounded top corners.
    ctx.save();
    roundRect(ctx, CARD_X, cardTop, CARD_W, cardBottomFor(layout.height) - cardTop, RADIUS);
    ctx.clip();
    ctx.fillStyle = INK;
    ctx.fillRect(CARD_X, cardTop, CARD_W, layout.darkBottom - cardTop);
    ctx.restore();
  }

  let y = cardTop + PAD;

  // --- Header: logo + label ---
  const logoH = 30;
  const logoW = (assets.logo.width / assets.logo.height) * logoH;
  if (draw) {
    ctx.drawImage(assets.logo, INNER_X, y, logoW, logoH);
    ctx.fillStyle = ON_DARK_FAINT;
    setFont(ctx, 600, 9, body);
    spaced(ctx, "MEETING INVITATION", INNER_X + INNER_W, y + logoH / 2 - 5, 2.2, "right");
  }
  y += logoH + 22;
  if (draw) {
    ctx.fillStyle = DARK_HAIR;
    ctx.fillRect(INNER_X, y, INNER_W, 1);
  }
  y += 26;

  // --- Meeting (title) ---
  if (draw) {
    ctx.fillStyle = ON_DARK_FAINT;
    setFont(ctx, 600, 10, body);
    spaced(ctx, "MEETING", INNER_X, y, 2.2, "left");
  }
  y += 22;
  setFont(ctx, 600, 30, heading);
  for (const line of wrapText(ctx, summary.title, INNER_W, 3)) {
    if (draw) {
      ctx.fillStyle = ON_DARK;
      setFont(ctx, 600, 30, heading);
      ctx.fillText(line, INNER_X, y);
    }
    y += 37;
  }
  y += 18;

  // --- When ---
  if (draw) {
    ctx.fillStyle = ON_DARK_FAINT;
    setFont(ctx, 600, 10, body);
    spaced(ctx, "DATE & TIME", INNER_X, y, 2.2, "left");
  }
  y += 22;
  if (draw) {
    ctx.fillStyle = ON_DARK_MUTED;
    setFont(ctx, 500, 14, body);
    ctx.fillText(summary.primary.dateLong, INNER_X, y);
  }
  y += 24;
  setFont(ctx, 600, 26, heading);
  for (const line of wrapText(ctx, summary.primary.timeRange, INNER_W, 2)) {
    if (draw) {
      ctx.fillStyle = ON_DARK;
      setFont(ctx, 600, 26, heading);
      ctx.fillText(line, INNER_X, y);
    }
    y += 32;
  }
  if (draw) {
    ctx.fillStyle = ON_DARK_FAINT;
    setFont(ctx, 500, 12, body);
    ctx.fillText(summary.primary.zoneLabel, INNER_X, y + 2);
  }
  y += 22;

  const darkBottom = y + PAD - 6;
  y = darkBottom + 30;

  // --- Details (location / link) ---
  const details: [string, string][] = [];
  if (summary.location) details.push(["LOCATION", summary.location]);
  if (summary.meetingUrl) details.push(["MEETING LINK", summary.meetingUrl]);
  if (details.length > 0) {
    for (const [label, value] of details) {
      if (draw) {
        ctx.fillStyle = FAINT;
        setFont(ctx, 600, 10, body);
        spaced(ctx, label, INNER_X, y, 2.2, "left");
      }
      y += 19;
      setFont(ctx, 500, 13, body);
      const isLink = label === "MEETING LINK";
      const lines = isLink ? [ellipsize(ctx, value, INNER_W)] : wrapText(ctx, value, INNER_W, 2);
      for (const line of lines) {
        if (draw) {
          ctx.fillStyle = INK;
          setFont(ctx, 500, 13, body);
          ctx.fillText(line, INNER_X, y);
        }
        y += 19;
      }
      y += 12;
    }
    if (draw) {
      ctx.fillStyle = HAIR;
      ctx.fillRect(INNER_X, y, INNER_W, 1);
    }
    y += 24;
  }

  // --- Local times ---
  if (draw) {
    ctx.fillStyle = FAINT;
    setFont(ctx, 600, 10, body);
    spaced(ctx, "LOCAL TIMES", INNER_X, y, 2.2, "left");
  }
  y += 26;

  summary.zones.forEach((zone, i) => {
    if (i > 0) {
      if (draw) {
        ctx.fillStyle = HAIR;
        ctx.fillRect(INNER_X, y, INNER_W, 1);
      }
      y += 14;
    }

    setFont(ctx, 600, 15, heading);
    const rangeWidth = ctx.measureText(zone.timeRange).width;
    if (draw) {
      ctx.fillStyle = INK;
      setFont(ctx, 600, 15, heading);
      ctx.textAlign = "right";
      ctx.fillText(zone.timeRange, INNER_X + INNER_W, y);
      ctx.textAlign = "left";
    }
    // City on the left, truncated so it can't run into the time on the right.
    const city = ellipsize(ctx, zone.city, INNER_W - rangeWidth - 14);
    if (draw) {
      ctx.fillStyle = INK;
      ctx.fillText(city, INNER_X, y);
    }
    y += 21;

    if (draw) {
      ctx.fillStyle = MUTED;
      setFont(ctx, 500, 12, body);
      ctx.fillText(`${zone.dateLabel} · ${zone.offsetLabel}`, INNER_X, y);
    }
    y += 18;

    if (zone.names.length > 0) {
      setFont(ctx, 400, 12, body);
      for (const line of wrapText(ctx, zone.names.join(", "), INNER_W, 3)) {
        if (draw) {
          ctx.fillStyle = FAINT;
          setFont(ctx, 400, 12, body);
          ctx.fillText(line, INNER_X, y);
        }
        y += 17;
      }
    }
    y += 12;
  });

  if (summary.unknown.length > 0) {
    setFont(ctx, 400, 11, body);
    const lines = wrapText(ctx, `Time zone not recorded: ${summary.unknown.join(", ")}`, INNER_W, 3);
    for (const line of lines) {
      if (draw) {
        ctx.fillStyle = FAINT;
        setFont(ctx, 400, 11, body);
        ctx.fillText(line, INNER_X, y);
      }
      y += 16;
    }
    y += 6;
  }

  // --- Footer: mark + URL ---
  y += 10;
  if (draw) {
    ctx.fillStyle = HAIR;
    ctx.fillRect(INNER_X, y, INNER_W, 1);
  }
  y += 24;

  const markSize = 26;
  setFont(ctx, 600, 15, heading);
  const hostWidth = ctx.measureText(siteHost).width;
  const rowWidth = markSize + 10 + hostWidth;
  const rowX = CARD_X + (CARD_W - rowWidth) / 2;
  if (draw) {
    ctx.drawImage(assets.mark, rowX, y, markSize, markSize);
    ctx.fillStyle = INK;
    setFont(ctx, 600, 15, heading);
    ctx.fillText(siteHost, rowX + markSize + 10, y + 5);
  }
  y += markSize + 12;

  if (draw) {
    ctx.fillStyle = FAINT;
    setFont(ctx, 400, 11, body);
    ctx.textAlign = "center";
    ctx.fillText("Find a meeting time without the back-and-forth", CARD_X + CARD_W / 2, y);
    ctx.textAlign = "left";
  }
  y += 14;

  return { height: Math.ceil(y + PAD + OUTER), darkBottom };
}

export async function renderInvitation(
  summary: MeetingSummary,
  deps: InvitationDeps,
): Promise<HTMLCanvasElement> {
  const [logo, mark] = await Promise.all([deps.loadImage(deps.logoSrc), deps.loadImage(deps.markSrc)]);
  const assets: Assets = { logo, mark };

  // Pass 1: measure on a scratch canvas to learn the height and header size.
  const scratch = deps.createCanvas(W, 10);
  const measured = paint(scratch.getContext("2d")!, summary, deps, assets, false, {
    height: 0,
    darkBottom: 0,
  });

  // Pass 2: paint for real.
  const canvas = deps.createCanvas(W * SCALE, measured.height * SCALE);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  paint(ctx, summary, deps, assets, true, measured);
  return canvas;
}

// ---------------------------------------------------------------------------
// Browser glue
// ---------------------------------------------------------------------------

function loadBrowserImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${src}`));
    img.src = src;
  });
}

/** Renders the invitation in the browser and returns it as a PNG blob. */
export async function renderInvitationPng(summary: MeetingSummary): Promise<Blob> {
  const root = getComputedStyle(document.documentElement);
  const fallback = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const family = (cssVar: string) => {
    const v = root.getPropertyValue(cssVar).trim();
    return v ? `${v}, ${fallback}` : fallback;
  };
  const fonts = { heading: family("--font-geist-sans"), body: family("--font-inter") };

  // Make sure the web fonts are actually loaded before measuring/drawing.
  await Promise.all(
    [
      `600 30px ${fonts.heading}`,
      `500 14px ${fonts.body}`,
      `600 10px ${fonts.body}`,
      `400 12px ${fonts.body}`,
    ].map((f) => document.fonts.load(f).catch(() => [])),
  );

  const canvas = await renderInvitation(summary, {
    createCanvas: (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    },
    loadImage: loadBrowserImage,
    fonts,
    logoSrc: "/brand/hourglass-logo-dark.svg",
    markSrc: "/brand/hourglass-mark.svg",
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create image"))), "image/png");
  });
}
