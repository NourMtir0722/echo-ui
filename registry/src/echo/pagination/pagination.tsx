"use client";

/**
 * Pagination. A row of molded number caps with the
 * current page lit, wrapped in a labelled nav.
 *
 * The window arithmetic lives in range.ts so it can be tested without a DOM;
 * this file is the skin and the semantics.
 *
 * Every number is a molded cap with the library's press (useCapPhysics): it
 * rises and leans on hover, travels onto its seam, springs back. The page you
 * land on lights up — the lit cap blooms into it.
 */
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { useCapPhysics } from "echo-ui-core/tactile";
import { paginationRange, GAP } from "./range";
import "./pagination.css";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** 1-based current page. */
  page: number;
  /** Total number of pages. */
  count: number;
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current one. Default 1. */
  siblings?: number;
  /** Name for the nav landmark. Default "Pagination". */
  label?: string;
  /** Accessible name for the previous control. Default "Previous page". */
  previousLabel?: string;
  /** Accessible name for the next control. Default "Next page". */
  nextLabel?: string;
}

export function Pagination({
  page,
  count,
  onPageChange,
  siblings = 1,
  label = "Pagination",
  previousLabel = "Previous page",
  nextLabel = "Next page",
  className,
  ...rest
}: PaginationProps) {
  const slots = paginationRange({ page, count, siblings });
  if (slots.length === 0) return null;

  return (
    <nav
      className={["echo-pagination", className].filter(Boolean).join(" ")}
      aria-label={label}
      {...rest}
    >
      <Cap
        className="echo-pagination__step"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={previousLabel}
      >
        <Chevron direction="left" />
      </Cap>

      <ol className="echo-pagination__list">
        {slots.map((slot, i) =>
          slot === GAP ? (
            // Not a control: it names nothing and does nothing. Announcing
            // "ellipsis" between two page numbers is noise.
            <li key={`gap-${i}`} className="echo-pagination__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={slot}>
              <Cap
                className="echo-pagination__page"
                onClick={() => onPageChange(slot)}
                aria-label={`Page ${slot}`}
                aria-current={slot === page ? "page" : undefined}
                data-current={slot === page ? "" : undefined}
              >
                {slot}
              </Cap>
            </li>
          ),
        )}
      </ol>

      <Cap
        className="echo-pagination__step"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= count}
        aria-label={nextLabel}
      >
        <Chevron direction="right" />
      </Cap>
    </nav>
  );
}

/* A cap you can press: the library's molded-cap physics on a plain button. */
function Cap({ children, onPointerDown, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const cap = useCapPhysics<HTMLButtonElement>({ travel: 2, tilt: 7 });
  return (
    <button
      ref={cap.ref}
      type="button"
      {...cap.handlers}
      {...props}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        cap.handlers.onPointerDown?.(e);
      }}
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
