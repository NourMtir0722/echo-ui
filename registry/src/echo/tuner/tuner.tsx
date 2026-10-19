"use client";

/**
 * Tuner. A number picked the way a radio is tuned: a long scale printed on
 * the screen slides under a fixed, lit needle, and the reading above it
 * follows. Drag it and it moves with your hand; flick it and it coasts, then
 * settles onto a step; every tick that passes the needle clicks. Past either
 * end it gives a little and springs back. The scale's numbers dim toward both
 * edges, so the strip reads as a drum turning away from you.
 *
 * It fits a big range into a small width: the range scrolls instead of being
 * squeezed, so every step stays a finger's width apart (weight, height, a tip,
 * a zoom level, a frequency).
 *
 * For assistive technology it is a slider: `role="slider"` named by `label`,
 * with the reading and its unit as `aria-valuetext`, and every slider key:
 * arrows step, Page Up/Down move a numbered tick, Home and End go to the ends.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { createSpring, rubberband, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { SegmentDisplay } from "../segment-display";
import { decimalsFor, digitsFor, indexOf, lastIndex, niceLabelEvery, projectFlick, tickKind, valueAt } from "./scale";
import "../scope/scope.css";
import "./tuner.css";

export interface TunerProps extends EchoInterop {
  /** What it sets: the machine label over the reading, and the accessible name. */
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Engraved after the reading, and said with it: "kg", "MHz". */
  unit?: string;
  /** The numbered ticks, in value units. Default: the nicest number that's at least eight steps. */
  labelEvery?: number;
  /** How the value is said to assistive technology. Default: the reading and its unit ("72.5 kg"). */
  formatValue?: (value: number) => string;
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

/** Pixels between two steps on the scale. */
const SPACING = 10;
/** Ticks drawn each side of the needle: wider than any scale is shown. */
const REACH = 72;
const DETENT: SoundRecipe = { wave: "square", freq: 2200, decay: 0.012, gain: 0.045 };
const FOLLOW = { duration: 0.28, bounce: 0 };
const GLIDE = { duration: 0.7, bounce: 0 };

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the slider element, which is what a form library focuses.
 */
export const Tuner = forwardRef<HTMLDivElement, TunerProps>(function Tuner(
  {
    label,
    value,
    defaultValue,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    unit,
    labelEvery,
    formatValue,
    screen = "emissive",
    disabled = false,
    name,
    onKeyDown: onKeyDownProp,
    ...interop
  },
  ref,
) {
  const last = lastIndex(min, max, step);
  const every = labelEvery ?? niceLabelEvery(step);
  const [inner, setInner] = useState(() => indexOf(defaultValue ?? min, min, max, step));
  const index = value === undefined ? inner : indexOf(value, min, max, step);
  const current = valueAt(index, min, step);

  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const scale = useRef<HTMLDivElement | null>(null);
  const strip = useRef<SVGGElement>(null);
  const spring = useRef<Spring | null>(null);
  const committed = useRef(index);
  committed.current = index;
  /** The index the ticks were drawn around, so a frame between renders lines up with what's drawn. */
  const drawnAround = useRef(index);
  drawnAround.current = index;
  /**
   * Who is moving the scale. Under the hand (a drag or a flick) the reading
   * follows the scale step by step, each one clicking; sent by a key or from
   * outside, the reading is already decided and the scale just travels there.
   */
  const mover = useRef<"hand" | "set">("set");
  /** The index the scale itself last reported, so its own report isn't mistaken for a change from outside. */
  const reported = useRef(index);
  const drag = useRef<{ x: number; from: number; samples: { x: number; t: number }[] } | null>(null);

  const place = useCallback((position: number) => {
    const g = strip.current;
    if (g) g.setAttribute("transform", `translate(${(drawnAround.current * SPACING - position).toFixed(2)} 0)`);
  }, []);

  const commit = useCallback(
    (next: number) => {
      const i = Math.min(last, Math.max(0, next));
      reported.current = i;
      if (i === committed.current) return;
      committed.current = i;
      if (value === undefined) setInner(i);
      sound?.play(DETENT);
      onValueChange?.(valueAt(i, min, step));
    },
    [last, value, sound, onValueChange, min, step],
  );
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // One spring for the scale's whole life: it follows a drag, carries a
  // flick, and settles on each step.
  useEffect(() => {
    spring.current = createSpring(committed.current * SPACING, FOLLOW, (position) => {
      place(position);
      if (mover.current === "hand") commitRef.current(Math.round(position / SPACING));
    });
    return () => spring.current?.stop();
  }, [place]);

  // A reading set from outside travels there.
  useEffect(() => {
    const s = spring.current;
    if (!s || drag.current || index === reported.current) return;
    reported.current = index;
    mover.current = "set";
    if (reduced.current) s.set(index * SPACING);
    else s.to(index * SPACING, { config: FOLLOW });
  }, [index, reduced]);

  // After a render the ticks are drawn around the new index: line them up.
  useLayoutEffect(() => {
    place(spring.current?.value ?? index * SPACING);
  });

  /* Dragging: the scale moves 1:1 with the hand, and gives past the ends. */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    mover.current = "hand";
    const from = spring.current?.value ?? index * SPACING;
    spring.current?.set(from);
    drag.current = { x: e.clientX, from, samples: [{ x: e.clientX, t: e.timeStamp }] };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const raw = d.from - (e.clientX - d.x);
    const end = last * SPACING;
    const past = raw < 0 ? raw : raw > end ? raw - end : 0;
    const at = past ? (raw < 0 ? 0 : end) + rubberband(past, 120) : raw;
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    spring.current?.set(at);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const s = spring.current;
    if (!d || !s) return;
    const first = d.samples[0]!;
    const final = d.samples[d.samples.length - 1]!;
    const span = (final.t - first.t) / 1000;
    // Pointer velocity, in scale units per second (the scale runs against the hand).
    const velocity = span > 0 && e.timeStamp - final.t < 90 ? -(final.x - first.x) / span : 0;
    if (reduced.current) {
      s.set(Math.min(last, Math.max(0, Math.round(s.value / SPACING))) * SPACING);
      return;
    }
    s.to(projectFlick(s.value, velocity, SPACING, last), { config: velocity ? GLIDE : FOLLOW, velocity });
  };

  /** Go to a step decided up front (a key, the wheel): the reading changes once, the scale travels. */
  const goTo = useCallback(
    (next: number) => {
      const to = Math.min(last, Math.max(0, next));
      mover.current = "set";
      commitRef.current(to);
      const s = spring.current;
      if (!s) return;
      if (reduced.current) s.set(to * SPACING);
      else s.to(to * SPACING, { config: FOLLOW });
    },
    [last, reduced],
  );

  // A sideways wheel or trackpad swipe turns it; an up/down wheel only once
  // it has focus, so scrolling a page never catches on it. Native listener:
  // React's are passive and couldn't keep the page still.
  useEffect(() => {
    const el = scale.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (disabled) return;
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!sideways && document.activeElement !== el) return;
      e.preventDefault();
      const by = sideways ? e.deltaX : -e.deltaY;
      if (Math.abs(by) < 1) return;
      goTo(committed.current + Math.sign(by) * Math.max(1, Math.round(Math.abs(by) / SPACING)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [disabled, goTo]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler runs first and may take the key for itself.
    onKeyDownProp?.(e);
    if (e.defaultPrevented || disabled) return;
    const big = Math.max(1, Math.round(every / step));
    const at = committed.current;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? at + 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? at - 1
          : e.key === "PageUp"
            ? at + big
            : e.key === "PageDown"
              ? at - big
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? last
                  : null;
    if (next === null) return;
    e.preventDefault();
    goTo(next);
  };

  const reading = current.toFixed(decimalsFor(min, step));
  const said = formatValue ? formatValue(current) : unit ? `${reading} ${unit}` : reading;

  // The ticks round the needle, drawn about the current index.
  const ticks: { x: number; kind: ReturnType<typeof tickKind>; label?: string }[] = [];
  for (let i = Math.max(0, index - REACH); i <= Math.min(last, index + REACH); i++) {
    const kind = tickKind(i, min, step, every);
    ticks.push({ x: (i - index) * SPACING, kind, label: kind === "major" ? String(valueAt(i, min, step)) : undefined });
  }
  const span = REACH * SPACING;

  return (
    <div className="echo-tuner" data-disabled={disabled || undefined}>
      <div className="echo-tuner__screen" data-echo-screen={screen === "reflective" ? "reflective" : undefined}>
        <span className="echo-tuner__label" aria-hidden="true">
          {label}
        </span>
        <div className="echo-tuner__reading" aria-hidden="true">
          <SegmentDisplay
            variant="flush"
            label={label}
            value={reading}
            digits={digitsFor(min, max, step)}
            unit={unit}
          />
        </div>
        <div
          ref={(node) => {
            scale.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className="echo-tuner__scale"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={valueAt(last, min, step)}
          aria-valuenow={current}
          aria-valuetext={said}
          aria-orientation="horizontal"
          aria-disabled={disabled || undefined}
          {...interop}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className="echo-tuner__drum" aria-hidden="true">
            <svg className="echo-tuner__ticks" viewBox={`${-span} 0 ${2 * span} 64`} width={2 * span} height={64}>
              <g ref={strip}>
                {ticks.map((t) => (
                  <g key={t.x}>
                    <line x1={t.x} x2={t.x} y1={6} y2={t.kind === "major" ? 30 : t.kind === "mid" ? 21 : 14} data-kind={t.kind} />
                    {t.label !== undefined ? (
                      <text x={t.x} y={50}>
                        {t.label}
                      </text>
                    ) : null}
                  </g>
                ))}
              </g>
            </svg>
          </div>
          <span className="echo-tuner__needle" aria-hidden="true" />
        </div>
      </div>
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
});
