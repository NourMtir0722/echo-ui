/**
 * Banner — a persistent inline message strip.
 *
 * Distinct from Toast: a Toast is transient and reports something that just
 * happened; a Banner stays, and describes a condition that is still true.
 *
 * a11y: a banner rendered with the page is ordinary content and gets NO live
 * region — announcing it on load would interrupt for something the reader
 * will reach anyway. Pass `live` when the banner APPEARS in response to
 * something, which is the only case worth interrupting for.
 *
 * Static; consumes only var(--echo-*) via banner.css.
 */
import type { HTMLAttributes, ReactNode } from "react";
import type { EchoTone } from "echo-ui-core/types";
import "./banner.css";

/**
 * Banner carries the whole status vocabulary. `EchoTone` is the one
 * list; the alias stays so the name a consumer imports does not change.
 */
export type BannerTone = EchoTone;

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  children?: ReactNode;
  tone?: BannerTone;
  /** Leading icon. Decorative — the title carries the meaning. */
  icon?: ReactNode;
  /** Render a dismiss control. */
  onDismiss?: () => void;
  /**
   * The LCD tag on the right. Defaults to the tone in words (Info / Live /
   * Warn / Error); pass your own short word, or `false` to hide it.
   */
  tag?: string | false;
  /** Accessible name for the dismiss control. Defaults to "Dismiss" plus the title. */
  dismissLabel?: string;
  /**
   * Announce when the banner appears dynamically. Danger becomes an alert
   * (interrupts); everything else becomes a polite status.
   */
  live?: boolean;
}

const TONE_TAG: Record<BannerTone, string> = {
  info: "Info",
  active: "Live",
  warn: "Warn",
  danger: "Error",
};

export function Banner({
  title,
  children,
  tone = "info",
  icon,
  tag,
  onDismiss,
  dismissLabel,
  live = false,
  className,
  ...rest
}: BannerProps) {
  const liveProps = live
    ? ({ role: tone === "danger" ? "alert" : "status" } as const)
    : ({} as const);

  return (
    <div
      className={["echo-banner", className].filter(Boolean).join(" ")}
      data-tone={tone}
      {...liveProps}
      {...rest}
    >
      <span className="echo-banner__well" aria-hidden="true">
        {icon ? (
          <span className="echo-banner__icon">{icon}</span>
        ) : (
          <span className="echo-banner__pip" />
        )}
      </span>
      <div className="echo-banner__body">
        <div className="echo-banner__title">{title}</div>
        {children ? <div className="echo-banner__text">{children}</div> : null}
      </div>
      {tag === false ? null : <span className="echo-banner__tag">{tag ?? TONE_TAG[tone]}</span>}
      {onDismiss ? (
        <button
          type="button"
          className="echo-banner__dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel ?? `Dismiss ${title}`}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
