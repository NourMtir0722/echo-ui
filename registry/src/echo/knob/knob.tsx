"use client";

/**
 * Knob. A molded rotary cap in its well, with a pointer engraved on it and
 * the scale around it. Drag it (up turns it up, or drag around it), turn it
 * with the wheel, or use the keys. It clicks at every step, settles onto each
 * detent on a spring, and past either end it gives a little and springs back.
 *
 * For assistive tech it is a slider: `role="slider"`, named by `label`, with
 * the value (and `formatValue`'s reading) and every slider key: arrows step,
 * Page Up/Down take ten, Home and End go to the ends.
 *
 * The knob is 270° of travel, from -135° to +135°.
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
import { createSpring, rubberband, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import "./knob.css";

interface KnobOwnProps extends EchoInterop {
  /** What it sets; the visible label and the accessible name. */
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How the value reads, shown under the knob and to assistive tech ("-6 dB"). */
  formatValue?: (value: number) => string;
  /** Ticks engraved around it. Default 11. */
  ticks?: number;
  /** `sm` 40px, `md` 56px (default), `lg` 72px across. */
  size?: "sm" | "md" | "lg";
}

export type KnobProps = KnobOwnProps;

const SWEEP = 270;
const DETENT: SoundRecipe = { wave: "square", freq: 2200, decay: 0.012, gain: 0.045 };

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the slider element, which is what a form library focuses.
 */
export const Knob = forwardRef<HTMLDivElement, KnobProps>(function Knob({
  label,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (v) => String(v),
  ticks = 11,
  size = "md",
  disabled = false,
  name,
  onKeyDown: onKeyDownProp,
  ...interop
}, ref) {
  const [inner, setInner] = useState(defaultValue ?? min);
  const current = value ?? inner;
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const cap = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  const latest = useRef(current);
  latest.current = current;

  const angle = (v: number) => ((v - min) / (max - min || 1)) * SWEEP - SWEEP / 2;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min);

  const commit = useCallback(
    (next: number) => {
      const v = snap(next);
      if (v === latest.current) return;
      latest.current = v;
      if (value === undefined) setInner(v);
      sound?.play(DETENT);
      onValueChange?.(v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, onValueChange, sound, min, max, step],
  );

  // The cap turns on a spring toward the value's angle: each detent lands
  // with a little settle, a jump swings.
  useEffect(() => {
    const el = cap.current;
    if (!el) return;
    spring.current = createSpring(angle(latest.current), { duration: 0.35, bounce: 0.35 }, (a) => {
      el.style.rotate = `${a.toFixed(2)}deg`;
    });
    el.style.rotate = `${angle(latest.current)}deg`;
    return () => spring.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const over = useRef(0);
  useEffect(() => {
    const to = angle(current) + over.current;
    if (reduced.current) spring.current?.set(to);
    else spring.current?.to(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Dragging: up (or right) turns it up; far past an end it gives, rubber-banded.
  const drag = useRef<{ y: number; x: number; from: number } | null>(null);
  const range = max - min;
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    drag.current = { y: e.clientY, x: e.clientX, from: latest.current };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // 200px of travel covers the whole range; shift for fine control.
    const px = d.y - e.clientY + (e.clientX - d.x) * 0.5;
    const raw = d.from + (px / (e.shiftKey ? 800 : 200)) * range;
    commit(raw);
    const past = raw > max ? raw - max : raw < min ? raw - min : 0;
    over.current = past ? rubberband((past / range) * SWEEP, 12) : 0;
    if (!reduced.current) spring.current?.to(angle(latest.current) + over.current, { config: { duration: 0.12, bounce: 0 } });
  };
  const onPointerUp = () => {
    drag.current = null;
    if (over.current) {
      over.current = 0;
      spring.current?.to(angle(latest.current));
    }
  };
  // The wheel turns it once it has focus (so a page scroll never grabs it);
  // a native listener, since React's are passive and couldn't keep the page still.
  const well = useRef<HTMLDivElement | null>(null);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    const el = well.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (disabled || document.activeElement !== el) return;
      e.preventDefault();
      commitRef.current(latest.current + (e.deltaY < 0 ? step : -step));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [disabled, step]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler runs first and may take the key for itself.
    onKeyDownProp?.(e);
    if (e.defaultPrevented || disabled) return;
    const big = Math.max(step, (max - min) / 10);
    const next =
      e.key === "ArrowUp" || e.key === "ArrowRight"
        ? latest.current + step
        : e.key === "ArrowDown" || e.key === "ArrowLeft"
          ? latest.current - step
          : e.key === "PageUp"
            ? latest.current + big
            : e.key === "PageDown"
              ? latest.current - big
              : e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : null;
    if (next === null) return;
    e.preventDefault();
    commit(next);
  };

  const text = formatValue(current);
  return (
    <div className="echo-knob" data-size={size} data-disabled={disabled || undefined}>
      <div className="echo-knob__dial">
        <svg className="echo-knob__scale" viewBox="-50 -50 100 100" aria-hidden="true">
          {Array.from({ length: Math.max(2, ticks) }, (_, i) => {
            const a = ((-SWEEP / 2 + (SWEEP * i) / (Math.max(2, ticks) - 1)) * Math.PI) / 180;
            const lit = (i / (Math.max(2, ticks) - 1)) * range + min <= current + 1e-9;
            // Rounded: the server's Math.sin and the browser's differ in the
            // last digits, which React reports as a hydration mismatch.
            const at = (r: number, f: (x: number) => number) => Math.round(f(a) * r * 100) / 100;
            return (
              <line
                key={i}
                x1={at(42, Math.sin)}
                y1={-at(42, Math.cos)}
                x2={at(48, Math.sin)}
                y2={-at(48, Math.cos)}
                data-lit={lit ? "" : undefined}
              />
            );
          })}
        </svg>
        <div
          ref={(node) => {
            well.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className="echo-knob__well"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
          aria-valuetext={text}
          aria-disabled={disabled || undefined}
          aria-orientation="vertical"
          {...interop}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className="echo-knob__cap">
            {/* The rotor turns, not the cap: a turning box grows its corners
                past the well, and it's the pointer that has to move. */}
            <div ref={cap} className="echo-knob__rotor">
              <span className="echo-knob__pointer" />
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
