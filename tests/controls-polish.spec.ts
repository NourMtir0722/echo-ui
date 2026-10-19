import { test, expect } from "@playwright/test";

/**
 * The controls pass (2026-09-18). Each test pins one thing that was wrong:
 * outer glows the library does not use, a Select showing two selection marks
 * on a mismatched sheet, a NumberField whose focus ring fused it to its
 * steppers, and a RadioGroup built from one molded cap per option.
 */
const shadow = (el: Element) => getComputedStyle(el).boxShadow;
/** An outer glow: a box-shadow layer with a blur and no inset. */
const hasOuterGlow = (s: string) =>
  s.split(/,(?![^(]*\))/).some((layer) => !layer.includes("inset") && /\s0px\s0px\s\d+px/.test(layer) && !/\s0px\s0px\s0px/.test(layer));

test("no outer glow on the slider fill, a checked box, or a focused field/textarea", async ({ page }) => {
  await page.goto("/gallery/controls");
  expect(hasOuterGlow(await page.locator(".echo-slider__indicator").first().evaluate(shadow))).toBe(false);

  await page.getByRole("checkbox").first().click();
  expect(hasOuterGlow(await page.getByRole("checkbox").first().evaluate(shadow))).toBe(false);

  await page.locator(".echo-textarea__input").first().click();
  expect(hasOuterGlow(await page.locator(".echo-textarea__well").first().evaluate(shadow))).toBe(false);
  await page.locator(".echo-field__input").first().click();
  expect(hasOuterGlow(await page.locator(".echo-field__well").first().evaluate(shadow))).toBe(false);
});

/**
 * A first gradient stop computes as `0%` from the source CSS but `0px` from the
 * minified production build (`0%` → `0`). Same paint; compare it as one.
 */
const sameStops = (s: string) => s.replace(/\) 0px/g, ") 0%");

test("the checkbox is lit with the Record button's pink", async ({ page }) => {
  await page.goto("/gallery/controls");
  const box = page.getByRole("checkbox").first();
  await box.click();
  const bg = await box.evaluate((el) => getComputedStyle(el).backgroundImage);
  const cap = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return s.getPropertyValue("--echo-primary-cap-top").trim();
  });
  expect(cap).not.toBe("");
  // Resolved colours, so compare against a primary cap rendered on the page.
  const probe = await page.evaluate(() => {
    const d = document.createElement("div");
    d.style.backgroundImage =
      "linear-gradient(180deg, var(--echo-primary-cap-top) 0%, var(--echo-primary-cap-mid) 45%, var(--echo-primary-cap-base) 100%)";
    document.body.appendChild(d);
    const v = getComputedStyle(d).backgroundImage;
    d.remove();
    return v;
  });
  expect(sameStops(bg)).toBe(sameStops(probe));
});

test("an open Select shows one mark on the chosen item, and no emoji", async ({ page }) => {
  await page.goto("/gallery/controls");
  await page.getByRole("combobox").first().click();
  const chosen = page.locator(".echo-select__item[data-selected]");
  await expect(chosen.locator(".echo-select__indicator svg")).toHaveCount(1);
  expect(await chosen.innerText()).not.toMatch(/✔/u);
  expect(hasOuterGlow(await chosen.locator(".echo-select__indicator").evaluate(shadow))).toBe(false);
});

test("the Select sheet is the trigger's plastic, not the flat page surface", async ({ page }) => {
  await page.goto("/gallery/controls");
  await page.getByRole("combobox").first().click();
  const bg = await page.locator(".echo-select__popup").evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toMatch(/linear-gradient/);
});

test("the NumberField's focus stays inside the window, with air to the steppers", async ({ page }) => {
  await page.goto("/gallery/controls");
  const input = page.locator(".echo-number-field__input").first();
  await input.click();
  const s = await input.evaluate(shadow);
  // Every focus layer is inset — nothing is drawn outside the window.
  expect(s.split(/,(?![^(]*\))/).every((l) => l.includes("inset"))).toBe(true);

  const [minus, win] = await Promise.all([
    page.locator(".echo-number-field__step").first().boundingBox(),
    input.boundingBox(),
  ]);
  expect(win!.x - (minus!.x + minus!.width)).toBeGreaterThanOrEqual(8);
});

test("a RadioGroup option is a hole and a label — not a molded cap", async ({ page }) => {
  await page.goto("/gallery/controls");
  const radio = page.locator(".echo-radio").first();
  const { bg, shadowed } = await radio.evaluate((el) => ({
    bg: getComputedStyle(el).backgroundImage,
    shadowed: getComputedStyle(el).boxShadow,
  }));
  expect(bg).toBe("none");
  expect(shadowed).toBe("none");
  await expect(radio.locator(".echo-radio__control")).toBeVisible();
});

test("Slider ships a small size", async ({ page }) => {
  await page.goto("/gallery/controls");
  const small = page.locator('.echo-slider[data-size="sm"] .echo-slider__thumb').first();
  const big = page.locator('.echo-slider[data-size="md"] .echo-slider__thumb').first();
  expect((await small.boundingBox())!.width).toBeLessThan((await big.boundingBox())!.width);
});

test("an indeterminate checkbox draws a dash, not the check", async ({ page }) => {
  await page.goto("/docs/checkbox");
  const mixed = page.getByTestId("preview").getByRole("checkbox", { name: "Mixed" });
  await expect(mixed).toHaveAttribute("aria-checked", "mixed");
  // "Some selected" and "all selected" used to be the same picture.
  await expect(mixed.locator(".echo-checkbox__dash")).toBeVisible();
  await expect(mixed.locator(".echo-checkbox__check")).toBeHidden();
});

/*
 * Moving between two options, the Select's flowing highlight drew
 * itself as a drop: on a row far wider than it is tall, that meant the tail
 * narrowing by tens of pixels and both ends rounding to half the row, a
 * lopsided wedge that read as broken, worst on a one-row hop (44.1 → 48 kHz).
 * In a list the highlight stays the molded cap and says speed only by drawing
 * out along its path.
 *
 * In WebKit the hop is made with ArrowDown, not the mouse. Base UI 1.8
 * ignores WebKit pointer moves whose movementX and movementY are both 0 (its
 * fix for zero-delta events fired while a list scrolls under a still pointer),
 * and Playwright's WebKit mouse reports 0 for every move, so the hover never
 * landed and this test failed on "the highlight never travelled". A real mouse
 * in Safari has real deltas. The highlight and its travel are the same either
 * way, which is what this test is about.
 */
test("the Select highlight stays a cap while it travels", async ({ page, browserName }) => {
  await page.goto("/gallery/controls");
  await page.getByRole("combobox").first().click();
  // Measure the rows once the list has unrolled out of its trigger, not
  // while it's still growing (where the second row sits on the first).
  const items = page.locator(".echo-select__item");
  await expect
    .poll(async () => {
      const [first, second] = [await items.nth(0).boundingBox(), await items.nth(1).boundingBox()];
      return second!.y - first!.y - first!.height;
    })
    .toBeGreaterThan(-1);
  await page.waitForTimeout(150);
  const [a, b] = [await items.nth(0).boundingBox(), await items.nth(1).boundingBox()];
  await page.mouse.move(a!.x + 30, a!.y + a!.height / 2);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const glow = document.querySelector<HTMLElement>(".echo-select__glow")!;
    const shape = glow.firstElementChild as HTMLElement;
    const row = document.querySelector<HTMLElement>(".echo-select__item")!;
    const w = window as unknown as { frames: { clip: string; left: number; right: number; top: number }[] };
    w.frames = [];
    const t0 = performance.now();
    const tick = () => {
      const g = glow.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      w.frames.push({ clip: getComputedStyle(shape).clipPath, left: g.left - r.left, right: g.right - r.right, top: g.top });
      if (performance.now() - t0 < 500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  if (browserName === "webkit") await page.keyboard.press("ArrowDown");
  else await page.mouse.move(b!.x + 30, b!.y + b!.height / 2, { steps: 3 });
  await page.waitForTimeout(600);
  const frames = await page.evaluate(() => (window as unknown as { frames: { clip: string; left: number; right: number; top: number }[] }).frames);
  const tops = frames.map((f) => f.top);
  expect(Math.max(...tops) - Math.min(...tops), "the highlight never travelled").toBeGreaterThan(10);
  expect(frames.filter((f) => f.clip !== "none").map((f) => f.clip), "the highlight changed shape").toEqual([]);
  expect(frames.every((f) => f.left >= -0.5 && f.right <= 0.5), "the highlight spilled past its row").toBe(true);
});

/*
 * Arrowing through an open Select drew the browser's default focus
 * ring on the current option, on top of the flowing highlight that already
 * marks it: two marks, one of them a colour the library never uses. The Menu
 * never had it. In forced colors, where the highlight is hidden, the current
 * option keeps a system-colour outline.
 */
test("arrowing through a Select marks the option once", async ({ page }) => {
  await page.goto("/gallery/controls");
  await page.getByRole("combobox").first().click();
  await page.keyboard.press("ArrowDown");
  const current = page.locator(".echo-select__item[data-highlighted]");
  await expect(current).toHaveCount(1);
  expect(await current.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");

  await page.keyboard.press("Escape");
  await page.emulateMedia({ forcedColors: "active" });
  await page.getByRole("combobox").first().click();
  await page.keyboard.press("ArrowDown");
  expect(await current.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
});
