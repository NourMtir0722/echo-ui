import { test } from "node:test";
import assert from "node:assert/strict";

import { addDays, dayOfMonth, spell, weekOf, weekStart } from "./dates";

test("days move across months and years", () => {
  assert.equal(addDays("2026-09-25", 1), "2026-09-26");
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29", "a leap year");
});

test("a week starts on Monday, or on Sunday when asked", () => {
  // 25 September 2026 is a Friday.
  assert.equal(weekStart("2026-09-25"), "2026-09-21");
  assert.equal(weekStart("2026-09-25", 0), "2026-09-20");
  assert.equal(weekStart("2026-09-21"), "2026-09-21", "a Monday starts its own week");
  assert.equal(weekStart("2026-09-27"), "2026-09-21", "a Sunday ends a Monday week");
  assert.equal(weekStart("2026-09-27", 0), "2026-09-27", "and starts a Sunday week");
  assert.deepEqual(weekOf("2026-09-25"), [
    "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27",
  ]);
});

test("a day is spelled the same in every time zone", () => {
  assert.equal(spell("2026-09-25", "en", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), "Friday, September 25, 2026");
  assert.equal(spell("2026-09-25", "en-GB", { weekday: "short" }), "Fri");
  assert.equal(spell("2026-09-25", "fr", { month: "short" }), "sept.");
  assert.equal(dayOfMonth("2026-09-25"), 25);
});
