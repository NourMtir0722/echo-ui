import { test, expect } from "@playwright/test";
import { axe } from "./axe";
import { MIN_TOUCH_TARGET, findSmallTargets, formatTargets } from "./helpers/layout";

/**
 * HardwareButton acceptance: axe-clean, keyboard
 * operable, and visual-regression per state.
 */
test.describe("HardwareButton", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/hardware-button");
    await page.getByTestId("variants").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("is keyboard operable — Enter and Space activate", async ({ page }) => {
    const btn = page.getByTestId("counter-btn");
    await btn.focus();
    await expect(btn).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByTestId("count")).toHaveText("1");

    await page.keyboard.press(" ");
    await expect(page.getByTestId("count")).toHaveText("2");
  });

  test("icon-only buttons have an accessible name", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Play track" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record clip" })).toBeVisible();
  });

  for (const id of ["variants", "sizes", "states", "icons", "engraved", "themed-coral"]) {
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, {
        animations: "disabled",
      });
    });
  }
});

test.describe("HardwareButton given a class and a style (fixture: /checks/hardware-button-props)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/checks/hardware-button-props");
    await page.getByTestId("filled").waitFor();
  });

  test("a caller's style and class are added to the cap's, not put in their place", async ({ page }) => {
    const cap = page.getByTestId("filled");
    // The fill is still there for the stylesheet (and Morph) to read…
    expect(await cap.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--hw-fill"))).toBe("0.5000");
    // …next to what the caller asked for,
    await expect(cap).toHaveCSS("min-width", "180px");
    // and the cap keeps its own class, so it still looks like a cap.
    await expect(cap).toHaveClass(/(^| )echo-hw__cap( |$)/);
    await expect(cap).toHaveClass(/(^| )mine( |$)/);
  });

  test("rendered by Menu.Trigger, it's still a cap", async ({ page }) => {
    const trigger = page.getByTestId("menu-trigger");
    await expect(trigger).toHaveClass(/(^| )echo-hw__cap( |$)/);
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
  });
});

/**
 * On a touch screen a small cap grows to 44px tall, and an icon-only one
 * reaches 44px sideways; a labelled one was as wide as its label, so "$5" or
 * "OK" came out 40px wide, narrower than a finger.
 */
test("a small cap with a short label is still a 44px target on a touch screen", { tag: "@touch" }, async ({ page }) => {
  await page.goto("/checks/hardware-button-props");
  await expect(page.getByTestId("short-sm")).toBeVisible();
  // Measured the way the site-wide sweep measures a target: the cap with its hit area.
  expect(formatTargets(await findSmallTargets(page, MIN_TOUCH_TARGET))).toEqual([]);
});

/**
 * A cap is held to its well (`max-width: 100%`), so a label too long for the
 * room truncates. A cap that's a link (`href`) is an <a>, which browsers size
 * without its padding, unlike a <button>: so a label a little narrower than
 * the room still pushed the cap past its well, and past a 320px column, by up
 * to its padding (36px at the default size).
 */
test("in a narrow column a link cap stays inside its well, padding and all", async ({ page }) => {
  await page.goto("/checks/hardware-button-props");
  const cap = page.getByTestId("link-cap");
  await expect(cap).toBeVisible();
  expect(await cap.evaluate((el) => el.tagName)).toBe("A");
  const spill = await cap.evaluate((el) => {
    const hw = el.closest(".echo-hw")!;
    // A column a little narrower than the button wants: the label still fits, the padding doesn't.
    const column = document.createElement("div");
    column.style.width = `${el.getBoundingClientRect().width - 12}px`;
    hw.before(column);
    column.append(hw);
    const well = hw.querySelector(".echo-hw__well")!;
    return {
      past: Math.round(el.getBoundingClientRect().right - column.getBoundingClientRect().right),
      scroll: well.scrollWidth - well.clientWidth,
    };
  });
  expect(spill.past, "the cap reaches past its column").toBeLessThanOrEqual(0);
  expect(spill.scroll, "the well scrolls sideways").toBeLessThanOrEqual(0);
});
