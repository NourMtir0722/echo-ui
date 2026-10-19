"use client";

/**
 * Form. A form that fails well. Give it `errors` (field name → message,
 * from your validation or your server) and pass the same message to each
 * field's own `error`, so it shows under the field. When a submit comes
 * back with errors, the Form puts a summary at the top, in the danger Banner:
 * how many things need fixing, each one a link that takes focus straight to
 * its field. Focus moves to the summary, so a screen reader hears it first
 * and a keyboard is one Tab from the first problem.
 *
 * A native form (`noValidate`: you validate, the browser doesn't), whose
 * `onSubmit` gets the values as an object. Not Base UI's Form: it refuses to
 * submit while any field is marked invalid, and a field stays marked while
 * its `error` is set, so the corrected form could never be sent to clear it.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import "./form.css";

export interface FormProps {
  children: ReactNode;
  /** Called with the form's values by field name (a name used more than once gives an array). */
  onSubmit?: (values: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => void;
  /** Field name → what's wrong. Empty or absent: nothing is. */
  errors?: Record<string, string | undefined>;
  /** Show the summary. Set it true after a submit that came back with errors; false once they're fixed. */
  showSummary?: boolean;
  /** The summary's heading. Default "There's a problem" / "There are N problems". */
  summaryTitle?: string;
  /** Names the form, for a screen reader's list of landmarks (a form with a name is one). */
  "aria-label"?: string;
}

export function Form({ children, onSubmit, errors = {}, showSummary = false, summaryTitle, ...name }: FormProps) {
  const listed = Object.entries(errors).filter((e): e is [string, string] => !!e[1]);
  const summary = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const form = useRef<HTMLFormElement>(null);
  const open = showSummary && listed.length > 0;

  // Each time the summary opens, it takes focus: said first, one Tab from the first problem.
  useEffect(() => {
    if (open) summary.current?.focus();
  }, [open, listed.length]);

  const title = summaryTitle ?? (listed.length === 1 ? "There's a problem" : `There are ${listed.length} problems`);
  const go = (field: string) => {
    const el = form.current?.querySelector<HTMLElement>(`[name="${CSS.escape(field)}"]`);
    // A named hidden input stands in for some controls; focus what the person sees.
    const target = el && el.getAttribute("type") === "hidden" ? el.parentElement?.querySelector<HTMLElement>("input:not([type=hidden]), button, [tabindex]") : el;
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <form
      ref={form}
      className="echo-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
        for (const key of new Set(data.keys())) {
          const all = data.getAll(key);
          values[key] = all.length > 1 ? all : all[0]!;
        }
        onSubmit?.(values);
      }}
      {...name}
    >
      {open ? (
        <div ref={summary} className="echo-form__summary" role="alert" tabIndex={-1} aria-labelledby={titleId}>
          <span className="echo-form__led" aria-hidden="true" />
          <div className="echo-form__summary-body">
            <p id={titleId} className="echo-form__summary-title">
              {title}
            </p>
            <ul className="echo-form__summary-list">
              {listed.map(([field, message]) => (
                <li key={field}>
                  <a
                    href={`#${field}`}
                    className="echo-form__summary-link"
                    onClick={(e) => {
                      e.preventDefault();
                      go(field);
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {children}
    </form>
  );
}
