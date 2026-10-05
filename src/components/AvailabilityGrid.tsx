"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { GridSlot } from "@/lib/time/grid";
import {
  buildDisplayMatrix,
  formatTimeOfDay,
  type DisplayMatrix,
} from "@/lib/time/display-grid";

export interface OverlayLayer {
  key: string;
  label: string;
  slots: Set<string>;
  /** Tailwind class applied to a cell when this layer covers it. */
  className: string;
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
  /** Background layers drawn under the interactive selection, e.g. host availability. */
  overlayLayers?: OverlayLayer[];
}

interface HeatmapProps extends BaseProps {
  mode: "heatmap";
  counts: Map<string, number>;
  totalParticipants: number;
  hostSlots?: Set<string>;
  hostName?: string | null;
}

type AvailabilityGridProps = EditProps | HeatmapProps;

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

  return props.mode === "edit" ? (
    <EditableGrid {...props} matrix={matrix} />
  ) : (
    <HeatmapGridView {...props} matrix={matrix} />
  );
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
      {legend}
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
  overlayLayers,
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

  const legend =
    overlayLayers && overlayLayers.length > 0 ? (
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {overlayLayers.map((layer) => (
          <span key={layer.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", layer.className)} />
            {layer.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border bg-primary" />
          Your availability
        </span>
      </div>
    ) : undefined;

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
        const activeLayers = overlayLayers?.filter((l) => l.slots.has(cell.isoUtc)) ?? [];

        return (
          <button
            type="button"
            ref={(el) => {
              if (el) cellRefs.current.set(key, el);
              else cellRefs.current.delete(key);
            }}
            role="gridcell"
            aria-selected={isSelected}
            aria-label={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)}${isSelected ? ", selected" : ""}`}
            tabIndex={focusKey === key || (focusKey === null && dateIdx === 0 && timeIdx === 0) ? 0 : -1}
            disabled={disabled}
            onFocus={() => setFocusKey(key)}
            onPointerDown={handlePointerDown(cell.isoUtc)}
            onPointerEnter={handlePointerEnter(cell.isoUtc)}
            onPointerUp={endDrag}
            onClick={handleClick(cell.isoUtc)}
            onKeyDown={handleKeyDown(dateIdx, timeIdx, cell.isoUtc)}
            className={cn(
              "h-8 w-full min-w-[56px] rounded-md border text-[11px] font-medium transition-colors select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : activeLayers.length > 0
                  ? cn(activeLayers[0]!.className, "hover:brightness-95")
                  : "bg-muted/40 border-transparent hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {isSelected ? "✓" : ""}
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

/**
 * A single response is a weak signal regardless of group size, so it's
 * shown as neutral gray rather than a faint green — green is reserved for
 * "more than one person can make it," scaling up to a solid green at full
 * overlap.
 */
function heatmapColor(count: number, total: number): string | undefined {
  if (count <= 0) return undefined;
  if (count === 1) return HEATMAP_GRAY;
  const ratio = total > 0 ? count / total : 0;
  const alpha = 0.25 + ratio * 0.65;
  return `hsl(142 65% 40% / ${alpha})`;
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
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border-2 border-foreground/70 bg-transparent" />
        {hostName ? `${hostName} is free` : "Host is free"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: HEATMAP_GRAY }} />
        Only 1 person free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "hsl(142 65% 40% / 0.9)" }} />
        Everyone free
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
        const key = cellKey(dateKey, timeKey);
        const cell = matrix.cellsByKey.get(key);
        if (!cell) return <div className="h-8 w-full" aria-hidden />;

        const count = counts.get(cell.isoUtc) ?? 0;
        const isHostFree = hostSlots?.has(cell.isoUtc) ?? false;
        // Fixed-lightness green doesn't track the page theme, so pin
        // legible white text to it rather than relying on text-foreground
        // (which flips per theme, not per fill color).
        const isStrongGreen = count >= 2;

        return (
          <div
            role="gridcell"
            title={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)} — ${count} of ${totalParticipants} available`}
            aria-label={`${cell.dateTime.toFormat("cccc, LLLL d")} at ${formatTimeOfDay(timeKey)}, ${count} of ${totalParticipants} available`}
            className={cn(
              "h-8 w-full min-w-[56px] rounded-md border flex items-center justify-center text-[10px] font-semibold",
              isStrongGreen ? "text-white" : "text-foreground/80",
              isHostFree && "border-2 border-foreground/70",
            )}
            style={{ backgroundColor: heatmapColor(count, totalParticipants) }}
          >
            {count > 0 ? count : ""}
          </div>
        );
      }}
    />
  );
}
