import { test, expect } from "@playwright/test";
import { axe } from "./axe";
import { opacityUntilUnmount, reopenMidExit } from "./helpers/exit";

/**
 * Modal acceptance: Base UI focus trap + Esc + scroll-lock,
 * the GSAP exit completes before unmount, and no axe violations while open.
 */
test.describe("Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/modal");
    await page.getByTestId("open-modal").waitFor();
  });

  async function open(page: import("@playwright/test").Page) {
    await page.getByTestId("open-modal").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Wait for the GSAP enter to finish so the focus trap has settled.
    await page.waitForFunction(() => {
      const el = document.querySelector(".echo-modal__popup");
      return !!el && getComputedStyle(el).opacity === "1";
    });
  }

  test("moves focus into the dialog on open and restores it on close", async ({ page }) => {
    await open(page);
    // Focus moved into the dialog.
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
    // A tab stays inside the dialog.
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
    // Closing restores focus to the trigger (a hallmark of a proper dialog).
    await page.keyboard.press("Escape");
    await expect(page.locator(".echo-modal__popup")).toHaveCount(0, { timeout: 1500 });
    await expect(page.getByTestId("open-modal")).toBeFocused();
  });

  test("locks body scroll while open", async ({ page }) => {
    const before = await page.evaluate(() => getComputedStyle(document.body).overflow);
    await open(page);
    const during = await page.evaluate(
      () =>
        getComputedStyle(document.body).overflow +
        "|" +
        getComputedStyle(document.documentElement).overflow,
    );
    expect(during).toMatch(/hidden|clip/);
    expect(during).not.toBe(before + "|" + before);
  });

  /**
   * The exit is watched from inside the page, every frame from the
   * press to the unmount. One look 80ms after the press, taken from the test,
   * came after the panel had gone whenever the runner was busy (CI, three tries
   * in a row), so the test said nothing about the animation.
   */
  test("Escape closes; the exit animation completes before unmount", async ({ page }) => {
    await open(page);
    const frames = opacityUntilUnmount(page, ".echo-modal__popup");
    await page.keyboard.press("Escape");
    const opacities = await frames;

    // Still mounted while it faded: GSAP animated it out, not an instant unmount.
    expect(opacities.some((o) => o > 0 && o < 1), `opacity each frame: ${opacities.join(", ")}`).toBe(true);
    // And gone once the exit finished.
    await expect(page.locator(".echo-modal__popup")).toHaveCount(0);
  });

  /**
   * Reopening while the exit still runs: Base UI lets the closing panel finish
   * and mounts a new one, which has to bloom all the way open rather than be
   * left as the pill the gather ends on.
   */
  test("reopened mid-exit, it ends up open, solid and unclipped", async ({ page }) => {
    await open(page);
    const popup = page.locator(".echo-modal__popup");
    const reopened = reopenMidExit(page, ".echo-modal__popup", '[data-testid="open-modal"]');
    await page.keyboard.press("Escape");
    expect(await reopened, "the exit finished before the panel could be reopened").toBe(true);

    // The closing panel finishes, and the new one blooms all the way open.
    await expect(popup).toHaveCount(1);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => popup.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await expect.poll(() => popup.evaluate((el) => getComputedStyle(el).clipPath)).toBe("none");
  });

  test("has no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await open(page);
    const results = await axe(page).include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);
  });
});
