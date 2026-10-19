import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Surfaces acceptance: axe-clean, correct output
 * semantics (progressbar/status/live-region discipline), and visual-regression
 * per component.
 */
test.describe("Surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/surfaces");
    await page.getByTestId("panels").waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Progress exposes progressbar semantics", async ({ page }) => {
    const bar = page.getByRole("progressbar", { name: "Upload progress" });
    await expect(bar).toHaveAttribute("aria-valuenow", "65");
  });

  test("Loader announces as status", async ({ page }) => {
    // exact: Playwright matches accessible names by substring, and the
    // Skeleton region below is named "Loading article".
    await expect(page.getByRole("status", { name: "Loading", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Saving", exact: true })).toBeVisible();
  });

  test("labeled StatusDot is exposed; unlabeled ones are decorative", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Offline" })).toBeVisible();
    const decorative = page.getByTestId("status-dots").locator(".echo-status-dot[aria-hidden='true']");
    await expect(decorative).toHaveCount(2);
  });

  test("Skeletons are silent except for the one that owns the wait", async ({ page }) => {
    // A dozen boxes each announcing "Loading" is unusable; one region owns it.
    const region = page.getByRole("status", { name: "Loading article" });
    await expect(region).toHaveAttribute("aria-busy", "true");

    const silent = page.getByTestId("skeletons").locator(".echo-skeleton[aria-hidden='true']");
    expect(await silent.count()).toBeGreaterThan(0);
    await expect(page.getByTestId("skeletons").getByRole("status")).toHaveCount(1);
  });

  test("a Banner rendered with the page is not a live region", async ({ page }) => {
    // Announcing on load interrupts for something the reader will reach anyway.
    const banners = page.getByTestId("banners").locator(".echo-banner");
    await expect(banners).toHaveCount(3);
    await expect(page.getByTestId("banners").getByRole("status")).toHaveCount(0);
    await expect(page.getByTestId("banners").getByRole("alert")).toHaveCount(0);
  });

  test("a dismissible Banner names its control", async ({ page }) => {
    await expect(page.getByTestId("banners").getByRole("button", { name: "Dismiss" })).toBeVisible();
  });

  for (const id of [
    "panels",
    "progress",
    "loaders",
    "status-dots",
    "toasts",
    "skeletons",
    "banners",
    "empty-states",
  ]) {
    // These baselines, like 23 others, were regenerated on 2026-09-19 after
    // review: they predated the 2026-09-18 design pass.
    test(`visual: ${id}`, async ({ page }) => {
      await expect(page.getByTestId(id)).toHaveScreenshot(`${id}.png`, { animations: "disabled" });
    });
  }
});

test.describe("Panel pressable", () => {
  const ink = (panel: import("@playwright/test").Locator) =>
    panel.locator("canvas").evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
      return n;
    });

  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/panel");
  });

  test("looks like any Panel at rest, and a press sends a wave that settles and stops", async ({ page }) => {
    const panel = page.locator(".echo-panel[data-pressable]").first();
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.locator("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(await ink(panel)).toBe(0);
    const b = (await panel.boundingBox())!;
    await page.mouse.move(b.x + 30, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.up();
    await expect.poll(() => ink(panel)).toBeGreaterThan(0);
    // A wave lives 2.2s at most; after that it's gone and nothing is drawn.
    await page.waitForTimeout(2500);
    expect(await ink(panel)).toBe(0);
    // Count this canvas's redraws while it sits idle.
    const redraws = await panel.locator("canvas").evaluate(
      (c: HTMLCanvasElement) =>
        new Promise<number>((done) => {
          let n = 0;
          const clear = CanvasRenderingContext2D.prototype.clearRect;
          CanvasRenderingContext2D.prototype.clearRect = function (...args) {
            if (this.canvas === c) n++;
            return clear.apply(this, args);
          };
          setTimeout(() => ((CanvasRenderingContext2D.prototype.clearRect = clear), done(n)), 400);
        }),
    );
    expect(redraws).toBe(0);
  });

  test("under reduced motion a press sends no wave", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const panel = page.locator(".echo-panel[data-pressable]").first();
    await panel.scrollIntoViewIfNeeded();
    await panel.click();
    await page.waitForTimeout(200);
    expect(await ink(panel)).toBe(0);
  });
});
