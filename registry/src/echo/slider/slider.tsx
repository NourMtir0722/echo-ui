"use client";

/**
 * Slider. Base UI Slider behavior (keyboard,
 * drag, track-press, a11y) with a recessed rail + molded knob and a scrubbing
 * tick sound on each step — very hardware.
 *
 * The knob has mass, and it keeps its shape. Base UI puts the thumb at the
 * value instantly — the value, the range input and the screen reader never
 * wait — and the knob's visible parts catch up on a real spring:
 *   - hovered, it rises and leans toward the pointer;
 *   - held, it grows and lifts off the rail, the way a touched control does
 *     on iOS, and stays glued to the hand while dragged;
 *   - pulled past either end, it rubber-bands, giving less the further you go;
 *   - a press on the rail throws it across, landing with a little bounce.
 * The lit fill rides with the knob, so the light always ends under it.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { forwardRef, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import type { EchoInterop, EchoSliderChangeEvent } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import {
  createSpring,
  rubberband,
  timing,
  useReducedMotionRef,
  watchTravel,
  type Spring,
} from "echo-ui-core/tactile";
import "./slider.css";

export type SliderSize = "sm" | "md";

interface SliderOwnProps extends EchoInterop {
  /**
   * `md` (default) is the fader: a 10px rail and a 28px knob. `sm` is a
   * 6px rail and a 20px knob, for dense rows — inline settings, a mixer strip,
   * a control inside a table. Two sizes, not a scale: a slider is either the
   * control you came for or one of many.
   */
  size?: SliderSize;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number, eventDetails: EchoSliderChangeEvent) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type SliderProps = SliderOwnProps & AccessibleName;

/** `forwardRef`, not a `ref` prop — see the note on `Field`. */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    size = "md",
    onValueChange,
    defaultValue = 50,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    ...props
  },
  ref,
) {
  const sound = useSoundOptional();
  const last = useRef<number | null>(null);
  const reduced = useReducedMotionRef();
  const track = useRef<HTMLDivElement | null>(null);
  const thumb = useRef<HTMLDivElement | null>(null);
  const travel = useRef<HTMLSpanElement | null>(null);
  const cap = useRef<HTMLSpanElement | null>(null);
  const fill = useRef<HTMLDivElement | null>(null);
  const hovered = useRef(false);
  const dragging = useRef(false);
  // Two springs, summed: how far the knob still has to travel to its value,
  // and how far it is being pulled past an end.
  const lag = useRef<Spring | null>(null);
  const pull = useRef<Spring | null>(null);

  useEffect(() => {
    const t = thumb.current;
    const r = track.current;
    if (!t || !r) return;
    const draw = () => {
      const x = (lag.current?.value ?? 0) + (pull.current?.value ?? 0);
      gsap.set([travel.current, fill.current], { x });
    };
    lag.current = createSpring(0, springs.bouncy, draw);
    pull.current = createSpring(0, springs.bouncy, draw);

    /*
     * Base UI moves the thumb by rewriting its inline --position; watchTravel
     * sees each move before paint. The spring absorbs the jump and carries
     * the knob the rest of the way — keeping whatever momentum it had, so a
     * knob redirected mid-flight bends rather than stopping dead.
     */
    const stop = watchTravel({
      part: t,
      frame: r,
      on: t,
      attributes: ["style"],
      onMove: (dx) => {
        const spring = lag.current;
        if (!spring || reduced.current) return;
        const jump = Math.abs(dx) > 20;
        spring.shift(dx);
        spring.to(0, {
          config: jump ? springs.bouncy : dragging.current ? springs.track : springs.snappy,
        });
      },
    });

    // Pulled past an end while held: rubber-band the knob after the pointer.
    const moved = (e: PointerEvent) => {
      if (!dragging.current || reduced.current || !pull.current) return;
      const rr = r.getBoundingClientRect();
      const over = e.clientX < rr.left ? e.clientX - rr.left : e.clientX > rr.right ? e.clientX - rr.right : 0;
      pull.current.to(rubberband(over, 36), { config: springs.track });
    };
    window.addEventListener("pointermove", moved);

    const parts = [travel.current, cap.current, fill.current];
    return () => {
      stop();
      window.removeEventListener("pointermove", moved);
      lag.current?.stop();
      pull.current?.stop();
      gsap.killTweensOf(parts);
    };
  }, [reduced]);

  /*
   * The knob's pose. It never deforms: hovered it rises a little, held it
   * grows and lifts clear of the rail, and it keeps its round shape throughout.
   */
  const pose = useCallback(
    (name: "lift" | "rebound") => {
      const c = cap.current;
      if (!c) return;
      const held = dragging.current;
      const up = hovered.current || held;
      const vars = { "--lift": held ? 1 : up ? 0.6 : 0 };
      if (reduced.current) {
        gsap.set(c, vars);
        return;
      }
      gsap.to(c, {
        ...timing(name),
        overwrite: "auto",
        ...vars,
        scale: held ? 1.22 : up ? 1.1 : 1,
        ...(held || !up ? { x: 0 } : {}),
      });
    },
    [reduced],
  );

  useEffect(() => {
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      pull.current?.to(0, { config: springs.bouncy });
      pose("rebound");
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [pose]);

  return (
    <BaseSlider.Root
      ref={ref}
      className="echo-slider"
      data-size={size}
      defaultValue={defaultValue}
      onValueChange={(value, eventDetails) => {
        // Tick once per step change (Base UI already fires on change).
        if (value !== last.current) {
          last.current = value;
          sound?.play("tap");
        }
        onValueChange?.(value, eventDetails);
      }}
      {...props}
    >
      <BaseSlider.Control
        className="echo-slider__control"
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || props.disabled) return;
          hovered.current = true;
          pose("lift");
        }}
        onPointerMove={(e) => {
          // Leaning toward the pointer: the knob notices you before you touch it.
          const c = cap.current;
          const t = thumb.current;
          if (!c || !t || e.pointerType !== "mouse" || dragging.current || reduced.current) return;
          if (props.disabled) return;
          const tr = t.getBoundingClientRect();
          const d = e.clientX - (tr.left + tr.width / 2);
          gsap.to(c, { ...timing("follow"), overwrite: "auto", x: Math.max(-6, Math.min(6, d * 0.12)) });
        }}
        onPointerLeave={() => {
          hovered.current = false;
          if (!dragging.current) pose("rebound");
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || props.disabled) return;
          dragging.current = true;
          pose("lift");
        }}
      >
        <BaseSlider.Track ref={track} className="echo-slider__track">
          {/* The rail clips the fill, which slides with the knob. */}
          <span className="echo-slider__rail" aria-hidden>
            <BaseSlider.Indicator ref={fill} className="echo-slider__indicator" />
          </span>
          {/* aria-label goes on the Thumb, which owns the hidden range input. */}
          <BaseSlider.Thumb
            ref={thumb}
            className="echo-slider__thumb"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
          >
            <span ref={travel} className="echo-slider__travel" aria-hidden>
              <span ref={cap} className="echo-slider__cap">
                <span className="echo-slider__grip" />
              </span>
            </span>
          </BaseSlider.Thumb>
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
});
