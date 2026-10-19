"use client";

/**
 * Calendar. A month on a device screen: the days are its lit segments, the
 * chosen day lit with the one lit accent (the primary cap's plastic and its
 * cream legend), today carrying WeekStrip's lit rail. Two keys page the
 * months, and the month slides the way it went.
 *
 * It's a grid, the pattern a screen reader knows for a calendar: one Tab
 * stop, on the chosen day or today; the arrows move a day or a week, Home
 * and End go to the week's ends, PageUp and PageDown a month (with Shift, a
 * year), and Enter or Space chooses. Moving past the month pages with you.
 * Each day is named in full ("Monday, 28 September 2026"); days that can't be
 * chosen say so and can still be reached, so the keys never skip.
 *
 * The value is an ISO date, as DateField's is, and the same engine does the
 * arithmetic: no `Date` crosses the boundary, so no time zone moves a day.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { useReducedMotionRef } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { useControlSize, type ControlSize } from "../size";
import {
  addDays,
  addMonths,
  allowed,
  compareDates,
  firstDayOfWeek as localeFirstDay,
  fromISO,
  localDigits,
  monthGrid,
  monthTitle,
  sameDay,
  spoken,
  toISO,
  today,
  weekday,
  weekdayNames,
  type CalendarDate,
} from "../date-field/date";
import { useDateLocale } from "../date-field/locale";
import "./calendar.css";

export interface CalendarProps extends EchoInterop {
  /** The chosen date, controlled, as ISO (`2026-09-28`); "" for none. */
  value?: string;
  defaultValue?: string;
  /** Called with the ISO date a person chooses. */
  onValueChange?: (value: string) => void;
  /** The earliest date that can be chosen, as ISO. */
  min?: string;
  /** The latest date that can be chosen, as ISO. */
  max?: string;
  /** Dates that can't be chosen (a weekend, a booked day), asked with each ISO date. They're shown struck through. */
  unavailable?: (date: string) => boolean;
  /** Whose names and first weekday, as a BCP 47 tag. Default: the browser's. */
  locale?: string;
  /** The week's first day, 0 for Sunday to 6 for Saturday. Default: the locale's. */
  firstDayOfWeek?: number;
  /** The month shown first, as any ISO date in it. Default: the chosen date's month, or this one. */
  defaultMonth?: string;
  /**
   * Each day's size on the control scale: `sm` 32px, `md` 44px (default,
   * a finger's width), `lg` 60px. In a column too narrow for seven, the days
   * shrink to fit it and the weekdays go down to one letter; with bigger
   * text, the days grow with it. Defaults to the nearest SizeProvider's.
   */
  size?: ControlSize;
  /** What the calendar is for, when the month's name alone doesn't say ("Check-in"). */
  "aria-label"?: string;
  className?: string;
}

const Chevron = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
  </svg>
);

const monthIndex = (d: CalendarDate) => d.year * 12 + d.month - 1;

const noSubscription = () => () => {};
/**
 * Today, once the page is in the browser. The server's today can be another
 * day (another time zone, or just past midnight), so it isn't marked until
 * then: a marker the server drew in the wrong place would be a hydration
 * mismatch.
 */
const useToday = () => useSyncExternalStore(noSubscription, () => toISO(today()), () => "");

/**
 * `forwardRef`, as every control is, for React 18. The ref lands on the day
 * that holds the Tab stop: what a form library focuses when it has an error.
 */
export const Calendar = forwardRef<HTMLButtonElement, CalendarProps>(function Calendar(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    unavailable,
    locale: ownLocale,
    firstDayOfWeek,
    defaultMonth,
    size: ownSize,
    autoFocus,
    "aria-label": ariaLabel,
    className,
    id,
    name,
    disabled,
    required,
    readOnly,
    onBlur,
    onFocus,
    onKeyDown,
    ...interop
  },
  ref,
) {
  const locale = useDateLocale(ownLocale);
  const size = useControlSize(ownSize);
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const first = firstDayOfWeek ?? localeFirstDay(locale);

  const [own, setOwn] = useState(defaultValue ?? "");
  const chosen = fromISO(value !== undefined ? value : own);
  const minDate = fromISO(min);
  const maxDate = fromISO(max);
  const limits = { min: minDate, max: maxDate, unavailable: unavailable ? (d: CalendarDate) => unavailable(toISO(d)) : undefined };
  /** A date inside min and max. */
  const within = (d: CalendarDate) =>
    minDate && compareDates(d, minDate) < 0 ? minDate : maxDate && compareDates(d, maxDate) > 0 ? maxDate : d;

  // The day the keys are on. The month shown is always its month.
  const [focused, setFocused] = useState<CalendarDate>(() => within(chosen ?? fromISO(defaultMonth) ?? today()));
  // A value set from outside brings its month into view.
  const chosenISO = chosen ? toISO(chosen) : "";
  useEffect(() => {
    const d = fromISO(chosenISO);
    if (d) setFocused((f) => (sameDay(f, d) ? f : d));
  }, [chosenISO]);

  const grid = useMemo(() => monthGrid(focused.year, focused.month, first), [focused.year, focused.month, first]);
  /*
   * Names and numbers come from Intl, and the server's ICU data and the
   * browser's can word them differently (Arabic's short Saturday is "السبت"
   * in one and "سبت" in the other). Each element holding one is marked
   * `suppressHydrationWarning`, so the server's wording stands rather than
   * the whole tree being thrown away and drawn again, focus with it.
   */
  const shortNames = useMemo(() => weekdayNames(locale, "short", first), [locale, first]);
  const narrowNames = useMemo(() => weekdayNames(locale, "narrow", first), [locale, first]);
  const longNames = useMemo(() => weekdayNames(locale, "long", first), [locale, first]);
  const now = fromISO(useToday());

  const choose = (d: CalendarDate) => {
    setFocused(d);
    if (disabled || readOnly || !allowed(d, limits)) return;
    const iso = toISO(d);
    if (value === undefined) setOwn(iso);
    sound?.play("select");
    onValueChange?.(iso);
  };

  // Keys move the day, and focus follows it once it's drawn.
  const table = useRef<HTMLTableElement>(null);
  const follow = useRef(false);
  const moveTo = (d: CalendarDate) => {
    follow.current = true;
    setFocused(within(d));
  };
  useLayoutEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    table.current?.querySelector<HTMLButtonElement>(`[data-date="${toISO(focused)}"]`)?.focus();
  }, [focused]);
  useEffect(() => {
    if (autoFocus) table.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  }, [autoFocus]);

  const onDayKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const intoWeek = (weekday(focused) - first + 7) % 7;
    const next: Partial<Record<string, CalendarDate>> = {
      ArrowLeft: addDays(focused, rtl ? 1 : -1),
      ArrowRight: addDays(focused, rtl ? -1 : 1),
      ArrowUp: addDays(focused, -7),
      ArrowDown: addDays(focused, 7),
      Home: addDays(focused, -intoWeek),
      End: addDays(focused, 6 - intoWeek),
      PageUp: addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: addMonths(focused, event.shiftKey ? 12 : 1),
    };
    const to = next[event.key];
    if (!to) return;
    event.preventDefault();
    moveTo(to);
  };

  // The month slides in the way it went: from the right going on, the left going back.
  const body = useRef<HTMLTableSectionElement>(null);
  const shown = useRef(monthIndex(focused));
  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = monthIndex(focused);
    const by = Math.sign(shown.current - was);
    if (!by || reduced.current || !body.current) return;
    const rtl = getComputedStyle(body.current).direction === "rtl" ? -1 : 1;
    body.current.animate(
      [
        { transform: `translateX(${by * rtl * 14}px)`, opacity: 0.25 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 240, easing: "cubic-bezier(.2,.9,.3,1.15)" },
    );
  }, [focused, reduced]);

  const lastOfPrevious = addDays({ year: focused.year, month: focused.month, day: 1 }, -1);
  const firstOfNext = addMonths({ year: focused.year, month: focused.month, day: 1 }, 1);
  const canGoBack = !minDate || compareDates(lastOfPrevious, minDate) >= 0;
  const canGoOn = !maxDate || compareDates(firstOfNext, maxDate) <= 0;
  const page = (by: 1 | -1) => {
    const to = within(addMonths(focused, by));
    const start = { year: to.year, month: to.month, day: 1 };
    // Paging to the last month there is disables its key, and a disabled key
    // can't hold focus: the month's day takes it rather than nothing.
    const edge =
      by < 0 ? !!minDate && compareDates(addDays(start, -1), minDate) < 0 : !!maxDate && compareDates(addMonths(start, 1), maxDate) > 0;
    if (edge) follow.current = true;
    setFocused(to);
  };

  const titleId = useId();
  const leaving = (event: FocusEvent<HTMLDivElement>) => !event.currentTarget.contains(event.relatedTarget as Node | null);
  return (
    <div
      id={id}
      className={["echo-calendar", className].filter(Boolean).join(" ")}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      onFocus={(event) => {
        if (leaving(event)) onFocus?.(event);
      }}
      onBlur={(event) => {
        if (leaving(event)) onBlur?.(event);
      }}
      {...interop}
    >
      <div className="echo-calendar__head">
        <HardwareButton
          size="sm"
          variant="ghost"
          iconOnly
          aria-label="Previous month"
          icon={<Chevron back />}
          disabled={disabled || !canGoBack}
          onClick={() => page(-1)}
        />
        {/* Said when it changes, so paging with the keys above is heard. */}
        <span id={titleId} className="echo-calendar__title" aria-live="polite" suppressHydrationWarning>
          {monthTitle(focused.year, focused.month, locale)}
        </span>
        <HardwareButton
          size="sm"
          variant="ghost"
          iconOnly
          aria-label="Next month"
          icon={<Chevron />}
          disabled={disabled || !canGoOn}
          onClick={() => page(1)}
        />
      </div>
      <table
        ref={table}
        role="grid"
        className="echo-calendar__grid"
        aria-labelledby={titleId}
        aria-required={required || undefined}
        aria-readonly={readOnly || undefined}
      >
        <thead>
          <tr>
            {shortNames.map((name, i) => (
              <th key={i} scope="col" aria-label={longNames[i]} className="echo-calendar__weekday" suppressHydrationWarning>
                {/* "Wed", or "W" when its column is too narrow for three letters: the one not shown is display: none. */}
                <span className="echo-calendar__weekday-name">
                  <span className="echo-calendar__weekday-short" suppressHydrationWarning>
                    {name}
                  </span>
                  <span className="echo-calendar__weekday-narrow" suppressHydrationWarning>
                    {narrowNames[i]}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={body}>
          {grid.map((week, w) => (
            <tr key={w}>
              {week.map((day) => {
                const iso = toISO(day);
                if (day.month !== focused.month) {
                  return (
                    <td key={iso} role="gridcell">
                      <span className="echo-calendar__outside" aria-hidden suppressHydrationWarning>
                        {localDigits(String(day.day), locale)}
                      </span>
                    </td>
                  );
                }
                const isChosen = sameDay(day, chosen);
                const open = allowed(day, limits);
                return (
                  <td key={iso} role="gridcell" aria-selected={isChosen}>
                    <button
                      ref={sameDay(day, focused) ? ref : undefined}
                      type="button"
                      disabled={disabled}
                      className="echo-calendar__day"
                      data-date={iso}
                      data-chosen={isChosen ? "" : undefined}
                      data-today={sameDay(day, now) ? "" : undefined}
                      data-unavailable={open ? undefined : ""}
                      tabIndex={sameDay(day, focused) ? 0 : -1}
                      aria-label={spoken(day, locale)}
                      aria-current={sameDay(day, now) ? "date" : undefined}
                      aria-disabled={open ? undefined : true}
                      onClick={() => choose(day)}
                      onFocus={() => {
                        if (!sameDay(day, focused)) setFocused(day);
                      }}
                      onKeyDown={onDayKey}
                      suppressHydrationWarning
                    >
                      {localDigits(String(day.day), locale)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {name ? <input type="hidden" name={name} value={chosenISO} disabled={disabled} /> : null}
    </div>
  );
});
