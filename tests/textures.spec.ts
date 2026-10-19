import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Texture acceptance: axe-clean, correct
 * decorative semantics, and visual regression on the static surfaces.
 *
 * ShaderField gets behavioural assertions but NO visual baseline — it is an
 * animated GPU surface whose frames differ by renderer.
 */
test.describe("Textures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/textures");
    await page.getByTestId("lcd-chips").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("LcdChip exposes its label as the group name", async ({ page }) => {
    await expect(page.getByRole("group", { name: "Uptime" })).toBeVisible();
    await expect(page.getByRole("group", { name: "BPM" })).toBeVisible();
  });

  test("texture overlays are decorative and never intercept the pointer", async ({ page }) => {
    const overlays = page.getByTestId("overlays").locator(".echo-texture");
    await expect(overlays).toHaveCount(4);
    for (const el of await overlays.all()) {
      await expect(el).toHaveAttribute("aria-hidden", "true");
      await expect(el).toHaveCSS("pointer-events", "none");
    }
  });

  test("overlays resolve their tunables from custom properties", async ({ page }) => {
    const dither = page.getByTestId("overlays").locator(".echo-texture--dither");
    await expect(dither).toHaveCSS("mix-blend-mode", "overlay");
    await expect(dither).toHaveCSS("image-rendering", "pixelated");
    const image = await dither.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(image).toContain("data:image/svg+xml");
  });

  test("ShaderField is decorative and sized", async ({ page }) => {
    const fields = page.getByTestId("shader-fields").locator(".echo-shader-field");
    await expect(fields).toHaveCount(2);
    await expect(fields.first()).toHaveAttribute("aria-hidden", "true");
    // Where there's no WebGL, as in CI's Chromium, the field takes its canvas away
    // and its own gradient is the picture, so the field is what has to fill the space.
    const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    if (!webgl) await expect(fields.first().locator("canvas")).toHaveCount(0);
    const box = await (webgl ? fields.first().locator("canvas") : fields.first()).boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test("ShaderField backs itself with a themed CSS fallback", async ({ page }) => {
    // What paints before the first frame, and permanently where WebGL is off.
    const background = await page
      .getByTestId("shader-fields")
      .locator(".echo-shader-field")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).toContain("radial-gradient");
  });

  for (const id of ["lcd-chips", "overlays", "textured", "grain-fields"]) {
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, { animations: "disabled" });
    });
  }
});
