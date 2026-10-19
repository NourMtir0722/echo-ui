"use client";

/**
 * Popover. Base UI Popover — anchoring, focus,
 * dismiss, a11y — skinned as an Echo panel, with the SAME useGsapPresence
 * bridge as Modal (proving it generalizes across Base UI wrappers) and
 * sound.select on open.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import * as React from "react";
import { isValidElement, useEffect, type ReactElement, type ReactNode, type RefObject } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { useGsapPresence } from "echo-ui-core/presence";
import type { EchoPortalContainer } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import "./popover.css";

export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  trigger?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  /**
   * Where the popup mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the popup wears
   * that theme too — mounted on <body>, it can only read the :root one.
   */
  container?: EchoPortalContainer;
  /** Open, controlled. Leave it out and the trigger opens and closes it. */
  open?: boolean;
  /** Called as it opens or closes: from its trigger, Escape, a press outside, or a change to `open`. */
  onOpenChange?: (open: boolean) => void;
  /** What takes focus as it opens: a date picker's chosen day, say. Default: the first thing in it that can. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** What it's placed against: a whole field rather than the key in it. Default: its trigger. */
  anchor?: RefObject<Element | null>;
  /** Names the popup when it has no `title`: a popup a screen reader can only call "dialog" is a door with no sign. */
  "aria-label"?: string;
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

export function Popover({
  trigger,
  title,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  container,
  open,
  onOpenChange,
  initialFocus,
  anchor,
  "aria-label": ariaLabel,
}: PopoverProps) {
  const triggerElement = useTriggerElement(trigger);
  const presence = useGsapPresence({ enter: "summon", exit: "summon" });
  const sound = useSoundOptional();

  const handleOpenChange = (open: boolean, details: BasePopover.Root.ChangeEventDetails) => {
    if (open) sound?.play("select");
    presence.onOpenChange(open, details);
    onOpenChange?.(open);
  };

  // Controlled: `open` drives it as the trigger does. Closing goes through
  // Base UI's own close, so the exit runs before the popup unmounts.
  const { open: shown, setOpen, actionsRef } = presence;
  useEffect(() => {
    if (open === undefined || open === shown) return;
    if (open) setOpen(true);
    else (actionsRef.current as BasePopover.Root.Actions | null)?.close();
  }, [open, shown, setOpen, actionsRef]);

  return (
    <BasePopover.Root
      open={presence.open}
      onOpenChange={handleOpenChange}
      actionsRef={presence.actionsRef as React.RefObject<BasePopover.Root.Actions | null>}
    >
      {trigger != null &&
        (triggerElement ? (
          <BasePopover.Trigger render={triggerElement} />
        ) : (
          <BasePopover.Trigger>{trigger}</BasePopover.Trigger>
        ))}
      <BasePopover.Portal container={container}>
        <BasePopover.Positioner
          className="echo-popover__positioner"
          side={side}
          align={align}
          sideOffset={sideOffset}
          anchor={anchor}
        >
          <BasePopover.Popup
            ref={presence.popupRef}
            className="echo-popover__popup"
            initialFocus={initialFocus}
            aria-label={title != null ? undefined : ariaLabel}
          >
            {title != null ? (
              <BasePopover.Title className="echo-popover__title">{title}</BasePopover.Title>
            ) : null}
            <div className="echo-popover__body">{children}</div>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
