"use client";

/**
 * Keypad. A payment terminal's keys under its screen: an amount, a PIN or a
 * code entered on HardwareButton caps, with the reading above them.
 *
 * - `amount` fills from the right, the way a till does: 1, 2, 4, 0 reads
 *   12.40, so nobody hunts for a decimal point. The unused digits stay on
 *   the screen, dim.
 * - `pin` shows a lit socket for each digit, never the digits.
 * - `digits` is a code or a number to dial, drawn in its cells.
 *
 * Type on a real keyboard and the key on screen goes down with your finger:
 * the pad shows what your hands did. It's one Tab stop; the arrow keys move
 * between keys, and digits and Backspace work wherever focus is on the pad.
 * The keypad replaces the phone's own keyboard, so none pops up over it.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { HardwareButton } from "../hardware-button";
import { SegmentDisplay } from "../segment-display";
import { StatusDot } from "../status-dot";
import { digitsOf, press, valueOf, type KeypadMode } from "./entry";
import "../scope/scope.css";
import "./keypad.css";

export type { KeypadMode } from "./entry";

export interface KeypadProps extends EchoInterop {
  /** What is being entered: the machine label on the screen, and the pad's accessible name. */
  label: string;
  /** `amount` (default) fills from the right; `pin` shows a lit socket per digit; `digits` shows a code. */
  mode?: KeypadMode;
  /** Controlled value: "12.40" for an amount, the digits for a PIN or a code. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once a PIN or a code has all its digits. */
  onComplete?: (value: string) => void;
  /** Most digits it takes: an amount's including its decimals (default 6), a PIN's length (default 4), a code's (default 12). */
  maxLength?: number;
  /** An amount's decimal places. Default 2. */
  decimals?: number;
  /** Engraved before the reading: "$", "€". */
  prefix?: string;
  /** Engraved after the reading, and said with it. */
  unit?: string;
  /** The way forward under the keys, usually one HardwareButton. */
  action?: ReactNode;
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

const DEFAULT_MAX: Record<KeypadMode, number> = { amount: 6, pin: 4, digits: 12 };

/** Delete, drawn: a key cap's own glyph. */
const DeleteGlyph = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5h11v14H9l-6-7z" />
    <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
  </svg>
);

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the pad, which takes focus and hands it to the key you were last on.
 */
export const Keypad = forwardRef<HTMLDivElement, KeypadProps>(function Keypad(
  {
    label,
    mode = "amount",
    value,
    defaultValue,
    onValueChange,
    onComplete,
    maxLength,
    decimals = 2,
    prefix,
    unit,
    action,
    screen = "emissive",
    disabled = false,
    readOnly = false,
    name,
    autoFocus,
    onKeyDown: onKeyDownProp,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    ...interop
  },
  ref,
) {
  const max = maxLength ?? DEFAULT_MAX[mode];
  const [inner, setInner] = useState(() => digitsOf(defaultValue ?? "", mode, decimals));
  const digits = value === undefined ? inner : digitsOf(value, mode, decimals);
  const current = valueOf(digits, mode, decimals);
  const off = disabled || readOnly;

  const layout: (string | null)[] = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9",
    mode === "amount" ? "00" : null,
    "0",
    "delete",
  ];
  const keyRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // One Tab stop: only the key you were last on is in the tab order.
  useEffect(() => {
    keyRefs.current.forEach((key, i) => {
      if (key) key.tabIndex = i === active ? 0 : -1;
    });
  });
  useEffect(() => {
    if (autoFocus) keyRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = useRef(digits);
  latest.current = digits;
  const type = useCallback(
    (key: string) => {
      if (off) return;
      const next = press(latest.current, key, mode, max);
      if (next === latest.current) return;
      latest.current = next;
      if (value === undefined) setInner(next);
      const out = valueOf(next, mode, decimals);
      onValueChange?.(out);
      if (mode !== "amount" && next.length === max && key !== "delete") onComplete?.(out);
    },
    [off, mode, max, value, decimals, onValueChange, onComplete],
  );

  /**
   * A key typed on a real keyboard goes down on screen too, with its click,
   * and stays down while the finger does: it comes up with the key, or when
   * focus leaves the pad, and never sooner than a glimpse after it
   * went down, so a quick tap still shows. The cap is moved directly, never by
   * sending it key events, so nothing else on the page hears a key nobody
   * pressed.
   */
  const [struck, setStruck] = useState<number | null>(null);
  const release = useRef<number | undefined>(undefined);
  const struckAt = useRef(0);
  const strike = (index: number) => {
    window.clearTimeout(release.current);
    struckAt.current = performance.now();
    setStruck(index);
  };
  const lift = () => {
    window.clearTimeout(release.current);
    const wait = Math.max(0, 90 - (performance.now() - struckAt.current));
    release.current = window.setTimeout(() => setStruck(null), wait);
  };
  useEffect(() => () => window.clearTimeout(release.current), []);

  // Focus given to the pad itself (a form library's setFocus, the ref's
  // focus()) goes on to its key, so the arrows and the Tab stop work from there.
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    onFocusProp?.(e);
    if (e.target === e.currentTarget) keyRefs.current[active]?.focus();
  };

  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (/^\d$/.test(e.key) || e.key === "Backspace" || e.key === "Delete") lift();
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    onBlurProp?.(e);
    // Leaving the pad lets the key up: its keyup will land somewhere else.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) lift();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler runs first and may take the key for itself.
    onKeyDownProp?.(e);
    if (e.defaultPrevented) return;
    const keys = keyRefs.current;
    const at = keys.findIndex((k) => k === document.activeElement);
    const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
    if (at >= 0 && (e.key in move || e.key === "Home" || e.key === "End")) {
      e.preventDefault();
      const present = keys.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
      let to = e.key === "Home" ? present[0]! : e.key === "End" ? present.at(-1)! : at + move[e.key]!;
      // Step over the gap where a PIN pad has no key.
      if (!keys[to]) to = e.key === "ArrowLeft" || e.key === "ArrowUp" ? to - 1 : to + 1;
      const key = keys[to];
      if (key) {
        setActive(to);
        key.focus();
      }
      return;
    }
    const typed = /^\d$/.test(e.key) ? e.key : e.key === "Backspace" || e.key === "Delete" ? "delete" : null;
    if (typed === null || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const index = layout.indexOf(typed);
    if (index >= 0 && keys[index] && !e.repeat && !off) strike(index);
    type(typed);
  };

  const shown = mode === "amount" ? current || valueOf("0", mode, decimals) : current;
  const said =
    mode === "pin"
      ? `${digits.length} of ${max} digits entered`
      : `${prefix ?? ""}${shown}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      ref={ref}
      className="echo-keypad"
      role="group"
      aria-label={label}
      tabIndex={-1}
      data-disabled={disabled || undefined}
      {...interop}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="echo-keypad__screen" data-echo-screen={screen === "reflective" ? "reflective" : undefined}>
        <span className="echo-keypad__label" aria-hidden="true">
          {label}
        </span>
        <div className="echo-keypad__reading" aria-hidden="true">
          {mode === "pin" ? (
            <span className="echo-keypad__sockets">
              {Array.from({ length: max }, (_, i) => (
                <StatusDot key={i} on={i < digits.length} decorative />
              ))}
            </span>
          ) : (
            <>
              {prefix ? <span className="echo-keypad__prefix">{prefix}</span> : null}
              <SegmentDisplay
                variant="flush"
                label={label}
                value={shown}
                digits={max}
                pad={mode === "amount" ? "0" : " "}
                unit={unit}
              />
            </>
          )}
        </div>
        <span className="echo-keypad__said" aria-live="polite">
          {said}
        </span>
      </div>
      <div className="echo-keypad__keys">
        {layout.map((key, i) =>
          key === null ? (
            <span key="gap" className="echo-keypad__gap" />
          ) : (
            <HardwareButton
              key={key}
              ref={(node: HTMLButtonElement | null) => {
                keyRefs.current[i] = node;
              }}
              size="lg"
              fullWidth
              disabled={off}
              held={struck === i}
              onFocus={() => setActive(i)}
              onClick={() => type(key)}
              {...(key === "delete"
                ? { iconOnly: true as const, icon: DeleteGlyph, "aria-label": "Delete" }
                : { children: key })}
            />
          ),
        )}
      </div>
      {action ? <div className="echo-keypad__action">{action}</div> : null}
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
});
