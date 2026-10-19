/**
 * Skeleton — the shape of content that has not arrived. A recessed well with a slow sheen crossing it.
 *
 * a11y: every skeleton is aria-hidden. A screen reader should hear "Loading"
 * once from the region that owns the wait — not a dozen anonymous boxes — so
 * the busy state belongs on the container, and the `label` prop puts it there.
 *
 * Static; consumes only var(--echo-*) via skeleton.css.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import "./skeleton.css";

export type SkeletonVariant = "text" | "block" | "circle";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** CSS width. Default 100% (text/block) or the height (circle). */
  width?: string | number;
  /** CSS height. Defaults per variant. */
  height?: string | number;
  /** Number of text lines; the last is short, as real paragraphs are. */
  lines?: number;
  /**
   * Announce the wait. Pass this ONCE, on the outermost skeleton of a region;
   * it makes that element the busy live region. Omit on every other one.
   */
  label?: string;
}

const size = (v: string | number | undefined) => (typeof v === "number" ? `${v}px` : v);

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  label,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const vars = {
    ...(width != null ? { "--echo-skeleton-width": size(width) } : null),
    ...(height != null ? { "--echo-skeleton-height": size(height) } : null),
    ...style,
  } as CSSProperties;

  const live = label
    ? ({ role: "status", "aria-busy": true, "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  if (variant === "text" && lines > 1) {
    return (
      <div
        className={["echo-skeleton-lines", className].filter(Boolean).join(" ")}
        style={vars}
        {...live}
        {...rest}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="echo-skeleton"
            data-variant="text"
            data-last={i === lines - 1 ? "" : undefined}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={["echo-skeleton", className].filter(Boolean).join(" ")}
      data-variant={variant}
      style={vars}
      {...live}
      {...rest}
    />
  );
}
