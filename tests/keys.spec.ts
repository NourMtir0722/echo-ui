import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Keys & plates acceptance: axe-clean, keyboard
 * operable, the LED's meaning reaches a screen reader as words, plus visual
 * regression.
 */
test.describe("Keys and plates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/keys");
    await page.getByTestId("led-keys").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("LedKey is a button named by its legend", async ({ page }) => {
    // exact: Playwright matches accessible names by substring, and "Rec"
    // would otherwise also match "Recording".
    await expect(page.getByRole("button", { name: "Snooze +5", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Locked", exact: true })).toBeDisabled();
  });

  test("a lit LED says what it means in text", async ({ page }) => {
    // A colour is not a message: the lit state has to be readable with the
    // stylesheet off, not just visible.
    const rec = page.getByRole("button", { name: "Rec Recording" });
    await expect(rec).toBeVisible();
    await expect(rec.locator(".echo-led-key__sr")).toHaveText("Recording");
  });

  test("LedKey latches from the keyboard and reports it as a pressed state", async ({ page }) => {
    const arm = page.getByRole("button", { name: "Arm", exact: true });
    await expect(arm).toHaveAttribute("aria-pressed", "false");

    await arm.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("led-key-latch")).toContainText("state: armed");
    // A key that toggles its own state announces it as pressed, not by
    // growing a second word onto its name.
    await expect(arm).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Space");
    await expect(page.getByTestId("led-key-latch")).toContainText("state: idle");
    await expect(arm).toHaveAttribute("aria-pressed", "false");
  });

  test("the LED and the rivets are decorative", async ({ page }) => {
    const led = page.getByTestId("led-keys").locator(".echo-led-key__led").first();
    await expect(led).toHaveAttribute("aria-hidden", "true");

    const rivet = page.getByTestId("plates").locator(".echo-engraved-plate__rivet").first();
    await expect(rivet).toHaveAttribute("aria-hidden", "true");
  });

  test("EngravedPlate carries its text and nothing else", async ({ page }) => {
    const plates = page.getByTestId("plates");
    await expect(plates.locator(".echo-engraved-plate").first()).toHaveText("Owed 4");
    // A plate is a stamped fact, not a control.
    await expect(plates.getByRole("button")).toHaveCount(0);
  });

  for (const id of ["led-keys", "plates", "coral"]) {
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, { animations: "disabled" });
    });
  }
});
