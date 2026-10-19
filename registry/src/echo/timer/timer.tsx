"use client";

/**
 * Timer. "Timer" opens into its durations; the others run into the one you
 * pick, which fills with the primary plastic and drains as the time runs.
 * When it's up the cap rings three times and folds back. Pause by pressing
 * the running cap; × (or Escape) folds it at any point.
 *
 * Every state is real HardwareButtons in a Morph. The running cap is the
 * duration you picked (they share a `data-morph` name), so it's that cap the
 * others flow into, and its level is HardwareButton's `fill`.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MorphFeelName } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";
import "./timer.css";

export interface TimerDuration {
  /** What the cap says, e.g. "30s". */
  label: string;
  ms: number;
}

export interface TimerProps {
  /** What it opens into. Keep to three or four. */
  durations?: TimerDuration[];
  /** Called when the time is up. */
  onDone?: () => void;
  /** The closed label. */
  children?: string;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  align?: "center" | "start" | "end";
  className?: string;
}

const DEFAULT_DURATIONS: TimerDuration[] = [
  { label: "10s", ms: 10_000 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
];

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const Clock = () => (
  <Svg>
    <circle cx="8" cy="9" r="5.2" />
    <path d="M8 6.5v2.7l1.7 1.6M6.3 1.8h3.4" />
  </Svg>
);
const Close = () => (
  <Svg>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);
const Pause = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z" fill="currentColor" />
  </svg>
);
const Play = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M5 3.2v9.6l8-4.8z" fill="currentColor" />
  </svg>
);

/** 0:09 — whole seconds, rounded up, so it never says 0:00 while running. */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Phase = "closed" | "pick" | "run";

export function Timer({
  durations = DEFAULT_DURATIONS,
  onDone,
  children = "Timer",
  feel,
  size,
  align,
  className,
}: TimerProps) {
  const sound = useSoundOptional();
  const [phase, setPhase] = useState<Phase>("closed");
  const [chosen, setChosen] = useState(0);
  const [paused, setPaused] = useState(false);
  const [left, setLeft] = useState(0);
  const [status, setStatus] = useState("");
  const cap = useRef<HTMLButtonElement>(null);
  const loop = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const run = useRef({ left: 0, total: 1, at: 0, paused: false });
  const done = useRef(onDone);
  done.current = onDone;

  const stop = () => {
    cancelAnimationFrame(loop.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stop, []);

  const close = (said = "Timer closed") => {
    stop();
    setPhase("closed");
    setPaused(false);
    setStatus(said);
  };

  const ring = () => {
    setStatus("Time's up");
    done.current?.();
    const hw = cap.current?.closest(".echo-hw");
    // Three rings: the cap jumps as if struck, and chimes.
    for (let k = 0; k < 3; k++) {
      timers.current.push(
        setTimeout(() => {
          sound?.play("notify");
          hw?.animate(
            [{ translate: "0 0" }, { translate: "0 -6px" }, { translate: "0 0" }],
            { duration: 280, easing: "cubic-bezier(.3,1.6,.5,1)" },
          );
        }, k * 320),
      );
    }
    timers.current.push(setTimeout(() => close("Timer finished"), 1900));
  };

  const choose = (i: number) => {
    stop();
    const total = durations[i]!.ms;
    run.current = { left: total, total, at: performance.now(), paused: false };
    setChosen(i);
    setLeft(total);
    setPaused(false);
    setPhase("run");
    setStatus(`Timer, ${durations[i]!.label}`);
    let shown = clock(total);
    const tick = (now: number) => {
      const r = run.current;
      if (!r.paused) r.left -= now - r.at;
      r.at = now;
      // The level runs every frame, straight onto the cap; the clock only
      // re-renders when the second changes.
      cap.current?.style.setProperty("--hw-fill", Math.max(0, r.left / r.total).toFixed(4));
      const text = clock(r.left);
      if (text !== shown) {
        shown = text;
        setLeft(r.left);
      }
      if (r.left > 0) loop.current = requestAnimationFrame(tick);
      else ring();
    };
    loop.current = requestAnimationFrame(tick);
  };

  const togglePause = () => {
    const r = run.current;
    r.paused = !r.paused;
    r.at = performance.now();
    setPaused(r.paused);
    setStatus(r.paused ? "Paused" : "Running");
  };

  const over = phase === "run" && left <= 0;
  const Close_ = (
    <HardwareButton data-morph="close" size={size} icon={<Close />} iconOnly aria-label="Close timer" onClick={() => close()} />
  );

  return (
    <Morph
      feel={feel}
      align={align}
      className={["echo-timer", className].filter(Boolean).join(" ")}
      status={status}
      label={phase === "pick" ? "Timer durations" : undefined}
      onEscape={phase === "closed" ? undefined : () => close()}
    >
      {phase === "closed" ? (
        <HardwareButton size={size} icon={<Clock />} onClick={() => setPhase("pick")}>
          {children}
        </HardwareButton>
      ) : phase === "pick" ? (
        <>
          {durations.map((d, i) => (
            <HardwareButton
              key={d.label}
              data-morph={`d${i}`}
              size={size}
              aria-label={`${d.label} timer`}
              onClick={() => choose(i)}
            >
              {d.label}
            </HardwareButton>
          ))}
          {Close_}
        </>
      ) : (
        <>
          <HardwareButton
            ref={cap}
            data-morph={`d${chosen}`}
            size={size}
            icon={paused ? <Play /> : <Pause />}
            fill={1}
            disabled={over}
            aria-label={`${paused ? "Resume" : "Pause"} timer, ${clock(left)} left`}
            onClick={togglePause}
          >
            <span className="echo-timer__time">{over ? "Time's up" : clock(left)}</span>
          </HardwareButton>
          {Close_}
        </>
      )}
    </Morph>
  );
}
