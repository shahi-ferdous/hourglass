"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { GridSlot } from "@/lib/time/grid";
import {
  buildDisplayMatrix,
  formatTimeOfDay,
  type DisplayMatrix,
} from "@/lib/time/display-grid";

/** Other people's availability, drawn as a color-coded heatmap behind the editable marks. */
export interface HeatOverlay {
  /** Per-slot count of OTHER people who are free (the viewer is excluded). */
  counts: Map<string, number>;
  /** How many other people there are in total. */
  total: number;
  hostSlots?: Set<string>;
  hostName?: string | null;
}

interface BaseProps {
  slots: GridSlot[];
  displayTimezone: string;
  className?: string;
  /** Accessible name for the whole grid, e.g. "Your availability". */
  ariaLabel: string;
}

interface EditProps extends BaseProps {
  mode: "edit";
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  /** When set, cells are tinted by how many other people are free. */
  heat?: HeatOverlay;
  /** Rendered at the right end of the legend row, e.g. the "show others" toggle. */
  headerAction?: React.ReactNode;
}

interface HeatmapProps extends BaseProps {
  mode: "heatmap";
  counts: Map<string, number>;
  totalParticipants: number;
  hostSlots?: Set<string>;
  hostName?: string | null;
}

/** Read-only view of a single person's availability. */
interface ViewProps extends BaseProps {
  mode: "view";
  selected: Set<string>;
  personName: string;
}

type AvailabilityGridProps = EditProps | HeatmapProps | ViewProps;

function cellKey(dateKey: string, timeKey: string) {
  return `${dateKey}|${timeKey}`;
}

export function AvailabilityGrid(props: AvailabilityGridProps) {
  const matrix = useMemo(
    () => buildDisplayMatrix(props.slots, props.displayTimezone),
    [props.slots, props.displayTimezone],
  );

  if (matrix.columns.length === 0 || matrix.rowTimes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No dates selected yet.
      </div>
    );
  }

  if (props.mode === "edit") return <EditableGrid {...props} matrix={matrix} />;
  if (props.mode === "view") return <PersonGridView {...props} matrix={matrix} />;
  return <HeatmapGridView {...props} matrix={matrix} />;
}

function GridShell({
  matrix,
  ariaLabel,
  className,
  renderCell,
  legend,
}: {
  matrix: DisplayMatrix;
  ariaLabel: string;
  className?: string;
  renderCell: (dateKey: string, timeKey: string) => React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {legend}
      <div
        role="grid"
        aria-label={ariaLabel}
        className="overflow-x-auto rounded-lg border bg-card"
      >
        <div
          className="grid w-max min-w-full"
          style={{
            gridTemplateColumns: `72px repeat(${matrix.columns.length}, minmax(64px, 1fr))`,
          }}
        >
          {/* corner */}
          <div className="sticky top-0 left-0 z-20 bg-card border-b border-r" />
          {matrix.columns.map((col) => (
            <div
              key={col.dateKey}
              role="columnheader"
              className="sticky top-0 z-10 bg-card border-b px-1 py-2 text-center text-xs font-medium"
            >
              <div className="text-muted-foreground">{col.weekdayLabel}</div>
              <div>{col.dayLabel}</div>
            </div>
          ))}

          {matrix.rowTimes.map((timeKey) => (
            <RowFragment
              key={timeKey}
              timeKey={timeKey}
              columns={matrix.columns}
              renderCell={renderCell}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RowFragment({
  timeKey,
  columns,
  renderCell,
}: {
  timeKey: string;
  columns: DisplayMatrix["columns"];
  renderCell: (dateKey: string, timeKey: string) => React.ReactNode;
}) {
  return (
    <>
      <div
        role="rowheader"
        className="sticky left-0 z-10 bg-card border-r px-2 py-1 text-right text-[11px] text-muted-foreground whitespace-nowrap"
      >
        {formatTimeOfDay(timeKey)}
      </div>
      {columns.map((col) => (
        <div key={col.dateKey + timeKey} className="p-0.5">
          {renderCell(col.dateKey, timeKey)}
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Editable grid: click-toggle + mouse drag-paint + keyboard nav
// ---------------------------------------------------------------------------

function EditableGrid({
  matrix,
  selected,
  onChange,
  disabled,
  heat,
  headerAction,
  ariaLabel,
  className,
}: EditProps & { matrix: DisplayMatrix }) {
  const dragModeRef = useRef<"select" | "deselect" | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const applyToggle = useCallback(
    (iso: string, select: boolean) => {
      const next = new Set(selected);
      if (select) next.add(iso);
      else next.delete(iso);
      onChange(next);
    },
    [selected, onChange],
  );

  const handlePointerDown = useCallback(
    (iso: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || e.pointerType !== "mouse") return;
      const willSelect = !selected.has(iso);
      dragModeRef.current = willSelect ? "select" : "deselect";
      applyToggle(iso, willSelect);
    },
    [applyToggle, disabled, selected],
  );

  const handlePointerEnter = useCallback(
    (iso: string) => () => {
      if (disabled || dragModeRef.current === null) return;
      applyToggle(iso, dragModeRef.current === "select");
    },
    [applyToggle, disabled],
  );

  const endDrag = useCallback(() => {
    dragModeRef.current = null;
  }, []);

  const handleClick = useCallback(
    (iso: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      // Mouse clicks are already handled by the pointerdown/drag flow;
      // this branch only fires for touch/keyboard-triggered clicks.
      if (e.detail === 0 || (e.nativeEvent as PointerEvent).pointerType !== "mouse") {
        applyToggle(iso, !selected.has(iso));
      }
    },
    [applyToggle, disabled, selected],
  );

  const moveFocus = useCallback(
    (fromDateIdx: number, fromTimeIdx: number, dCol: number, dRow: number) => {
      let dateIdx = fromDateIdx;
      let timeIdx = fromTimeIdx;
      for (let attempts = 0; attempts < Math.max(matrix.columns.length, matrix.rowTimes.length); attempts++) {
        dateIdx += dCol;
        timeIdx += dRow;
        if (
          dateIdx < 0 ||
          dateIdx >= matrix.columns.length ||
          timeIdx < 0 ||
          timeIdx >= matrix.rowTimes.length
        ) {
          return;
        }
        const key = cellKey(matrix.columns[dateIdx]!.dateKey, matrix.rowTimes[timeIdx]!);
        const el = cellRefs.current.get(key);
        if (el && matrix.cellsByKey.has(key)) {
          el.focus();
          setFocusKey(key);
          return;
        }
      }
    },
    [matrix],
  );

  const handleKeyDown = useCallback(
    (dateIdx: number, timeIdx: number, iso: string) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          moveFocus(dateIdx, timeIdx, 1, 0);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveFocus(dateIdx, timeIdx, -1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveFocus(dateIdx, timeIdx, 0, 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveFocus(dateIdx, timeIdx, 0, -1);
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          if (!disabled) applyToggle(iso, !selected.has(iso));
          break;
      }
    },
    [applyToggle, disabled, moveFocus, selected],
  );

  // The "Your availability" key and the action (toggle) share one fixed
  // row, so the toggle never moves; the heat legend sits on its own line
  // beneath it when shown.
  const legend = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-sm bg-primary" />
          Your availability
        </span>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {heat && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <HeatLegend hostName={heat.hostName} />
        </div>
      )}
    </div>
  );

  return (
    <GridShell
      matrix={matrix}
      ariaLabel={ariaLabel}
      className={className}
      legend={legend}
      renderCell={(dateKey, timeKey) => {
        const key = cellKey(dateKey, timeKey);
        const cell = matrix.cellsByKey.get(key);
        if (!cell) return <div className="h-8 w-full" aria-hidden />;

        const isSelected = selected.has(cell.isoUtc);
        const dateIdx = matrix.columns.findIndex((c) => c.dateKey === dateKey);
        const timeIdx = matrix.rowTimes.indexOf(timeKey);
        const othersCount = heat?.counts.get(cell.isoUtc) ?? 0;
        const tier = heat ? heatmapTier(othersCount, heat.total) : null;
        const isHostFree = heat?.hostSlots?.has(cell.isoUtc) ?? false;
        // Without the overlay a marked cell is solid primary; with it, the
        // heat color stays visible and the mark is a small filled badge.
        const solidMark = isSelected && !heat;

        return (
          <button
            type="button"
            ref={(el) => {
              if (el) cellRefs.current.set(key, el);
              else cellRefs.current.delete(key);
            }}
            role="gridcell"
            aria-selected={isSelected}
            aria-label={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)}${isSelected ? ", selected" : ""}${heat && othersCount > 0 ? `, ${othersCount} of ${heat.total} others free` : ""}`}
            tabIndex={focusKey === key || (focusKey === null && dateIdx === 0 && timeIdx === 0) ? 0 : -1}
            disabled={disabled}
            onFocus={() => setFocusKey(key)}
            onPointerDown={handlePointerDown(cell.isoUtc)}
            onPointerEnter={handlePointerEnter(cell.isoUtc)}
            onPointerUp={endDrag}
            onClick={handleClick(cell.isoUtc)}
            onKeyDown={handleKeyDown(dateIdx, timeIdx, cell.isoUtc)}
            style={solidMark ? undefined : { backgroundColor: tier?.color }}
            className={cn(
              "relative flex h-8 w-full min-w-[56px] items-center justify-center rounded-md text-[10px] font-semibold transition-colors select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              solidMark
                ? "bg-primary text-primary-foreground"
                : cn(
                    !tier?.color && "bg-muted/40",
                    tier?.solid ? "text-white" : "text-foreground/80",
                    !disabled && (tier?.color ? "hover:brightness-95" : "hover:bg-muted"),
                  ),
              disabled && "cursor-default",
            )}
          >
            {solidMark ? (
              <span className="text-[11px]">✓</span>
            ) : isSelected ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground shadow-sm">
                ✓
              </span>
            ) : othersCount > 0 ? (
              othersCount
            ) : null}
            {heat && isHostFree && <HostDot />}
          </button>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Read-only heatmap
// ---------------------------------------------------------------------------

const HEATMAP_GRAY = "color-mix(in srgb, var(--color-muted-foreground) 32%, transparent)";
const HEATMAP_EVERYONE = "hsl(142 65% 36%)";

function HostDot() {
  return (
    <span
      aria-hidden
      className="absolute top-1 right-1 size-1.5 rounded-full bg-foreground ring-2 ring-background/60"
    />
  );
}

function HeatLegend({ hostName }: { hostName?: string | null }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: HEATMAP_GRAY }} />
        Only 1 person free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "hsl(142 60% 45% / 0.5)" }} />
        Some people free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: HEATMAP_EVERYONE }} />
        Everyone free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-foreground ring-2 ring-muted" />
        {hostName ? `${hostName} is free` : "Host is free"}
      </span>
    </>
  );
}

/**
 * Three distinct fills, no borders:
 *  - exactly one person → neutral gray (a single response is a weak signal
 *    regardless of group size, so it isn't green),
 *  - some (but not all) people → green that deepens with the share free,
 *  - everyone → solid, saturated green.
 */
function heatmapTier(count: number, total: number): {
  color: string | undefined;
  solid: boolean;
} {
  if (count <= 0) return { color: undefined, solid: false };
  if (count === 1) return { color: HEATMAP_GRAY, solid: false };
  if (count >= total) return { color: HEATMAP_EVERYONE, solid: true };
  const ratio = total > 0 ? count / total : 0;
  return { color: `hsl(142 60% 45% / ${0.3 + ratio * 0.35})`, solid: false };
}

function HeatmapGridView({
  matrix,
  counts,
  totalParticipants,
  hostSlots,
  hostName,
  ariaLabel,
  className,
}: HeatmapProps & { matrix: DisplayMatrix }) {
  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <HeatLegend hostName={hostName} />
    </div>
  );

  return (
    <GridShell
      matrix={matrix}
      ariaLabel={ariaLabel}
      className={className}
      legend={legend}
      renderCell={(dateKey, timeKey) => {
        const key = cellKey(dateKey, timeKey);
        const cell = matrix.cellsByKey.get(key);
        if (!cell) return <div className="h-8 w-full" aria-hidden />;

        const count = counts.get(cell.isoUtc) ?? 0;
        const isHostFree = hostSlots?.has(cell.isoUtc) ?? false;
        // Fixed-lightness green doesn't track the page theme, so pin
        // legible white text to the solid fill rather than relying on
        // text-foreground (which flips per theme, not per fill color).
        const { color, solid } = heatmapTier(count, totalParticipants);

        return (
          <div
            role="gridcell"
            title={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)} — ${count} of ${totalParticipants} available`}
            aria-label={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)}, ${count} of ${totalParticipants} available${isHostFree ? ", host is free" : ""}`}
            className={cn(
              "relative flex h-8 w-full min-w-[56px] items-center justify-center rounded-md text-[10px] font-semibold",
              solid ? "text-white" : "text-foreground/80",
              count === 0 && "bg-muted/40",
            )}
            style={{ backgroundColor: color }}
          >
            {count > 0 ? count : ""}
            {isHostFree && <HostDot />}
          </div>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Read-only single-person view
// ---------------------------------------------------------------------------

function PersonGridView({
  matrix,
  selected,
  personName,
  ariaLabel,
  className,
}: ViewProps & { matrix: DisplayMatrix }) {
  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-primary" />
        {personName} is free
      </span>
    </div>
  );

  return (
    <GridShell
      matrix={matrix}
      ariaLabel={ariaLabel}
      className={className}
      legend={legend}
      renderCell={(dateKey, timeKey) => {
        const cell = matrix.cellsByKey.get(cellKey(dateKey, timeKey));
        if (!cell) return <div className="h-8 w-full" aria-hidden />;

        const isFree = selected.has(cell.isoUtc);
        const label = `${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)}`;
        return (
          <div
            role="gridcell"
            aria-label={`${label}, ${personName} is ${isFree ? "free" : "not free"}`}
            className={cn(
              "flex h-8 w-full min-w-[56px] items-center justify-center rounded-md text-[11px] font-medium",
              isFree ? "bg-primary text-primary-foreground" : "bg-muted/40",
            )}
          >
            {isFree ? "✓" : ""}
          </div>
        );
      }}
    />
  );
}
