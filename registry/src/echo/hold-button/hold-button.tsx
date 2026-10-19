"use client";

/**
 * HoldButton. A destructive or final action you confirm by holding: press
 * and keep pressing, and the primary plastic fills the cap from the start
 * edge; let go early and it drains back; hold to the end and it's done. For
 * the moments a second tap would be too easy (delete a project, end a call
 * for everyone, publish to production). ConfirmButton is the two-press
 * alternative; choose one per product and keep to it.
 *
 * Space and Enter hold it the same way. Assistive tech often can't hold: its
 * activation arrives as one click, so a click that wasn't a held press arms
 * the button instead, it says "Press again to confirm", and the next press
 * within a few seconds confirms. Nothing is ever confirmed by a single tap.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import type { ControlSize } from "../size";
import "./hold-button.css";

export interface HoldButtonProps {
  /** What it does: "Delete project". */
  children: ReactNode;
  onConfirm: () => void;
  /** How long to hold, ms. Default 1200. */
  duration?: number;
  /** What it says once done, for a moment. Default "Done". */
  doneLabel?: string;
  /** What it says when armed by a single press. Default "Press again to confirm". */
  armedLabel?: string;
  variant?: "primary" | "neutral";
  size?: ControlSize;
  icon?: ReactNode;
  disabled?: boolean;
}

const DONE: SoundRecipe = { wave: "triangle", freq: 880, decay: 0.18, gain: 0.12, bend: 220 };

export function HoldButton({
  children,
  onConfirm,
  duration = 1200,
  doneLabel = "Done",
  armedLabel = "Press again to confirm",
  variant = "neutral",
  size,
  icon,
  disabled,
}: HoldButtonProps) {
  const sound = useSoundOptional();
  const [fill, setFill] = useState(0);
  const [state, setState] = useState<"idle" | "armed" | "done">("idle");
  const raf = useRef(0);
  const held = useRef(false);
  const heldAt = useRef(0);
  const from = useRef(0);
  const fillNow = useRef(0);
  const disarm = useRef(0);
  const reset = useRef(0);

  const confirm = useCallback(() => {
    cancelAnimationFrame(raf.current);
    held.current = false;
    fillNow.current = 1;
    setFill(1);
    setState("done");
    sound?.play(DONE);
    onConfirm();
    window.clearTimeout(reset.current);
    reset.current = window.setTimeout(() => {
      setState("idle");
      fillNow.current = 0;
      setFill(0);
    }, 1400);
  }, [onConfirm, sound]);

  // Holding pours the plastic in at an even rate; letting go drains it on the
  // same clock, a little faster, from wherever it had got to.
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const start = fillNow.current;
    const tick = (now: number) => {
      const dt = now - t0;
      const f = held.current ? Math.min(1, start + dt / duration) : Math.max(0, start - (dt / duration) * 1.6);
      fillNow.current = f;
      setFill(f);
      if (held.current && f >= 1) return confirm();
      if (held.current || f > 0) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [confirm, duration]);

  const press = () => {
    if (disabled || state === "done" || held.current) return;
    if (state === "armed") return confirm();
    held.current = true;
    heldAt.current = performance.now();
    from.current = fillNow.current;
    run();
  };
  const release = () => {
    if (!held.current) return;
    held.current = false;
    run();
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(disarm.current);
      window.clearTimeout(reset.current);
    },
    [],
  );

  const label = state === "done" ? doneLabel : state === "armed" ? armedLabel : children;
  return (
    <span className="echo-hold-button" data-state={state}>
      <HardwareButton
        variant={variant}
        size={size}
        icon={icon}
        disabled={disabled}
        fill={fill}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          press();
        }}
        onPointerUp={release}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            press();
          }
        }}
        /* Not on HardwareButton's typed interop list, but passed through and
           chained with its own handlers all the same. */
        {...({
          onPointerLeave: release,
          onPointerCancel: release,
          onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === " " || e.key === "Enter") release();
          },
        } as object)}
        onClick={(e) => {
          // A click with no press behind it (assistive tech, a script) arms it.
          if (e.detail !== 0 || state !== "idle" || held.current) return;
          setState("armed");
          window.clearTimeout(disarm.current);
          disarm.current = window.setTimeout(() => setState((s) => (s === "armed" ? "idle" : s)), 5000);
        }}
      >
        {label}
      </HardwareButton>
      <span className="echo-hold-button__hint" aria-live="polite">
        {state === "armed" ? armedLabel : state === "done" ? doneLabel : ""}
      </span>
    </span>
  );
}
