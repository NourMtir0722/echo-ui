"use client";

/**
 * LcdChip — a recessed dark LCD readout with a glowing value and a machine
 * label. Where StatTile is a stacked tile for a
 * dashboard, LcdChip is the inline chip: value and label on one line.
 *
 * It powers on the first time it scrolls into view, flickering up in steps
 * like StatTile's screen; one already on screen at load is simply on.
 *
 * With `roll`, a new value rolls to its digits (useRoll) instead of
 * flickering over: each digit steps through the ones in between.
 */
import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { useBootOnView } from "echo-ui-core/tactile";
import { useRoll } from "../roll";
import "./lcd-chip.css";

export interface LcdChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The readout itself — digits, a duration, a count. */
  value: ReactNode;
  /** Machine label rendered beside the value; also the accessible name. */
  label: string;
  /** Emissive accent value. `false` renders it as plain cream text. Default true. */
  glow?: boolean;
  /**
   * A new value rolls to its digits, each stepping through the ones in
   * between, instead of flickering over. For a string or number value.
   */
  roll?: boolean;
}

export function LcdChip({ value, label, glow = true, roll = false, className, ...rest }: LcdChipProps) {
  const boot = useBootOnView<HTMLSpanElement>();
  const rolling = roll && (typeof value === "string" || typeof value === "number");
  const shown = useRoll(rolling ? String(value) : "", { enabled: rolling });
  // A new value ticks over, the way a segment display updates: the value
  // remounts (keyed by it) and flickers in steps. Not on the first render, so
  // a page never blinks as it loads.
  const first = useRef(value);
  const changed = value !== first.current;
  // A span, so the chip is phrasing content: it can sit in a button, a
  // label or a line of text, not only in a block.
  return (
    <span
      ref={boot}
      className={["echo-lcd-chip", className].filter(Boolean).join(" ")}
      data-glow={glow ? "" : undefined}
      role="group"
      aria-label={label}
      {...rest}
    >
      {rolling ? (
        // The digits in between are drawn, not read: the value is said once.
        <span className="echo-lcd-chip__value" data-roll="">
          <span aria-hidden="true">{shown}</span>
          <span className="echo-lcd-chip__said">{value}</span>
        </span>
      ) : (
        <span key={String(value)} className="echo-lcd-chip__value" data-tick={changed || undefined}>
          {value}
        </span>
      )}
      <span className="echo-lcd-chip__label">{label}</span>
    </span>
  );
}
