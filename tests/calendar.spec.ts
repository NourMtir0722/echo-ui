import { test, expect } from "@playwright/test";
import { axe } from "./axe";
import { hydrated } from "./helpers/hydration";

/**
 * Calendar, on /checks/calendar: the grid and its keys, the month keys and
 * the limits, a booked day, and Arabic right to left. The clock is set to
 * 28 September 2026, so "today" is the same day on every run.
 */
test.beforeEach(async ({ page }) => {
  await page.clock.setSystemTime(new Date("2026-09-28T10:00:00"));
  await page.goto("/checks/calendar");
  await hydrated(page.locator("#rtl .echo-calendar__day").last());
});

const day = (name: RegExp | string) => ({ name, exact: typeof name === "string" });

test("a grid named by its month, with one Tab stop on the chosen day", async ({ page }) => {
  const plain = page.locator("#plain");
  const grid = plain.getByRole("grid", { name: "September 2026" });
  await expect(grid).toBeVisible();
  expect(await grid.locator("th").evaluateAll((ths) => ths.map((th) => th.getAttribute("aria-label")))).toEqual([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  const chosen = grid.getByRole("button", day(/\b28 September 2026/));
  await expect(chosen).toHaveAttribute("tabindex", "0");
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect(grid.getByRole("gridcell", { selected: true })).toHaveCount(1);
  await expect(chosen).toHaveAttribute("aria-current", "date");
});

test("the keys move the day, paging follows, and Enter chooses", async ({ page }) => {
  const plain = page.locator("#plain");
  await plain.getByRole("button", day(/\b28 September 2026/)).focus();
  await page.keyboard.press("ArrowRight");
  await expect(plain.getByRole("button", day(/\b29 September 2026/))).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(plain.getByRole("grid", { name: "October 2026" })).toBeVisible();
  await expect(plain.getByRole("button", day(/\b6 October 2026/))).toBeFocused();
  await page.keyboard.press("Home");
  await expect(plain.getByRole("button", day(/^Monday,? 5 October 2026$/))).toBeFocused();
  await page.keyboard.press("End");
  await expect(plain.getByRole("button", day(/^Sunday,? 11 October 2026$/))).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(plain.getByRole("button", day(/\b11 September 2026/))).toBeFocused();
  await page.keyboard.press("Shift+PageDown");
  await expect(plain.getByRole("button", day(/\b11 September 2027/))).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#plain-value")).toHaveText("2027-09-11");
  await expect(plain.getByRole("gridcell", { selected: true })).toHaveText("11");
});

test("the month keys page, stop at the limits, and focus is never lost", async ({ page }) => {
  const limits = page.locator("#limits");
  // Today is before the earliest date, so the calendar opens on it.
  await expect(limits.getByRole("group", { name: "Check-in" })).toBeVisible();
  await expect(limits.getByRole("grid", { name: "October 2026" })).toBeVisible();
  await expect(limits.getByRole("button", { name: "Previous month" })).toBeDisabled();
  await limits.getByRole("button", { name: "Next month" }).click();
  await expect(limits.getByRole("grid", { name: "November 2026" })).toBeVisible();
  await expect(limits.getByRole("button", { name: "Next month" })).toBeDisabled();
  // Its key went dead in the hand: the month's day has focus instead.
  await expect(limits.locator('.echo-calendar__day[tabindex="0"]')).toBeFocused();
  // The keys stop at the latest date: two weeks on from the 7th is the 21st, so the 20th.
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(limits.getByRole("button", day(/November 20, 2026/))).toBeFocused();
});

test("a booked day is struck through, reachable, and can't be chosen", async ({ page }) => {
  const limits = page.locator("#limits");
  const booked = limits.getByRole("button", day(/October 9, 2026/));
  await expect(booked).toHaveAttribute("aria-disabled", "true");
  expect(await booked.evaluate((el) => getComputedStyle(el).textDecoration)).toContain("line-through");
  await limits.getByRole("button", day(/October 8, 2026/)).click();
  await expect(page.locator("#limits-value")).toHaveText("2026-10-08");
  await page.keyboard.press("ArrowRight");
  await expect(booked).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#limits-value")).toHaveText("2026-10-08");
});

test("in a form it submits the chosen date; disabled can't be reached, read-only can't be chosen", async ({ page }) => {
  const form = page.locator("#form");
  await form.getByRole("button", day(/September 29, 2026/)).click();
  await form.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#form-value")).toHaveText("2026-09-29");

  const locked = page.getByRole("group", { name: "Locked" });
  await expect(locked.locator(".echo-calendar__day").first()).toBeDisabled();
  await expect(locked.getByRole("button", { name: "Next month" })).toBeDisabled();

  const signed = page.getByRole("group", { name: "Signed" });
  await expect(signed.getByRole("grid")).toHaveAttribute("aria-readonly", "true");
  await signed.getByRole("button", day(/September 29, 2026/)).click();
  await expect(signed.getByRole("gridcell", { selected: true })).toHaveText("28");
});

test("right to left, the arrows follow the reading direction", async ({ page }) => {
  const rtl = page.locator("#rtl");
  const days = rtl.locator(".echo-calendar__day");
  await rtl.locator('.echo-calendar__day[tabindex="0"]').focus();
  await expect(rtl.locator('.echo-calendar__day[tabindex="0"]')).toHaveText("١٥");
  await page.keyboard.press("ArrowLeft");
  await expect(rtl.locator(".echo-calendar__day:focus")).toHaveText("١٦");
  // The 16th sits to the left of the 15th.
  const [x15, x16] = await Promise.all(["١٥", "١٦"].map(async (n) => (await days.filter({ hasText: new RegExp(`^${n}$`) }).boundingBox())!.x));
  expect(x16).toBeLessThan(x15!);
});

test("the next month slides in, and doesn't under reduced motion", async ({ page }) => {
  const sliding = () =>
    page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.tagName === "TBODY").length);
  await page.locator("#plain").getByRole("button", { name: "Next month" }).click();
  expect(await sliding()).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await hydrated(page.locator("#rtl .echo-calendar__day").last());
  await page.locator("#plain").getByRole("button", { name: "Next month" }).click();
  await expect(page.locator("#plain").getByRole("grid", { name: "October 2026" })).toBeVisible();
  expect(await sliding()).toBe(0);
});

test("every state is axe-clean", { tag: "@mobile" }, async ({ page }) => {
  const results = await axe(page).include("main").analyze();
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});

test("in forced colours, the chosen day is the system highlight", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.reload();
  await hydrated(page.locator("#rtl .echo-calendar__day").last());
  const plain = page.locator("#plain");
  const [chosen, other] = await Promise.all(
    [/\b28 September 2026/, /\b29 September 2026/].map((n) => plain.getByRole("button", day(n)).evaluate((el) => getComputedStyle(el).backgroundColor)),
  );
  expect(chosen).not.toBe(other);
});

test("visual: a month with a chosen day and today, and a limited one with a booked day", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await expect(page.locator("#plain .echo-calendar")).toHaveScreenshot("calendar.png");
  await expect(page.locator("#limits .echo-calendar")).toHaveScreenshot("calendar-limits.png");
});
