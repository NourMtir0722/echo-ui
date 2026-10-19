"use client";

/**
 * Textarea. Field is
 * single-line; this is the same recessed well, multi-line, and autosizing.
 *
 * AUTOSIZE, and why it is measured rather than computed. Growing a textarea by
 * counting `\n`s is wrong the moment a line wraps, and wrong again at a
 * different width. The honest way is to let the browser lay the text out and
 * read the result: collapse the height, read scrollHeight, set that. It runs on
 * every value change and on resize, and it is cheap because it is one forced
 * reflow of one element.
 *
 * The measurement is skipped entirely when `autosize` is false, so a fixed-rows
 * textarea costs nothing.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EchoTextInterop } from "echo-ui-core/types";
import { Field as BaseField } from "@base-ui/react/field";
import { useWellMotion } from "echo-ui-core/tactile";
import "./textarea.css";

/**
 * Layout effects warn during SSR because there is no layout to run them
 * against. The measurement genuinely has to happen before paint on the client
 * (otherwise the box visibly jumps from one row to its real height), so the
 * hook is swapped rather than the behavior.
 */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Narrowed deliberately.
 *
 * This used to extend `TextareaHTMLAttributes` wholesale and accept
 * `className` — an open API, and the one `PRINCIPLES.md` now says Echo does
 * not have. It was also half of a backwards split: the control that most
 * needed a form library could be restyled per-instance, while `Checkbox`
 * could not even take an `onBlur`. It now takes the same declared interop set
 * as every other text control, and nothing else.
 */
interface TextareaOwnProps extends EchoTextInterop {
  /** Help text under the textarea, linked to it so a screen reader reads it after the name. */
  description?: ReactNode;
  /**
   * What's wrong, in words. While it's set the textarea is invalid: the
   * message shows under it with a square pip, the textarea gets
   * `aria-invalid`, and the message is linked to it. Clear it when fixed.
   */
  error?: string;
  /** Visible eyebrow label; also the accessible name. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Render the value in the machine (mono) voice — logs, patch notes, codes. */
  mono?: boolean;
  /** Grow to fit the content instead of scrolling. Default true. */
  autosize?: boolean;
  /** Rows to show before growing. Also the fixed height when autosize is off. */
  rows?: number;
  /** Stop growing here and scroll instead. Rows, not pixels. */
  maxRows?: number;
}

/**
 * A field has to have a name. A visible `label` is
 * the one to reach for; `aria-label` or `aria-labelledby` are for a field whose
 * label is elsewhere on screen. Leaving all three out is a type error.
 */
type FieldName =
  | { label: string; "aria-label"?: string; "aria-labelledby"?: string }
  | { "aria-label": string; label?: string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; label?: string; "aria-label"?: string };

export type TextareaProps = TextareaOwnProps & FieldName;

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The caller's
 * ref is merged with the one autosize already needs, and points at the
 * textarea itself.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
  label,
  value,
  defaultValue,
  onValueChange,
  mono = false,
  autosize = true,
  rows = 3,
  maxRows,
  disabled,
  name,
  description,
  error,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  ...interop
  },
  forwardedRef,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Autosize measures through `ref`; the caller is handed the same node.
  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement, []);

  // The well answers the hand (useWellMotion), as Field's does: pressed in
  // on click, struck by each key, with a caret that glides along the line.
  const well = useWellMotion<HTMLDivElement>();

  // Uncontrolled values still have to be measured, so the current text is
  // tracked here regardless of who owns it.
  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  const text = value ?? innerValue;

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el || !autosize) return;

    // Collapse first: scrollHeight only shrinks if the box is smaller than the
    // content, so measuring without this makes the field grow and never shrink.
    el.style.height = "auto";
    const styles = getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const vertical = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const cap = maxRows ? maxRows * lineHeight + vertical : Infinity;
    const next = Math.min(el.scrollHeight, cap);

    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > cap ? "auto" : "hidden";
  }, [autosize, maxRows]);

  useIsomorphicLayoutEffect(resize, [text, resize]);

  // A width change re-wraps the text, which changes the height. Without this
  // the box is correct until the first time the window moves.
  useEffect(() => {
    if (!autosize || typeof ResizeObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [autosize, resize]);

  // Base UI's Field wires the label, description, error and aria-invalid;
  // Echo keeps the autosize and the look.
  return (
    <BaseField.Root
      className="echo-textarea"
      disabled={disabled}
      invalid={error ? true : undefined}
      name={name}
    >
      {label && <BaseField.Label className="echo-textarea__label">{label}</BaseField.Label>}
      <div className="echo-textarea__well" ref={well}>
        <span className="echo-textarea__floor" data-echo-floor aria-hidden />
        <BaseField.Control
          ref={ref}
          value={text}
          onValueChange={(next) => {
            if (value === undefined) setInnerValue(next);
            onValueChange?.(next);
          }}
          className={mono ? "echo-textarea__input echo-textarea__input--mono" : "echo-textarea__input"}
          // A visible label wins; these only apply when there is none.
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? undefined : ariaLabelledby}
          aria-describedby={ariaDescribedby}
          render={<textarea {...interop} rows={rows} />}
        />
        <span className="echo-textarea__caret" data-echo-caret aria-hidden />
      </div>
      {description != null && (
        <BaseField.Description className="echo-textarea__description">{description}</BaseField.Description>
      )}
      {error && (
        <BaseField.Error className="echo-textarea__error" match>
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
});
