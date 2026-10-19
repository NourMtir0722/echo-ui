import { test, expect } from "@playwright/test";
import { axe } from "./axe";
import { hydrated } from "./helpers/hydration";

/**
 * DatePicker, on /checks/date-picker: the calendar key, Alt+↓, choosing and
 * Escape, and a disabled one. The clock is set to 28 September 2026.
 */
test.beforeEach(async ({ page }) => {
  await page.clock.setSystemTime(new Date("2026-09-28T10:00:00"));
  await page.goto("/checks/date-picker");
  await hydrated(page.locator("#off .echo-date-field__wheel").last());
});

const key = (page: import("@playwright/test").Page) => page.locator("#picker").getByRole("button", { name: "Choose from a calendar" });
const popup = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: "Choose from a calendar" });

test("the key opens a named calendar with focus on the chosen day", async ({ page }) => {
  await expect(key(page)).toHaveAttribute("aria-expanded", "false");
  await key(page).click();
  await expect(popup(page)).toBeVisible();
  await expect(key(page)).toHaveAttribute("aria-expanded", "true");
  await expect(popup(page).getByRole("grid", { name: "October 2026" })).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /October 14, 2026/ })).toBeFocused();
});

test("choosing a day closes it, turns the field to the day, and gives focus back", async ({ page }) => {
  await key(page).click();
  await expect(popup(page).getByRole("button", { name: /October 14, 2026/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(popup(page)).toBeHidden();
  await expect(page.locator("#picker-value")).toHaveText("2026-10-15");
  await expect(page.locator("#picker .echo-date-field__date")).toHaveText("10/15/2026");
  await expect(key(page)).toBeFocused();
});

test("Escape closes it without choosing", async ({ page }) => {
  await key(page).click();
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(popup(page)).toBeHidden();
  await expect(page.locator("#picker-value")).toHaveText("2026-10-14");
  await expect(key(page)).toBeFocused();
});

test("Alt+↓ on a wheel opens it, on the month the field shows", async ({ page }) => {
  const month = page.locator("#picker").getByRole("spinbutton", { name: "Due Month" });
  await month.focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#picker-value")).toHaveText("2026-11-14");
  await page.keyboard.press("Alt+ArrowDown");
  await expect(popup(page).getByRole("grid", { name: "November 2026" })).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /November 14, 2026/ })).toBeFocused();
});

test("a disabled picker's key is disabled too", async ({ page }) => {
  await expect(page.locator("#off").getByRole("button", { name: "Choose from a calendar" })).toBeDisabled();
});

test("open, it's axe-clean", { tag: "@mobile" }, async ({ page }) => {
  await key(page).click();
  await expect(popup(page)).toBeVisible();
  const results = await axe(page).analyze();
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});

test("visual: the calendar open under its field", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await key(page).click();
  await expect(popup(page)).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator("main")).toHaveScreenshot("date-picker.png");
});
