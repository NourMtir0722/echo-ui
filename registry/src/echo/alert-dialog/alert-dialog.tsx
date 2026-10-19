"use client";

/**
 * AlertDialog.
 *
 * Modal already covers the STRUCTURE. What is different here is everything a
 * user cannot see in a screenshot:
 *
 *  - `role="alertdialog"` and a required description, so a screen reader is
 *    told this is a decision, not a panel.
 *  - No dismissal by backdrop click or Escape leading to the destructive path:
 *    Base UI's AlertDialog refuses outside-press by construction. You have to
 *    answer it. That is the entire reason it is not a Modal with red buttons.
 *  - Its own sound. `caution` on open — a sawtooth, the only rough waveform in
 *    the token set — because a destructive confirm should not arrive with the
 *    same friendly chime as a settings panel. Confirming plays `error` when the
 *    action is destructive, and nothing at all when it is not.
 *
 *   <AlertDialog
 *     trigger={<HardwareButton>Erase</HardwareButton>}
 *     title="Erase all takes?"
 *     description="This cannot be undone."
 *     confirmLabel="Erase"
 *     onConfirm={erase}
 *   />
 *
 * Deliberately NOT a compound API, unlike Menu and Sheet. A confirm has one
 * shape — question, consequence, two answers — and every part a consumer could
 * rearrange is a way to build one that is missing its consequence or has two
 * confirm buttons. The props are the guardrail.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import * as React from "react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { EchoDismissEvent, EchoPortalContainer } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { liquidBloom, usePopupMotion } from "echo-ui-core/presence";
import { usePressable } from "echo-ui-core/tactile";
import "./alert-dialog.css";

export interface AlertDialogProps {
  /** Element or text that opens the dialog. */
  trigger?: ReactNode;
  /** The decision, as a question. */
  title: ReactNode;
  /**
   * What happens if they say yes. Required: a confirm without its consequence
   * is a dialog that has already decided for the user.
   */
  description: ReactNode;
  /** Extra detail between the description and the answers. */
  children?: ReactNode;
  /** Label for the confirming answer. Name the ACTION ("Erase"), never "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Whether confirming destroys something. Default true — this component only
   * exists for the destructive case, and defaulting to false would make the
   * dangerous spelling the quiet one.
   */
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: EchoDismissEvent) => void;
  /**
   * Where the dialog mounts. Defaults to <body>. Pass an element inside a
   * scoped theme (`createEchoTheme(seed, { selector })`) and the dialog wears
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

export function AlertDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
  open,
  defaultOpen,
  onOpenChange,
  container,
}: AlertDialogProps) {
  const triggerElement = useTriggerElement(trigger);
  const sound = useSoundOptional();
  // Liquid bloom, the same arrival as Modal: out of a pill in the middle.
  const bloom = usePopupMotion(liquidBloom);
  // The answers and the plain trigger are molded caps: they press like the
  // library's keys, down onto their 2px seam.
  const triggerPress = usePressable<HTMLButtonElement>({}, { travel: 1.5, tilt: 3 });
  const cancelPress = usePressable<HTMLButtonElement>({}, { travel: 1.5, tilt: 3 });
  const confirmPress = usePressable<HTMLButtonElement>({}, { travel: 1.5, tilt: 3 });

  return (
    <BaseAlertDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next, eventDetails) => {
        // The rough waveform, once, on arrival. Not on every re-render.
        if (next) sound?.play("caution");
        onOpenChange?.(next, eventDetails);
      }}
    >
      {trigger != null &&
        (triggerElement ? (
          <BaseAlertDialog.Trigger render={triggerElement} />
        ) : (
          <BaseAlertDialog.Trigger className="echo-alert__trigger" {...triggerPress}>
            {trigger}
          </BaseAlertDialog.Trigger>
        ))}

      <BaseAlertDialog.Portal container={container}>
        <BaseAlertDialog.Backdrop className="echo-alert__backdrop" />
        <BaseAlertDialog.Popup ref={bloom} className="echo-alert__popup" data-destructive={destructive || undefined}>
          <BaseAlertDialog.Title className="echo-alert__title">{title}</BaseAlertDialog.Title>
          <BaseAlertDialog.Description className="echo-alert__desc">
            {description}
          </BaseAlertDialog.Description>
          {children != null ? <div className="echo-alert__body">{children}</div> : null}

          <div className="echo-alert__actions">
            {/*
              Cancel comes FIRST in the DOM, so it is what Tab reaches first and
              what a keyboard user confirms by reflex. The destructive answer
              should never be one blind Enter away.
            */}
            <BaseAlertDialog.Close className="echo-alert__cancel" onClick={() => onCancel?.()} {...cancelPress}>
              {cancelLabel}
            </BaseAlertDialog.Close>
            <BaseAlertDialog.Close
              className="echo-alert__confirm"
              data-destructive={destructive || undefined}
              {...confirmPress}
              onClick={() => {
                if (destructive) sound?.play("error");
                onConfirm?.();
              }}
            >
              {confirmLabel}
            </BaseAlertDialog.Close>
          </div>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
