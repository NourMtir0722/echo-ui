import { test, expect, type Page } from "@playwright/test";
import { createEchoTheme, hexToOklch } from "../packages/core/src/theme";
import { axe } from "./axe";

/**
 * The light device, on the galleries the rest of the suite already knows.
 *
 * A pale chassis makes a light device. The engine's own tests hold its roles
 * (light-device.test.ts); these hold the components that read them: nothing
 * on a light body fails axe, and how it looks is pinned. The theme comes from
 * the real engine and is put on the page after the site's own, so it wins,
 * the way device.spec.ts sets a finish.
 */
const LIGHT = { accent: "#0594F9", chassis: "#EBEBEB", paper: "#1D1D1D" };

async function light(page: Page) {
  await page.addStyleTag({ content: createEchoTheme(LIGHT, { quiet: true }).css });
  await page.waitForTimeout(300);
}

for (const gallery of ["hardware-button", "controls", "keys", "navigation", "overlays", "primitives", "structure", "surfaces"]) {
  test(`light device: the ${gallery} gallery passes axe on a light body`, async ({ page }) => {
    await page.goto(`/gallery/${gallery}`);
    await light(page);
    const { violations } = await axe(page).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

const SECTIONS: Record<string, string[]> = {
  "hardware-button": ["variants", "states", "engraved"],
  keys: ["led-keys", "plates"],
  surfaces: ["panels", "progress", "skeletons", "banners"],
  primitives: ["badges", "stat-tiles", "count-badges"],
  navigation: ["paginations", "steps", "tables"],
};

for (const [gallery, ids] of Object.entries(SECTIONS)) {
  for (const id of ids) {
    test(`visual: ${gallery} ${id}, on a light device`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/gallery/${gallery}`);
      await light(page);
      await expect(page.getByTestId(id)).toHaveScreenshot(`light-${gallery}-${id}.png`, { animations: "disabled" });
    });
  }
}

/*
 * A tinted light body: Echo's purple on the light device. The one above is a
 * pure grey, which has no hue to lose.
 */
const LILAC = { accent: "#8B6FE8", chassis: "#EBEAF3", paper: "#1F1D2D" };

test("a recess on a tinted light body keeps the body's hue", async ({ page }) => {
  await page.goto("/gallery/controls");
  await page.addStyleTag({ content: createEchoTheme(LILAC, { quiet: true }).css });
  await page.waitForTimeout(300);
  // The field's well is a gradient of two mixes: paint each through a canvas to read it as sRGB.
  const colours = await page.locator(".echo-field__well").first().evaluate((el) => {
    const stops = getComputedStyle(el).backgroundImage.match(/(oklch|oklab|rgba?|color)\([^()]*\)/g) ?? [];
    const ctx = document.createElement("canvas").getContext("2d")!;
    return stops.map((colour) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return "#" + [r!, g!, b!].map((v) => v.toString(16).padStart(2, "0")).join("");
    });
  });
  expect(colours.length).toBeGreaterThan(0);
  const body = hexToOklch(LILAC.chassis).H;
  for (const hex of colours) {
    // Chromium drew these at hue 0 (rose) on a body at hue 291 (lilac).
    const off = Math.abs(((hexToOklch(hex).H - body + 540) % 360) - 180);
    expect(off, `${hex} is ${off.toFixed(0)}° off the body's hue`).toBeLessThan(30);
  }
});

test("visual: the controls gallery, on a light device", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery/controls");
  await light(page);
  await expect(page.locator(".echo-gallery")).toHaveScreenshot("light-controls.png", { animations: "disabled" });
});
