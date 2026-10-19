/**
 * The date engine the date field, the calendar and the date picker share:
 * calendar dates with no time and no time zone, the calendar arithmetic, and
 * what a locale says about them (the order of day, month and year, the first
 * day of the week, the names). Echo's own code, on `Intl`, with no date
 * library.
 *
 * A date here is `{ year, month, day }` with the month from 1, and an ISO
 * string (`2026-09-28`) across the boundary: what a form submits and what a
 * builder stores. No `Date` crosses it, so no time zone can move a day.
 */

export interface CalendarDate {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

/** What can't be picked: before `min`, after `max`, or `unavailable` says so. */
export interface DateLimits {
  min?: CalendarDate;
  max?: CalendarDate;
  unavailable?: (date: CalendarDate) => boolean;
}

export type SegmentKind = "day" | "month" | "year";

export const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** `2026-09-28`. */
export const toISO = (d: CalendarDate) => `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}`;

/** A date from `2026-09-28`, or undefined for anything that isn't a real one. */
export function fromISO(value: string | undefined | null): CalendarDate | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return undefined;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isReal(d) ? d : undefined;
}

export const isReal = (d: CalendarDate) =>
  Number.isInteger(d.year) && d.year >= 1 && d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= daysInMonth(d.year, d.month);

/** Negative, zero or positive, as `a` is before, on or after `b`. */
export const compareDates = (a: CalendarDate, b: CalendarDate) => a.year - b.year || a.month - b.month || a.day - b.day;

export const sameDay = (a: CalendarDate | undefined, b: CalendarDate | undefined) => !!a && !!b && compareDates(a, b) === 0;

/** Today, where the person is. */
export function today(now = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Days since 1970-01-01 (UTC arithmetic, so no daylight saving gets in). */
const serial = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day) / 86_400_000;
const fromSerial = (n: number): CalendarDate => {
  const t = new Date(n * 86_400_000);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};

export const addDays = (d: CalendarDate, days: number) => fromSerial(serial(d) + days);

/** The same day `months` later, or the month's last day when it has fewer (Jan 31 + 1 → Feb 28). */
export function addMonths(d: CalendarDate, months: number): CalendarDate {
  const index = d.year * 12 + (d.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}

/** 0 for Sunday to 6 for Saturday. */
export const weekday = (d: CalendarDate) => new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();

/** Whether a date can be picked under `limits`. */
export function allowed(d: CalendarDate, { min, max, unavailable }: DateLimits = {}): boolean {
  if (min && compareDates(d, min) < 0) return false;
  if (max && compareDates(d, max) > 0) return false;
  return !unavailable?.(d);
}

/* --------------------------------------------------------------- the locale */

/** Regions whose week starts on Sunday, for engines without `Intl.Locale` week info. */
const SUNDAY_FIRST = new Set(["US", "CA", "JP", "IL", "BR", "MX", "PH", "KR", "TW", "HK", "IN", "ZA", "SA", "AE"]);

/** The first day of the week where `locale` is spoken: 0 for Sunday, 1 for Monday. */
export function firstDayOfWeek(locale?: string): number {
  try {
    const l = new Intl.Locale(locale ?? Intl.DateTimeFormat().resolvedOptions().locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
      maximize(): Intl.Locale;
    };
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    // Intl counts Monday as 1 and Sunday as 7.
    if (info) return info.firstDay % 7;
    return SUNDAY_FIRST.has(l.maximize().region ?? "") ? 0 : 1;
  } catch {
    return 1;
  }
}

/** The segments in the order `locale` writes a date, with what goes between them. */
export function segmentOrder(locale?: string): { kind: SegmentKind; after: string }[] {
  const parts = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(2000, 10, 22));
  const order: { kind: SegmentKind; after: string }[] = [];
  for (const part of parts) {
    if (part.type === "day" || part.type === "month" || part.type === "year") order.push({ kind: part.type, after: "" });
    // Without the direction marks Arabic puts between the parts: the field lays them out with `dir`.
    else if (part.type === "literal" && order.length) order[order.length - 1]!.after += part.value.replace(/[\u200e\u200f\u061c]/g, "");
  }
  if (order.length) order[order.length - 1]!.after = "";
  return order;
}

/**
 * Which way `locale` lays a numeric date out. Arabic writes it right to
 * left, with a right-to-left mark between the parts; Hebrew, Persian and
 * Urdu write theirs left to right, as one run of numbers.
 */
export function dateDirection(locale?: string): "ltr" | "rtl" {
  const parts = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(2000, 10, 22));
  return parts.some((p) => p.type === "literal" && /[\u200f\u061c]/.test(p.value)) ? "rtl" : "ltr";
}

/** A typed key as a digit 0–9, from Western, Arabic-Indic or Persian keys; undefined for anything else. */
export function digitOf(key: string): string | undefined {
  if (/^[0-9]$/.test(key)) return key;
  const code = key.length === 1 ? key.charCodeAt(0) : 0;
  if (code >= 0x660 && code <= 0x669) return String(code - 0x660);
  if (code >= 0x6f0 && code <= 0x6f9) return String(code - 0x6f0);
  return undefined;
}

/** Western digits in `text` written in `locale`'s own ("2026" is "٢٠٢٦" in ar-EG). */
export function localDigits(text: string, locale?: string): string {
  const fmt = new Intl.NumberFormat(locale, { useGrouping: false });
  return text.replace(/[0-9]/g, (d) => fmt.format(Number(d)));
}

/** The date written out, as a screen reader should say it: "Monday, 28 September 2026". */
export function spoken(d: CalendarDate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(d.year, d.month - 1, d.day)),
  );
}

/** The date in words without its weekday: "September 28, 2026", "28 September 2026". */
export function written(d: CalendarDate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(d.year, d.month - 1, d.day)),
  );
}

/** "September 2026". */
export function monthTitle(year: number, month: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** A month's name, long ("September") or short ("Sep"). */
export function monthName(month: number, locale?: string, width: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(locale, { month: width, timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));
}

/** The seven weekday names from the week's first day: `short` for the header, `long` for its name. */
export function weekdayNames(locale?: string, width: "long" | "short" | "narrow" = "short", first = firstDayOfWeek(locale)): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" });
  // 2000-01-02 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2000, 0, 2 + ((first + i) % 7)))));
}

/**
 * The month as the calendar draws it: six weeks from the week holding the
 * 1st, so every month is the same height and nothing jumps as you page.
 */
export function monthGrid(year: number, month: number, first = 1): CalendarDate[][] {
  const start = { year, month, day: 1 };
  const lead = (weekday(start) - first + 7) % 7;
  const origin = addDays(start, -lead);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(origin, w * 7 + d)));
}
