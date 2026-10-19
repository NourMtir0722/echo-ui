import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Text contrast, measured on the pixels behind the text (WCAG 1.4.3).
 *
 * axe skips text on a gradient ("incomplete"), and every Echo surface is a
 * gradient, so a part can pass the axe sweep with text nobody can read. This
 * screenshots the text shown and hidden: where the two differ is where the
 * glyphs are, and the hidden shot there is what's behind each one. The text's
 * own colour, faded by its alpha and opacity, is laid over each of those
 * pixels, and the worst of them counts: on a gradient, the tops of the
 * letters can sit on lighter plastic than their feet.
 */
async function inkContrast(page: Page, text: Locator): Promise<number> {
  await text.scrollIntoViewIfNeeded();
  const { box, colour } = await text.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Any CSS colour, through a canvas, as sRGB bytes and an alpha.
    const probe = new OffscreenCanvas(1, 1).getContext("2d")!;
    probe.fillStyle = cs.color;
    probe.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = probe.getImageData(0, 0, 1, 1).data;
    return {
      box: { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width) + 1, height: Math.ceil(r.height) + 1 },
      colour: [red!, green!, blue!, (alpha! / 255) * Number(cs.opacity)] as const,
    };
  });
  const shown = await page.screenshot({ clip: box, animations: "disabled" });
  await text.evaluate((el) => (el as HTMLElement).style.setProperty("color", "transparent", "important"));
  const hidden = await page.screenshot({ clip: box, animations: "disabled" });
  await text.evaluate((el) => (el as HTMLElement).style.removeProperty("color"));
  return page.evaluate(
    async ([a, b, text]) => {
      const read = async (b64: string) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const [ink, ground] = await Promise.all([read(a), read(b)]);
      const c = (v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const lum = (r: number, g: number, bl: number) => 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(bl);
      const [tr, tg, tb, ta] = text;
      let worst = Infinity;
      for (let i = 0; i < ink.length; i += 4) {
        const behind = lum(ground[i]!, ground[i + 1]!, ground[i + 2]!);
        if (Math.abs(lum(ink[i]!, ink[i + 1]!, ink[i + 2]!) - behind) < 0.002) continue; // no glyph here
        const over = (t: number, g: number) => t * ta + g * (1 - ta);
        const seen = lum(over(tr, ground[i]!), over(tg, ground[i + 1]!), over(tb, ground[i + 2]!));
        worst = Math.min(worst, (Math.max(seen, behind) + 0.05) / (Math.min(seen, behind) + 0.05));
      }
      return worst;
    },
    [shown.toString("base64"), hidden.toString("base64"), colour] as const,
  );
}

async function everyOneReads(page: Page, selector: string, needed = 4.5) {
  await page.mouse.move(0, 0);
  const texts = page.locator(`main ${selector}`);
  const count = await texts.count();
  expect(count, `no ${selector} on the page`).toBeGreaterThan(0);
  const faint: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = texts.nth(i);
    if (!(await text.isVisible()) || !(await text.textContent())?.trim()) continue;
    const ratio = await inkContrast(page, text);
    if (ratio < needed) faint.push(`"${(await text.textContent())?.trim()}" ${ratio.toFixed(2)}:1`);
  }
  expect(faint, `under ${needed}:1`).toEqual([]);
}

test("WeekStrip's weekday letters reach 4.5:1, chosen day or not", async ({ page }) => {
  await page.goto("/docs/week-strip", { waitUntil: "networkidle" });
  await everyOneReads(page, ".echo-week-strip__weekday");
});

test("QuickTile's status line reaches 4.5:1, on a lit tile too", async ({ page }) => {
  await page.goto("/docs/quick-tile", { waitUntil: "networkidle" });
  await everyOneReads(page, ".echo-quick-tile__status");
});

test("a primary cap's label reaches 4.5:1 under a Scope's soft molding", async ({ page }) => {
  await page.goto("/docs/scope", { waitUntil: "networkidle" });
  await everyOneReads(page, ".echo-hw__cap[data-variant=primary] .echo-hw__content > span");
});
