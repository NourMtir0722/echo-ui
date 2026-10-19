import { test, expect, type Page } from "@playwright/test";
import { createEchoTheme } from "../packages/core/src/theme";

/**
 * Focus indicators have 3:1 contrast (WCAG 1.4.11 non-text contrast, applied
 * to the focus indicator).
 *
 * forced-colors.spec.ts proves focus changes the pixels. This proves the
 * change is strong enough to see: for every focusable part in the galleries,
 * compare each pixel focused against the same pixel unfocused, and require at
 * least a one-pixel ring's worth (the part's perimeter) to differ by 3:1.
 *
 * The text inputs' inner focus edge (1.5px of the glow at 70%) reached
 * 2.6:1 at best.
 */
const GALLERIES = ["controls", "hardware-button", "keys", "navigation", "overlays", "structure", "primitives", "surfaces", "modal"];

const FOCUSABLE = [
  "main button:not([disabled])",
  "main a[href]",
  "main input:not([disabled]):not([type=hidden])",
  "main textarea:not([disabled])",
  'main [tabindex="0"]',
].join(", ");

/** Pixels (focused vs unfocused) whose contrast is at least 3:1, computed in the page. */
async function strongPixels(page: Page, before: Buffer, after: Buffer): Promise<number> {
  return page.evaluate(
    async ([a, b]) => {
      const read = async (b64: string) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const [p, q] = await Promise.all([read(a), read(b)]);
      const lum = (d: Uint8ClampedArray, i: number) => {
        const c = (v: number) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * c(d[i]!) + 0.7152 * c(d[i + 1]!) + 0.0722 * c(d[i + 2]!);
      };
      let strong = 0;
      for (let i = 0; i < p.length; i += 4) {
        const l1 = lum(p, i);
        const l2 = lum(q, i);
        if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= 3) strong++;
      }
      return strong;
    },
    [before.toString("base64"), after.toString("base64")] as const,
  );
}

/** Echo's purple on the light device, the site's own (lightSeedOf in apps/www). */
const LIGHT = { accent: "#8B6FE8", chassis: "#F0EFF8", paper: "#1D1A2A" };

/** Every focusable part in a gallery whose focus doesn't change a ring's worth of pixels by 3:1. */
async function weakFocus(page: Page, gallery: string, light = false): Promise<string[]> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/gallery/${gallery}`);
  if (light) {
    await page.addStyleTag({ content: createEchoTheme(LIGHT, { quiet: true }).css });
    await page.waitForTimeout(300);
  }
  const count = await page.locator(FOCUSABLE).count();
  const problems: string[] = [];
  for (let i = 0; i < count; i++) {
    const el = page.locator(FOCUSABLE).nth(i);
    if (!(await el.isVisible())) continue;
    await el.scrollIntoViewIfNeeded();
    // Measure the part that carries the indicator: a text input's ring is on
    // its well; a radio's rings the hole, which is the control.
    const host = await el.evaluateHandle(
      (n) => n.closest('[class$="__well"], [class*="__well "]') ?? n.querySelector(".echo-radio__control") ?? n,
    );
    const box = await host.asElement()!.boundingBox();
    if (!box || box.width < 2 || box.height < 2) continue;
    const pad = 6;
    const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const before = await page.screenshot({ clip, animations: "disabled" });
    // Keyboard focus, so :focus-visible applies.
    await el.evaluate((node) => (node as HTMLElement).focus({ focusVisible: true } as FocusOptions));
    const after = await page.screenshot({ clip, animations: "disabled" });
    const strong = await strongPixels(page, before, after);
    const needed = Math.round(2 * (box.width + box.height));
    if (strong < needed) {
      const label = await el.evaluate((n) => `${n.tagName.toLowerCase()}.${(n.getAttribute("class") ?? "").split(" ")[0]} "${(n.textContent ?? n.getAttribute("aria-label") ?? "").trim().slice(0, 24)}"`);
      problems.push(`${label}: ${strong} pixels at 3:1, needs ${needed}`);
    }
  }
  return problems;
}

for (const gallery of GALLERIES) {
  test(`every focus indicator has 3:1 contrast: /gallery/${gallery}`, async ({ page }) => {
    test.setTimeout(120_000);
    expect(await weakFocus(page, gallery)).toEqual([]);
  });

  // On a light device the ring is the accent's ink on pale plastic: in the raw accent it read 2.35-2.68:1 on the well.
  test(`every focus indicator has 3:1 contrast on a light device: /gallery/${gallery}`, async ({ page }) => {
    test.setTimeout(120_000);
    expect(await weakFocus(page, gallery, true)).toEqual([]);
  });
}
