"use client";

/**
 * Tag. A label the USER put there — a category, a
 * person, a filter — optionally removable.
 *
 * Distinct from Badge, which reports state the system knows (status, counts).
 * The difference shows in the material: a Badge is printed onto the chassis,
 * a Tag is a small applied plate that can be peeled off.
 *
 * A removable tag answers the hand the way a plate would: it lifts off the
 * surface under the pointer, leaning toward it, and presses back down when
 * held. A static tag has nothing to do and stays put.
 */
import type { HTMLAttributes, ReactNode } from "react";
import { useCapPhysics } from "echo-ui-core/tactile";
import "./tag.css";

/*
 * Bundlers replace `process.env.NODE_ENV` at build time; declared here so the
 * file type-checks in an app without Node's types.
 */
declare const process: { env: { NODE_ENV?: string } };

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onRemove"> {
  children: ReactNode;
  /** Render a remove control. Omit and the tag is static. */
  onRemove?: () => void;
  /**
   * Accessible name for the remove control. Defaults to "Remove" plus the
   * tag's text ("Remove Loop"), so a row of tags doesn't read as a row of
   * identical "Remove" buttons. Pass one when the tag's content isn't text.
   */
  removeLabel?: string;
}

export function Tag({ children, onRemove, removeLabel, className, ...rest }: TagProps) {
  const text = typeof children === "string" || typeof children === "number" ? String(children) : null;
  if (process.env.NODE_ENV !== "production" && onRemove && !removeLabel && text === null) {
    warnUnnamedRemove();
  }
  const name = removeLabel ?? (text !== null ? `Remove ${text}` : "Remove");
  const plate = useCapPhysics<HTMLSpanElement>({ lift: 1.5, travel: 1, tilt: 7 });
  return (
    <span
      ref={onRemove ? plate.ref : undefined}
      className={["echo-tag", className].filter(Boolean).join(" ")}
      {...(onRemove ? plate.handlers : {})}
      {...rest}
    >
      <span className="echo-tag__label">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="echo-tag__remove"
          onClick={onRemove}
          aria-label={name}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

let warnedUnnamed = false;
function warnUnnamedRemove(): void {
  if (warnedUnnamed) return;
  warnedUnnamed = true;
  console.warn(
    "[echo-ui] <Tag onRemove> with non-text children needs `removeLabel`: otherwise every " +
      "remove button is just \"Remove\", and a screen reader can't tell them apart.",
  );
}
