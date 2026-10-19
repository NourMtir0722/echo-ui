"use client";

/**
 * NumberField / Stepper. Base UI NumberField
 * behavior — typing, arrow keys, alt/shift step sizes, clamping, form
 * semantics — skinned as a machined readout between two molded step caps.
 *
 * The label doubles as a SCRUB HANDLE: drag it left/right to dial the value.
 * The spec calls this out as "very hardware-feeling", and it is the reason
 * this component is worth wrapping rather than reaching for a plain input.
 *
 * Sound is driven from onValueChange and deduped per integer step, the same
 * way Slider does it — a scrub drag fires continuously, and playing a click
 * per event would machine-gun.
 *
 * With `roll`, a step rolls the digits (useRoll): each steps through the
 * ones in between, drawn over the input while it goes. Without it, the whole
 * number slides in the way it went.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import type { EchoNumberFieldChangeEvent, EchoTextInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { timing, useCapPhysics, useReducedMotionRef, useWellMotion } from "echo-ui-core/tactile";
import gsap from "gsap";
import { useRoll } from "../roll";
import { useControlSize, type ControlSize } from "../size";
import "./number-field.css";

export interface NumberFieldProps extends EchoTextInterop {
  /** Visible label; also the scrub handle and the input's accessible name. */
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (
    value: number | null,
    eventDetails: EchoNumberFieldChangeEvent,
  ) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Step size while holding shift. Default 10. */
  largeStep?: number;
  /** Step size while holding alt. Default 0.1. */
  smallStep?: number;
  /** Accessible name for the decrement cap. Default "Decrease". */
  decrementLabel?: string;
  /** Accessible name for the increment cap. Default "Increase". */
  incrementLabel?: string;
  /**
   * A step rolls the digits, each stepping through the ones in between,
   * instead of sliding the whole number in. Typing never rolls.
   */
  roll?: boolean;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a Field or HardwareButton of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
}

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref
 * lands on the INPUT, which is what a form library reads and focuses.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    label,
    onValueChange,
    decrementLabel = "Decrease",
    incrementLabel = "Increase",
    roll = false,
    size: ownSize,
    autoFocus,
    onBlur,
    onFocus,
    onKeyDown,
    inputMode,
    maxLength,
    minLength,
    pattern,
    placeholder,
    autoComplete,
    ...props
  },
  ref,
) {
  const sound = useSoundOptional();
  const size = useControlSize(ownSize);
  // Seeded with the starting value, so the very first change can roll too.
  const start = props.value ?? props.defaultValue;
  const lastStep = useRef<number | null>(start == null ? null : Math.round(start));
  const reduced = useReducedMotionRef();
  const input = useRef<HTMLInputElement | null>(null);
  // The readout is a typing well of its own (useWellMotion), like a code
  // window: it sinks while focused and takes each digit as a strike.
  const well = useWellMotion<HTMLInputElement>();
  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      well(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [ref, well],
  );

  // roll: what the input shows, read back after Base UI has formatted it
  // ("1,000", not 1000), and whether the last change was typed. A typed
  // change jumps; a step rolls from the old text to the new.
  const [readout, setReadout] = useState("");
  const [typed, setTyped] = useState(true);
  const readBack = useCallback(() => {
    requestAnimationFrame(() => {
      if (input.current) setReadout(input.current.value);
    });
  }, []);
  const shown = useRoll(readout, { enabled: roll && !typed });
  const rolling = roll && shown !== readout;
  // A controlled value can change without a step; start from what's shown.
  useEffect(() => {
    if (roll) readBack();
  }, [roll, readBack, props.value]);

  const readoutInput = (
    <BaseNumberField.Input
      ref={setInput}
      className="echo-number-field__input"
      aria-label={label}
      /*
       * Spread only when set. Base UI's Input brings its own `inputMode`
       * and its own key handling for the steppers; an explicit `undefined`
       * overrides them rather than leaving them alone.
       */
      {...(autoFocus ? { autoFocus } : {})}
      {...(onBlur ? { onBlur } : {})}
      {...(onFocus ? { onFocus } : {})}
      {...(onKeyDown ? { onKeyDown } : {})}
      {...(inputMode ? { inputMode } : {})}
      {...(maxLength !== undefined ? { maxLength } : {})}
      {...(minLength !== undefined ? { minLength } : {})}
      {...(pattern ? { pattern } : {})}
      {...(placeholder ? { placeholder } : {})}
      {...(autoComplete ? { autoComplete } : {})}
    />
  );

  return (
    <BaseNumberField.Root
      className="echo-number-field"
      data-size={size}
      onValueChange={(value, eventDetails) => {
        // One click per whole step, however the value arrived.
        const step = value == null ? null : Math.round(value);
        if (step !== lastStep.current) {
          // The number rolls the way it went: up from below as it climbs,
          // down from above as it falls. Not while typing — the text is the
          // user's own there.
          const el = input.current;
          const was = lastStep.current;
          if (el && step !== null && was !== null && eventDetails.reason !== "input-change" && !reduced.current && !roll) {
            const dir = step > was ? 1 : -1;
            // yPercent, not y: y is the well's own sink, and the two add up.
            gsap.fromTo(el, { yPercent: 20 * dir, opacity: 0.35 }, { yPercent: 0, opacity: 1, ...timing("lift"), overwrite: "auto" });
          }
          lastStep.current = step;
          sound?.play("tap");
        }
        if (roll) {
          setTyped(eventDetails.reason === "input-change");
          readBack();
        }
        onValueChange?.(value, eventDetails);
      }}
      data-rolling={rolling ? "" : undefined}
      {...props}
    >
      <BaseNumberField.ScrubArea className="echo-number-field__scrub">
        <label className="echo-number-field__label">{label}</label>
        <BaseNumberField.ScrubAreaCursor />
      </BaseNumberField.ScrubArea>

      <BaseNumberField.Group className="echo-number-field__group">
        <Step part={BaseNumberField.Decrement} label={decrementLabel}>
          −
        </Step>
        {roll ? (
          <span className="echo-number-field__window">
            {readoutInput}
            {/* The digits in between are drawn, not read: the input says the value. */}
            <span className="echo-number-field__roll" aria-hidden="true" hidden={!rolling}>
              {shown}
            </span>
          </span>
        ) : (
          readoutInput
        )}
        <Step part={BaseNumberField.Increment} label={incrementLabel}>
          +
        </Step>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
});

/* A stepper is a molded cap: it rises on hover, travels onto its seam when
   pressed and springs back (useCapPhysics), and holding it still repeats. */
function Step({
  part: Part,
  label,
  children,
}: {
  part: typeof BaseNumberField.Increment | typeof BaseNumberField.Decrement;
  label: string;
  children: ReactNode;
}) {
  const cap = useCapPhysics<HTMLButtonElement>({ travel: 2, tilt: 6 });
  return (
    <Part
      ref={cap.ref}
      className="echo-number-field__step"
      aria-label={label}
      onPointerEnter={cap.handlers.onPointerEnter}
      onPointerMove={cap.handlers.onPointerMove}
      onPointerLeave={cap.handlers.onPointerLeave}
      onPointerDown={cap.handlers.onPointerDown}
      onPointerUp={cap.handlers.onPointerUp}
      onPointerCancel={cap.handlers.onPointerCancel}
      onKeyDown={cap.handlers.onKeyDown}
      onKeyUp={cap.handlers.onKeyUp}
      onBlur={cap.handlers.onBlur}
    >
      {children}
    </Part>
  );
}
