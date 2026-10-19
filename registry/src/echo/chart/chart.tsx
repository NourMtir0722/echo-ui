"use client";

/**
 * Chart. StatTile's dot-matrix language applied to a series.
 *
 * It exists because a template demanded it. `echo-console` does: a device dashboard with no reading of anything over time is a table
 * with badges on it, and a chart is the one thing on that screen that has to
 * look like Echo rather than like a charting library.
 *
 * SO IT IS NOT A CHARTING LIBRARY. There are no axes, no gridlines, no
 * tooltips and no smoothing, because none of those are things a device panel
 * has. It is an LED matrix: a column per sample, cells lit from the bottom.
 * Values quantise to whole cells by construction — Echo's rule that a screen
 * readout does not ease smoothly is not a style here, it is the data model.
 * If you need a real chart with axes and hit-testing, use a real charting
 * library; this is a readout.
 *
 * a11y: a matrix of divs says nothing, so the whole thing is one `role="img"`
 * with a generated summary — what it measures, its range, and where it ended.
 * Pass `summary` when you can say it better.
 */
import { useMemo, type HTMLAttributes } from "react";
import { useBootOnView } from "echo-ui-core/tactile";
import "./chart.css";

export type ChartVariant = "bar" | "line";

export interface ChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The series, oldest first. Empty renders an unlit matrix. */
  data: number[];
  /**
   * What is being measured. Required: it is the accessible name, and a chart
   * nobody can read is a decorative rectangle.
   */
  label: string;
  /** `bar` lights from the bottom up; `line` lights only the value's cell. */
  variant?: ChartVariant;
  /** Matrix height in cells. More cells is finer, not smoother. */
  rows?: number;
  /** Scale ceiling. Defaults to the largest value present. */
  max?: number;
  /** Scale floor. Default 0. */
  min?: number;
  /** Replaces the generated accessible description. */
  summary?: string;
  /** Machine label under the matrix. */
  caption?: string;
}

export function Chart({
  data,
  label,
  variant = "bar",
  rows = 7,
  max,
  min = 0,
  summary,
  caption,
  className,
  ...rest
}: ChartProps) {
  const ceiling = max ?? (data.length ? Math.max(...data) : 1);
  const span = ceiling - min || 1;

  /**
   * How many cells each column lights. Rounding here rather than in CSS is
   * what makes the quantisation the data model instead of a rendering
   * accident — the same number drives the pixels and the summary.
   */
  const levels = useMemo(
    () =>
      data.map((value) => {
        const clamped = Math.min(Math.max(value, min), ceiling);
        return Math.max(0, Math.min(rows, Math.round(((clamped - min) / span) * rows)));
      }),
    [data, min, ceiling, span, rows],
  );

  const described =
    summary ??
    (data.length === 0
      ? "No data."
      : `${data.length} samples, from ${Math.min(...data)} to ${Math.max(...data)}, ending at ${
          data[data.length - 1]
        }.`);

  // Powers on the first time it scrolls into view: each column lights from
  // the bottom up, one after another, like a meter finding its level.
  const boot = useBootOnView<HTMLDivElement>();

  return (
    <div ref={boot} className={["echo-chart", className].filter(Boolean).join(" ")} {...rest}>
      <div
        className="echo-chart__matrix"
        data-variant={variant}
        role="img"
        aria-label={`${label}. ${described}`}
        style={{ "--echo-chart-rows": rows } as React.CSSProperties}
      >
        {levels.map((level, column) => (
          <div className="echo-chart__col" key={column} style={{ "--c": column } as React.CSSProperties}>
            {Array.from({ length: rows }, (_, i) => {
              // Row 0 is the TOP of the column, so lit cells count from the end.
              const cellFromBottom = rows - i;
              const lit = variant === "bar" ? cellFromBottom <= level : cellFromBottom === level;
              return (
                <span
                  key={i}
                  className="echo-chart__cell"
                  data-lit={lit ? "" : undefined}
                  style={{ "--r": cellFromBottom } as React.CSSProperties}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        ))}
      </div>
      {caption ? <span className="echo-chart__caption">{caption}</span> : null}
    </div>
  );
}
