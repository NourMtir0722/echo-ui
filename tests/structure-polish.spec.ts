import { test, expect } from "@playwright/test";

/** Structure pass (2026-09-18): Tabs, Accordion, Table, AppShell. */

test("the open tab's label is full text colour on the chassis, over a lit rail", async ({ page }) => {
  await page.goto("/docs/tabs");
  const preview = page.getByTestId("preview");
  const active = preview.getByRole("tab", { selected: true }).first();
  const [label, text] = await Promise.all([
    active.evaluate((el) => getComputedStyle(el).color),
    page.evaluate(() => {
      const d = document.createElement("span");
      d.style.color = "var(--echo-text)";
      document.body.appendChild(d);
      const c = getComputedStyle(d).color;
      d.remove();
      return c;
    }),
  ]);
  // The rule used to target [data-selected], which Base UI never sets.
  expect(label).toBe(text);
  const rail = preview.locator(".echo-tabs__indicator").first();
  expect((await rail.boundingBox())!.height).toBeLessThanOrEqual(3);
});

test("an accordion header is a ruled row, not a molded cap", async ({ page }) => {
  await page.goto("/docs/accordion");
  const trigger = page.getByTestId("preview").locator(".echo-accordion__trigger").first();
  expect(await trigger.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
});

test("table rows are separated by a rule lighter than the well", async ({ page }) => {
  await page.goto("/docs/table");
  const cell = page.getByTestId("preview").locator(".echo-table__body .echo-table__cell").first();
  // Paint the well, then the rule over it, and compare real pixels — the
  // browser reports these colours in several notations, a canvas does not.
  const { rule, well } = await cell.evaluate((el) => {
    const wellColor = getComputedStyle(document.documentElement).getPropertyValue("--echo-well").trim();
    const ctx = document.createElement("canvas").getContext("2d")!;
    const lum = () => {
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    ctx.fillStyle = wellColor;
    ctx.fillRect(0, 0, 1, 1);
    const well = lum();
    ctx.fillStyle = getComputedStyle(el).borderBottomColor;
    ctx.fillRect(0, 0, 1, 1);
    return { rule: lum(), well };
  });
  expect(rule).toBeGreaterThan(well + 8);
});

test("AppShell ships a current-page mark for plain links", async ({ page }) => {
  await page.goto("/docs/app-shell");
  const preview = page.getByTestId("preview");
  const current = preview.locator('.echo-shell__side a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  const mark = await current.evaluate((el) => getComputedStyle(el, "::before").width);
  expect(mark).toBe("2px");
  await preview.locator(".echo-shell__side a", { hasText: "Master" }).click();
  await expect(preview.locator('.echo-shell__side a[aria-current="page"]')).toHaveText("Master");
});
