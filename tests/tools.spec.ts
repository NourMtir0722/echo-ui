import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * The tools, rebuilt from registry components. These pin the behaviour the
 * rebuild introduced: the seed reaches the engine only as a whole hex, the
 * seed the generator picks is the whole SITE's seed (every page, popups,
 * reloads), and the audition's controls are the library's own.
 */
type Page = import("@playwright/test").Page;

const varOn = (page: Page, selector: string, name: string) =>
  page.evaluate(
    ([sel, v]) => getComputedStyle(document.querySelector(sel!)!).getPropertyValue(v!).trim(),
    [selector, name],
  );
const rootAccent = (page: Page) => varOn(page, ":root", "--echo-accent");

/** Default-seed :root blocks on the page. The layout emits exactly one. */
const defaultRootBlocks = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("style")].filter(
        (s) => s.id !== "echo-site-theme" && /:root\s*\{[^}]*--echo-accent:/.test(s.textContent ?? ""),
      ).length,
  );

test.describe("Theme generator", () => {
  test("the preview shows the accent ramp, all seven stops", async ({ page }) => {
    await page.goto("/generator");
    // The row was sized to its content, and its stops are empty: it came out 0px wide.
    const stops = page.getByText("Accent ramp", { exact: true }).locator("xpath=following-sibling::div[1]/div");
    await expect(stops).toHaveCount(7);
    for (const box of await stops.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))) {
      expect(box).toBeGreaterThan(16);
    }
  });

  test("a hex typed into the Field relights the whole page, preview included", async ({ page }) => {
    await page.goto("/generator");
    const before = await rootAccent(page);

    await page.getByRole("textbox", { name: "Accent hex", exact: true }).fill("#3D8EF0");
    await expect.poll(() => rootAccent(page)).not.toBe(before);
    expect(await varOn(page, ".echo-preview", "--echo-accent")).toBe(await rootAccent(page));
  });

  test("a half-typed hex never reaches the engine", async ({ page }) => {
    await page.goto("/generator");
    const before = await rootAccent(page);
    const field = page.getByRole("textbox", { name: "Accent hex", exact: true });
    await field.fill("#1FA");
    expect(await rootAccent(page)).toBe(before);
    // Leaving the field snaps it back to the colour in use.
    await field.blur();
    await expect(field).toHaveValue("#8B6FE8");
  });

  test("presets are pressed caps, and editing drops you to Custom", async ({ page }) => {
    await page.goto("/generator");
    const sky = page.getByRole("button", { name: "Sky", exact: true });
    await sky.click();
    await expect(sky).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("textbox", { name: "Paper hex", exact: true }).fill("#FFFFFF");
    await expect(sky).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/Start from · Custom/)).toBeVisible();
  });

  test("the contrast readout holds 4.5:1 as the accent moves, down to a green", async ({ page }) => {
    await page.goto("/generator");
    const readout = page.getByRole("group", { name: "Button label", exact: true });
    const ratio = async () => Number((await readout.innerText()).match(/\d+\.\d\d/)![0]);
    expect(await ratio()).toBeGreaterThanOrEqual(4.5);

    const before = await readout.innerText();
    // A green: the hue the destructive confirm once failed on.
    await page.getByRole("textbox", { name: "Accent hex", exact: true }).fill("#0AC642");
    await expect.poll(() => readout.innerText()).not.toBe(before);
    expect(await ratio()).toBeGreaterThanOrEqual(4.5);
  });

  test("a shared link relights the site, leaves the address bar, and keeps yours a press away", async ({ page }) => {
    await page.goto("/generator");
    const nawwara = await rootAccent(page);
    await page.getByRole("textbox", { name: "Accent hex", exact: true }).fill("#C2185B");
    await expect.poll(() => rootAccent(page)).not.toBe(nawwara);
    const yours = await rootAccent(page);

    await page.goto("/generator?accent=1fa8a0&chassis=1f2a2a&paper=eaf3f1");
    await expect(page.getByRole("textbox", { name: "Accent hex", exact: true })).toHaveValue("#1FA8A0");
    await expect(page).toHaveURL(/\/generator$/);
    await expect(page.getByRole("status")).toContainText("press Yours");
    const shared = page.getByRole("button", { name: "Shared", exact: true });
    await expect(shared).toHaveAttribute("aria-pressed", "true");
    const teal = await rootAccent(page);
    expect(teal).not.toBe(yours);

    // Theirs and yours, one press apart.
    await page.getByRole("button", { name: "Yours", exact: true }).click();
    await expect.poll(() => rootAccent(page)).toBe(yours);
    await shared.click();
    await expect.poll(() => rootAccent(page)).toBe(teal);

    // It's the site's seed now, like any other pick.
    await page.goto("/docs/switch");
    expect(await rootAccent(page)).toBe(teal);
  });

  test("Copy link copies a link that opens the same seed", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) },
      });
    });
    await page.goto("/generator");
    await page.getByRole("button", { name: "Sky", exact: true }).click();
    const sky = await rootAccent(page);
    await page.getByRole("button", { name: "Copy link" }).click();
    const link = await page.evaluate(() => (window as unknown as { copied: string }).copied);
    expect(link).toMatch(/\/generator\?accent=3d8ef0&chassis=1f2330&paper=e9f0fa$/);

    await page.getByRole("button", { name: "Reset to Nawwara" }).click();
    await page.goto(new URL(link).pathname + new URL(link).search);
    await expect.poll(() => rootAccent(page)).toBe(sky);
  });

  test("Download DESIGN.md is this seed's look, and sends an agent with a terminal to init with it", async ({ page }) => {
    await page.goto("/generator");
    await page.getByRole("button", { name: "Sky", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download DESIGN.md" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("DESIGN.md");
    const text = await readFile(await download.path(), "utf8");
    expect(text).toMatch(/In a project with a terminal, don't build from this file/);
    expect(text).toMatch(/`npx echo-ui-cli init --seed #3d8ef0,#1f2330,#e9f0fa`/i);
    expect(text).toMatch(/\| `--echo-accent` \| #3d8ef0 \|/i);
    await expect(page.getByRole("status")).toContainText("DESIGN.md downloaded");
  });

  test("a blocked Copy seed doesn't send you to the CSS", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new DOMException("blocked", "NotAllowedError")) },
      });
    });
    await page.goto("/generator");
    await page.getByRole("button", { name: "Copy seed" }).click();
    await expect(page.getByRole("status")).toContainText("hex values above");
    await expect(page.getByRole("status")).not.toContainText("Generated CSS");
  });

  test("the preview's popups wear the chosen seed, not the default", async ({ page }) => {
    await page.goto("/generator");
    await page.getByRole("button", { name: "Coral", exact: true }).click();
    const coral = await rootAccent(page);
    await page.getByRole("button", { name: "Open dialog" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await varOn(page, '[role="dialog"]', "--echo-accent")).toBe(coral);
  });
});

test.describe("Site theme", () => {
  test("every page emits the default theme once, so nothing can undo a chosen seed", async ({ page }) => {
    for (const path of ["/", "/generator", "/docs/switch", "/gallery/controls", "/templates/chat", "/tactile"]) {
      await page.goto(path);
      expect(await defaultRootBlocks(page), path).toBe(1);
    }
  });

  test("a seed picked in the generator follows you to the Switch doc, and survives a reload", async ({ page }) => {
    await page.goto("/generator");
    const nawwara = await rootAccent(page);
    await page.getByRole("button", { name: "Sky", exact: true }).click();
    await expect.poll(() => rootAccent(page)).not.toBe(nawwara);
    const sky = await rootAccent(page);
    const ramp = await varOn(page, ":root", "--echo-accent-4");

    await page.goto("/docs/switch");
    const sw = page.getByRole("switch").first();
    await sw.waitFor();
    // Read ON the Switch: the token has to reach the component, not just :root.
    expect(await sw.evaluate((el) => getComputedStyle(el).getPropertyValue("--echo-accent-4").trim())).toBe(ramp);
    expect(await rootAccent(page)).toBe(sky);

    await page.reload();
    expect(await rootAccent(page)).toBe(sky);
  });

  test("Reset puts the whole site back on Nawwara", async ({ page }) => {
    await page.goto("/generator");
    const nawwara = await rootAccent(page);
    await page.getByRole("button", { name: "Coral", exact: true }).click();
    await expect.poll(() => rootAccent(page)).not.toBe(nawwara);
    await page.getByRole("button", { name: "Reset to Nawwara" }).click();
    await expect.poll(() => rootAccent(page)).toBe(nawwara);

    await page.goto("/docs/switch");
    expect(await rootAccent(page)).toBe(nawwara);
  });

  test("the brand wears the seed too: purple by default, and as drawn on Raspberry", async ({ page }) => {
    const brandBody = () => varOn(page, ":root", "--brand-body");
    const creatureStops = () =>
      page.evaluate(() => [...document.querySelectorAll("radialGradient stop")].map((s) => getComputedStyle(s).stopColor).join());

    await page.goto("/brand/creature");
    // On the default seed the creature is Echo's purple.
    expect((await brandBody()).toLowerCase()).toBe("#8b6fe8");
    const purple = await creatureStops();

    await page.goto("/generator");
    await page.getByRole("button", { name: "Raspberry", exact: true }).click();
    await page.goto("/brand/creature");
    // Raspberry is the seed the brand was drawn on: not one value moved.
    expect((await brandBody()).toUpperCase()).toBe("#DE3B74");
    expect(await creatureStops()).not.toBe(purple);
  });

  test("a colour picked in the generator is the homepage's too", async ({ page }) => {
    await page.goto("/generator");
    await page.getByRole("button", { name: "Coral", exact: true }).click();
    await expect(page.getByRole("button", { name: "Coral", exact: true })).toHaveAttribute("aria-pressed", "true");
    const coral = await rootAccent(page);
    await page.goto("/");
    expect(await rootAccent(page)).toBe(coral);
  });

  test("the homepage's opening colour is the homepage's alone: until you pick, the rest of the site is purple", async ({ page }) => {
    await page.goto("/");
    // Sky, the landing's own, while nothing is chosen.
    expect((await rootAccent(page)).toLowerCase()).toBe("#3d8ef0");
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-seed-chosen"))).toBe(false);
    await page.goto("/generator");
    await expect(page.getByRole("button", { name: "Nawwara", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect((await rootAccent(page)).toLowerCase()).toBe("#8b6fe8");
  });
});

test.describe("Sound audition", () => {
  test("every fader is the library's Slider, named for its recipe", async ({ page }) => {
    await page.goto("/audition");
    await expect(page.locator('input[type="range"]:not(.echo-slider *)')).toHaveCount(0);
    await expect(page.getByRole("slider", { name: "tap freq", exact: true })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Master gain", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play celebrate", exact: true })).toBeVisible();
  });

  test("reset asks first", async ({ page }) => {
    await page.goto("/audition");
    await page.getByRole("button", { name: "Reset" }).first().click();
    await expect(page.getByRole("alertdialog")).toContainText("Reset the tap recipe?");
  });
});
