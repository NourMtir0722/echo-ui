/**
 * Steps. How far through a sequence you are, as a
 * row of LED stations wired together.
 *
 * a11y: an ordered list inside a labelled group. The current station carries
 * aria-current="step"; the done/upcoming distinction is stated in text for
 * screen readers rather than left to the lit/unlit pip, because a colour is
 * not a message.
 *
 * Static; consumes only var(--echo-*) via steps.css.
 */
import type { HTMLAttributes } from "react";
import "./steps.css";

export type StepState = "complete" | "current" | "upcoming";

export interface StepsProps extends HTMLAttributes<HTMLDivElement> {
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
  /** Name for the group, e.g. "Setup". Required — a bare list of stations
   *  says nothing about what sequence it is. */
  label: string;
  /** Word appended for screen readers on finished steps. Default "completed". */
  completeLabel?: string;
}

export function Steps({
  steps,
  current,
  label,
  completeLabel = "completed",
  className,
  ...rest
}: StepsProps) {
  if (steps.length === 0) return null;

  return (
    <div
      className={["echo-steps", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
      {...rest}
    >
      <ol className="echo-steps__list">
        {steps.map((step, i) => {
          const state: StepState = i < current ? "complete" : i === current ? "current" : "upcoming";
          return (
            <li
              key={`${step}-${i}`}
              className="echo-steps__step"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="echo-steps__marker" aria-hidden="true">
                {state === "complete" ? (
                  <svg className="echo-steps__check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" pathLength={1} />
                  </svg>
                ) : (
                  <span className="echo-steps__pip" />
                )}
              </span>
              <span className="echo-steps__label">
                {step}
                {state === "complete" ? (
                  <span className="echo-steps__sr"> {completeLabel}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
