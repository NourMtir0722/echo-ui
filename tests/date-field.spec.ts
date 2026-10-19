import { test, expect, type Locator } from "@playwright/test";
import { axe } from "./axe";
import { hydrated } from "./helpers/hydration";

/**
 * DateField, on /checks/date-field: wheels named and ordered by the locale,
 * typed and stepped from the keyboard and from a phone's, limits said in
 * words, the builder's own error, disabled and read-only, and the ISO date
 * a form submits.
 */
const labels = (field: Locator) => field.getByRole("spinbutton").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
const flaps = (field: Locator) => field.locator(".echo-date-field__date");

test.beforeEach(async ({ page }) => {
  await page.goto("/checks/date-field");
  await hydrated(page.locator("#form .echo-date-field__wheel").last());
});

test("each wheel is a spin button named by the field and its part, in the locale's order", async ({ page }) => {
  const us = page.locator("#us");
  await expect(us.getByRole("group", { name: "Date of birth" })).toBeVisible();
  expect(await labels(us)).toEqual(["Month", "Day", "Year"]);
  await expect(us.getByRole("spinbutton", { name: "Date of birth Day" })).toHaveAttribute("aria-valuetext", "Empty");
  await expect(flaps(us)).toHaveText("MM/DD/YYYY");

  expect(await labels(page.locator("#gb"))).toEqual(["Day", "Month", "Year"]);
  await expect(flaps(page.locator("#gb"))).toHaveText("31/01/2024");

  const de = page.locator("#de");
  expect(await labels(de)).toEqual(["Tag", "Monat", "Jahr"]);
  await expect(flaps(de)).toHaveText("TT.MM.JJJJ");
});

test("typing fills a wheel and moves on; the value is the ISO date once it's whole", async ({ page }) => {
  const us = page.locator("#us");
  const month = us.getByRole("spinbutton", { name: "Date of birth Month" });
  const day = us.getByRole("spinbutton", { name: "Date of birth Day" });
  const year = us.getByRole("spinbutton", { name: "Date of birth Year" });

  // A press on the label goes to the first empty wheel.
  await us.getByText("Date of birth", { exact: true }).click();
  await expect(month).toBeFocused();

  // No month starts with 9 and goes on, so 9 moves on at once.
  await page.keyboard.type("9");
  await expect(month).toHaveAttribute("aria-valuetext", "9, September");
  await expect(day).toBeFocused();
  await page.keyboard.type("28");
  await expect(year).toBeFocused();

  // A year being typed isn't a date yet.
  await page.keyboard.type("20");
  await expect(year).toHaveAttribute("aria-valuenow", "20");
  await expect(flaps(us)).toHaveText("09/28/20YY");
  await expect(page.locator("#us-value")).toHaveText("none");
  await page.keyboard.type("26");
  await expect(page.locator("#us-value")).toHaveText("2026-09-28");
  await expect(flaps(us)).toHaveText("09/28/2026");
});

test("a separator key moves on and keeps what was typed; a digit that can't continue starts again", async ({ page }) => {
  const us = page.locator("#us");
  const month = us.getByRole("spinbutton", { name: "Date of birth Month" });
  const day = us.getByRole("spinbutton", { name: "Date of birth Day" });
  await month.focus();
  await page.keyboard.type("1");
  await expect(month).toBeFocused();
  await page.keyboard.type("/");
  await expect(month).toHaveAttribute("aria-valuetext", "1, January");
  await expect(day).toBeFocused();

  // 3 then 5 in a day: there's no 35th, so the 5 starts over, and is the 5th.
  await page.keyboard.type("35");
  await expect(day).toHaveAttribute("aria-valuenow", "5");
});

test("the arrows step and wrap, Page keys jump, Home and End go to the ends, Backspace clears", async ({ page }) => {
  const gb = page.locator("#gb");
  const day = gb.getByRole("spinbutton", { name: "Arrival Day" });
  const month = gb.getByRole("spinbutton", { name: "Arrival Month" });
  await day.focus();
  await page.keyboard.press("ArrowUp");
  await expect(day).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("ArrowDown");
  await expect(day).toHaveAttribute("aria-valuenow", "31");
  await page.keyboard.press("PageDown");
  await expect(day).toHaveAttribute("aria-valuenow", "24");
  await page.keyboard.press("Home");
  await expect(day).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("End");
  await expect(day).toHaveAttribute("aria-valuenow", "31");

  // January 31st to February: 2024 is a leap year, so the 29th.
  await month.focus();
  await page.keyboard.press("ArrowUp");
  await expect(month).toHaveAttribute("aria-valuetext", "2, February");
  await expect(day).toHaveAttribute("aria-valuenow", "29");
  await expect(day).toHaveAttribute("aria-valuemax", "29");

  await page.keyboard.press("Backspace");
  await expect(month).toHaveAttribute("aria-valuetext", "Empty");
  await expect(month).not.toHaveAttribute("aria-valuenow", /./);
  await expect(flaps(gb)).toHaveText("29/MM/2024");
});

test("left and right move between wheels the way the locale writes a date", async ({ page }) => {
  const gb = page.locator("#gb");
  await gb.getByRole("spinbutton", { name: "Arrival Day" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(gb.getByRole("spinbutton", { name: "Arrival Month" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(gb.getByRole("spinbutton", { name: "Arrival Day" })).toBeFocused();

  // Arabic writes a date right to left: the day is on the right, and ← goes on to the month.
  const ar = page.locator("#rtl").getByRole("spinbutton");
  const [arDay, arMonth, arYear] = [ar.nth(0), ar.nth(1), ar.nth(2)];
  expect((await arDay.boundingBox())!.x).toBeGreaterThan((await arYear.boundingBox())!.x);
  await expect(page.locator("#rtl .echo-date-field__date")).toHaveText("١٥/٠٣/٢٠٢٦");
  await arDay.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(arMonth).toBeFocused();
  // Its own digits type too.
  await page.keyboard.type("٤");
  await expect(arMonth).toHaveAttribute("aria-valuenow", "4");

  // Hebrew writes a numeric date left to right, on a right-to-left page too.
  const he = page.locator("#he").getByRole("spinbutton");
  expect((await he.nth(0).boundingBox())!.x).toBeLessThan((await he.nth(2).boundingBox())!.x);
  await he.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(he.nth(1)).toBeFocused();
});

test("a date outside the limits, or unavailable, is said in words and the wheels are invalid", async ({ page }) => {
  const limits = page.locator("#limits");
  const year = limits.getByRole("spinbutton", { name: "Start date Year" });
  await expect(year).toHaveAttribute("aria-valuemin", "2026");
  await expect(year).toHaveAttribute("aria-valuemax", "2026");
  await expect(year).toHaveAccessibleDescription("Any day this year.");

  await limits.getByRole("spinbutton", { name: "Start date Month" }).focus();
  await page.keyboard.type("1225");
  await expect(page.locator("#limits-value")).toHaveText("2026-12-25");
  await expect(year).toHaveAccessibleDescription("Any day this year. December 25, 2026 isn't available.");
  await expect(year).toHaveAttribute("aria-invalid", "true");

  await year.focus();
  await page.keyboard.type("2027");
  await expect(year).toHaveAccessibleDescription(/Choose a date from January 1, 2026 to December 31, 2026\./);

  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await expect(year).toHaveAccessibleDescription("Any day this year.");
  await expect(year).not.toHaveAttribute("aria-invalid", /./);
});

test("the builder's error is read on every wheel, marks it invalid, and wins", async ({ page }) => {
  const error = page.locator("#error");
  for (const wheel of await error.getByRole("spinbutton").all()) {
    await expect(wheel).toHaveAttribute("aria-invalid", "true");
    await expect(wheel).toHaveAccessibleDescription("That plan has ended. Choose a date after today.");
  }
});

test("a disabled field can't be reached, and a read-only one doesn't change", async ({ page }) => {
  const states = page.locator("#states");
  for (const wheel of await states.getByRole("spinbutton", { name: /^Locked/ }).all()) {
    await expect(wheel).toHaveAttribute("tabindex", "-1");
    await expect(wheel).toHaveAttribute("aria-disabled", "true");
  }
  const signed = states.getByRole("spinbutton", { name: "Signed Day" });
  await expect(signed).toHaveAttribute("aria-readonly", "true");
  await signed.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.type("4");
  await expect(signed).toHaveAttribute("aria-valuenow", "28");
});

test("a form submits the ISO date under the field's name", async ({ page }) => {
  const form = page.locator("#form");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#form-value")).toHaveText("2026-10-02");
  await form.getByRole("spinbutton", { name: "Due Day" }).focus();
  await page.keyboard.press("ArrowUp");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#form-value")).toHaveText("2026-10-03");
});

test("a phone's keyboard types through beforeinput, and a pasted ISO date fills every wheel", async ({ page }) => {
  const us = page.locator("#us");
  const month = us.getByRole("spinbutton", { name: "Date of birth Month" });
  await expect(month).toHaveAttribute("inputmode", "numeric");
  await expect(month).toHaveAttribute("contenteditable", "true");

  const input = (wheel: Locator, inputType: string, data: string | null) =>
    wheel.evaluate(
      (el, init) => el.dispatchEvent(new InputEvent("beforeinput", { ...init, bubbles: true, cancelable: true })),
      { inputType, data },
    );
  await month.focus();
  await input(month, "insertText", "3");
  await expect(month).toHaveAttribute("aria-valuetext", "3, March");
  await expect(us.getByRole("spinbutton", { name: "Date of birth Day" })).toBeFocused();

  await input(us.getByRole("spinbutton", { name: "Date of birth Day" }), "insertFromPaste", "2026-12-24");
  await expect(page.locator("#us-value")).toHaveText("2026-12-24");

  await input(month, "deleteContentBackward", null);
  await expect(month).toHaveAttribute("aria-valuetext", "Empty");
  await expect(page.locator("#us-value")).toHaveText("none");
  // Nothing typed reaches the flaps as text.
  await expect(flaps(us)).toHaveText("MM/24/2026");
});

test("a flap turns over when its digit changes, and not as the field draws or under reduced motion", async ({ page }) => {
  const turning = () =>
    page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.classList.contains("echo-date-field__flap")).length);
  expect(await turning()).toBe(0);
  await page.locator("#gb").getByRole("spinbutton", { name: "Arrival Day" }).focus();
  await page.keyboard.press("ArrowDown");
  expect(await turning()).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await hydrated(page.locator("#form .echo-date-field__wheel").last());
  await page.locator("#gb").getByRole("spinbutton", { name: "Arrival Day" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#gb").getByRole("spinbutton", { name: "Arrival Day" })).toHaveAttribute("aria-valuenow", "30");
  expect(await turning()).toBe(0);
});

test("every state is axe-clean", { tag: "@mobile" }, async ({ page }) => {
  await page.locator("#us").getByRole("spinbutton", { name: "Date of birth Month" }).focus();
  await page.keyboard.type("12");
  const results = await axe(page).include("main").analyze();
  expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});

test("in forced colours, the wheel with focus is ringed in the system highlight", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.reload();
  await hydrated(page.locator("#form .echo-date-field__wheel").last());
  const day = page.locator("#gb").getByRole("spinbutton", { name: "Arrival Day" });
  await day.focus();
  const ring = await day.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(ring).toBe("solid 2px");
});

test("visual: date fields, empty, typed, in German, and invalid", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#gb").getByRole("spinbutton", { name: "Arrival Month" }).focus();
  await expect(page.locator("main")).toHaveScreenshot("date-field.png");
});
