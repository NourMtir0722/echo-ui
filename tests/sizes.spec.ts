import { test, expect } from "@playwright/test";

/**
 * One size scale. A control's height is the control scale's, so a field and
 * a select (and, with a size, a button) beside each other line up.
 */
test("Field, Select and NumberField are the same height", async ({ page }) => {
  // The Field's input was content-box with the browser's own 1px padding, so
  // it stood 46px beside a 44px Select.
  await page.goto("/gallery/controls");
  const heights = await page
    .locator(".echo-field__input, .echo-select__trigger, .echo-number-field__input")
    .evaluateAll((els) => [...new Set(els.map((e) => e.getBoundingClientRect().height))]);
  expect(heights).toEqual([44]);
});

test("at each size, a Field, a Select, a Segmented and a HardwareButton are the same height", async ({ page }) => {
  await page.goto("/docs/size");
  const rows = page.locator(".echo-field").locator("xpath=ancestor::div[.//button][1]");
  await expect(rows).toHaveCount(3);
  const heights = await rows.evaluateAll((els) =>
    els.map((row) => ({
      field: row.querySelector(".echo-field__well")!.getBoundingClientRect().height,
      select: row.querySelector(".echo-select__trigger")!.getBoundingClientRect().height,
      segmented: row.querySelector(".echo-segmented")!.getBoundingClientRect().height,
      button: row.querySelector(".echo-hw__well")!.getBoundingClientRect().height,
    })),
  );
  expect(heights).toEqual([
    { field: 32, select: 32, segmented: 32, button: 32 },
    { field: 44, select: 44, segmented: 44, button: 44 },
    { field: 60, select: 60, segmented: 60, button: 60 },
  ]);
});

test("a HardwareButton's press lands anywhere on it, well included", async ({ page }) => {
  // The cap is the outer height less its well; the hit area is the whole
  // button, so md is a 44px target and sm stays 32px.
  await page.goto("/docs/size");
  const button = page.getByRole("button", { name: "Invite" }).first();
  const well = (await button.locator("xpath=..").boundingBox())!;
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent, {
    x: well.x + well.width / 2,
    y: well.y + 1,
  });
  expect(hit).toBe("Invite");
});

test("a tab is as tall as a control of its size", async ({ page, isMobile }) => {
  await page.goto("/docs/tabs");
  const height = (name: string) =>
    page.getByRole("tablist", { name }).first().getByRole("tab").first().evaluate((e) => e.getBoundingClientRect().height);
  expect(await height("Track view")).toBe(44);
  // On a touch screen sm grows to the 44px target.
  expect(await height("Chart range")).toBe(isMobile ? 44 : 32);
});
