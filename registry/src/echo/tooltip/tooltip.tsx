"use client";

/**
 * Tooltip. Base UI Tooltip behavior (hover/focus,
 * delay, dismissal, a11y), Echo skin, and the SAME useGsapPresence bridge as
 * Modal/Popover. No sound — tooltips fire too often to earn one.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import * as React from "react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { EchoPortalContainer } from "echo-ui-core/types";
import { useGsapPresence } from "echo-ui-core/presence";
import "./tooltip.css";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export interface TooltipProps {
  trigger?: ReactNode;
  children?: ReactNode;
  side?: TooltipSide;
  sideOffset?: number;
  /** Hover open delay in ms. */
  delay?: number;
  /**
   * Where the popup mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the popup wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: EchoPortalContainer;
}

/**
 * The element to render as the trigger, or null to wrap `trigger` in a plain
 * button. In development, an element passed from a server component can arrive
 * as a lazy reference, which `isValidElement` rejects, so it got wrapped in a
 * second button. `use` unwraps it, as Radix's Slot does. React 18 has
 * neither `use` nor server components, so it never meets one. The key is built
 * at runtime so bundlers don't warn about a missing export on React 18.
 */
function useTriggerElement(trigger: ReactNode): ReactElement | null {
  if (isValidElement(trigger)) return trigger;
  const use = (React as unknown as Record<string, unknown>)[" use ".trim()];
  if (
    typeof use === "function" &&
    typeof trigger === "object" &&
    trigger !== null &&
    (trigger as { $$typeof?: symbol }).$$typeof === Symbol.for("react.lazy")
  ) {
    const payload = (trigger as { _payload?: unknown })._payload;
    if (payload && typeof (payload as PromiseLike<unknown>).then === "function") {
      const resolved: unknown = use(payload);
      if (isValidElement(resolved)) return resolved;
    }
  }
  return null;
}

export function Tooltip({
  trigger,
  children,
  side = "top",
  sideOffset = 8,
  delay = 400,
  container,
}: TooltipProps) {
  const triggerElement = useTriggerElement(trigger);
  const presence = useGsapPresence({ enter: "summon", exit: "summon" });

  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root
        open={presence.open}
        onOpenChange={presence.onOpenChange}
        actionsRef={presence.actionsRef as React.RefObject<BaseTooltip.Root.Actions | null>}
      >
        {trigger != null &&
        (triggerElement ? (
          <BaseTooltip.Trigger render={triggerElement} />
        ) : (
            <BaseTooltip.Trigger>{trigger}</BaseTooltip.Trigger>
          ))}
        <BaseTooltip.Portal container={container}>
          <BaseTooltip.Positioner className="echo-tooltip__positioner" side={side} sideOffset={sideOffset}>
            <BaseTooltip.Popup ref={presence.popupRef} className="echo-tooltip__popup">
              {children}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}
