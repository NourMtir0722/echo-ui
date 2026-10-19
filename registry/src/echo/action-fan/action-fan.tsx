"use client";

/**
 * ActionFan. One HardwareButton opens into its choices — HardwareButtons in
 * a Morph — and an icon-only × that folds them back in. Choosing one does it
 * and folds the fan.
 *
 * The first choice takes focus as the fan opens; Escape folds it.
 */
import { useState, type ReactNode } from "react";
import type { MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";

export interface ActionFanAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface ActionFanProps {
  /** The whole's label, e.g. "Share". */
  children: ReactNode;
  icon?: ReactNode;
  actions: ActionFanAction[];
  /** Accessible name of the × that folds the fan. */
  closeLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  /** Which edge stays put while the choices spread. */
  align?: "center" | "start" | "end";
  className?: string;
}

const Close = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export function ActionFan({
  children,
  icon,
  actions,
  closeLabel = "Close",
  open: openProp,
  onOpenChange,
  feel,
  size,
  align,
  className,
}: ActionFanProps) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };

  return (
    <Morph
      feel={feel}
      align={align}
      className={className}
      label={open && typeof children === "string" ? children : undefined}
      onEscape={open ? () => setOpen(false) : undefined}
    >
      {open ? (
        <>
          {actions.map((a) => (
            <HardwareButton
              key={a.label}
              size={size}
              icon={a.icon}
              onClick={() => {
                a.onSelect();
                setOpen(false);
              }}
            >
              {a.label}
            </HardwareButton>
          ))}
          <HardwareButton size={size} icon={<Close />} iconOnly aria-label={closeLabel} onClick={() => setOpen(false)} />
        </>
      ) : (
        <HardwareButton size={size} icon={icon} onClick={() => setOpen(true)}>
          {children}
        </HardwareButton>
      )}
    </Morph>
  );
}
