/**
 * DescriptionList. Things and their values: order details, account
 * settings, a device's specs, the status of a system at a glance.
 *
 * `plain` sets the terms as machine labels over their values, with the
 * library's one separator between rows. `screen` puts the whole list on a
 * dark screen, the values in the readout face: the glance list on a phone's
 * home screen, a status panel on a dashboard.
 *
 * It's a real description list: each term and its value are read together.
 */
import type { ReactNode } from "react";
import "../scope/scope.css";
import "./description-list.css";

export interface DescriptionListItem {
  /** What it is: "Battery", "Order number". */
  term: ReactNode;
  /** Its value. */
  detail: ReactNode;
  /** A small glyph before the term. Decorative: the term says what it is. */
  icon?: ReactNode;
}

export interface DescriptionListProps {
  items: readonly DescriptionListItem[];
  /** `plain` (default) on the page; `screen` on a dark screen, values in the readout face. */
  variant?: "plain" | "screen";
  /** `stacked` (default) puts each value under its term; `inline` sets them side by side. */
  layout?: "stacked" | "inline";
  /** With `variant="screen"`: `emissive` (default) is dark; `reflective` is the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

export function DescriptionList({ items, variant = "plain", layout = "stacked", screen = "emissive" }: DescriptionListProps) {
  return (
    <dl
      className="echo-description-list"
      data-variant={variant}
      data-layout={layout}
      data-echo-screen={variant === "screen" && screen === "reflective" ? "reflective" : undefined}
    >
      {items.map((item, i) => (
        <div key={i} className="echo-description-list__row">
          <dt className="echo-description-list__term">
            {item.icon ? (
              <span className="echo-description-list__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            {item.term}
          </dt>
          <dd className="echo-description-list__detail">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
