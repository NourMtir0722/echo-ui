import { test, expect } from "@playwright/test";

/**
 * Forms. Field and Textarea sit on Base
 * UI's Field, which links the description and error to the control. These
 * check what a screen reader actually gets: the name, the description (help
 * text, then the error), and aria-invalid while there's an error.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/checks/forms");
});

test("a field is named by its label and described by its help text and error", async ({ page }) => {
  const email = page.locator("#email");
  await expect(email).toHaveAccessibleName("Email");
  await expect(email).toHaveAccessibleDescription(
    /We only use it to send the session link\.\s+Enter an email address, like ada@example\.com\./,
  );
  await expect(email).toHaveAttribute("aria-invalid", "true");
});

test("fixing the value clears the error and aria-invalid", async ({ page }) => {
  const email = page.locator("#email");
  await email.fill("ada@example.com");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("We only use it to send the session link.");
  await expect(page.getByText("Enter an email address")).toHaveCount(0);
});

test("a field without a description or error has neither", async ({ page }) => {
  const plain = page.getByRole("textbox", { name: "Plain" });
  await expect(plain).toHaveAccessibleDescription("");
  await expect(plain).not.toHaveAttribute("aria-invalid", "true");
});

test("an outside hint is read alongside the field's own description", async ({ page }) => {
  const code = page.getByRole("textbox", { name: "Code" });
  await expect(code).toHaveAccessibleDescription(/Letters and numbers only\./);
  await expect(code).toHaveAccessibleDescription(/Six characters\./);
});

test("a textarea is wired the same way", async ({ page }) => {
  const notes = page.getByRole("textbox", { name: "Notes" });
  await expect(notes).toHaveAccessibleDescription(/Kept with the take\.\s+Notes can't be empty\./);
  await expect(notes).toHaveAttribute("aria-invalid", "true");
});

test("a textarea reads an outside hint too", async ({ page }) => {
  await expect(page.getByRole("textbox", { name: "Hinted" })).toHaveAccessibleDescription("Markdown is fine.");
});

test("the textarea still grows with its content", async ({ page }) => {
  const grows = page.getByRole("textbox", { name: "Grows" });
  const before = (await grows.boundingBox())!.height;
  await grows.fill("one\ntwo\nthree\nfour\nfive\nsix");
  await expect.poll(async () => (await grows.boundingBox())!.height).toBeGreaterThan(before);
});

test("visual: a field with help text and an error", async ({ page }) => {
  await expect(page.locator(".echo-field").first()).toHaveScreenshot("field-error.png");
});

const watchShake = (page: import("@playwright/test").Page) =>
  page.locator("#email").evaluate((input) => {
    const well = input.closest<HTMLElement>(".echo-field")!;
    const seen: string[] = [];
    (window as unknown as { shake: string[] }).shake = seen;
    new MutationObserver(() => seen.push(well.style.translate)).observe(well, { attributes: true, attributeFilter: ["style"] });
  });

test("a new error shakes the field sideways, and it settles back", async ({ page }) => {
  const email = page.locator("#email");
  await email.fill("ada@example.com");
  await watchShake(page);
  await email.fill("ada");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await page.waitForTimeout(900);
  const seen = await page.evaluate(() => (window as unknown as { shake: string[] }).shake);
  const xs = seen.filter(Boolean).map((t) => parseFloat(t));
  expect(Math.max(...xs), "it moves right").toBeGreaterThan(3);
  expect(Math.min(...xs), "and swings back through").toBeLessThan(0);
  expect(seen.at(-1), "and comes to rest where it was").toBe("");
});

test("under reduced motion a new error doesn't shake the field", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const email = page.locator("#email");
  await email.fill("ada@example.com");
  await watchShake(page);
  await email.fill("ada");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { shake: string[] }).shake.filter(Boolean))).toEqual([]);
});
