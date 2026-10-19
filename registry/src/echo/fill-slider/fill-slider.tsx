"use client";

/**
 * FillSlider. The tall slider of a control centre: a tube in the chassis
 * that fills with lit plastic from the bottom, like Meter's, and follows your
 * finger anywhere on it. Brightness, volume, a level you set by eye.
 *
 * It's Base UI's slider, vertical: every slider key works (up and right to
 * raise, Page Up/Down a tenth, Home and End), and it clicks once a step. The
 * top of the fill is the handle, so there's no knob to aim for.
 */
import { forwardRef, useRef, type ReactNode } from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import type { EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import "./fill-slider.css";

export interface FillSliderProps extends EchoInterop {
  /** What it sets: engraved under the tube and its accessible name. */
  label: string;
  /** A glyph at the foot of the tube, over the fill. Decorative. */
  icon?: ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How the value is said to assistive technology. Default: a percent of the range. */
  formatValue?: (value: number) => string;
}

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the slider's root.
 */
export const FillSlider = forwardRef<HTMLDivElement, FillSliderProps>(function FillSlider(
  { label, icon, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, formatValue, disabled, name, ...interop },
  ref,
) {
  const sound = useSoundOptional();
  const last = useRef<number | null>(null);
  const said = (v: number) => formatValue?.(v) ?? `${Math.round(((v - min) / (max - min || 1)) * 100)}%`;
  return (
    <div className="echo-fill-slider" data-disabled={disabled || undefined}>
      <BaseSlider.Root
        ref={ref}
        className="echo-fill-slider__root"
        orientation="vertical"
        value={value}
        defaultValue={defaultValue ?? min}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        name={name}
        onValueChange={(next) => {
          const v = next as number;
          if (v !== last.current) {
            last.current = v;
            sound?.play("tap");
          }
          onValueChange?.(v);
        }}
        {...interop}
      >
        <BaseSlider.Control className="echo-fill-slider__control">
          <BaseSlider.Track className="echo-fill-slider__tube">
            <BaseSlider.Indicator className="echo-fill-slider__fill" />
            {icon ? (
              <span className="echo-fill-slider__icon" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <BaseSlider.Thumb className="echo-fill-slider__handle" aria-label={label} getAriaValueText={(_, v) => said(v)} />
          </BaseSlider.Track>
        </BaseSlider.Control>
      </BaseSlider.Root>
      <span className="echo-fill-slider__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
});
