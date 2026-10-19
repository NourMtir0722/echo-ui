import { test, expect } from "@playwright/test";

/**
 * OtpField. A sign-in's one-time code: it
 * arrives by SMS and has to get into six windows without being retyped. What
 * matters is the behaviour around the digits — paste, walking back, the
 * completion callback — and that the row is one labelled group rather than six
 * unlabelled boxes.
 */
/*
 * Clipboard permissions are Chromium-only in Playwright. Granting
 * them in a `test.use` fails WebKit at CONTEXT CREATION, so the whole file
 * dies rather than the one test that needs a clipboard. They are granted to
 * the `chromium` project in `playwright.config.ts` instead, and the tests that
 * genuinely need a clipboard skip elsewhere. The rest — the labelling, the
 * keyboard walk, the autocomplete attribute — are exactly the behaviour worth
 * checking on a second engine.
 */

const slots = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("group", { name }).locator(".echo-otp__slot");

test.beforeEach(async ({ page }) => {
  await page.goto("/docs/otp-field");
});

test("the row is one labelled group of digit windows", async ({ page }) => {
  await expect(page.getByRole("group", { name: "Verification code" })).toBeVisible();
  await expect(slots(page, "Verification code")).toHaveCount(6);
  await expect(slots(page, "PIN")).toHaveCount(4);
});

test("each window carries the one-time-code autocomplete a phone offers", async ({ page }) => {
  await expect(slots(page, "PIN").first()).toHaveAttribute("autocomplete", "one-time-code");
});

test("typing moves along the row, and Backspace walks back", async ({ page }) => {
  const pin = slots(page, "PIN");
  await pin.first().focus();
  await page.keyboard.type("42");
  await expect(pin.nth(0)).toHaveValue("4");
  await expect(pin.nth(1)).toHaveValue("2");
  await expect(pin.nth(2)).toBeFocused();
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(pin.nth(1)).toHaveValue("");
});

test("a pasted code fills the whole row", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  const pin = slots(page, "PIN");
  await pin.first().focus();
  await page.evaluate(() => navigator.clipboard.writeText("9137"));
  await page.keyboard.press("ControlOrMeta+V");
  await expect(pin.nth(0)).toHaveValue("9");
  await expect(pin.nth(3)).toHaveValue("7");
});

test("help text is linked to the group", async ({ page }) => {
  await expect(page.getByRole("group", { name: "PIN" })).toHaveAccessibleDescription("Sent to your phone.");
});

test("visual: otp field", async ({ page }) => {
  await expect(page.locator(".echo-otp").first()).toHaveScreenshot("otp-field.png");
});
