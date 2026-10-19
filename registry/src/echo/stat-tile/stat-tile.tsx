"use client";

/**
 * StatTile — a recessed LCD readout.
 *
 * It powers on the first time it scrolls into view: the screen flickers up in
 * steps, the way a segment display comes alive. One already on screen when
 * the page loads is simply on.
 *
 * With `roll`, a new reading rolls to its digits (useRoll) instead of
 * flickering over: each digit steps through the ones in between.
 */
import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { useBootOnView } from "echo-ui-core/tactile";
import { useRoll } from "../roll";
import "./stat-tile.css";

export interface StatTileProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value: ReactNode;
  unit?: ReactNode;
  label: string;
  /**
   * Emissive accent value. Default true.
   *
   * A wall of tiles is why this exists: on the console template six lit readouts
   * side by side made the accent mean "a number" instead of "this one", and
   * Echo reserves it for the single thing that is on. Quiet the routine tiles
   * and light the one being watched. LcdChip has carried the same prop since
   * it shipped; StatTile not having it was the gap.
   */
  glow?: boolean;
  /**
   * A new reading rolls to its digits, each stepping through the ones in
   * between, instead of flickering over. For a string or number value.
   */
  roll?: boolean;
}

export function StatTile({ value, unit, label, glow = true, roll = false, className, ...rest }: StatTileProps) {
  const boot = useBootOnView<HTMLDivElement>();
  const rolling = roll && (typeof value === "string" || typeof value === "number");
  const shown = useRoll(rolling ? String(value) : "", { enabled: rolling });
  // A new value ticks over, the way a segment display updates: the value
  // remounts (keyed by it) and flickers in steps. Not on the first render, so
  // a page never blinks as it loads.
  const first = useRef(value);
  const changed = value !== first.current;
  return (
    <div
      ref={boot}
      className={["echo-stat-tile", className].filter(Boolean).join(" ")}
      data-glow={glow ? "" : undefined}
      role="group"
      aria-label={label}
      {...rest}
    >
      <div
        key={rolling ? "roll" : String(value)}
        className="echo-stat-tile__value"
        data-tick={(!rolling && changed) || undefined}
        data-roll={rolling ? "" : undefined}
      >
        {rolling ? (
          // The digits in between are drawn, not read: the value is said once.
          <>
            <span aria-hidden="true">{shown}</span>
            <span className="echo-stat-tile__said">{value}</span>
          </>
        ) : (
          value
        )}
        {unit != null ? <span className="echo-stat-tile__unit">{unit}</span> : null}
      </div>
      <div className="echo-stat-tile__label">{label}</div>
    </div>
  );
}
