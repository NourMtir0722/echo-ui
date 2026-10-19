"use client";

/**
 * Checkbox. Base UI Checkbox behavior with a
 * molded box skin and a select sound on change.
 *
 * It presses like the library's keys (useCapPhysics): it resists, gives and
 * lands, sinks further while held, and comes back faster than it went down.
 * Checking it pops the lit cap up and draws the tick in one stroke, the way a
 * pen would; unchecking settles it back into the chassis.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { forwardRef, useCallback, useEffect, useRef, type DOMAttributes, type MutableRefObject } from "react";
import gsap from "gsap";
import type { EchoChangeEvent, EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { mergeHandlers, timing, useCapPhysics, useReducedMotionRef } from "echo-ui-core/tactile";
import "./checkbox.css";

interface CheckboxOwnProps extends EchoInterop {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean, eventDetails: EchoChangeEvent) => void;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type CheckboxProps = CheckboxOwnProps & AccessibleName;

function CheckIcon() {
  return (
    <svg className="echo-checkbox__check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  );
}

/**
 * Indeterminate draws a dash, not the check. Base UI shows the Indicator for
 * both states, and with one icon inside it a "some selected" parent looked
 * exactly like "all selected" — the difference existed only as aria-checked.
 */
function DashIcon() {
  return (
    <svg className="echo-checkbox__dash" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M4 8h8" strokeLinecap="round" pathLength={1} />
    </svg>
  );
}

/**
 * `forwardRef`, not a `ref` prop, and on purpose.
 *
 * On React 19 `ref` is an ordinary prop and this could be a plain function.
 * On React 18 it is not — React strips `ref` before the component runs, so
 * the same code would type-check, work on 19, and populate nothing on 18.
 * Echo supports both until a major. `forwardRef` behaves
 * identically on each.
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { onCheckedChange, ...props },
  ref,
) {
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const root = useRef<HTMLButtonElement | null>(null);
  // A small key: no rise on hover (unchecked, it is a hole), no lean.
  const cap = useCapPhysics<HTMLElement>({ lift: 0, travel: 1.5, tilt: 0 });
  const capRef = cap.ref;

  const setRoot = useCallback(
    (node: HTMLButtonElement | null) => {
      root.current = node;
      capRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [ref, capRef],
  );

  // Space toggles a checkbox and Enter doesn't, so only Space presses it.
  const handlers: DOMAttributes<HTMLElement> = {
    ...cap.handlers,
    onKeyDown: (e) => {
      if (e.key === " ") cap.handlers.onKeyDown?.(e);
    },
    onKeyUp: (e) => {
      if (e.key === " ") cap.handlers.onKeyUp?.(e);
    },
  };

  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const changed = new MutationObserver(() => {
      if (reduced.current) return;
      const on = r.hasAttribute("data-checked") || r.hasAttribute("data-indeterminate");
      gsap.fromTo(
        r,
        { scale: on ? 1.18 : 0.9 },
        { scale: 1, ...timing("rebound"), overwrite: "auto" },
      );
      if (!on) return;
      const mark = [...r.querySelectorAll<SVGPathElement>("svg path")].find(
        (p) => (p.ownerSVGElement && getComputedStyle(p.ownerSVGElement).display !== "none"),
      );
      if (mark) {
        gsap.fromTo(
          mark,
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.26, ease: "power2.out", delay: 0.04, overwrite: "auto" },
        );
      }
    });
    changed.observe(r, { attributes: true, attributeFilter: ["data-checked", "data-unchecked", "data-indeterminate"] });
    return () => {
      changed.disconnect();
      gsap.killTweensOf(r);
    };
  }, [reduced]);

  return (
    <BaseCheckbox.Root
      ref={setRoot}
      className="echo-checkbox"
      onCheckedChange={(checked, eventDetails) => {
        sound?.play("select");
        onCheckedChange?.(checked, eventDetails);
      }}
      {...props}
      // After the caller's props, merged with them: a caller's onBlur (a
      // react-hook-form `register()`) or onKeyDown runs first, then the cap's.
      {...mergeHandlers(handlers, props)}
    >
      <BaseCheckbox.Indicator className="echo-checkbox__indicator">
        <CheckIcon />
        <DashIcon />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
});
