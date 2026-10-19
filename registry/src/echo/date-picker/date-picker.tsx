"use client";

/**
 * DatePicker. A DateField with a calendar key in its well: type the date, or
 * press the key (or Alt+↓ on a wheel) and choose it on a Calendar that opens
 * under the field. Choosing closes it, and the field's flaps turn over to
 * the day; Escape closes it without choosing. Either way focus goes back to
 * the key.
 *
 * It is the two parts, not a third look: the field is DateField, the
 * calendar is Calendar, and the popup is Popover, so the value, the keys and
 * the limits are theirs.
 */
import { forwardRef, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Calendar } from "../calendar";
import { DateField, type DateFieldProps } from "../date-field";
import { HardwareButton } from "../hardware-button";
import { Popover } from "../popover";
import "./date-picker.css";

/** DateField's props without `end`: DatePicker's end is its calendar key. */
type WithoutEnd<T> = T extends unknown ? Omit<T, "end"> : never;

export type DatePickerProps = WithoutEnd<DateFieldProps> & {
  /** The week's first day on the calendar, 0 for Sunday to 6 for Saturday. Default: the locale's. */
  firstDayOfWeek?: number;
  /** The calendar key's name, and the popup's. Default "Choose from a calendar". */
  calendarLabel?: string;
};

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
    <path d="M2.5 7h11M5.5 2v3M10.5 2v3" />
  </svg>
);

export const DatePicker = forwardRef<HTMLSpanElement, DatePickerProps>(function DatePicker(
  { value, defaultValue, onValueChange, firstDayOfWeek, calendarLabel = "Choose from a calendar", onKeyDown, ...field },
  ref,
) {
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : own;
  const set = (iso: string) => {
    if (value === undefined) setOwn(iso);
    onValueChange?.(iso);
  };
  const [open, setOpen] = useState(false);

  // The popup sits under the whole well, not just the key; and opens on the day the keys start from.
  const anchor = useRef<Element | null>(null);
  const day = useRef<HTMLElement | null>(null);
  const root = useCallback((el: HTMLDivElement | null) => {
    anchor.current = el?.querySelector(".echo-date-field__well") ?? null;
  }, []);
  const calendar = useCallback((el: HTMLDivElement | null) => {
    day.current = el?.querySelector<HTMLElement>('.echo-calendar__day[tabindex="0"]') ?? null;
  }, []);

  const off = field.disabled || field.readOnly;
  return (
    <div ref={root} className="echo-date-picker">
      <DateField
        ref={ref}
        {...(field as DateFieldProps)}
        value={current}
        onValueChange={set}
        onKeyDown={(event: KeyboardEvent<Element>) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || off) return;
          // Alt+↓ opens the calendar from a wheel, as it opens a list from a combobox.
          if (event.altKey && event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        end={
          <Popover
            open={open}
            onOpenChange={setOpen}
            anchor={anchor}
            initialFocus={day}
            align="end"
            aria-label={calendarLabel}
            trigger={
              <HardwareButton
                size="sm"
                variant="ghost"
                iconOnly
                aria-label={calendarLabel}
                icon={<CalendarIcon />}
                disabled={off}
              />
            }
          >
            <div ref={calendar} className="echo-date-picker__calendar">
              <Calendar
                value={current}
                onValueChange={(iso) => {
                  set(iso);
                  setOpen(false);
                }}
                min={field.min}
                max={field.max}
                unavailable={field.unavailable}
                locale={field.locale}
                firstDayOfWeek={firstDayOfWeek}
                size={field.size}
              />
            </div>
          </Popover>
        }
      />
    </div>
  );
});
