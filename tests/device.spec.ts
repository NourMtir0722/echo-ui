import { test, expect, type Page } from "@playwright/test";
import { createEchoTheme } from "../packages/core/src/theme";

/**
 * The device settings reach the rendered page (PRINCIPLES.md, "What you can
 * change"). The engine's own tests prove the tokens; this proves components
 * read them. The theme comes from the real engine and is injected after the
 * site's own, so it wins.
 */

async function withTheme(page: Page, seed: Parameters<typeof createEchoTheme>[0]) {
  await page.addStyleTag({ content: createEchoTheme(seed, { quiet: true }).css });
  await page.waitForTimeout(250);
}

const cap = (page: Page) => page.locator(".echo-hw__cap").first();

test("finish: matte and glossy each change how a cap is lit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery/hardware-button");
  const shoot = () => cap(page).screenshot({ animations: "disabled" });
  const base = await shoot();
  await withTheme(page, { finish: 0 });
  const matte = await shoot();
  await withTheme(page, { finish: 1 });
  const glossy = await shoot();
  expect(matte.equals(base), "matte looks like the default").toBe(false);
  expect(glossy.equals(base), "glossy looks like the default").toBe(false);
  expect(glossy.equals(matte), "matte and glossy look the same").toBe(false);
});

test("radius: crisp and soft change a cap's corners, and pills stay pills", async ({ page }) => {
  await page.goto("/gallery/hardware-button");
  const corner = () => cap(page).evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
  const base = await corner();
  await withTheme(page, { radius: 0 });
  expect(await corner()).toBeLessThan(base);
  await withTheme(page, { radius: 1 });
  expect(await corner()).toBeGreaterThan(base);
  // LedKey caps are pills (radius-full): even the crispest radius leaves them round.
  await page.goto("/gallery/keys");
  await withTheme(page, { radius: 0 });
  const r = await page.locator(".echo-led-key__cap").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(parseFloat(r)).toBeGreaterThan(100);
});

test("density: compact and comfortable change a button's height by the factor", async ({ page }) => {
  // The button's outer height (well included) is the control height, and
  // that is what density scales. Tokens land on whole pixels, so within 1px.
  await page.goto("/gallery/hardware-button");
  const height = async () => (await cap(page).locator("xpath=..").boundingBox())!.height;
  const base = await height();
  await withTheme(page, { density: "compact" });
  expect(Math.abs((await height()) - base * 0.875)).toBeLessThanOrEqual(1);
  await withTheme(page, { density: "comfortable" });
  expect(Math.abs((await height()) - base * 1.125)).toBeLessThanOrEqual(1);
});
