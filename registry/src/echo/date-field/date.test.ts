import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  addMonths,
  allowed,
  compareDates,
  dateDirection,
  daysInMonth,
  digitOf,
  firstDayOfWeek,
  fromISO,
  localDigits,
  monthGrid,
  monthTitle,
  segmentOrder,
  spoken,
  toISO,
  weekday,
  weekdayNames,
  written,
} from "./date";

const d = (iso: string) => fromISO(iso)!;

test("calendar arithmetic: leap years, month ends, and the year boundary", () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2100, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(toISO(addMonths(d("2026-01-31"), 1)), "2026-02-28");
  assert.equal(toISO(addMonths(d("2024-01-31"), 1)), "2024-02-29");
  assert.equal(toISO(addMonths(d("2026-11-15"), 3)), "2027-02-15");
  assert.equal(toISO(addMonths(d("2026-01-15"), -1)), "2025-12-15");
  assert.equal(toISO(addDays(d("2026-12-31"), 1)), "2027-01-01");
  assert.equal(toISO(addDays(d("2026-03-01"), -1)), "2026-02-28");
  // Across a daylight-saving change, a day is still a day.
  assert.equal(toISO(addDays(d("2026-03-28"), 2)), "2026-03-30");
  assert.equal(weekday(d("2026-09-28")), 1);
  assert.ok(compareDates(d("2026-09-28"), d("2026-10-01")) < 0);
});

test("ISO strings in and out, and only real dates", () => {
  assert.deepEqual(fromISO("2026-09-28"), { year: 2026, month: 9, day: 28 });
  assert.equal(fromISO("2026-02-30"), undefined);
  assert.equal(fromISO("28/09/2026"), undefined);
  assert.equal(fromISO(""), undefined);
  assert.equal(toISO({ year: 987, month: 3, day: 4 }), "0987-03-04");
});

test("what a locale says: the segment order, the week's first day, the names", () => {
  const kinds = (locale: string) => segmentOrder(locale).map((s) => s.kind);
  assert.deepEqual(kinds("en-US"), ["month", "day", "year"]);
  assert.deepEqual(kinds("en-GB"), ["day", "month", "year"]);
  assert.deepEqual(kinds("ja-JP"), ["year", "month", "day"]);
  assert.deepEqual(segmentOrder("de-DE").map((s) => s.after), [".", ".", ""]);
  assert.deepEqual(segmentOrder("ar-EG").map((s) => s.after), ["/", "/", ""]);
  assert.equal(firstDayOfWeek("en-US"), 0);
  assert.equal(firstDayOfWeek("en-GB"), 1);
  assert.equal(firstDayOfWeek("fr-FR"), 1);
  assert.deepEqual(weekdayNames("en-US", "short", 0).slice(0, 2), ["Sun", "Mon"]);
  assert.deepEqual(weekdayNames("en-GB", "short", 1).slice(0, 2), ["Mon", "Tue"]);
  assert.equal(monthTitle(2026, 9, "en-US"), "September 2026");
  assert.equal(spoken(d("2026-09-28"), "en-US"), "Monday, September 28, 2026");
  assert.equal(written(d("2026-09-28"), "en-GB"), "28 September 2026");
});

test("which way a date runs, and whose digits", () => {
  // Arabic lays a date out right to left; Hebrew, Persian and Urdu left to right.
  assert.equal(dateDirection("ar-EG"), "rtl");
  assert.equal(dateDirection("he-IL"), "ltr");
  assert.equal(dateDirection("fa-IR"), "ltr");
  assert.equal(dateDirection("en-GB"), "ltr");
  assert.equal(localDigits("2026", "ar-EG"), "٢٠٢٦");
  assert.equal(localDigits("09", "en-US"), "09");
  assert.equal(digitOf("7"), "7");
  assert.equal(digitOf("٧"), "7");
  assert.equal(digitOf("۷"), "7");
  assert.equal(digitOf("a"), undefined);
  assert.equal(digitOf("Enter"), undefined);
});

test("a month is six weeks from the week holding the 1st", () => {
  const monday = monthGrid(2026, 9, 1);
  assert.equal(monday.length, 6);
  assert.ok(monday.every((week) => week.length === 7));
  // 1 September 2026 is a Tuesday: a Monday-first grid opens on 31 August.
  assert.equal(toISO(monday[0]![0]!), "2026-08-31");
  assert.equal(toISO(monthGrid(2026, 9, 0)[0]![0]!), "2026-08-30");
});

test("limits: before min, after max, and what's unavailable can't be picked", () => {
  const limits = { min: d("2026-09-10"), max: d("2026-09-20"), unavailable: (x: { day: number }) => x.day === 15 };
  assert.equal(allowed(d("2026-09-09"), limits), false);
  assert.equal(allowed(d("2026-09-10"), limits), true);
  assert.equal(allowed(d("2026-09-15"), limits), false);
  assert.equal(allowed(d("2026-09-21"), limits), false);
});
