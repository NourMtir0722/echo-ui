/**
 * Divider — a panel seam.
 */
import type { HTMLAttributes } from "react";
import "./divider.css";

export type DividerOrientation = "horizontal" | "vertical";

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: DividerOrientation;
}

export function Divider({ orientation = "horizontal", className, ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={["echo-divider", className].filter(Boolean).join(" ")}
      data-orientation={orientation}
      {...rest}
    />
  );
}
