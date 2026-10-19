"use client";

/**
 * Stopwatch. Start becomes the running time (lit) and a Lap button that buds
 * beside it; each lap is a drop that leaves Lap and lands in the lap count.
 * Pause dims the time and Lap flows into Reset, which folds it all back into
 * Start.
 *
 * Real HardwareButtons in a Morph, a CountBadge for the laps, and useBudOff
 * for the drop. The time is written straight into the cap every frame, so
 * nothing re-renders while it runs.
 */
import { useEffect, useRef, useState } from "react";
import type { MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { CountBadge } from "../count-badge";
import { Morph } from "../morph";
import { useBudOff } from "../bud-off";
import "./stopwatch.css";

export interface StopwatchProps {
  /** Called on every lap, with its number and the time, ms. */
  onLap?: (lap: number, ms: number) => void;
  /** Called on reset, with the time it had reached, ms. */
  onReset?: (ms: number) => void;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  align?: "center" | "start" | "end";
  className?: string;
}

const Play = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M5 3.2v9.6l8-4.8z" fill="currentColor" />
  </svg>
);
const Pause = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z" fill="currentColor" />
  </svg>
);
const Flag = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 14V2.5M3.5 2.5h8l-1.6 3 1.6 3h-8" />
  </svg>
);

/** 01:23.45 — minutes, seconds, hundredths. */
export const watch = (ms: number) => {
  const cs = Math.floor(Math.max(0, ms) / 10);
  const m = Math.floor(cs / 6000);
  const s = Math.floor(cs / 100) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};

type Phase = "idle" | "run" | "pause";

export function Stopwatch({ onLap, onReset, feel, size, align, className }: StopwatchProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [laps, setLaps] = useState(0);
  const [shownLaps, setShownLaps] = useState(0);
  const [status, setStatus] = useState("");
  const budOff = useBudOff();
  const text = useRef<HTMLSpanElement>(null);
  const lapButton = useRef<HTMLButtonElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const loop = useRef(0);
  const clockRef = useRef({ base: 0, at: 0 });
  /** Drops still flying to the lap count; Reset calls them off. */
  const flights = useRef(new Set<() => void>());

  const now = () => {
    const c = clockRef.current;
    return phase === "run" ? c.base + performance.now() - c.at : c.base;
  };
  /**
   * The time is written into the text node already there, never by setting
   * textContent, which swaps the node for a new one. The time is the Pause
   * cap's label and changes every frame, so a press landed on a node that was
   * gone by the time it let go, and WebKit dropped the click.
   */
  const show = (ms: number) => {
    const el = text.current;
    if (!el) return;
    const node = el.firstChild;
    if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = watch(ms);
    else el.textContent = watch(ms);
  };
  const tick = () => {
    const c = clockRef.current;
    show(c.base + performance.now() - c.at);
    loop.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(loop.current), []);

  const start = () => {
    clockRef.current = { base: 0, at: performance.now() };
    loop.current = requestAnimationFrame(tick);
    setPhase("run");
    setStatus("Stopwatch running");
  };

  const toggle = () => {
    const c = clockRef.current;
    if (phase === "run") {
      cancelAnimationFrame(loop.current);
      c.base += performance.now() - c.at;
      show(c.base);
      setPhase("pause");
      setStatus(`Paused at ${watch(c.base)}`);
    } else {
      c.at = performance.now();
      loop.current = requestAnimationFrame(tick);
      setPhase("run");
      setStatus("Running");
    }
  };

  const lap = () => {
    const n = laps + 1;
    const at = now();
    setLaps(n);
    onLap?.(n, at);
    setStatus(`Lap ${n}, ${watch(at)}`);
    // The first lap brings the count in; the drop waits for it to be there.
    // Waiting or flying, Reset can call it off.
    let cancel = () => cancelAnimationFrame(frame);
    const callOff = () => cancel();
    const landed = () => {
      flights.current.delete(callOff);
      setShownLaps(n);
    };
    const frame = requestAnimationFrame(() => {
      const from = lapButton.current;
      const to = badge.current;
      if (from && to) cancel = budOff(from, to, { onArrive: landed });
      else landed();
    });
    flights.current.add(callOff);
  };

  const reset = () => {
    const at = clockRef.current.base;
    cancelAnimationFrame(loop.current);
    // A lap still on its way would land after this and bring its count back.
    flights.current.forEach((cancel) => cancel());
    flights.current.clear();
    clockRef.current = { base: 0, at: 0 };
    setLaps(0);
    setShownLaps(0);
    setPhase("idle");
    setStatus("Stopwatch reset");
    onReset?.(at);
  };

  return (
    <Morph feel={feel} align={align} className={["echo-stopwatch", className].filter(Boolean).join(" ")} status={status}>
      {phase === "idle" ? (
        <HardwareButton data-morph="time" size={size} icon={<Play />} onClick={start}>
          Start
        </HardwareButton>
      ) : (
        <>
          <HardwareButton
            data-morph="time"
            variant={phase === "run" ? "primary" : "neutral"}
            size={size}
            icon={phase === "run" ? <Pause /> : <Play />}
            aria-label={phase === "run" ? "Pause stopwatch" : "Resume stopwatch"}
            onClick={toggle}
          >
            <span ref={text} className="echo-stopwatch__time">
              {watch(clockRef.current.base + (phase === "run" ? performance.now() - clockRef.current.at : 0))}
            </span>
          </HardwareButton>
          {phase === "run" ? (
            <HardwareButton ref={lapButton} data-morph="side" size={size} icon={<Flag />} onClick={lap}>
              Lap
            </HardwareButton>
          ) : (
            <HardwareButton data-morph="side" size={size} onClick={reset}>
              Reset
            </HardwareButton>
          )}
          {laps > 0 ? (
            <span ref={badge} className="echo-stopwatch__laps">
              <CountBadge count={shownLaps} label={shownLaps === 1 ? "lap" : "laps"} showZero />
            </span>
          ) : null}
        </>
      )}
    </Morph>
  );
}
