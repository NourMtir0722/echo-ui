/**
 * Loader — three accent LEDs breathing in sequence.
 * Announces as a live status region; reduced motion holds the dots steady.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import "./loader.css";

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Dot diameter in px. */
  dot?: number;
  /** Accessible status text. Default "Loading". */
  label?: string;
}

export function Loader({ dot = 9, label = "Loading", className, style, ...rest }: LoaderProps) {
  return (
    <div
      className={["echo-loader", className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
      style={{ "--echo-loader-dot": `${dot}px`, ...style } as CSSProperties}
      {...rest}
    >
      <div className="echo-loader__dot" />
      <div className="echo-loader__dot" />
      <div className="echo-loader__dot" />
    </div>
  );
}
