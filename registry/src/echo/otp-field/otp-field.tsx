"use client";

/**
 * OtpField. The one-time code a sign-in
 * screen asks for, as a row of lit digit windows — Field's recessed well cut
 * into six screens, in the LCD voice, because a code is something the device
 * reports back at you.
 *
 * On Base UI's OTP Field, so the parts nobody sees are right: a pasted code
 * fills the row, arrow keys and Backspace walk it, `autocomplete="one-time-code"`
 * lets the phone offer the SMS code, and the whole row is one labelled group.
 */
import { forwardRef, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { attachWellMotion, timing, useReducedMotionRef } from "echo-ui-core/tactile";
import type { EchoTextInterop } from "echo-ui-core/types";
import { Field as BaseField } from "@base-ui/react/field";
import { OTPField as BaseOtp } from "@base-ui/react/otp-field";
import { useControlSize, type ControlSize } from "../size";
import "./otp-field.css";

interface OtpFieldOwnProps extends EchoTextInterop {
  /** How many digits. Default 6. */
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Fired when the last slot is filled — where a sign-in screen submits. */
  onComplete?: (value: string) => void;
  /** Hide the characters, for a code that is a secret rather than a one-time one. */
  mask?: boolean;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a Field or HardwareButton of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
  /** Help text under the row, linked to the group. */
  description?: ReactNode;
  /** What's wrong, in words. While it's set the group is invalid and the message shows. */
  error?: string;
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

export type OtpFieldProps = OtpFieldOwnProps & FieldName;

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`.
 *
 * The ref lands on the FIRST slot. A one-time code is one value spread over
 * several inputs, and the first is the one `shouldFocusError` should land on
 * — focusing the last slot would put the caret past the digits the user
 * still has to fix.
 */
export const OtpField = forwardRef<HTMLInputElement, OtpFieldProps>(function OtpField(
  {
    label,
    length = 6,
    value,
    defaultValue,
    onValueChange,
    onComplete,
    disabled,
    size: ownSize,
    required,
    name,
    mask,
    description,
    error,
    id,
    autoFocus,
    onBlur,
    onFocus,
    onKeyDown,
    autoComplete,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
  },
  ref,
) {
  const reduced = useReducedMotionRef();
  const size = useControlSize(ownSize);
  const slots = useRef<HTMLDivElement | null>(null);
  const cells = () => [...(slots.current?.querySelectorAll<HTMLElement>(".echo-otp__slot") ?? [])];

  /* Each window is a well (useWellMotion): the one you're on sinks, so the
     press travels along the row with you, and each digit lands as a strike. */
  useEffect(() => {
    const detach = cells().map(attachWellMotion);
    return () => detach.forEach((d) => d());
  }, [length]);

  /* The whole code in: a ripple runs along the row. */
  const completed = () => {
    if (reduced.current) return;
    gsap.fromTo(
      cells(),
      // yPercent, not y: y is the well's own sink, and the two add up.
      { yPercent: 0 },
      { keyframes: [{ yPercent: -8, duration: 0.12, ease: "power2.out" }, { yPercent: 0, ...timing("rebound") }], stagger: 0.05 },
    );
  };
  return (
    <BaseField.Root className="echo-otp" data-size={size} disabled={disabled} invalid={error ? true : undefined}>
      {label && <BaseField.Label className="echo-otp__label">{label}</BaseField.Label>}
      <BaseOtp.Root
        ref={slots}
        className="echo-otp__slots"
        length={length}
        name={name}
        value={value}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        mask={mask}
        onValueChange={onValueChange}
        onValueComplete={(next) => {
          completed();
          onComplete?.(next);
        }}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? undefined : ariaLabelledby}
      >
        {Array.from({ length }, (_, i) => (
          <BaseOtp.Input
            key={i}
            className="echo-otp__slot"
            ref={i === 0 ? ref : undefined}
            {...(i === 0 && id ? { id } : {})}
            {...(i === 0 && autoFocus ? { autoFocus } : {})}
            /*
             * Spread only when set. Base UI gives every window its own
             * `autocomplete="one-time-code"` and its own key handling, and
             * passing an explicit `undefined` overrides them — which is how
             * the phone stopped offering the code it had just received.
             */
            {...(i === 0 && autoComplete ? { autoComplete } : {})}
            {...(onBlur ? { onBlur } : {})}
            {...(onFocus ? { onFocus } : {})}
            {...(onKeyDown ? { onKeyDown } : {})}
          />
        ))}
      </BaseOtp.Root>
      {description != null && <BaseField.Description className="echo-otp__description">{description}</BaseField.Description>}
      {error && (
        <BaseField.Error className="echo-otp__error" match>
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
});
