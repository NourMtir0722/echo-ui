import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * A popup opened from inside a dialog lands on top of it.
 *
 * Modal, Sheet and AlertDialog stack at a fixed z-index; Select, Popover and
 * Tooltip set none, so they rendered behind the dialog that opened them. The
 * check is what a pointer would hit: the element at the popup's centre must
 * be the popup (or inside it), not the dialog underneath.
 */

async function onTop(page: Page, popup: Locator) {
  await expect(popup).toBeVisible();
  // Presence animations scale the popup in; measure once it has settled.
  await page.waitForTimeout(500);
  const box = (await popup.boundingBox())!;
  return popup.evaluate(
    (el, { x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (el === hit || el.contains(hit));
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
}

for (const dialog of ["modal", "sheet"] as const) {
  test.describe(`popups inside a ${dialog}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/checks/layering");
      await page.getByRole("button", { name: `Open ${dialog}` }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("Select's list is on top", async ({ page }) => {
      await page.getByRole("combobox", { name: `${dialog} select` }).click();
      expect(await onTop(page, page.locator(".echo-select__popup"))).toBe(true);
    });

    test("Popover is on top", async ({ page }) => {
      await page.getByTestId(`${dialog}-popover`).click();
      expect(await onTop(page, page.locator(".echo-popover__popup"))).toBe(true);
    });

    test("Tooltip is on top", async ({ page }) => {
      await page.getByTestId(`${dialog}-tooltip`).hover();
      expect(await onTop(page, page.locator(".echo-tooltip__popup"))).toBe(true);
    });

    test("Menu is on top", async ({ page }) => {
      await page.getByTestId(`${dialog}-menu`).click();
      expect(await onTop(page, page.locator(".echo-menu__popup"))).toBe(true);
    });
  });
}
