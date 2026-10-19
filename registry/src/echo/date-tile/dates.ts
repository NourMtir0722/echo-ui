/**
 * Days as ISO dates ("2026-09-25"). Pure: no React, no DOM.
 *
 * Everything is worked in UTC and formatted in UTC, so a day is the same day
 * on the server and in every browser, whatever time zone either is in: a
 * day picker that renders the 24th on the server and the 25th in Tokyo is a
 * hydration mismatch and a wrong answer.
 */

const DAY = 86_400_000;

/** Midnight UTC of an ISO date, as a timestamp. */
export function at(iso: string): number {
  const [y = 1970, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The ISO date of a timestamp. */
export function isoOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The day `n` days after `iso` (before it, for a negative `n`). */
export function addDays(iso: string, n: number): string {
  return isoOf(at(iso) + n * DAY);
}

/** The first day of the week `iso` falls in: Monday (1, default) or Sunday (0). */
export function weekStart(iso: string, startsOn: 0 | 1 = 1): string {
  const weekday = new Date(at(iso)).getUTCDay();
  return addDays(iso, -((weekday - startsOn + 7) % 7));
}

/** The seven days of the week `iso` falls in. */
export function weekOf(iso: string, startsOn: 0 | 1 = 1): string[] {
  const first = weekStart(iso, startsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** A day's parts in words, in `locale`: "Fri", "Friday", "Sep", "25 September 2026"… */
export function spell(iso: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(at(iso));
}

/** The day of the month, as a number. */
export function dayOfMonth(iso: string): number {
  return new Date(at(iso)).getUTCDate();
}
