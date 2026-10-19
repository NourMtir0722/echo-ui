"use client";

/**
 * LevelMeter. A live level (a microphone, a mix bus, a download rate) as a
 * column of LED cells with real ballistics: it rises at once when the level
 * jumps, falls back slowly, and the highest cell it reached stays lit for a
 * moment before it drops, so a peak you'd miss is still there to see.
 *
 * Feed it `level` (0–1) as often as you like; it draws itself on animation
 * frames without re-rendering, and stops drawing once everything has settled.
 *
 * For assistive tech it's a meter named by `label` whose value is rounded to
 * tenths and updated at most once a second: a live level read out on every
 * frame would be noise. Under reduced motion it still shows the level, without
 * the slow fall or the held peak.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotionRef } from "echo-ui-core/tactile";
import "./level-meter.css";

export interface LevelMeterProps {
  /** What it measures; the accessible name, and the visible label unless `hideLabel`. */
  label: string;
  /** The level now, 0–1. */
  level: number;
  /** How many cells. Default 16. */
  cells?: number;
  /** Default vertical. */
  orientation?: "vertical" | "horizontal";
  /** Hold the peak for a moment. Default true. */
  peakHold?: boolean;
  /** Keep the label for assistive tech only. */
  hideLabel?: boolean;
}

/** How fast it falls, in full scales per second, and how long a peak holds, ms. */
const RELEASE = 1.4;
const HOLD = 900;
const PEAK_FALL = 0.8;

export function LevelMeter({ label, level, cells = 16, orientation = "vertical", peakHold = true, hideLabel = false }: LevelMeterProps) {
  const strip = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  target.current = Math.min(1, Math.max(0, level));
  const reduced = useReducedMotionRef();
  const [said, setSaid] = useState(0);
  const saidAt = useRef(0);
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const leds = [...el.querySelectorAll<HTMLElement>(".echo-level-meter__cell")];
    let shown = 0;
    let peak = 0;
    let peakAt = 0;
    let last = performance.now();
    let id = 0;
    const draw = () => {
      const lit = Math.round(shown * leds.length);
      const top = peakHold && !reduced.current ? Math.round(peak * leds.length) - 1 : -1;
      leds.forEach((led, i) => {
        led.toggleAttribute("data-on", i < lit);
        led.toggleAttribute("data-peak", i === top && top >= lit);
      });
    };
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = target.current;
      // Attack at once; release slowly (instant under reduced motion).
      shown = t >= shown || reduced.current ? t : Math.max(t, shown - RELEASE * dt);
      if (shown >= peak) {
        peak = shown;
        peakAt = now;
      } else if (now - peakAt > HOLD) {
        peak = Math.max(shown, peak - PEAK_FALL * dt);
      }
      draw();
      if (now - saidAt.current > 1000) {
        saidAt.current = now;
        setSaid(Math.round(shown * 10) / 10);
      }
      const settled = Math.abs(shown - t) < 0.001 && (peak - shown < 0.001 || !peakHold);
      id = settled ? 0 : requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!id) {
        last = performance.now();
        id = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;
    wake();
    return () => cancelAnimationFrame(id);
  }, [cells, peakHold, reduced]);

  // Every new level wakes the loop; it sleeps again once all has settled.
  useEffect(() => {
    wakeRef.current();
  }, [level]);

  return (
    <div className="echo-level-meter" data-orientation={orientation}>
      <div
        ref={strip}
        className="echo-level-meter__strip"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={said}
        aria-valuetext={`${Math.round(said * 100)}%`}
      >
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className="echo-level-meter__cell" aria-hidden="true" />
        ))}
      </div>
      {hideLabel ? null : (
        <span className="echo-level-meter__label" aria-hidden="true">
          {label}
        </span>
      )}
    </div>
  );
}
