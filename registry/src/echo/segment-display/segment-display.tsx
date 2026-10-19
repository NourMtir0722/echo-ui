"use client";

/**
 * SegmentDisplay. A seven-segment readout, drawn the way a real one looks:
 * the segments a reading doesn't light stay faintly visible under the glass,
 * and the zeros that only pad it out print dim rather than vanishing, so
 * "88.5" on a four-digit face reads as a dim 0 and a lit 88.5.
 *
 * `screen` sits in its own dark well with its label engraved over it;
 * `flush` is the digits alone, for a screen you already have.
 *
 * For assistive technology it is the reading, said once, as it is: the
 * padding and the dark segments are drawing, not text.
 */
import type { CSSProperties } from "react";
import { useRoll } from "../roll";
import { CELL_H, COLON_DOTS, DP, LEAN, SEGMENTS, SEGMENT_POINTS, layout, place } from "./segments";
import "../scope/scope.css";
import "./segment-display.css";

export interface SegmentDisplayProps {
  /** The reading: digits, a minus, a dot, a colon, and the letters a segment face can draw. */
  value: string | number;
  /** What it reads: the accessible name, and engraved over a `screen` display. */
  label: string;
  /** Engraved after the digits: "MHz", "kg". */
  unit?: string;
  /** At least this many digit cells. A shorter reading is padded on the left. */
  digits?: number;
  /** What fills the padding: dim zeros (`"0"`, default), the way a counter shows them, or blanks (`" "`). */
  pad?: "0" | " ";
  /** Draw the segments a reading doesn't light, faintly, as a real display shows them. Default true. */
  ghost?: boolean;
  /** Lit in the accent (default); `false` lights it cream, for a value that isn't live. */
  glow?: boolean;
  /** A new reading rolls to its digits, each stepping through the ones in between. */
  roll?: boolean;
  /** Digit height: `sm` 24px, `md` 40px (default), `lg` 64px. */
  size?: "sm" | "md" | "lg";
  /** `screen` (default) sits in its own dark well; `flush` is the digits alone. */
  variant?: "screen" | "flush";
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

export function SegmentDisplay({
  value,
  label,
  unit,
  digits = 0,
  pad = "0",
  ghost = true,
  glow = true,
  roll = false,
  size = "md",
  variant = "screen",
  screen = "emissive",
}: SegmentDisplayProps) {
  const text = String(value);
  const shown = useRoll(text, { enabled: roll });
  const cells = layout(shown, digits, pad);
  const { x, width } = place(cells);
  return (
    <div
      className="echo-segment-display"
      data-variant={variant}
      data-size={size}
      data-glow={glow ? "" : undefined}
      data-ghost={ghost ? "" : undefined}
      data-echo-screen={screen === "reflective" ? "reflective" : undefined}
      role="group"
      aria-label={label}
    >
      {variant === "screen" ? (
        <span className="echo-segment-display__label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <span className="echo-segment-display__row">
        <svg
          className="echo-segment-display__face"
          viewBox={`0 0 ${width} ${CELL_H}`}
          // The one dynamic value, as a variable the stylesheet reads: the
          // face's proportions, so its width follows the digit height.
          style={{ "--seg-ratio": (width / CELL_H).toFixed(4) } as CSSProperties}
          aria-hidden="true"
          focusable="false"
        >
          {cells.map((cell, i) =>
            cell.kind === "colon" ? (
              <g key={i} transform={`translate(${x[i]} 0) skewX(${-LEAN})`}>
                {COLON_DOTS.map((dot, j) => (
                  <circle key={j} cx={dot.cx} cy={dot.cy} r={dot.r} data-state="lit" />
                ))}
              </g>
            ) : (
              <g key={i} transform={`translate(${x[i]} 0) skewX(${-LEAN})`}>
                {SEGMENTS.map((s) => (
                  <polygon
                    key={s}
                    points={SEGMENT_POINTS[s]}
                    data-state={cell.lit.includes(s) ? (cell.pad ? "dim" : "lit") : "off"}
                  />
                ))}
                <circle cx={DP.cx} cy={DP.cy} r={DP.r} data-state={cell.dp ? "lit" : "off"} />
              </g>
            ),
          )}
        </svg>
        {unit ? (
          <span className="echo-segment-display__unit" aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </span>
      <span className="echo-segment-display__said">{unit ? `${text} ${unit}` : text}</span>
    </div>
  );
}
