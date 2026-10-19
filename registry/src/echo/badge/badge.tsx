/**
 * Badge — a small molded/LCD status label.
 * Static; consumes only var(--echo-*) via badge.css.
 */
import type { HTMLAttributes } from "react";
import "./badge.css";

export type BadgeVariant = "neutral" | "accent" | "lcd" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ variant = "neutral", size = "md", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={["echo-badge", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </span>
  );
}
