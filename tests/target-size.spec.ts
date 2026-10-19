import { test, expect } from "@playwright/test";
import { createEchoTheme } from "../packages/core/src/theme";

/**
 * Every pointer target is at least 24×24 CSS px (WCAG 2.5.8, Target Size
 * Minimum). Echo guarantees it by construction
 * rather than leaning on the standard's spacing exception, which depends on
 * how an app lays components out.
 *
 * Measured as the real hit area, not the visible box: the points 11.5px
 * above, below, left and right of a target's center must all land on the
 * target, so an invisible hit-area extension counts and a clipped one doesn't.
 * The `@touch` tests check the 44px coarse-pointer sizes separately.
 */

const GALLERIES = [
  "controls",
  "hardware-button",
  "keys",
  "navigation",
  "overlays",
  "structure",
  "primitives",
  "surfaces",
  "textures",
  "modal",
];

const TARGETS = [
  "main button:not([disabled])",
  "main a[href]",
  'main input:not([disabled]):not([type=hidden]):not([type="range"])',
  "main textarea:not([disabled])",
  'main [role="slider"]',
].join(", ");

// Density can't take a target under 24px (PRINCIPLES.md): checked at compact too.
for (const density of ["default", "compact"] as const) for (const gallery of GALLERIES) {
  test(`every target is at least 24×24 (${density}): /gallery/${gallery}`, async ({ page }) => {
    await page.goto(`/gallery/${gallery}`);
    if (density !== "default") {
      await page.addStyleTag({ content: createEchoTheme({ density }, { quiet: true }).css });
    }
    const small = await page.evaluate((selector) => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden") continue;
        // The native inputs behind Base UI's switch, checkbox and radio are
        // visually hidden (1×1); their visible part is the target.
        const box = el.getBoundingClientRect();
        if (box.width <= 1 && box.height <= 1) continue;
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const hits = [
          [cx - 11.5, cy],
          [cx + 11.5, cy],
          [cx, cy - 11.5],
          [cx, cy + 11.5],
        ].every(([x, y]) => {
          const at = document.elementFromPoint(x!, y!);
          return !!at && (at === el || el.contains(at));
        });
        if (!hits) {
          const cls = [...el.classList].find((c) => c.startsWith("echo-")) ?? el.tagName.toLowerCase();
          const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 20);
          out.push(`${cls} "${name}" (${Math.round(r.width)}×${Math.round(r.height)})`);
        }
      }
      return out;
    }, TARGETS);
    expect(small, "targets whose hit area is under 24×24").toEqual([]);
  });
}
