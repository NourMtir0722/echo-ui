"use client";

/**
 * Meter. A measurement within a known range: storage used, battery, signal,
 * a score. Not progress (that's Progress, a task on its way to done): a
 * meter's value is simply where things stand.
 *
 * A recessed tube with the primary plastic poured into it to the value.
 * When the value changes the level travels there on a spring and settles
 * with a small slosh, the way a liquid does, so you can see how far it moved.
 * `marks` engrave levels on the tube (a limit, a target) without a second
 * colour: what a level means is said in words.
 *
 * Base UI Meter gives it `role="meter"` and the formatted value as
 * `aria-valuetext`. Under reduced motion the level jumps.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";
import { createSpring, useReducedMotionRef } from "echo-ui-core/tactile";
import "./meter.css";

export interface MeterProps {
  /** What it measures; the visible label and the accessible name. */
  label: string;
  value: number;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** How the value reads ("62%", "4.2 GB"): Intl number format options. Default percent of the range. */
  format?: Intl.NumberFormatOptions;
  /** Levels engraved on the tube: a limit, a target. Say what each means in the label or nearby. */
  marks?: number[];
  /** Show the value as text beside the label. Default true. */
  showValue?: boolean;
}

export function Meter({ label, value, min = 0, max = 100, format, marks = [], showValue = true }: MeterProps) {
  const fill = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionRef();
  const level = Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
  const spring = useRef<ReturnType<typeof createSpring> | null>(null);

  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    spring.current = createSpring(level, { duration: 0.6, bounce: 0.28 }, (x) => {
      el.style.setProperty("--meter-level", x.toFixed(4));
    });
    el.style.setProperty("--meter-level", String(level));
    return () => spring.current?.stop();
    // Made once; later values go through `to` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!spring.current) return;
    if (reduced.current) spring.current.set(level);
    else spring.current.to(level);
  }, [level, reduced]);

  // Intl's percent style multiplies what it is given by 100, and Base UI gives
  // a format the raw value: `{ style: "percent" }` read 78 as "7,800%". A
  // meter's percent is its share of the range, so that one is formatted here,
  // with the rest of the caller's options kept.
  const percent = format?.style === "percent" ? new Intl.NumberFormat(undefined, format).format(level) : undefined;
  const reading =
    percent !== undefined ? { getAriaValueText: () => percent } : format ? { format } : {};

  return (
    <BaseMeter.Root className="echo-meter" value={value} min={min} max={max} {...reading}>
      <div className="echo-meter__head">
        <BaseMeter.Label className="echo-meter__label">{label}</BaseMeter.Label>
        {showValue ? (
          <BaseMeter.Value className="echo-meter__value">{percent !== undefined ? () => percent : undefined}</BaseMeter.Value>
        ) : null}
      </div>
      <BaseMeter.Track className="echo-meter__track">
        <div ref={fill} className="echo-meter__fill" style={{ "--meter-level": level } as CSSProperties} />
        {marks.map((m) => {
          const at = Math.min(1, Math.max(0, (m - min) / (max - min || 1)));
          return <span key={m} className="echo-meter__mark" style={{ "--meter-mark": at } as CSSProperties} aria-hidden="true" />;
        })}
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}
