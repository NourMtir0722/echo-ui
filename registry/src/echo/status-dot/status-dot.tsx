/**
 * StatusDot — a tiny LED socket, filled or empty.
 *
 * See `status-dot.css` for why the state difference is
 * carried by fill-vs-hollow and luminance rather than by hue.
 */
import type { HTMLAttributes } from "react";
import "./status-dot.css";

/*
 * Bundlers replace `process.env.NODE_ENV` at build time, but an app without
 * Node's types (a standard Vite project) has no `process` to type-check
 * against. Declared in this module so the file compiles in any React app.
 */
declare const process: { env: { NODE_ENV?: string } };

interface StatusDotBase extends Omit<HTMLAttributes<HTMLSpanElement>, "aria-label"> {
  /** Lit socket vs dead one. */
  on?: boolean;
}

/**
 * A dot must either NAME its state or declare that something else does.
 *
 * The old component was `aria-hidden` unless you remembered to pass `label`,
 * so the default was a control that signalled nothing to assistive tech — and
 * in the console template it usually had no accompanying text either, which
 * meant the state was available to nobody. Making the choice explicit at the
 * type level means it cannot be forgotten, only decided.
 */
export type StatusDotProps = StatusDotBase &
  (
    | {
        /** Accessible name for the state, e.g. "Recording" / "Offline". */
        label: string;
        decorative?: false;
      }
    | {
        /**
         * Adjacent visible text already states the state, so the dot is
         * decorative and hidden from assistive tech. Saying so is deliberate:
         * it is a claim about the surrounding markup.
         */
        decorative: true;
        label?: undefined;
      }
  );

export function StatusDot({ on = true, label, decorative, className, ...rest }: StatusDotProps) {
  if (process.env.NODE_ENV !== "production" && !label && !decorative) {
    warnUnlabelledDot();
  }

  return (
    <span
      className={["echo-status-dot", className].filter(Boolean).join(" ")}
      data-on={on ? "" : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}

let warnedUnlabelled = false;
function warnUnlabelledDot(): void {
  if (warnedUnlabelled) return;
  warnedUnlabelled = true;
  console.warn(
    "[echo-ui] <StatusDot> needs either `label` (an accessible name for the state) " +
      "or `decorative` (adjacent visible text states it). Without one it signals " +
      "nothing to assistive technology.",
  );
}
