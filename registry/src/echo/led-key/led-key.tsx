"use client";

/**
 * LedKey — a molded pill key with an indicator LED.
 * Generalized from the first Echo device's `SnoozeKey`,
 * which hardcoded "Snooze +N": the value here is the RENDERING — a pill cap in
 * a well whose LED reports that the thing the key controls is running — so the
 * label is free-form and the domain noun lives in the consumer.
 *
 * Where HardwareButton is the general command cap, LedKey is the latching one:
 * use it when the key's own state is part of the answer (armed, monitoring,
 * snoozed), not for a button that just fires and forgets.
 */
import {
  forwardRef,
  useCallback,
  type DOMAttributes,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { EchoPressInterop } from "echo-ui-core/types";
import { useCapPhysics } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import "./led-key.css";

/** Closed, like every Echo control — see `HardwareButton`. */
export interface LedKeyProps extends EchoPressInterop {
  /** The key's legend — machine-cased in the skin. */
  children: ReactNode;
  /** Light the LED and breathe it. Default false (dead plastic). */
  lit?: boolean;
  /**
   * What the lit LED MEANS, announced as visually hidden text (e.g. "Armed").
   * A colour is not a message: pass this whenever the LED is the only thing
   * that says the key is on.
   */
  litLabel?: string;
  /**
   * Outer height on the control scale: `sm` 32px, `md` 44px (default), `lg`
   * 60px, the same as a HardwareButton or Field of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
}

export const LedKey = forwardRef<HTMLButtonElement, LedKeyProps>(function LedKey(
  { children, lit = false, litLabel, size: ownSize, ...rest },
  forwardedRef,
) {
  const size = useControlSize(ownSize);
  // A key switch (useCapPhysics): it rises and leans on hover, clicks onto
  // its seam, loads while held and clicks again as it snaps home.
  const { ref: capRef, handlers: capHandlers } = useCapPhysics<HTMLButtonElement>({ travel: 2, tilt: 5, sound: true });

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      capRef(node);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef)
        (forwardedRef as MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [forwardedRef, capRef],
  );

  // Compose incoming handlers with the cap's rather than letting either side
  // win — the same merge HardwareButton does, so a Base UI Tooltip or Popover
  // can use a LedKey as its trigger without losing its own listeners.
  const restProps = rest as Record<string, unknown>;
  const mergedHandlers: Record<string, (event: never) => void> = {};
  for (const key of Object.keys(capHandlers) as (keyof DOMAttributes<HTMLButtonElement>)[]) {
    const motion = capHandlers[key] as ((event: never) => void) | undefined;
    const incoming = restProps[key] as ((event: never) => void) | undefined;
    mergedHandlers[key] = (event) => {
      incoming?.(event);
      motion?.(event);
    };
  }

  return (
    <span className="echo-led-key" data-size={size} data-lit={lit ? "" : undefined}>
      <button ref={setRef} type="button" className="echo-led-key__cap" {...rest} {...mergedHandlers}>
        <span className="echo-led-key__led" aria-hidden="true" />
        <span className="echo-led-key__label">{children}</span>
        {lit && litLabel ? <span className="echo-led-key__sr">{litLabel}</span> : null}
      </button>
    </span>
  );
});
