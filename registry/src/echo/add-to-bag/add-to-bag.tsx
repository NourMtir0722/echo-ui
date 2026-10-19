"use client";

/**
 * AddToBag. Press it and a drop buds out of the button and lands in the
 * count beside it, which swells and goes up — the eye follows the thing you
 * added to where it went.
 *
 * `onAdd` runs at once (the item is added when you press); the count the
 * badge shows catches up when the drop lands. A HardwareButton and a
 * CountBadge, joined by useBudOff.
 */
import { useRef, useState, type ReactNode } from "react";
import { HardwareButton } from "../hardware-button";
import { CountBadge } from "../count-badge";
import { useBudOff } from "../bud-off";
import "./add-to-bag.css";

export interface AddToBagProps {
  /** How many are in the bag. */
  count: number;
  /** Add one. The badge shows it when the drop lands. */
  onAdd: () => void;
  /** The button's label. */
  children?: ReactNode;
  /** What the count is of, for the badge's name: "3 in bag". */
  countLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Plus = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export function AddToBag({
  count,
  onAdd,
  children = "Add to bag",
  countLabel = "in bag",
  icon = <Plus />,
  disabled,
  size,
  className,
}: AddToBagProps) {
  const budOff = useBudOff();
  const button = useRef<HTMLButtonElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  // Drops still in the air: the badge doesn't count them yet.
  const [flying, setFlying] = useState(0);
  const shown = Math.max(0, count - flying);

  const add = () => {
    onAdd();
    const from = button.current;
    const to = badge.current;
    if (!from || !to) return;
    setFlying((n) => n + 1);
    budOff(from, to, { onArrive: () => setFlying((n) => Math.max(0, n - 1)) });
  };

  return (
    <span className={["echo-add-to-bag", className].filter(Boolean).join(" ")}>
      <HardwareButton ref={button} size={size} icon={icon} disabled={disabled} onClick={add}>
        {children}
      </HardwareButton>
      <span ref={badge} className="echo-add-to-bag__count">
        <CountBadge count={shown} label={countLabel} showZero />
      </span>
    </span>
  );
}
