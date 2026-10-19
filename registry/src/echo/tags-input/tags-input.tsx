"use client";

/**
 * TagsInput. Free-form tags typed into Field's well: email addresses,
 * keywords, labels. Type and press Enter (or a comma) and the text buds into
 * a tag; Backspace in an empty input takes the last one back; a paste with
 * commas or new lines becomes several at once. Each tag has its own ×.
 *
 * For a fixed list to choose from, use Combobox with `multiple`. This is for
 * values nobody could list in advance.
 *
 * The input is named by the visible label; the tags are a named list, each
 * remove button says what it removes, and additions and removals are
 * announced politely.
 */
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import type { EchoTextInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { useControlSize, type ControlSize } from "../size";
import "../tag/tag.css";
import "../combobox/combobox.css";
import "./tags-input.css";

interface TagsInputOwnProps extends EchoTextInterop {
  /** The visible label and the input's accessible name. */
  label: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Turn typed text into a tag, or reject it (return null): trim, lower-case, validate. */
  normalize?: (text: string) => string | null;
  /** The most tags it takes. */
  max?: number;
  size?: ControlSize;
}

export type TagsInputProps = TagsInputOwnProps;

const Cross = () => (
  <svg viewBox="0 0 12 12" aria-hidden>
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** `forwardRef` — see the note on `Field`. The ref lands on the input. */
export const TagsInput = forwardRef<HTMLInputElement, TagsInputProps>(function TagsInput(
  { label, value, defaultValue = [], onValueChange, normalize = (t) => t.trim() || null, max, placeholder, size: ownSize, id, name, disabled, onKeyDown, onBlur, ...interop },
  ref,
) {
  const size = useControlSize(ownSize);
  const autoId = useId();
  const inputId = id ?? autoId;
  const sound = useSoundOptional();
  const [inner, setInner] = useState<string[]>(defaultValue);
  const tags = value ?? inner;
  const [text, setText] = useState("");
  const [said, setSaid] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  const set = (next: string[]) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const add = (raw: string[]) => {
    const fresh: string[] = [];
    for (const r of raw) {
      const t = normalize(r);
      if (t && !tags.includes(t) && !fresh.includes(t) && (max === undefined || tags.length + fresh.length < max)) fresh.push(t);
    }
    if (!fresh.length) return false;
    set([...tags, ...fresh]);
    sound?.play("tap");
    setSaid(`Added ${fresh.join(", ")}`);
    return true;
  };
  const remove = (t: string) => {
    set(tags.filter((x) => x !== t));
    setSaid(`Removed ${t}`);
    input.current?.focus();
  };

  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if ((e.key === "Enter" || e.key === ",") && text.trim()) {
      e.preventDefault();
      if (add([text])) setText("");
    } else if (e.key === "Backspace" && text === "" && tags.length) {
      e.preventDefault();
      remove(tags[tags.length - 1]!);
    }
  };
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[,\n]/.test(pasted)) return;
    e.preventDefault();
    add(pasted.split(/[,\n]+/));
  };

  return (
    <div className="echo-combobox echo-tags-input" data-size={size} data-multiple="">
      <label className="echo-combobox__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="echo-combobox__well" onPointerDown={(e) => e.target === e.currentTarget && (e.preventDefault(), input.current?.focus())}>
        <div className="echo-combobox__chips">
          {tags.length ? (
            <ul className="echo-tags-input__list" aria-label={`${label}, added`}>
              {tags.map((t) => (
                <li key={t} className="echo-tag echo-combobox__chip">
                  <span className="echo-tag__label">{t}</span>
                  <button type="button" className="echo-tag__remove" aria-label={`Remove ${t}`} disabled={disabled} onClick={() => remove(t)}>
                    <Cross />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            ref={(node) => {
              input.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as MutableRefObject<HTMLInputElement | null>).current = node;
            }}
            {...interop}
            id={inputId}
            className="echo-combobox__input"
            value={text}
            placeholder={tags.length ? undefined : placeholder}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={keys}
            onPaste={paste}
            onBlur={(e) => {
              // Whatever was left typed becomes a tag when you move on.
              if (text.trim() && add([text])) setText("");
              onBlur?.(e);
            }}
            aria-describedby={`${inputId}-hint`}
          />
        </div>
      </div>
      <span id={`${inputId}-hint`} className="echo-tags-input__hint">
        Enter or comma adds; Backspace removes the last.
      </span>
      {name ? tags.map((t) => <input key={t} type="hidden" name={name} value={t} />) : null}
      <span className="echo-tags-input__live" aria-live="polite">
        {said}
      </span>
    </div>
  );
});
