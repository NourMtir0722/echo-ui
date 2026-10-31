import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The Styles page: the styles Echo publishes, on real components, and the one
 * place to switch between them. Themes is for colours and this is for whole
 * looks, and the landing keeps both to itself: a first visit meets Echo's own.
 * Style and the light key are two settings, and neither changes the other's.
 */
const rootVar = (page: Page, name: string) => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), name);
const lineWidth = async (page: Page) => parseFloat((await rootVar(page, "--echo-line-width")) || "0");

const style = (page: Page, name: string) => page.getByRole("radio", { name: new RegExp(`^${name}`) });
const lightKey = (page: Page) => page.getByRole("button", { name: "Light", exact: true });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("the docs' bar has Styles next to Themes, the sidebar lists it, and it opens the page", async ({ page }) => {
  await page.goto("/docs/installation");
  const bar = page.getByRole("banner");
  const names = await bar.getByRole("link").allTextContents();
  expect(names.indexOf("Styles")).toBe(names.indexOf("Themes") + 1);
  await expect(page.getByRole("navigation", { name: "Components" }).locator('a[href="/styles"]')).toHaveText("Style switcher");

  await bar.getByRole("link", { name: "Styles", exact: true }).click();
  await expect(page).toHaveURL(/\/styles$/);
  await expect(page.getByRole("heading", { level: 1, name: "Styles" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Styles", exact: true })).toHaveAttribute("aria-current", "page");
});

test("the landing doesn't show the styles: not in the hero's nav, the bar past it, or the phone's menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero4__nav").getByRole("link", { name: "Themes" })).toBeVisible();
  await expect(page.locator(".hero4__nav").getByText("Styles")).toHaveCount(0);
  await expect(page.locator(".hero4__nav").getByText("Ink Instrument")).toHaveCount(0);
  await expect(page.getByRole("banner").locator('a[href="/styles"]')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("link", { name: "Themes" })).toBeVisible();
  await expect(sheet.locator('a[href="/styles"]')).toHaveCount(0);
  await expect(sheet.getByText("Ink Instrument")).toHaveCount(0);
});

test("the Themes page is colours: it offers Echo's four, and no style", async ({ page }) => {
  await page.goto("/generator");
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: "Coral", exact: true })).toBeVisible();
  await expect(main.getByText("Ink Instrument")).toHaveCount(0);
  await expect(main.getByText("Styles", { exact: true })).toHaveCount(0);
});

test("a bunch of real components wear the choice, and the command says how to wear it in a project", async ({ page }) => {
  await page.goto("/styles");
  const main = page.getByRole("main");
  for (const key of ["Record", "Save take", "Open dialog"]) await expect(main.getByRole("button", { name: key })).toBeVisible();
  await expect(main.getByRole("switch")).toHaveCount(2);
  await expect(main.getByRole("table")).toBeVisible();
  await expect(main.getByRole("code").or(main.locator("code"))).toContainText("style use echo");

  await style(page, "Ink Instrument").click();
  await expect(main.locator("code")).toContainText("style use ink-instrument");
  // The line reaches the parts themselves, not just :root.
  const key = main.getByRole("button", { name: "Save take" });
  await expect.poll(() => key.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--echo-line-width")))).toBeGreaterThan(0);
});

test("a style goes with the visitor, and Echo brings back the colour and device they left", async ({ page }) => {
  await page.goto("/generator");
  await lightKey(page).click();
  await page.getByRole("button", { name: "Coral", exact: true }).click();
  await expect(page.getByText(/Start from · Coral/)).toBeVisible();

  await page.goto("/styles");
  await style(page, "Ink Instrument").click();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await page.goto("/docs/cli");
  expect(await lineWidth(page)).toBeGreaterThan(0);

  await page.goto("/styles");
  await expect(style(page, "Ink Instrument")).toBeChecked();
  await style(page, "Echo").click();
  await expect.poll(() => lineWidth(page)).toBe(0);
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");
  await page.goto("/generator");
  await expect(page.getByRole("button", { name: "Coral", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("the light key turns a style over and leaves it that style, through a reload and back", async ({ page }) => {
  await page.goto("/styles");
  await style(page, "Ink Instrument").click();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "true");

  await lightKey(page).click();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => rootVar(page, "--echo-surface")).toBe("#1C1C1C");
  await expect(style(page, "Ink Instrument")).toBeChecked();

  await page.reload();
  await expect(style(page, "Ink Instrument")).toBeChecked();
  await expect(lightKey(page)).toHaveAttribute("aria-pressed", "false");

  await lightKey(page).click();
  await expect.poll(() => rootVar(page, "--echo-surface")).toBe("#F3F3F3");
  await expect(style(page, "Ink Instrument")).toBeChecked();
});

test("with no colour picked, Echo goes back to the page's own opening and leaves nothing saved", async ({ page }) => {
  await page.goto("/styles");
  const chosen = () => page.evaluate(() => document.documentElement.hasAttribute("data-seed-chosen"));
  expect(await chosen()).toBe(false);
  await style(page, "Ink Instrument").click();
  await expect.poll(chosen).toBe(true);
  await style(page, "Echo").click();
  await expect.poll(chosen).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("echo-site-theme"))).toBeNull();
});

test("the styles are switched from the keyboard alone", async ({ page }) => {
  await page.goto("/styles");
  await style(page, "Echo").focus();
  await page.keyboard.press("ArrowRight");
  await expect(style(page, "Ink Instrument")).toBeChecked();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await expect(style(page, "Ink Instrument")).toBeFocused();
});

test("a tagged link keeps its address: only a style's own link is taken out of it", async ({ page }) => {
  await page.goto("/styles?utm_source=x");
  await expect(style(page, "Echo")).toBeChecked();
  await page.waitForTimeout(600);
  // Rewriting the address reads as a second page view to anything counting visits.
  await expect(page).toHaveURL(/\/styles\?utm_source=x$/);

  await page.goto("/styles?style=ink-instrument");
  await expect(style(page, "Ink Instrument")).toBeChecked();
  await expect(page).toHaveURL(/\/styles$/);
});

test("the page passes axe in Echo's own, in Ink Instrument, and in Ink Instrument turned over", async ({ page }) => {
  const clean = async () => {
    // The chrome's colours ease to the new look; measured halfway, a link is neither look's.
    await page.waitForTimeout(600);
    const { violations } = await axe(page).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  };
  await page.goto("/styles");
  await clean();
  await style(page, "Ink Instrument").click();
  await expect.poll(() => lineWidth(page)).toBeGreaterThan(0);
  await clean();
  await lightKey(page).click();
  await expect.poll(() => rootVar(page, "--echo-surface")).toBe("#1C1C1C");
  await clean();
});
