import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The site's light key: Echo's two devices, at a press. The same accent,
 * molded in light plastic or dark, kept with the visitor's theme as they move
 * between pages.
 */
const surfaceLightness = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.color = "var(--echo-surface)";
    document.body.appendChild(probe);
    const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g)!.map(Number) as [number, number, number];
    probe.remove();
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

const lightKey = (page: Page) => page.getByRole("button", { name: "Light", exact: true });

test("the light key puts the site on the light device and back, and the choice goes with you", async ({ page }) => {
  await page.goto("/docs/installation");
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "false");
  expect(await surfaceLightness(page)).toBeLessThan(0.4);

  await lightKey(page).click();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => surfaceLightness(page)).toBeGreaterThan(0.7);

  await page.goto("/docs/cli");
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");
  expect(await surfaceLightness(page)).toBeGreaterThan(0.7);

  await lightKey(page).click();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => surfaceLightness(page)).toBeLessThan(0.4);
});

test("a docs page with code passes axe on the light device", async ({ page }) => {
  await page.goto("/docs/theming");
  await lightKey(page).click();
  await expect.poll(() => surfaceLightness(page)).toBeGreaterThan(0.7);
  // The chrome's colours ease to the new device; measured halfway, a link is neither device's.
  await page.waitForTimeout(600);
  const { violations } = await axe(page).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("on the homepage the light key is in the footer, and the nav carries the landing's own tools in its place", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Echo elsewhere where the key would be; the key itself at the foot of the page.
  await expect(page.locator(".hero4").getByRole("button", { name: "Light", exact: true })).toHaveCount(0);
  await expect(page.locator(".hero4").getByRole("list", { name: "Echo elsewhere" })).toBeVisible();
  const key = page.locator(".foot").getByRole("button", { name: "Light", exact: true });
  await expect(lightKey(page)).toHaveCount(1);
  await key.scrollIntoViewIfNeeded();
  await key.click();
  await expect(key).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => surfaceLightness(page)).toBeGreaterThan(0.7);
});

test("a colour picked on the light device keeps the light device: the Themes page's presets", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/docs/installation");
  await lightKey(page).click();
  await expect.poll(() => surfaceLightness(page)).toBeGreaterThan(0.7);

  await page.goto("/generator");
  await page.getByRole("button", { name: "Coral", exact: true }).click();
  await expect(page.getByText(/Start from · Coral/)).toBeVisible();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");
  expect(await surfaceLightness(page)).toBeGreaterThan(0.7);
  await page.getByRole("button", { name: "Sky", exact: true }).click();
  await expect(page.getByText(/Start from · Sky/)).toBeVisible();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");
  expect(await surfaceLightness(page)).toBeGreaterThan(0.7);
});
