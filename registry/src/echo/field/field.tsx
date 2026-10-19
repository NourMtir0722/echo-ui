"use client";

/**
 * Field. A text input sunk into a recessed well whose inner edge lights in
 * the accent on focus — the "recessed well for anything you
 * type into" half of the device material language. Composes var(--echo-*).
 * The well moves with you (useWellMotion): pressed in, struck by each key.
 */
import { forwardRef, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { EchoTextInterop } from "echo-ui-core/types";
import { Field as BaseField } from "@base-ui/react/field";
import { createSpring, useReducedMotionRef, useWellMotion } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import "./field.css";

interface FieldOwnProps extends EchoTextInterop {
  /**
   * Restated from `EchoTextInterop` because Field is where the guidance lives:
   * what the value is, for autofill and assistive tech — "email",
   * "current-password", "one-time-code". WCAG 1.3.5 asks for it on any field
   * collecting the user's own information.
   */
  autoComplete?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Render the input value in the machine (mono) voice — codes, timers. */
  mono?: boolean;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a HardwareButton or Select of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
  /**
   * Engraved into the well before the text: a search icon, a currency sign,
   * a protocol ("https://"). Decoration: say the same in the label.
   */
  start?: ReactNode;
  /**
   * In the well after the text: a unit ("ms"), or a small control (a clear
   * ×, show password) as a `size="sm"` iconOnly HardwareButton with its own
   * name.
   */
  end?: ReactNode;
  type?: string;
  /**
   * Help text under the field. It's linked to the input, so a screen reader
   * reads it after the name.
   */
  description?: ReactNode;
  /**
   * What's wrong, in words. While it's set the field is invalid: the message
   * shows under it with a square pip (the danger shape), the input gets
   * `aria-invalid`, and the message is linked to it. Clear it when fixed.
   */
  error?: string;
  /** Ids of other text that describes the field, read after its own description and error. */
  "aria-describedby"?: string;
}

/**
 * A field has to have a name. A visible `label` is
 * the one to reach for; `aria-label` or `aria-labelledby` are for a field whose
 * label is elsewhere on screen. Leaving all three out is a type error.
 */
type FieldName =
  | { label: string; "aria-label"?: string; "aria-labelledby"?: string }
  | { "aria-label": string; label?: string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; label?: string; "aria-label"?: string };

export type FieldProps = FieldOwnProps & FieldName;

/**
 * `forwardRef`, not a `ref` prop, and on purpose.
 *
 * On React 19 `ref` is an ordinary prop and this could be a plain function.
 * On React 18 it is not — React strips `ref` before the component runs, so
 * the same code would type-check, work on 19, and hand `register()` a ref
 * that is never populated on 18. Echo supports both until a major
 *; `forwardRef` behaves identically on each.
 *
 * The ref lands on the INPUT, not the wrapper: it is what a form library
 * reads `.value` from and what `shouldFocusError` calls `.focus()` on.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  {
    label,
    placeholder,
    value,
    defaultValue,
    onValueChange,
    mono = false,
    size: ownSize,
    start,
    end,
    disabled,
    type = "text",
    id,
    name,
    description,
    error,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    ...interop
  },
  ref,
) {
  // The well answers the hand (useWellMotion): it presses in when you click,
  // takes each key as a small strike, and the caret glides with weight.
  const well = useWellMotion<HTMLDivElement>();
  const size = useControlSize(ownSize);
  const root = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotionRef();

  // A new error shakes the field: a sideways shove that swings through and
  // settles on a spring, the way a latch that won't take the key bounces
  // back. The whole field, label and message with it, on the root: the well
  // belongs to useWellMotion, whose GSAP resets `translate` as it strikes.
  // Not on the first render, and not under reduced motion.
  const shownError = useRef(error);
  useEffect(() => {
    const was = shownError.current;
    shownError.current = error;
    const el = root.current;
    if (!el || !error || error === was || reduced.current) return;
    const spring = createSpring(0, { duration: 0.42, bounce: 0.55 }, (x) => {
      el.style.translate = Math.abs(x) < 0.05 ? "" : `${x.toFixed(2)}px 0`;
    });
    spring.to(0, { velocity: 320 });
    return () => spring.stop();
  }, [error, reduced]);

  /*
   * Base UI's Field owns the wiring: the label's `for`, `aria-describedby`
   * from the description and error, and `aria-invalid`. Echo owns the look.
   */
  return (
    <BaseField.Root
      ref={root}
      className="echo-field"
      data-size={size}
      disabled={disabled}
      invalid={error ? true : undefined}
      name={name}
    >
      {label && <BaseField.Label className="echo-field__label">{label}</BaseField.Label>}
      <div className="echo-field__well" ref={well} data-adorned={start != null || end != null ? "" : undefined}>
        <span className="echo-field__floor" data-echo-floor aria-hidden />
        {start != null ? (
          <span className="echo-field__adornment" data-side="start" aria-hidden="true">
            {start}
          </span>
        ) : null}
        <BaseField.Control
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onValueChange={(next) => onValueChange?.(next)}
          className={mono ? "echo-field__input echo-field__input--mono" : "echo-field__input"}
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? undefined : ariaLabelledby}
          aria-describedby={ariaDescribedby}
          {...interop}
        />
        {end != null ? (
          <span className="echo-field__adornment" data-side="end">
            {end}
          </span>
        ) : null}
        <span className="echo-field__caret" data-echo-caret aria-hidden />
      </div>
      {description != null && <BaseField.Description className="echo-field__description">{description}</BaseField.Description>}
      {error && (
        <BaseField.Error className="echo-field__error" match>
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
});
