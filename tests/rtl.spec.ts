import { test, expect } from "@playwright/test";

/**
 * Right-to-left. /gallery/rtl renders each specimen twice at the
 * same width, left-to-right and right-to-left. Mirrored layout means every
 * part's box in the right-to-left copy is the reflection of its box in the
 * left-to-right one: x' = width - (x + w), same y and size. Any physical
 * property left in component CSS (`left`, `margin-right`, `text-align: left`)
 * breaks that for its part.
 *
 * Only layout boxes are compared, so the specimens use the same Latin text on
 * both sides, and two kinds of element are skipped:
 * - inline text (`display: inline`), which the Unicode bidi algorithm orders,
 *   not CSS: "42ms" rightly stays "42ms" in right-to-left;
 * - visually hidden inputs (clipped to nothing), which nobody sees.
 * The light doesn't mirror (it stays at the top left in both directions), but
 * it's drawn in backgrounds and shadows, so no box has to be excused for it.
 */
type Box = { tag: string; cls: string; x: number; y: number; w: number; h: number };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery/rtl");
  await page.evaluate(() => document.fonts.ready);
});

test("every specimen's right-to-left layout is the mirror of its left-to-right one", async ({ page }) => {
  const names = await page.locator('[data-specimen][data-dir="ltr"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-specimen")!),
  );
  expect(names.length).toBeGreaterThan(5);

  const problems: string[] = [];
  for (const name of names) {
    const read = (dir: string) =>
      page.locator(`[data-specimen="${name}"][data-dir="${dir}"]`).evaluate((root) => {
        const origin = root.getBoundingClientRect();
        const boxes: Box[] = [];
        for (const el of root.querySelectorAll("*")) {
          // Inside an SVG only the <svg> itself is a layout box.
          if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
          const style = getComputedStyle(el);
          if (style.display === "inline" || style.clipPath === "inset(50%)") continue;
          const r = el.getBoundingClientRect();
          boxes.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute("class") ?? "").split(" ")[0]!,
            x: r.x - origin.x,
            y: r.y - origin.y,
            w: r.width,
            h: r.height,
          });
        }
        return { width: origin.width, boxes };
      });

    const ltr = await read("ltr");
    const rtl = await read("rtl");
    expect(rtl.boxes.length, `${name}: same parts in both directions`).toBe(ltr.boxes.length);
    ltr.boxes.forEach((a, i) => {
      const b = rtl.boxes[i]!;
      if (a.w === 0 || a.h === 0) return;
      const mirroredX = ltr.width - (a.x + a.w);
      const off = Math.max(Math.abs(b.x - mirroredX), Math.abs(b.y - a.y), Math.abs(b.w - a.w));
      if (off > 1) {
        problems.push(
          `${name}: <${a.tag} ${a.cls}> ltr x=${a.x.toFixed(1)} w=${a.w.toFixed(1)}; rtl x=${b.x.toFixed(1)}, mirror would be ${mirroredX.toFixed(1)}`,
        );
      }
    });
  }
  expect(problems).toEqual([]);
});

test("a switch that's on lights at the inline end in both directions", async ({ page }) => {
  for (const dir of ["ltr", "rtl"]) {
    const sw = page.locator(`[data-dir="${dir}"] .echo-switch[data-checked]`).first();
    const track = (await sw.boundingBox())!;
    const thumb = (await sw.locator(".echo-switch__thumb").boundingBox())!;
    const thumbCentre = thumb.x + thumb.width / 2 - track.x;
    const atEnd = dir === "ltr" ? thumbCentre > track.width / 2 : thumbCentre < track.width / 2;
    expect(atEnd, `${dir}: the thumb of an on switch is at the inline end`).toBe(true);
  }
});

test("arrow keys follow the reading direction", async ({ page }) => {
  const slider = page.locator('[data-dir="rtl"]').getByRole("slider", { name: "Level" });
  await slider.focus();
  const before = Number(await slider.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowLeft");
  // In right-to-left, left is forward.
  expect(Number(await slider.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
});

test("visual: right-to-left gallery", async ({ page }) => {
  await expect(page.getByTestId("arabic")).toHaveScreenshot("rtl-arabic.png");
});
