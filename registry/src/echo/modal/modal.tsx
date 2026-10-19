"use client";

/**
 * Modal. Behavior from Base UI's Dialog (focus
 * trap, Esc, scroll-lock, a11y wiring); skin + motion + sound from Echo. Enter
 * uses motion.summon, exit is a GSAP tween that completes BEFORE unmount via
 * useGsapPresence + Base UI's actionsRef. Sound.transition plays on open.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import * as React from "react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { liquidBloom, useGsapPresence } from "echo-ui-core/presence";
import type { EchoPortalContainer } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { usePressable } from "echo-ui-core/tactile";
import "./modal.css";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  /** Element or text that opens the modal (rendered as the Dialog trigger). */
  trigger?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Show the corner close button. Default true. */
  showClose?: boolean;
  /** Start opened (uncontrolled). */
  defaultOpen?: boolean;
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


export function Modal({
  trigger,
  title,
  description,
  children,
  footer,
  size = "md",
  showClose = true,
  defaultOpen = false,
  container,
}: ModalProps) {
  const triggerElement = useTriggerElement(trigger);
  // Liquid bloom: it swells out of a pill in the middle of the room.
  const presence = useGsapPresence({ exit: "summon", defaultOpen, animate: liquidBloom });
  const sound = useSoundOptional();

  const handleOpenChange = (nextOpen: boolean, details: Dialog.Root.ChangeEventDetails) => {
    if (nextOpen) sound?.play("transition");
    presence.onOpenChange(nextOpen, details);
  };

  return (
    <Dialog.Root
      open={presence.open}
      onOpenChange={handleOpenChange}
      actionsRef={presence.actionsRef as React.RefObject<Dialog.Root.Actions | null>}
    >
      {trigger != null &&
        (triggerElement ? (
          <Dialog.Trigger render={triggerElement} />
        ) : (
          <Dialog.Trigger>{trigger}</Dialog.Trigger>
        ))}

      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="echo-modal__backdrop" />
        <Dialog.Popup ref={presence.popupRef} className="echo-modal__popup" data-size={size}>
          {title != null ? <Dialog.Title className="echo-modal__title">{title}</Dialog.Title> : null}
          {description != null ? (
            <Dialog.Description className="echo-modal__desc">{description}</Dialog.Description>
          ) : null}
          {children != null ? <div className="echo-modal__body">{children}</div> : null}
          {footer != null ? <div className="echo-modal__footer">{footer}</div> : null}
          {showClose ? (
            <ModalCloseKey />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* The close key presses like the library's keys: a small one, 1px down. */
function ModalCloseKey() {
  const press = usePressable<HTMLButtonElement>({}, { lift: 0, travel: 1, tilt: 0 });
  return (
    <Dialog.Close className="echo-modal__close" aria-label="Close" {...press}>
      ✕
    </Dialog.Close>
  );
}
