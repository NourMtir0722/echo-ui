"use client";

/**
 * Progress — a discrete LED cell bar. A device meter,
 * not a smooth fill: cells light one by one, steppy by construction.
 *
 * The first time it scrolls into view the meter powers on: the lit cells come
 * up one after another from the start, like a level meter finding its level.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import { useBootOnView } from "echo-ui-core/tactile";
import "./progress.css";

interface ProgressOwnProps extends Omit<HTMLAttributes<HTMLDivElement>, "aria-label" | "aria-labelledby"> {
  /** 0..1 fraction filled. */
  value?: number;
  cells?: number;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

/** The meter's name says what is filling up: "Upload", "Battery". */
export type ProgressProps = ProgressOwnProps & AccessibleName;

export function Progress({ value = 0.5, cells = 14, className, ...rest }: ProgressProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * cells);
  const boot = useBootOnView<HTMLDivElement>();
  return (
    <div
      ref={boot}
      className={["echo-progress", className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      {...rest}
    >
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          className="echo-progress__cell"
          data-on={i < filled ? "" : undefined}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </div>
  );
}
