import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The styles Echo publishes, on its own site: the Styles page switches the
 * whole site from Echo's own look to Ink Instrument, drawn in one ink on a pale sheet,
 * and the choice goes with the visitor from page to page.
 */
const rootVar = (page: Page, name: string) => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), name);
const lineWidth = async (page: Page) => parseFloat((await rootVar(page, "--echo-line-width")) || "0");
const ink = (page: Page) => page.getByRole("radio", { name: /^Ink Instrument/ });

/** The families the page has really loaded, not just declared. */
const loadedFamilies = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
  });

test("Ink Instrument relights every page: drawn in the ink, in its own faces, and it stays through a reload", async ({ page }) => {
  await page.goto("/styles");
  expect(await lineWidth(page)).toBe(0);
  await ink(page).click();
  await expect(ink(page)).toBeChecked();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  expect(await rootVar(page, "--echo-font-mono")).toContain("IBM Plex Mono");

  await page.goto("/docs/switch");
  expect(await lineWidth(page)).toBeGreaterThan(0);
  const sw = page.getByRole("switch").first();
  await sw.waitFor();
  // Read on a part: the drawn line has to reach the component, not just :root.
  expect(parseFloat(await sw.evaluate((el) => getComputedStyle(el).getPropertyValue("--echo-line-width")))).toBeGreaterThan(0);
  expect(await loadedFamilies(page)).toContain("IBM Plex Mono");

  await page.reload();
  expect(await lineWidth(page)).toBeGreaterThan(0);

  // Echo's colours are Echo's style: picking one wears it, molded again.
  await page.goto("/generator");
  await page.getByRole("button", { name: "Nawwara", exact: true }).click();
  await expect.poll(() => lineWidth(page)).toBe(0);
});

test("a style's link opens it whole, and one Echo doesn't publish changes nothing", async ({ page }) => {
  await page.goto("/styles?style=ink-instrument");
  await expect(ink(page)).toBeChecked();
  expect(await lineWidth(page)).toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/styles$/);

  await page.goto("/styles?style=cobalt-ticket");
  await expect(ink(page)).toBeChecked();
});

test("the light key turns a style over: the Styles page still has it chosen, and the Themes page still names it", async ({ page }) => {
  await page.goto("/styles");
  await ink(page).click();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  const light = page.getByRole("button", { name: "Light", exact: true }).first();
  // Ink Instrument is a light device, so the key is lit.
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await light.click();
  await expect(light).toHaveAttribute("aria-pressed", "false");
  expect(await lineWidth(page)).toBeGreaterThan(0);
  await expect(ink(page)).toBeChecked();
  await page.goto("/generator");
  await expect(page.getByRole("heading", { name: "Start from · Ink Instrument" })).toBeVisible();
});

test("Ink Instrument passes axe on the Styles page and a docs page", async ({ page }) => {
  const clean = async () => {
    // The chrome's colours ease to the new look; measured halfway, a link is neither look's.
    await page.waitForTimeout(600);
    const { violations } = await axe(page).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  };
  await page.goto("/styles?style=ink-instrument");
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await clean();
  await page.goto("/docs/switch");
  await clean();
});

test("in Ink Instrument the landing's own pieces are drawn in the ink, and Echo's own takes them back", async ({ page }) => {
  await page.goto("/styles?style=ink-instrument");
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await page.goto("/");
  const drawn = () => page.evaluate(() => document.documentElement.hasAttribute("data-drawn"));
  expect(await drawn()).toBe(true);
  // No colour of its own: the page's family is the ink and greys, not a purple made up for a hueless seed.
  expect((await rootVar(page, "--family-seed")).toLowerCase()).toBe("#1c1c1c");
  // The device is drawn, not molded, and Echo on its screen is paper with an ink line.
  expect(await page.locator(".brand-device").first().evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  const body = page.locator(".brand-device .brand-creature__body").first();
  expect(parseFloat(await body.evaluate((el) => getComputedStyle(el).strokeWidth))).toBeGreaterThan(0);
  // The road is drawn hollow, and a card is outlined in the ink, its cast shadow gone with the style's shade.
  await page.locator("section.hiw").scrollIntoViewIfNeeded();
  expect(await page.locator(".hiw__road-lip").first().evaluate((el) => getComputedStyle(el).display)).toBe("none");
  const card = page.locator("section.hiw .demo").first();
  expect(await card.evaluate((el) => getComputedStyle(el).getPropertyValue("--echo-shade").trim())).toBe("0");
  expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("rgb(28, 28, 28) 0px 0px 0px 1.5px inset");

  await page.goto("/generator");
  await page.getByRole("button", { name: "Nawwara", exact: true }).click();
  await expect.poll(drawn).toBe(false);
  await page.goto("/");
  expect(await drawn()).toBe(false);
  expect(await page.locator(".brand-device").first().evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe("none");
});

test("visual: the controls gallery, in Ink Instrument", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/styles?style=ink-instrument");
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await page.goto("/gallery/controls");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".echo-gallery")).toHaveScreenshot("ink-instrument-controls.png", { animations: "disabled" });
});
