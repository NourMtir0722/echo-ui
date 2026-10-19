import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Navigation + data acceptance: axe-clean, correct
 * landmark and current-item semantics, keyboard reachable, plus visual
 * regression.
 */
test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/navigation");
    await page.getByTestId("breadcrumbs").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Breadcrumb marks the current page and does not link it", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(nav).toBeVisible();

    // A link back to where you already are is a dead control.
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toHaveText("Input 2");
    await expect(nav.getByRole("link", { name: "Input 2" })).toHaveCount(0);
    await expect(nav.getByRole("link")).toHaveCount(3);
  });

  // exact: Playwright matches accessible names by substring, so "Page 2"
  // would otherwise also match "Page 20".
  test("Pagination names its pages and marks the current one", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Pagination" });
    await expect(nav.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Previous is dead at page 1; next is live.
    await expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(nav.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  test("Pagination moves and keeps its width", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Pagination" });
    const slots = nav.locator(".echo-pagination__list > li");
    const before = await slots.count();

    await nav.getByRole("button", { name: "Next page" }).click();
    await expect(nav.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Only pages inside the window are one click away — at page 2 of 20 that
    // is 1..5 and 20, which is the whole point of the window.
    await expect(nav.getByRole("button", { name: "Page 10", exact: true })).toHaveCount(0);

    await nav.getByRole("button", { name: "Page 5", exact: true }).click();
    await expect(nav.getByRole("button", { name: "Page 5", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Deep in the middle the window is gapped on both sides and still the
    // same width.
    await nav.getByRole("button", { name: "Page 6", exact: true }).click();
    await expect(nav.getByRole("button", { name: "Page 20", exact: true })).toBeVisible();
    // A control that reflows under the cursor is how you misclick.
    await expect(slots).toHaveCount(before);
  });

  test("the pagination ellipsis is not a control", async ({ page }) => {
    const gaps = page.getByRole("navigation", { name: "Pagination" }).locator(".echo-pagination__gap");
    expect(await gaps.count()).toBeGreaterThan(0);
    await expect(gaps.first()).toHaveAttribute("aria-hidden", "true");
  });

  test("Steps marks the current station and states completion in text", async ({ page }) => {
    const group = page.getByRole("group", { name: "Setup" });
    await expect(group.locator('[aria-current="step"]')).toContainText("Calibrate");
    // A colour is not a message: done-ness has to reach a screen reader as words.
    await expect(group.locator('[data-state="complete"]')).toContainText("completed");
  });

  test("Table is captioned and its scroll region is keyboard reachable", async ({ page }) => {
    await expect(page.getByRole("table", { name: "Recent takes" })).toBeVisible();

    // An overflow container that cannot take focus is unreachable by keyboard.
    const region = page.getByRole("region", { name: "Recent takes" });
    await expect(region).toHaveAttribute("tabindex", "0");

    await expect(page.getByRole("rowheader", { name: "Room tone" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Length" })).toBeVisible();
  });

  for (const id of ["breadcrumbs", "paginations", "steps", "tables"]) {
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, { animations: "disabled" });
    });
  }
});

test("the current page's light stays inside its cap while it flashes", async ({ page }) => {
  // The flash scaled to 1.4x, past the cap, so while it played the page
  // scrolled sideways inside itself (38 > 32) and a layout check that landed
  // then failed.
  await page.goto("/gallery/navigation");
  const nav = page.getByRole("navigation", { name: "Pagination" }).first();
  await nav.scrollIntoViewIfNeeded();
  // Land on another page, so its light is flashing now.
  await nav.locator(".echo-pagination__page:not([data-current])").first().click();
  const current = nav.locator(".echo-pagination__page[data-current]");
  const widths = await current.evaluate((el) => {
    const out: number[] = [];
    for (const a of el.getAnimations({ subtree: true })) {
      a.pause();
      for (const at of [0.25, 0.5, 0.75, 0.99]) {
        a.currentTime = Number(a.effect!.getComputedTiming().duration) * at;
        out.push(el.scrollWidth - el.clientWidth);
      }
    }
    return out;
  });
  expect(widths.length, "the flash is running").toBeGreaterThan(0);
  expect(Math.max(...widths)).toBeLessThanOrEqual(1);
});
