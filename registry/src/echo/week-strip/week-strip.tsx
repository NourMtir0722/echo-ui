"use client";

/**
 * WeekStrip. A week you tap through, the way the top of a phone's calendar
 * works: seven days in a Segmented, each with its weekday and date, the
 * chosen one lit (the light travels there as a drop). Today carries a lit
 * rail under its date; a day with something on it has a pip. The keys at
 * either end go a week back or forward, keeping the same weekday.
 *
 * For assistive technology it's a radio group of days, each named with its
 * full date.
 */
import { forwardRef, useState } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { HardwareButton } from "../hardware-button";
import { Segmented } from "../segmented";
import { addDays, dayOfMonth, spell, weekOf } from "../date-tile/dates";
import "./week-strip.css";

export interface WeekStripProps extends EchoInterop {
  /** What the day is for: the group's accessible name ("Delivery day"). */
  label: string;
  /** The chosen day, as an ISO date (controlled). */
  value?: string;
  /** The day chosen to begin with. Default: `today`. */
  defaultValue?: string;
  onValueChange?: (date: string) => void;
  /** Today, which carries the lit rail. */
  today?: string;
  /** Days with something on them: each gets a pip. */
  marked?: readonly string[];
  /** The first day of the week: 1 Monday (default), 0 Sunday. */
  weekStartsOn?: 0 | 1;
  /** The language days are named in. Default "en". */
  locale?: string;
}

const Arrow = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
  </svg>
);

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the days' radio group.
 */
export const WeekStrip = forwardRef<HTMLDivElement, WeekStripProps>(function WeekStrip(
  { label, value, defaultValue, onValueChange, today, marked = [], weekStartsOn = 1, locale = "en", disabled, name, ...interop },
  ref,
) {
  // A day has to be chosen for a week to show. Pass value, defaultValue or
  // today: working out "now" here would differ between server and browser.
  const [inner, setInner] = useState(defaultValue ?? today ?? "1970-01-01");
  const chosen = value ?? inner;
  const days = weekOf(chosen, weekStartsOn);
  const choose = (date: string) => {
    if (value === undefined) setInner(date);
    onValueChange?.(date);
  };
  const week = spell(days[0]!, locale, { day: "numeric", month: "long" });
  return (
    <div className="echo-week-strip" role="group" aria-label={label}>
      <HardwareButton size="sm" iconOnly icon={<Arrow back />} aria-label={`Week before ${week}`} disabled={disabled} onClick={() => choose(addDays(chosen, -7))} />
      <Segmented
        ref={ref}
        size="lg"
        aria-label={`Days, week of ${week}`}
        value={days.indexOf(chosen)}
        onValueChange={(i) => choose(days[i]!)}
        disabled={disabled}
        options={days.map((day) => ({
          label: `${spell(day, locale, { weekday: "long", day: "numeric", month: "long" })}${day === today ? ", today" : ""}${marked.includes(day) ? ", has events" : ""}`,
          content: (
            <span className="echo-week-strip__day" data-today={day === today || undefined}>
              <span className="echo-week-strip__weekday">{spell(day, locale, { weekday: "narrow" })}</span>
              <span className="echo-week-strip__date">{dayOfMonth(day)}</span>
              <span className="echo-week-strip__pip" data-on={marked.includes(day) || undefined} />
            </span>
          ),
        }))}
        {...interop}
      />
      <HardwareButton size="sm" iconOnly icon={<Arrow />} aria-label={`Week after ${week}`} disabled={disabled} onClick={() => choose(addDays(chosen, 7))} />
      {name ? <input type="hidden" name={name} value={chosen} /> : null}
    </div>
  );
});
