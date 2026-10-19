"use client";

/**
 * RadioGroup. Base UI RadioGroup behavior
 * (roving focus, arrow-key selection, form semantics) skinned as a row of
 * recessed holes beside their labels, the chosen one lit by a pip.
 *
 * Compound API: <RadioGroup><RadioGroup.Item value="a">Label</RadioGroup.Item></RadioGroup>.
 *
 * The label lives INSIDE Radio.Root (which renders the role=radio button), so
 * the text IS the accessible name and the whole line is the hit target. A
 * wrapping <label> would not associate with a button and would leave the radio
 * unnamed.
 *
 * Sound rides on the group's onValueChange rather than useTactile: Base UI's
 * Root owns the click, so wrapping the callback avoids clobbering it.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { forwardRef, type DOMAttributes, type ReactNode } from "react";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import type { EchoChangeEvent, EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { mergeHandlers, useCapPhysics } from "echo-ui-core/tactile";
import "./radio-group.css";

export type RadioGroupOrientation = "horizontal" | "vertical";

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

/**
 * `value` is narrowed to `string`, not left as Base UI's `unknown`.
 *
 * Base UI types a radio group's value as unknown because it will carry any
 * value you hand an Item. Echo's Select had already made the call to narrow to
 * string, and shipping two sibling value-selectors whose callbacks need
 * different handling is incoherence a whole screen of controls exposes:
 * `onValueChange={setRouting}` typechecks on one and not the other, for no
 * reason a consumer can see. A radio group in a form is string-valued.
 */
/**
 * Narrowed deliberately.
 *
 * This used to be `Omit<Skin<ComponentProps<typeof BaseRadioGroup>>, …>`:
 * a wholesale passthrough of Base UI's props, which made Echo's public API a
 * downstream of Base UI's internals AND accepted `className`, the open
 * API `PRINCIPLES.md` says Echo does not have. The public-API leak check could
 * not see it, because a `typeof` passthrough has no dot after the alias.
 */
interface RadioGroupOwnProps extends EchoInterop {
  value?: string;
  defaultValue?: string;
  /** Lay the options out in a row or a stack. Default "horizontal". */
  orientation?: RadioGroupOrientation;
  /** Fired with the newly selected value. */
  onValueChange?: (
    value: string,
    eventDetails: EchoChangeEvent,
  ) => void;
  children?: ReactNode;
}

export type RadioGroupProps = RadioGroupOwnProps & AccessibleName;

/** `forwardRef`, not a `ref` prop — see the note on `Field`. */
const RadioGroupRoot = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroupRoot(
  { onValueChange, orientation = "horizontal", ...props },
  ref,
) {
  const sound = useSoundOptional();
  return (
    <BaseRadioGroup
      ref={ref}
      className="echo-radio-group"
      data-orientation={orientation}
      onValueChange={(value, eventDetails) => {
        sound?.play("select");
        onValueChange?.(value as string, eventDetails);
      }}
      {...props}
    />
  );
});

/**
 * The same narrowing for an item: its own props, not Base UI's, and no
 * `className`. `value` is what the group reports when this one is chosen.
 */
interface RadioGroupItemProps extends EchoInterop {
  value: string;
  children?: ReactNode;
}

const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(function RadioGroupItem(
  { children, ...props },
  ref,
) {
  // The hole takes the library's press (useCapPhysics) without moving: it
  // deepens as the stroke lands and while held (--press, --load), and the lit
  // pip sinks with it. The row hears the pointer; the hole is what answers.
  const hole = useCapPhysics<HTMLSpanElement>({ lift: 0, travel: 0, tilt: 0 });
  const live = (e: { currentTarget: Element }) => !e.currentTarget.hasAttribute("data-disabled");
  const own: DOMAttributes<HTMLElement> = {
    onPointerDown: (e) => live(e) && hole.handlers.onPointerDown?.(e as never),
    onPointerUp: (e) => hole.handlers.onPointerUp?.(e as never),
    onPointerLeave: (e) => hole.handlers.onPointerLeave?.(e as never),
    onPointerCancel: (e) => hole.handlers.onPointerCancel?.(e as never),
    onBlur: (e) => hole.handlers.onBlur?.(e as never),
    // Space chooses a radio; Enter and the arrows don't press it.
    onKeyDown: (e) => e.key === " " && live(e) && hole.handlers.onKeyDown?.(e as never),
    onKeyUp: (e) => e.key === " " && hole.handlers.onKeyUp?.(e as never),
  };

  return (
    <BaseRadio.Root ref={ref} className="echo-radio" {...props} {...mergeHandlers(own, props as Record<string, unknown>)}>
      <span ref={hole.ref} className="echo-radio__control" aria-hidden="true">
        <BaseRadio.Indicator className="echo-radio__pip" />
      </span>
      <span className="echo-radio__label">{children}</span>
    </BaseRadio.Root>
  );
});

// Assembled into `RadioGroup` in index.ts, which isn't a client module.
export { RadioGroupRoot, RadioGroupItem };
