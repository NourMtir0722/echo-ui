"use client";

/**
 * DateField. A date typed into wheels, day, month and year in the order the
 * person's locale writes them, each a row of small flaps that turn over to
 * the value. It is Field's frame (field.css: the well, its lit edge, the
 * label, the help and the error with its pip) on the same size scale, with
 * wheels where the input would be.
 *
 * Each wheel is a spin button, the pattern a screen reader knows for a
 * date's parts. Type its digits and it moves on once no other digit could
 * follow (a 4 in the day can only be the 4th); step it with ↑/↓, PageUp and
 * PageDown; Home and End go to the ends of its range; Backspace clears it;
 * ←/→ or a separator key (/ . - or a space) move between wheels.
 *
 * The value is an ISO date (`2026-09-28`), or "" until the wheels make a
 * real one: no `Date` crosses the boundary, so no time zone can move a day.
 * `name` puts it in a form. `min`, `max` and `unavailable` are said in words
 * under the field when the date breaks them; your own `error` says anything
 * else, and wins.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { createSpring, useReducedMotionRef } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import { useDateLocale } from "./locale";
import {
  compareDates,
  dateDirection,
  daysInMonth,
  digitOf,
  fromISO,
  isReal,
  localDigits,
  monthName,
  segmentOrder,
  today,
  toISO,
  written,
  type SegmentKind,
} from "./date";
import "../field/field.css";
import "./date-field.css";

interface DateFieldOwnProps extends EchoInterop {
  /** The date, controlled, as an ISO string (`2026-09-28`); "" for none. */
  value?: string;
  defaultValue?: string;
  /** Called with the ISO date once the wheels make a real one, and with "" when they stop making one. */
  onValueChange?: (value: string) => void;
  /** The earliest date, as ISO. The year wheel starts at its year. */
  min?: string;
  /** The latest date, as ISO. The year wheel ends at its year. */
  max?: string;
  /** Dates that can't be chosen (a weekend, a booked day), asked with each ISO date. */
  unavailable?: (date: string) => boolean;
  /** Whose order and names, as a BCP 47 tag ("en-GB", "de"). Default: the browser's. */
  locale?: string;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a Field beside it. Defaults to the nearest SizeProvider's.
   */
  size?: ControlSize;
  /** In the well after the date: a small control, as a `size="sm"` iconOnly HardwareButton. DatePicker puts its calendar key here. */
  end?: ReactNode;
  /** Help under the field, read after its name. */
  description?: ReactNode;
  /** What's wrong, in words. While it's set, the field is invalid. */
  error?: string;
  /** Ids of other text that describes the field, read after its own description and error. */
  "aria-describedby"?: string;
}

/** A date field has a name: a visible `label`, or `aria-label` / `aria-labelledby`. */
type DateFieldName =
  | { label: string; "aria-label"?: string; "aria-labelledby"?: string }
  | { "aria-label": string; label?: string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; label?: string; "aria-label"?: string };

export type DateFieldProps = DateFieldOwnProps & DateFieldName;

type Parts = Partial<Record<SegmentKind, number>>;
/** Digits typed into a wheel that could still take another. */
type Draft = { kind: SegmentKind; text: string };

const DIGITS: Record<SegmentKind, number> = { day: 2, month: 2, year: 4 };
/** How far PageUp and PageDown step: a week, a quarter, a decade. */
const JUMP: Record<SegmentKind, number> = { day: 7, month: 3, year: 10 };
/** One flap turning, a dry tick (SplitFlap's). */
const FLAP: SoundRecipe = { wave: "square", freq: 2600, decay: 0.012, gain: 0.05 };
const SEPARATORS = new Set(["/", ".", "-", ",", " ", ":"]);

/** "Day", "Tag", "jour": the wheel's name in the field's locale. */
function wheelName(kind: SegmentKind, locale?: string): string {
  try {
    const name = new Intl.DisplayNames(locale, { type: "dateTimeField" }).of(kind);
    if (name) return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    /* an engine without names for a date's fields */
  }
  return { day: "Day", month: "Month", year: "Year" }[kind];
}

/** What an empty wheel shows: its name's first letter, the way forms write it (DD, TT, JJ), or dashes. */
function blank(kind: SegmentKind, locale?: string): string {
  const letter = wheelName(kind, locale).charAt(0).toLocaleUpperCase(locale);
  return letter.toLocaleLowerCase(locale) !== letter ? letter : "–";
}

const partsOf = (iso: string | undefined): Parts => {
  const d = fromISO(iso);
  return d ? { day: d.day, month: d.month, year: d.year } : {};
};

const wholeOf = (p: Parts) =>
  p.day !== undefined && p.month !== undefined && p.year !== undefined ? { day: p.day, month: p.month, year: p.year } : undefined;

/** The ISO date the wheels make, or "". */
const isoOf = (p: Parts) => {
  const d = wholeOf(p);
  return d && isReal(d) ? toISO(d) : "";
};

/**
 * `forwardRef`, as Field is, for React 18. The ref lands on the first wheel:
 * what a form library focuses when the field has an error. Wire it with
 * react-hook-form's `Controller` (`value`, `onValueChange`, `onBlur`, `ref`).
 */
export const DateField = forwardRef<HTMLSpanElement, DateFieldProps>(function DateField(
  {
    label,
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    unavailable,
    locale: ownLocale,
    size: ownSize,
    end,
    description,
    error,
    id,
    name,
    disabled,
    required,
    readOnly,
    autoFocus,
    onBlur,
    onFocus,
    onKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    ...interop
  },
  ref,
) {
  const size = useControlSize(ownSize);
  const locale = useDateLocale(ownLocale);
  const order = useMemo(() => segmentOrder(locale), [locale]);
  // Arabic lays the wheels out right to left; the digits in a wheel always run left to right.
  const direction = useMemo(() => dateDirection(locale), [locale]);
  const reduced = useReducedMotionRef();
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;

  const [parts, setPartsState] = useState<Parts>(() => partsOf(value ?? defaultValue));
  const [draft, setDraftState] = useState<Draft | null>(null);
  /*
   * The same two, for handlers. A wheel that fills moves focus on at once,
   * and the blur that follows runs before React has re-rendered: read from
   * state, it would see the digits as still being typed and write them back.
   */
  const now = useRef({ parts, draft });
  const setParts = (next: Parts) => {
    now.current.parts = next;
    setPartsState(next);
  };
  const setDraft = (next: Draft | null) => {
    now.current.draft = next;
    setDraftState(next);
  };

  /** The value this field last said, so a parent handing it back isn't read as a new one. */
  const said = useRef(isoOf(parts));
  useEffect(() => {
    if (value === undefined || value === said.current) return;
    said.current = value;
    const next = partsOf(value);
    now.current = { parts: next, draft: null };
    setPartsState(next);
    setDraftState(null);
  }, [value]);

  const commit = (next: Parts) => {
    // A day past the month's end comes back to its last day: the 31st of February is the 28th or 29th.
    if (next.day !== undefined && next.month !== undefined) {
      const last = daysInMonth(next.year ?? 2000, next.month);
      if (next.day > last) next = { ...next, day: last };
    }
    setParts(next);
    const out = isoOf(next);
    if (out !== said.current) {
      said.current = out;
      onValueChange?.(out);
    }
  };

  const minDate = fromISO(min);
  const maxDate = fromISO(max);
  const rangeOf = (kind: SegmentKind, p: Parts): [number, number] =>
    kind === "day"
      ? [1, p.month !== undefined ? daysInMonth(p.year ?? 2000, p.month) : 31]
      : kind === "month"
        ? [1, 12]
        : [minDate?.year ?? 1, maxDate?.year ?? 9999];

  /** The wheels with the digits still being typed counted in. */
  const settled = (): Parts => {
    const { parts: p, draft: d } = now.current;
    return d ? { ...p, [d.kind]: Number(d.text) || undefined } : p;
  };

  const wheels = useRef(new Map<SegmentKind, HTMLSpanElement>());
  const move = (kind: SegmentKind, by: 1 | -1) => {
    const at = order.findIndex((s) => s.kind === kind);
    const next = order[at + by];
    if (next) wheels.current.get(next.kind)?.focus();
  };

  /** A digit typed into a wheel: it moves on once no other digit could follow. */
  const typeDigit = (kind: SegmentKind, digit: string) => {
    if (readOnly) return;
    const base = settled();
    // A year is typed whole, whatever the limits: 2027 against a max in 2026
    // is kept, and the message under the field says why it can't be.
    const hi = kind === "year" ? 9999 : rangeOf(kind, base)[1];
    const typing = now.current.draft?.kind === kind ? now.current.draft.text : "";
    let text = typing + digit;
    // A digit that can't continue what's there starts it again: 1 then 5 in a month is May.
    if (Number(text) > hi) text = digit;
    const n = Number(text);
    if (text.length >= DIGITS[kind] || n * 10 > hi) {
      setDraft(null);
      commit({ ...base, [kind]: n || undefined });
      move(kind, 1);
    } else setDraft({ kind, text });
  };

  /** Backspace: the last digit typed, or the whole wheel. */
  const erase = (kind: SegmentKind) => {
    if (readOnly) return;
    const typing = now.current.draft?.kind === kind ? now.current.draft.text : "";
    if (typing.length > 1) return setDraft({ kind, text: typing.slice(0, -1) });
    const base = settled();
    setDraft(null);
    commit({ ...base, [kind]: undefined });
  };

  const onWheelKey = (kind: SegmentKind) => (event: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.metaKey || event.ctrlKey || event.altKey) return;
    const base = settled();
    const [lo, hi] = rangeOf(kind, base);
    const current = base[kind];
    const within = (n: number) => Math.min(hi, Math.max(lo, n));
    const start = within(today()[kind]);
    const set = (to: number | undefined) => {
      event.preventDefault();
      setDraft(null);
      if (!readOnly) commit({ ...base, [kind]: to });
    };
    const rtl = direction === "rtl";

    switch (event.key) {
      case "ArrowUp":
        return set(current === undefined ? start : current >= hi ? lo : current + 1);
      case "ArrowDown":
        return set(current === undefined ? start : current <= lo ? hi : current - 1);
      case "PageUp":
        return set(within((current ?? start) + JUMP[kind]));
      case "PageDown":
        return set(within((current ?? start) - JUMP[kind]));
      case "Home":
        return set(lo);
      case "End":
        return set(hi);
      case "ArrowRight":
      case "ArrowLeft":
        event.preventDefault();
        return move(kind, (event.key === "ArrowRight") !== rtl ? 1 : -1);
      case "Backspace":
      case "Delete":
        event.preventDefault();
        return erase(kind);
    }
    if (SEPARATORS.has(event.key)) {
      event.preventDefault();
      return move(kind, 1);
    }
    const digit = digitOf(event.key);
    if (digit) {
      event.preventDefault();
      typeDigit(kind, digit);
    }
  };

  /*
   * A phone's keyboard. The wheels are contentEditable with a numeric
   * keyboard (a focused span opens none), and a virtual keyboard often sends
   * its keys as "Unidentified": what it types arrives as `beforeinput`, which
   * is turned into the same digits, separators and Backspace, and never
   * reaches the flaps. A pasted ISO date fills every wheel.
   */
  const onInput = useRef<(kind: SegmentKind, event: InputEvent) => void>(() => {});
  onInput.current = (kind, event) => {
    event.preventDefault();
    if (disabled || readOnly) return;
    if (event.inputType.startsWith("delete")) return erase(kind);
    const text = event.data ?? event.dataTransfer?.getData("text/plain") ?? "";
    const pasted = fromISO(text.trim());
    if (pasted) {
      setDraft(null);
      return commit({ day: pasted.day, month: pasted.month, year: pasted.year });
    }
    let at = kind;
    for (const c of text) {
      const digit = digitOf(c);
      if (digit) typeDigit(at, digit);
      else if (SEPARATORS.has(c)) move(at, 1);
      // Typing on may have moved focus to the next wheel.
      const focused = [...wheels.current].find(([, el]) => el === document.activeElement);
      if (focused) at = focused[0];
    }
  };
  useEffect(() => {
    const offs = [...wheels.current].map(([kind, el]) => {
      const on = (event: Event) => onInput.current(kind, event as InputEvent);
      el.addEventListener("beforeinput", on);
      return () => el.removeEventListener("beforeinput", on);
    });
    return () => offs.forEach((off) => off());
  }, [order]);

  /** Leaving a wheel keeps what was typed in it: a 1 left in the month is January. */
  const onWheelBlur = (kind: SegmentKind) => () => {
    if (now.current.draft?.kind !== kind) return;
    const next = settled();
    setDraft(null);
    if (!readOnly) commit(next);
  };

  /*
   * The flaps. A character that changes is a new flap, so it mounts, and
   * mounting after the first render turns it over and ticks, once however
   * many turn together. Nothing turns as the field first draws.
   */
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const ticked = useRef(false);
  const turn = useCallback(
    (el: HTMLSpanElement | null) => {
      if (!el || !mounted.current) return;
      if (!ticked.current) {
        ticked.current = true;
        queueMicrotask(() => {
          ticked.current = false;
        });
        play.current?.(FLAP);
      }
      if (reduced.current) return;
      el.animate([{ transform: "rotateX(-90deg)" }, { transform: "rotateX(0deg)" }], {
        duration: 190,
        easing: "cubic-bezier(.3,1.6,.6,1)",
      });
    },
    [reduced],
  );

  // What the field knows is wrong by itself: a date outside its limits, said in words.
  const whole = wholeOf(parts);
  const iso = isoOf(parts);
  const broken =
    iso && whole
      ? minDate && maxDate && (compareDates(whole, minDate) < 0 || compareDates(whole, maxDate) > 0)
        ? `Choose a date from ${written(minDate, locale)} to ${written(maxDate, locale)}.`
        : minDate && compareDates(whole, minDate) < 0
          ? `Choose ${written(minDate, locale)} or later.`
          : maxDate && compareDates(whole, maxDate) > 0
            ? `Choose ${written(maxDate, locale)} or earlier.`
            : unavailable?.(iso)
              ? `${written(whole, locale)} isn't available.`
              : undefined
      : undefined;
  const message = error ?? broken;

  // A new message shakes the field, as it does a Field: a latch that won't take the key.
  const root = useRef<HTMLDivElement | null>(null);
  const shown = useRef(message);
  useEffect(() => {
    const was = shown.current;
    shown.current = message;
    const el = root.current;
    if (!el || !message || message === was || reduced.current) return;
    const spring = createSpring(0, { duration: 0.42, bounce: 0.55 }, (x) => {
      el.style.translate = Math.abs(x) < 0.05 ? "" : `${x.toFixed(2)}px 0`;
    });
    spring.to(0, { velocity: 320 });
    return () => spring.stop();
  }, [message, reduced]);

  const ownId = useId();
  const groupId = id ?? `${ownId}-group`;
  const labelId = `${ownId}-label`;
  const descriptionId = `${ownId}-description`;
  const errorId = `${ownId}-error`;
  const labelledBy = [label ? labelId : undefined, ariaLabelledby].filter(Boolean).join(" ") || undefined;
  // Each wheel says the field's name before its own ("Date of birth, Day"): Tab can land on any of them.
  const nameIds = labelledBy ?? (ariaLabel ? groupId : undefined);
  const describedBy = [description != null ? descriptionId : undefined, message ? errorId : undefined, ariaDescribedby].filter(Boolean).join(" ") || undefined;

  const focusFirstEmpty = () => {
    if (disabled) return;
    const empty = order.find((s) => parts[s.kind] === undefined) ?? order[0];
    if (empty) wheels.current.get(empty.kind)?.focus();
  };
  const leaving = (event: FocusEvent<HTMLDivElement>) => !event.currentTarget.contains(event.relatedTarget as Node | null);

  return (
    <div
      ref={root}
      className="echo-field echo-date-field"
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      data-invalid={message ? "" : undefined}
    >
      {label ? (
        <span
          id={labelId}
          className="echo-field__label"
          onMouseDown={(event) => {
            event.preventDefault();
            focusFirstEmpty();
          }}
        >
          {label}
        </span>
      ) : null}
      <div
        id={groupId}
        role="group"
        className="echo-field__well echo-date-field__well"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-disabled={disabled || undefined}
        data-adorned={end != null ? "" : undefined}
        onFocus={(event) => {
          if (leaving(event)) onFocus?.(event);
        }}
        onBlur={(event) => {
          if (leaving(event)) onBlur?.(event);
        }}
        onMouseDown={(event) => {
          // A press on the well between wheels: the first empty wheel takes it.
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          focusFirstEmpty();
        }}
        {...interop}
      >
        <span className="echo-date-field__date" dir={direction}>
          {order.map(({ kind, after }, index) => {
            const typing = draft?.kind === kind ? draft.text : undefined;
            const n = typing !== undefined ? Number(typing) || undefined : parts[kind];
            const letter = blank(kind, locale);
            const chars =
              typing !== undefined
                ? localDigits(typing, locale).padEnd(DIGITS[kind], letter)
                : n === undefined
                  ? letter.repeat(DIGITS[kind])
                  : localDigits(String(n).padStart(DIGITS[kind], "0"), locale);
            const lit = typing !== undefined ? typing.length : n === undefined ? 0 : DIGITS[kind];
            const [lo, hi] = rangeOf(kind, parts);
            const wheelId = `${ownId}-${kind}`;
            return (
              <span key={kind} className="echo-date-field__part">
                <span
                  id={wheelId}
                  ref={(el) => {
                    if (el) wheels.current.set(kind, el);
                    else wheels.current.delete(kind);
                    if (index !== 0) return;
                    if (typeof ref === "function") ref(el);
                    else if (ref) ref.current = el;
                  }}
                  role="spinbutton"
                  tabIndex={disabled ? -1 : 0}
                  contentEditable={!disabled && !readOnly}
                  suppressContentEditableWarning
                  inputMode="numeric"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="echo-date-field__wheel"
                  data-kind={kind}
                  aria-label={wheelName(kind, locale)}
                  aria-labelledby={nameIds ? `${nameIds} ${wheelId}` : undefined}
                  // On every wheel, not the group: a wheel is where focus lands, and what's wrong is read there.
                  aria-describedby={describedBy}
                  aria-valuemin={lo}
                  aria-valuemax={hi}
                  aria-valuenow={n}
                  aria-valuetext={
                    n === undefined
                      ? "Empty"
                      : kind === "month" && typing === undefined
                        ? `${localDigits(String(n), locale)}, ${monthName(n, locale)}`
                        : localDigits(String(n), locale)
                  }
                  aria-invalid={message ? true : undefined}
                  aria-required={required || undefined}
                  aria-readonly={readOnly || undefined}
                  aria-disabled={disabled || undefined}
                  autoFocus={autoFocus && index === 0}
                  onKeyDown={onWheelKey(kind)}
                  onBlur={onWheelBlur(kind)}
                  // Its name and reading come from Intl, which the server and the browser can word differently.
                  suppressHydrationWarning
                >
                  {chars.split("").map((c, i) => (
                    <span
                      key={`${i}${c}`}
                      ref={turn}
                      className="echo-date-field__flap"
                      data-blank={i >= lit ? "" : undefined}
                      aria-hidden
                      suppressHydrationWarning
                    >
                      {c}
                    </span>
                  ))}
                </span>
                {after ? (
                  <span className="echo-date-field__separator" aria-hidden suppressHydrationWarning>
                    {after.trim() || after}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
        {end != null ? (
          <span className="echo-field__adornment" data-side="end">
            {end}
          </span>
        ) : null}
      </div>
      {name ? <input type="hidden" name={name} value={iso} disabled={disabled} /> : null}
      {description != null ? (
        <p id={descriptionId} className="echo-field__description">
          {description}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} className="echo-field__error">
          {message}
        </p>
      ) : null}
    </div>
  );
});
