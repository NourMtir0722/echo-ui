/**
 * EmptyState — nothing here, and what to do about it.
 *
 * The useful distinction the component enforces by shape: an empty state is
 * a TITLE plus a WAY FORWARD. A title alone is a dead end, which is why the
 * action slot sits in the API rather than being left to the caller's layout.
 *
 * Static; consumes only var(--echo-*) via empty-state.css.
 */
import type { HTMLAttributes, ReactNode } from "react";
import "./empty-state.css";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  description?: ReactNode;
  /** Decorative mark above the title: a small line icon, drawn quiet. */
  icon?: ReactNode;
  /**
   * A picture above the title at its own size, in full colour: a Creature, an
   * illustration. Takes the icon's place when both are given.
   */
  illustration?: ReactNode;
  /** The way forward — usually one HardwareButton. */
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={["echo-empty-state", className].filter(Boolean).join(" ")} {...rest}>
      {illustration ? (
        <div className="echo-empty-state__illustration" aria-hidden="true">
          {illustration}
        </div>
      ) : icon ? (
        <div className="echo-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="echo-empty-state__title">{title}</p>
      {description ? <p className="echo-empty-state__description">{description}</p> : null}
      {action ? <div className="echo-empty-state__action">{action}</div> : null}
    </div>
  );
}
