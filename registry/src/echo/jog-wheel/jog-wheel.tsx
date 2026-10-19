"use client";

/**
 * JogWheel. A knob with no ends: turn it and it moves a value by steps, as
 * far as you like, the way a video editor's jog wheel or a clicky scroll
 * wheel does. Turn slowly and it moves one step per click; spin it and the
 * steps grow with the speed, so a long way is a quick flick.
 *
 * It's Knob's own cap, well and pointer, larger, with its scale engraved on
 * the cap so you can see it turn. For assistive technology it's a spin
 * button (it has no ends to be a slider between): arrow keys step, Shift or
 * Page Up/Down take ten, and a `min` and `max` add Home and End.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { createSpring, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { angleAround, spinSteps, wheelDegrees } from "./spin";
import "../knob/knob.css";
import "./jog-wheel.css";

export interface JogWheelProps extends EchoInterop {
  /** What it moves: the label under it, and the accessible name. */
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  step?: number;
  /** Optional ends. Without them it turns forever. */
  min?: number;
  max?: number;
  /** How the value reads, under the wheel and to assistive tech ("00:01:12.08"). */
  formatValue?: (value: number) => string;
  /** `md` 96px (default) or `lg` 128px across. */
  size?: "md" | "lg";
}

/** Degrees of turn per step at a slow turn: a click every notch. */
const NOTCH = 15;
const DETENT: SoundRecipe = { wave: "square", freq: 2400, decay: 0.01, gain: 0.04 };

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the spin button.
 */
export const JogWheel = forwardRef<HTMLDivElement, JogWheelProps>(function JogWheel(
  {
    label,
    value,
    defaultValue,
    onValueChange,
    step = 1,
    min,
    max,
    formatValue = (v) => String(v),
    size = "md",
    disabled = false,
    name,
    onKeyDown: onKeyDownProp,
    ...interop
  },
  ref,
) {
  const [inner, setInner] = useState(defaultValue ?? min ?? 0);
  const current = value ?? inner;
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const rotor = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  const latest = useRef(current);
  latest.current = current;
  /** How far the cap has turned, in degrees, since it appeared: it never wraps. */
  const turned = useRef(0);

  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const commit = useCallback(
    (steps: number) => {
      if (!steps) return;
      const next = clamp(Number((latest.current + steps * step).toFixed(10)));
      if (next === latest.current) return;
      latest.current = next;
      if (value === undefined) setInner(next);
      sound?.play(DETENT);
      onValueChange?.(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, onValueChange, sound, step, min, max],
  );

  useEffect(() => {
    const el = rotor.current;
    if (!el) return;
    spring.current = createSpring(0, { duration: 0.18, bounce: 0.2 }, (a) => {
      el.style.rotate = `${a.toFixed(2)}deg`;
    });
    return () => spring.current?.stop();
  }, []);
  const turnTo = (degrees: number) => {
    turned.current = degrees;
    if (reduced.current) spring.current?.set(degrees);
    else spring.current?.to(degrees);
  };

  /*
   * Dragging round the centre: the angle it's turned through, in notches,
   * faster for a quicker turn. Over the hub the angle means nothing (a hair's
   * move swings it a quarter turn), so the turn waits until the hand is out
   * of it again, and picks up from there.
   */
  const drag = useRef<{ angle: number | null; t: number; owed: number } | null>(null);
  const well = useRef<HTMLDivElement | null>(null);
  const angleAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return angleAround(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width / 2);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    drag.current = { angle: angleAt(e), t: e.timeStamp, owed: 0 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const a = angleAt(e);
    if (a === null || d.angle === null) {
      d.angle = a;
      d.t = e.timeStamp;
      return;
    }
    let delta = a - d.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const seconds = Math.max(0.001, (e.timeStamp - d.t) / 1000);
    d.angle = a;
    d.t = e.timeStamp;
    turnTo(turned.current + delta);
    const { steps, owed } = spinSteps(delta, seconds, d.owed, NOTCH);
    d.owed = owed;
    commit(steps);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  /*
   * The wheel turns it once it has focus, so a page scroll never catches on
   * it. It turns as far as the wheel scrolled (a mouse's click is a notch, a
   * trackpad's small deltas add up to one), and like a hand, faster is further.
   */
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    const el = well.current;
    if (!el) return;
    let owed = 0;
    let last = 0;
    const wheel = (e: WheelEvent) => {
      if (disabled || document.activeElement !== el) return;
      const degrees = wheelDegrees(e, NOTCH);
      if (!degrees) return;
      e.preventDefault();
      const seconds = Math.min(0.25, Math.max(0.001, (e.timeStamp - last) / 1000));
      last = e.timeStamp;
      const turn = spinSteps(degrees, seconds, owed, NOTCH);
      owed = turn.owed;
      turned.current += degrees;
      if (reduced.current) spring.current?.set(turned.current);
      else spring.current?.to(turned.current);
      commitRef.current(turn.steps);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [disabled, reduced]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler runs first and may take the key for itself.
    onKeyDownProp?.(e);
    if (e.defaultPrevented || disabled) return;
    const big = e.shiftKey ? 10 : 1;
    let steps: number | null =
      e.key === "ArrowUp" || e.key === "ArrowRight"
        ? big
        : e.key === "ArrowDown" || e.key === "ArrowLeft"
          ? -big
          : e.key === "PageUp"
            ? 10
            : e.key === "PageDown"
              ? -10
              : null;
    if (steps === null && e.key === "Home" && min !== undefined) steps = Math.round((min - latest.current) / step);
    if (steps === null && e.key === "End" && max !== undefined) steps = Math.round((max - latest.current) / step);
    if (steps === null) return;
    e.preventDefault();
    turnTo(turned.current + Math.sign(steps) * Math.min(Math.abs(steps), 6) * NOTCH);
    commit(steps);
  };

  const text = formatValue(current);
  return (
    <div className="echo-knob echo-jog-wheel" data-size={size} data-disabled={disabled || undefined}>
      <div className="echo-knob__dial echo-jog-wheel__dial">
        <div
          ref={(node) => {
            well.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className="echo-knob__well"
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuenow={current}
          aria-valuetext={text}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-disabled={disabled || undefined}
          {...interop}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className="echo-knob__cap">
            {/* The rotor turns, not the cap: the engraving and the finger dimple turn with it. */}
            <div ref={rotor} className="echo-knob__rotor echo-jog-wheel__rotor">
              <svg className="echo-jog-wheel__engraving" viewBox="-50 -50 100 100" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => {
                  const a = (i * 15 * Math.PI) / 180;
                  const at = (r: number, f: (x: number) => number) => Math.round(f(a) * r * 100) / 100;
                  return <line key={i} x1={at(38, Math.sin)} y1={-at(38, Math.cos)} x2={at(46, Math.sin)} y2={-at(46, Math.cos)} />;
                })}
              </svg>
              <span className="echo-jog-wheel__dimple" />
            </div>
          </div>
        </div>
      </div>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <span className="echo-knob__label" aria-hidden="true">
        {label}
      </span>
      <span className="echo-knob__value" aria-hidden="true">
        {text}
      </span>
    </div>
  );
});
