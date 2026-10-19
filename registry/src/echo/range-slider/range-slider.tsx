"use client";

/**
 * RangeSlider. Two knobs on one rail, for a span: a price range, a time
 * window, frequencies to keep. The rail lights between them. Each knob keeps
 * Slider's mass: Base UI puts it at its value at once (the value, the range
 * inputs and the screen reader never wait) and the knob you see catches up on
 * a spring. They can't cross; `minGap` keeps them apart by that many steps.
 *
 * The same rail, fill and knobs as Slider, so a Slider and a RangeSlider
 * side by side are one control language. Each knob is its own slider for
 * assistive tech, named "{label}, minimum" and "{label}, maximum".
 */
import { forwardRef, useEffect, useRef } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import gsap from "gsap";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import { createSpring, useReducedMotionRef, watchTravel, type Spring } from "echo-ui-core/tactile";
import "../slider/slider.css";
import "./range-slider.css";

interface RangeSliderOwnProps extends EchoInterop {
  /** What the span is ("Price"); each knob is named from it. */
  label: string;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How many steps the knobs keep between them. Default 1. */
  minGap?: number;
  /** `md` (default) or `sm`, as Slider. */
  size?: "sm" | "md";
  /** How a value reads for assistive tech ("$40"). Default: the number. */
  formatValue?: (value: number) => string;
}

function Knob({ index, label, formatValue }: { index: number; label: string; formatValue?: (value: number) => string }) {
  const thumb = useRef<HTMLDivElement | null>(null);
  const travel = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotionRef();
  useEffect(() => {
    const t = thumb.current;
    const frame = t?.parentElement;
    if (!t || !frame) return;
    const lag: Spring = createSpring(0, springs.bouncy, (x) => gsap.set(travel.current, { x }));
    const stop = watchTravel({
      part: t,
      frame,
      on: t,
      attributes: ["style"],
      onMove: (dx) => {
        if (reduced.current) return;
        lag.shift(dx);
        lag.to(0, { config: Math.abs(dx) > 20 ? springs.bouncy : springs.track });
      },
    });
    return () => {
      stop();
      lag.stop();
    };
  }, [reduced]);
  return (
    <BaseSlider.Thumb
      ref={thumb}
      index={index}
      className="echo-slider__thumb"
      aria-label={label}
      {...(formatValue ? { getAriaValueText: (_: string, v: number) => formatValue(v) } : {})}
    >
      <span ref={travel} className="echo-slider__travel" aria-hidden>
        <span className="echo-slider__cap">
          <span className="echo-slider__grip" />
        </span>
      </span>
    </BaseSlider.Thumb>
  );
}

export type RangeSliderProps = RangeSliderOwnProps;

/** `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on the root. */
export const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(function RangeSlider({
  label,
  value,
  defaultValue = [25, 75],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  minGap = 1,
  size = "md",
  formatValue,
  ...interop
}, ref) {
  const sound = useSoundOptional();
  const last = useRef<string>("");
  return (
    <BaseSlider.Root
      ref={ref}
      className="echo-slider echo-range-slider"
      data-size={size}
      {...(value !== undefined ? { value } : { defaultValue })}
      min={min}
      max={max}
      step={step}
      minStepsBetweenValues={minGap}
      {...interop}
      onValueChange={(next) => {
        const pair = next as number[];
        const key = pair.join(",");
        if (key !== last.current) {
          last.current = key;
          sound?.play("tap");
        }
        onValueChange?.([pair[0]!, pair[1]!]);
      }}
    >
      <BaseSlider.Control className="echo-slider__control">
        <BaseSlider.Track className="echo-slider__track">
          <span className="echo-slider__rail" aria-hidden>
            <BaseSlider.Indicator className="echo-slider__indicator" />
          </span>
          <Knob index={0} label={`${label}, minimum`} formatValue={formatValue} />
          <Knob index={1} label={`${label}, maximum`} formatValue={formatValue} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
});
