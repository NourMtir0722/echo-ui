import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Static primitives acceptance: axe-clean and
 * visual-regression per component.
 */
test.describe("Primitives", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/primitives");
    await page.getByTestId("badges").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Avatar is named, and falls back to initials when the image 404s", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Ada Lovelace" }).first()).toBeVisible();

    // The whole reason this is not a bare <img>: a broken URL must still
    // render something, not leave a hole.
    const broken = page.getByRole("img", { name: "Broken Fallback" });
    await expect(broken).toBeVisible();
    await expect(broken.locator("img")).toHaveCount(0);
    await expect(broken).toContainText("BF");
  });

  test("Avatar derives initials from the first and last words", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Grace Hopper" })).toContainText("GH");
    await expect(page.getByRole("img", { name: "Echo One, studio unit" })).toContainText("E1");
  });

  test("a removable Tag names its own remove control", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Remove Loop" })).toBeVisible();
    // Static tags carry no control at all.
    const controls = page.getByTestId("tags").getByRole("button");
    await expect(controls).toHaveCount(1);
  });

  test("CountBadge announces the true count, not the capped face", async ({ page }) => {
    // The face says 99+; "127 unread messages" is what is useful to hear.
    await expect(page.getByRole("status", { name: "127 unread messages" })).toContainText("99+");
    await expect(page.getByRole("status", { name: "3 unread messages" })).toContainText("3");
  });

  test("CountBadge renders nothing at zero unless asked", async ({ page }) => {
    const badges = page.getByTestId("count-badges").locator(".echo-count-badge");
    await expect(badges).toHaveCount(4); // three counts + the explicit showZero
    await expect(page.getByRole("status", { name: "0 errors" })).toBeVisible();
  });

  for (const id of [
    "badges",
    "kbd",
    "stat-tiles",
    "dividers",
    "avatars",
    "tags",
    "count-badges",
  ]) {
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, { animations: "disabled" });
    });
  }
});
