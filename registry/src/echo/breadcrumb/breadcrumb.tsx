/**
 * Breadcrumb. Where you are in the hierarchy, as an
 * engraved trail.
 *
 * a11y shape that matters: a labelled nav wrapping an ordered list; the last
 * item is the current page, so it is NOT a link and carries aria-current.
 * Separators are decorative and hidden — a screen reader gets the list
 * structure, which is the real separator.
 *
 * Static; consumes only var(--echo-*) via breadcrumb.css.
 */
import type { HTMLAttributes, ReactNode } from "react";
import "./breadcrumb.css";

export interface BreadcrumbItem {
  label: string;
  /** Omit on the last item; the current page is not a link to itself. */
  href?: string;
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  /** Name for the nav landmark. Default "Breadcrumb". */
  label?: string;
  /** Separator glyph. Decorative. */
  separator?: ReactNode;
}

export function Breadcrumb({
  items,
  label = "Breadcrumb",
  separator = "/",
  className,
  ...rest
}: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={["echo-breadcrumb", className].filter(Boolean).join(" ")}
      aria-label={label}
      {...rest}
    >
      <ol className="echo-breadcrumb__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="echo-breadcrumb__item">
              {isLast || !item.href ? (
                <span
                  className="echo-breadcrumb__current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <a className="echo-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              )}
              {isLast ? null : (
                <span className="echo-breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
