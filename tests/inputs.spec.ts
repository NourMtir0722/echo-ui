import { test, expect, type Page } from "@playwright/test";

/**
 * Wave C, the inputs: Toggle and ToggleGroup, Toolbar and ButtonGroup,
 * Field's adornments, Meter, RangeSlider, and the instruments Knob and
 * LevelMeter. Driven on their docs pages.
 */
const preview = (page: Page) => page.getByTestId("preview");

test.describe("Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/toggle");
  });

  test("a Toggle is a pressed button, and a multiple group lets several be on", async ({ page }) => {
    const style = preview(page).getByRole("group", { name: "Text style" });
    const bold = style.getByRole("button", { name: "Bold" });
    const italic = style.getByRole("button", { name: "Italic" });
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await italic.click();
    await expect(italic).toHaveAttribute("aria-pressed", "true");
    await expect(bold).toHaveAttribute("aria-pressed", "true");
  });

  test("a single group keeps at most one on, and arrows move between its keys", async ({ page }) => {
    const view = preview(page).getByRole("group", { name: "View" });
    const grid = view.getByRole("button", { name: "Grid" });
    const list = view.getByRole("button", { name: "List" });
    await list.click();
    await expect(list).toHaveAttribute("aria-pressed", "true");
    await expect(grid).toHaveAttribute("aria-pressed", "false");
    await list.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(grid).toBeFocused();
  });

  test("on is the cap held down, not a light, and it stays down after a hover", async ({ page }) => {
    const loop = preview(page).getByRole("button", { name: "Loop" });
    const top = () => loop.evaluate((el) => getComputedStyle(el).top);
    await expect(loop).toHaveAttribute("aria-pressed", "true");
    await loop.hover();
    await page.mouse.move(0, 0);
    await expect.poll(top).toBe("1.5px");
    await loop.click();
    await expect.poll(top).toBe("0px");
  });

  test("visual: toggles", async ({ page }) => {
    await expect(preview(page)).toHaveScreenshot("toggles.png");
  });
});

test.describe("Toolbar", () => {
  test.beforeEach(async ({ page }) => {
    // The arrow keys are Base UI's roving focus, live once the page has hydrated.
    await page.goto("/docs/toolbar", { waitUntil: "networkidle" });
  });

  test("one tab stop, and the arrow keys walk the whole bar", async ({ page }) => {
    const bar = preview(page).getByRole("toolbar", { name: "Formatting" });
    await bar.getByRole("button", { name: "Bold" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(bar.getByRole("button", { name: "Italic" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(bar.getByRole("button", { name: "Undo" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(bar.getByRole("button", { name: "Publish" })).toBeFocused();
    // Only one of the bar's controls is in the tab order at a time.
    const tabbable = await bar.locator("button").evaluateAll((els) => els.filter((b) => (b as HTMLButtonElement).tabIndex >= 0).length);
    expect(tabbable).toBe(1);
  });

  test("a ButtonGroup is a named group whose buttons share one well", async ({ page }) => {
    const group = preview(page).getByRole("group", { name: "Steps" });
    await expect(group.getByRole("button")).toHaveCount(2);
    const shadow = await group.locator(".echo-hw__well").first().evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toBe("none");
  });

  test("visual: toolbar", async ({ page }) => {
    await expect(preview(page)).toHaveScreenshot("toolbar.png");
  });
});

test.describe("Field adornments", () => {
  test("the search icon is decoration; the clear key is a named button that clears", async ({ page }) => {
    await page.goto("/docs/field");
    const search = preview(page).getByRole("textbox", { name: "Search presets" });
    await expect(search).toHaveValue("tape saturation");
    await expect(preview(page).locator('.echo-field__adornment[data-side="start"]')).toHaveAttribute("aria-hidden", "true");
    await preview(page).getByRole("button", { name: "Clear search" }).click();
    await expect(search).toHaveValue("");
  });
});

test.describe("Meter", () => {
  test("a named meter whose reading is its value text, and it moves when the value does", async ({ page }) => {
    await page.goto("/docs/meter");
    const storage = preview(page).getByRole("meter", { name: "Storage" });
    await expect(storage).toHaveAttribute("aria-valuetext", /42\.5\s*GB/);
    await preview(page).getByRole("button", { name: "Add files" }).click();
    await expect(storage).toHaveAttribute("aria-valuetext", /51\.5\s*GB/);
  });

  test("asking for a percent reads the share of the range, not the raw value times 100", async ({ page }) => {
    await page.goto("/docs/meter");
    const battery = preview(page).getByRole("meter", { name: "Battery" });
    await expect(battery).toHaveAttribute("aria-valuetext", "78%");
    await expect(battery).toContainText("78%");
    await expect(battery).not.toContainText("7,800%");
  });
});

test.describe("RangeSlider", () => {
  test("two named sliders that can't cross", async ({ page }) => {
    await page.goto("/docs/range-slider");
    const low = preview(page).getByRole("slider", { name: "Price, minimum" });
    const high = preview(page).getByRole("slider", { name: "Price, maximum" });
    await expect(low).toHaveAttribute("aria-valuetext", "$40");
    await low.focus();
    await page.keyboard.press("ArrowRight");
    await expect(low).toHaveAttribute("aria-valuenow", "45");
    await page.keyboard.press("End");
    const [l, h] = [Number(await low.getAttribute("aria-valuenow")), Number(await high.getAttribute("aria-valuenow"))];
    expect(l).toBeLessThan(h);
  });
});

test.describe("Knob", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/knob");
  });

  test("a named slider with every slider key and a reading in words", async ({ page }) => {
    const gain = preview(page).getByRole("slider", { name: "Gain" });
    await expect(gain).toHaveAttribute("aria-valuetext", "0 dB");
    await gain.focus();
    await page.keyboard.press("ArrowUp");
    await expect(gain).toHaveAttribute("aria-valuetext", "+1 dB");
    await page.keyboard.press("PageDown");
    // A tenth of the 48 dB range, snapped to the step: +1 → -4.
    await expect(gain).toHaveAttribute("aria-valuenow", "-4");
    await page.keyboard.press("Home");
    await expect(gain).toHaveAttribute("aria-valuenow", "-24");
    await page.keyboard.press("End");
    await expect(gain).toHaveAttribute("aria-valuenow", "24");
  });

  test("dragging up turns it up, and the cap turns with it", async ({ page }) => {
    const low = preview(page).getByRole("slider", { name: "Low" });
    const b = (await low.boundingBox())!;
    const turn = () => low.locator(".echo-knob__rotor").evaluate((el) => parseFloat(el.style.rotate || "0"));
    const before = await turn();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 60, { steps: 6 });
    await page.mouse.up();
    await expect(low).toHaveAttribute("aria-valuenow", "70");
    await expect.poll(turn).toBeGreaterThan(before);
  });

  test("visual: knobs", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("knobs.png");
  });
});

test.describe("LevelMeter", () => {
  test("lights with the signal, and goes dark and stops drawing when it stops", async ({ page }) => {
    await page.goto("/docs/level-meter");
    const left = preview(page).getByRole("meter", { name: "Left" });
    await expect.poll(() => left.locator("[data-on]").count()).toBeGreaterThan(0);
    await preview(page).getByRole("button", { name: "Signal" }).click();
    await expect.poll(() => left.locator("[data-on], [data-peak]").count(), { timeout: 5000 }).toBe(0);
    const changes = await left.evaluate(
      (el) =>
        new Promise<number>((done) => {
          let n = 0;
          const o = new MutationObserver((m) => (n += m.length));
          o.observe(el, { attributes: true, subtree: true });
          setTimeout(() => (o.disconnect(), done(n)), 500);
        }),
    );
    expect(changes).toBe(0);
  });
});
