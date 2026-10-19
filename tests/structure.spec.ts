import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Structure acceptance: axe-clean, Tabs arrow-key nav,
 * Accordion keyboard toggle.
 */
test.describe("Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/structure");
    await page.getByTestId("tab-meter").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Tabs: arrow keys move between tabs", async ({ page }) => {
    await expect(page.getByTestId("panel-meter")).toBeVisible();
    await page.getByTestId("tab-meter").focus();
    // Manual activation (WAI-ARIA): arrow moves focus, Enter/Space activates.
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("tab-log")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("tab-log")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("panel-log")).toBeVisible();
  });

  test("Accordion: Enter toggles a panel open", async ({ page }) => {
    await expect(page.getByTestId("acc-panel")).toBeHidden();
    await page.getByTestId("acc-trigger").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("acc-panel")).toBeVisible();
  });
});
