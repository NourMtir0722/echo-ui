/**
 * CountBadge — a number worth noticing. The lit
 * sibling of Badge: where Badge names a state, CountBadge counts a thing.
 *
 * Static; consumes only var(--echo-*) via count-badge.css.
 */
import type { HTMLAttributes } from "react";
import "./count-badge.css";

/**
 * Renamed from `CountBadgeTone` when `tone` became Echo's status vocabulary.
 *
 * This was never a tone. `tone` is what a thing MEANS — `info`, `active`,
 * `warn`, `danger` (`EchoTone`) — and "accent or neutral" is a colour choice,
 * which is what `variant` already means everywhere else in Echo
 * (`PanelVariant`, `SkeletonVariant`, `HardwareButtonVariant`). A count badge
 * has no status to report; it reports a number.
 */
export type CountBadgeVariant = "accent" | "neutral";

export interface CountBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  count: number;
  /**
   * What the number counts, e.g. "unread messages". The accessible name
   * becomes "3 unread messages" — a bare "3" tells a screen-reader user
   * nothing.
   */
  label: string;
  /** Cap the display; above it renders as `${max}+`. Default 99. */
  max?: number;
  /** Render at zero instead of disappearing. Default false. */
  showZero?: boolean;
  variant?: CountBadgeVariant;
}

export function CountBadge({
  count,
  label,
  max = 99,
  showZero = false,
  variant = "accent",
  className,
  ...rest
}: CountBadgeProps) {
  if (count <= 0 && !showZero) return null;

  const clamped = count > max;
  const display = clamped ? `${max}+` : String(count);
  // Say the real number even when the face is capped: "127 unread messages"
  // is useful, "99+ unread messages" is a rendering detail.
  const spoken = `${count} ${label}`;

  return (
    <span
      className={["echo-count-badge", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-capped={clamped ? "" : undefined}
      role="status"
      aria-label={spoken}
      {...rest}
    >
      {/* Keyed by the number, so a new count mounts fresh and rolls in. */}
      <span key={display} className="echo-count-badge__num" aria-hidden="true">
        {display}
      </span>
    </span>
  );
}
