"use client";

/**
 * Select. Base UI Select behavior (typeahead,
 * keyboard, a11y) skinned as an Echo device dropdown — a molded cap trigger and
 * a floating panel with an accent dot on the selected option. sound.select on
 * change. The popup fades/scales via CSS (Base UI auto-detects the transition),
 * so no GSAP presence is needed here.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { Select as BaseSelect } from "@base-ui/react/select";
import { forwardRef, useMemo } from "react";
import type { EchoInterop, EchoPortalContainer } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { mergeHandlers, mergeRefs, useCapPhysics, useLiquidHighlight } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import "./select.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectOwnProps extends EchoInterop {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The greyed text shown until something is chosen. Not a label. */
  placeholder?: string;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a Field or HardwareButton of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
  /**
   * Where the list mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the list wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: EchoPortalContainer;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type SelectProps = SelectOwnProps & AccessibleName;

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`.
 *
 * The ref lands on the TRIGGER, because that is the focusable element: it is
 * what `shouldFocusError` calls `.focus()` on, and what `onBlur` and `onFocus`
 * fire from. Form participation — `name`, `required`, `readOnly` — belongs to
 * the Root, which owns the hidden input. So the interop set is split by hand
 * here rather than spread wholesale: the two halves go to different elements.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    size: ownSize,
    value,
    defaultValue,
    onValueChange,
    placeholder = "Select…",
    disabled,
    name,
    required,
    readOnly,
    id,
    autoFocus,
    onBlur,
    onFocus,
    onKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    container,
    ...rest
  },
  ref,
) {
  const sound = useSoundOptional();
  const size = useControlSize(ownSize);
  // The hovered option is marked by one cap flowing from option to option.
  const glow = useLiquidHighlight();
  // The trigger is the button's neutral cap, so it presses like one.
  const cap = useCapPhysics<HTMLButtonElement>({ tilt: 3 });
  const capRef = cap.ref;
  const triggerRef = useMemo(() => mergeRefs(ref, capRef), [ref, capRef]);

  return (
    <BaseSelect.Root
      items={options}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
      required={required}
      readOnly={readOnly}
      onValueChange={(next) => {
        sound?.play("select");
        onValueChange?.(next as string);
      }}
    >
      <BaseSelect.Trigger
        ref={triggerRef}
        /*
         * Spread only when set. The Trigger owns the keys that open the
         * listbox, and an explicit `onKeyDown={undefined}` overrides that
         * rather than leaving it alone.
         */
        {...(id ? { id } : {})}
        {...(autoFocus ? { autoFocus } : {})}
        {...(onFocus ? { onFocus } : {})}
        className="echo-select__trigger"
        data-size={size}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        {...rest}
        // The cap's own pointer and key handlers, with the caller's onBlur and
        // onKeyDown run first (the Trigger's own key handling is untouched).
        {...mergeHandlers(cap.handlers, { onBlur, onKeyDown, ...rest })}
      >
        <BaseSelect.Value placeholder={placeholder} />
        <BaseSelect.Icon className="echo-select__icon">
          <ChevronDown />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal container={container}>
        <BaseSelect.Positioner
          className="echo-select__positioner"
          side="bottom"
          align="start"
          sideOffset={8}
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup ref={glow.container} className="echo-select__popup">
            <span ref={glow.light} className="echo-select__glow" aria-hidden>
              <span ref={glow.shape} className="echo-select__glow-shape" />
            </span>
            {options.map((option) => (
              <BaseSelect.Item key={option.value} value={option.value} className="echo-select__item">
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                {/* Explicit children: with none, Base UI renders a ✔️ emoji. */}
                <BaseSelect.ItemIndicator className="echo-select__indicator">
                  <CheckIcon />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
});
