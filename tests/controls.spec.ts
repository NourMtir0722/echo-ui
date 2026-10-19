import { test, expect } from "@playwright/test";
import { axe } from "./axe";

/**
 * Form controls acceptance: axe-clean and keyboard
 * operable. The controls gallery reproduces the reference "Switches & sliders"
 * showcase — Field, Toggle (Switch), Slider, Segmented — plus Checkbox,
 * Select, RadioGroup and NumberField.
 */
test.describe("Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/controls");
    await page.getByRole("switch", { name: "Watching" }).waitFor();
  });

  test("has no accessibility violations (axe)", { tag: "@mobile" }, async ({ page }) => {
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Switch toggles on keyboard (Space)", async ({ page }) => {
    const sw = page.getByRole("switch", { name: "Do not disturb" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.focus();
    await page.keyboard.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", "true");
  });

  test("Slider moves on keyboard (ArrowRight)", async ({ page }) => {
    const slider = page.getByRole("slider", { name: "Level" });
    await expect(slider).toHaveAttribute("aria-valuenow", "70");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "71");
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "72");
  });

  test("Segmented selects on keyboard (ArrowRight)", async ({ page }) => {
    const focus = page.getByRole("radio", { name: "Focus" });
    const brk = page.getByRole("radio", { name: "Break" });
    await expect(focus).toHaveAttribute("aria-checked", "true");
    await focus.focus();
    await page.keyboard.press("ArrowRight");
    await expect(brk).toHaveAttribute("aria-checked", "true");
    await expect(focus).toHaveAttribute("aria-checked", "false");
  });

  test("Field accepts typed input", async ({ page }) => {
    const input = page.getByRole("textbox", { name: "Label" });
    await input.fill("hello");
    await expect(input).toHaveValue("hello");
  });

  test("Checkbox toggles on keyboard (Space)", async ({ page }) => {
    const box = page.getByRole("checkbox", { name: "I agree to the terms" });
    await expect(box).toHaveAttribute("aria-checked", "false");
    await box.focus();
    await page.keyboard.press("Space");
    await expect(box).toHaveAttribute("aria-checked", "true");
  });

  test("Select opens and picks an option", async ({ page }) => {
    const trigger = page.getByRole("combobox", { name: "Session length" });
    await expect(trigger).toContainText("25 minutes");
    await trigger.click();
    await page.getByRole("option", { name: "50 minutes" }).click();
    await expect(trigger).toContainText("50 minutes");
  });

  test("RadioGroup moves selection with the arrow keys", async ({ page }) => {
    const line = page.getByRole("radio", { name: "Line out" });
    const phones = page.getByRole("radio", { name: "Headphones" });
    await expect(line).toHaveAttribute("aria-checked", "true");
    await line.focus();
    await page.keyboard.press("ArrowRight");
    await expect(phones).toHaveAttribute("aria-checked", "true");
    await expect(line).toHaveAttribute("aria-checked", "false");
  });

  test("RadioGroup exposes the group's own name, not just the options", async ({ page }) => {
    // Naming only the items says what the choices are but never the question.
    await expect(page.getByRole("radiogroup", { name: "Output routing" })).toBeVisible();
  });

  test("NumberField steps with the caps and the keyboard, and clamps", async ({ page }) => {
    const tempo = page.getByRole("textbox", { name: "Tempo" });
    await expect(tempo).toHaveValue("120");

    await page.getByRole("button", { name: "Increase" }).first().click();
    await expect(tempo).toHaveValue("121");

    await tempo.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(tempo).toHaveValue("119");

    // max is 240; holding shift steps by largeStep and must not overshoot it.
    await tempo.fill("239");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(tempo).toHaveValue("240");
  });

  test("NumberField step caps are named for screen readers", async ({ page }) => {
    // They ship as − and +, which announce as punctuation without a label.
    await expect(page.getByRole("button", { name: "Increase" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Decrease" }).first()).toBeVisible();
  });
});

/**
 * The assertions are about the things that make each item worth
 * being its own component: that the Textarea's height comes from the browser's
 * layout rather than a newline count, and that the palette matches on words it
 * never displays.
 */
test.describe("Textarea", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/controls");
    await page.getByTestId("autosizing").waitFor();
  });

  // Layout height, not the painted rect: the well sinks a fraction
  // of a pixel while focused, and the transform nudged the rect's height by a
  // rounding error, which failed "stays put" now and then.
  const heightOf = (page: import("@playwright/test").Page, id: string) =>
    page.locator(`[data-testid="${id}"]`).evaluate((el) => parseFloat(getComputedStyle(el).height));

  test("grows with the content and shrinks back", async ({ page }) => {
    const area = page.getByTestId('autosizing');
    const start = await heightOf(page, "autosizing");

    await area.fill("one\ntwo\nthree\nfour\nfive\nsix");
    const grown = await heightOf(page, "autosizing");
    expect(grown).toBeGreaterThan(start);

    // Shrinking is the half that a naive implementation gets wrong: scrollHeight
    // never reports smaller than the box unless the box is collapsed first.
    await area.fill("one");
    expect(await heightOf(page, "autosizing")).toBeLessThan(grown);
  });

  test("grows on WRAP, not just on newlines", async ({ page }) => {
    const area = page.getByTestId('autosizing');
    const start = await heightOf(page, "autosizing");

    // One line, no newline character in it at all.
    await area.fill("word ".repeat(120));
    expect(await heightOf(page, "autosizing")).toBeGreaterThan(start);
  });

  test("maxRows caps the growth and scrolls instead", async ({ page }) => {
    const area = page.getByTestId('capped');
    await area.fill(Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n"));

    const { height, scrollHeight, overflowY } = await area.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      scrollHeight: el.scrollHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(scrollHeight).toBeGreaterThan(height);
    expect(overflowY).toBe("auto");
    expect(height).toBeLessThan(160);
  });

  test("autosize={false} stays put", async ({ page }) => {
    const before = await heightOf(page, "fixed");
    await page.getByTestId('fixed').fill("a\nb\nc\nd\ne\nf\ng\nh");
    expect(await heightOf(page, "fixed")).toBe(before);
  });

  test("the visible label names the control", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: "Session note" })).toBeVisible();
  });
});

test.describe("Command", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/controls");
    await page.getByTestId("open-palette").waitFor();
  });

  test("opens on the global shortcut and closes on Escape", async ({ page }) => {
    // Focus is on the page, not on the trigger — the whole point of a palette.
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("combobox", { name: "Search commands" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox", { name: "Search commands" })).toHaveCount(0);
  });

  test("matches on hidden keywords, not just labels", async ({ page }) => {
    await page.getByTestId("open-palette").click();
    const input = page.getByRole("combobox", { name: "Search commands" });

    // "trash" appears nowhere on screen; it is a keyword of "Delete take".
    await input.fill("trash");
    await expect(page.getByRole("option", { name: /Delete take/ })).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(1);
  });

  test("a group with no matches disappears rather than heading nothing", async ({ page }) => {
    await page.getByTestId("open-palette").click();
    await page.getByRole("combobox", { name: "Search commands" }).fill("theme");

    await expect(page.getByText("Navigate", { exact: true })).toBeVisible();
    await expect(page.getByText("Take", { exact: true })).toHaveCount(0);
  });

  test("Enter runs the first match without an arrow press", async ({ page }) => {
    await page.getByTestId("open-palette").click();
    await page.getByRole("combobox", { name: "Search commands" }).fill("recording");
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("ran")).toHaveText("rec");
    // The palette closes before the command runs, so a command that opens
    // another surface does not race this one's exit.
    await expect(page.getByRole("combobox", { name: "Search commands" })).toHaveCount(0);
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.getByTestId("open-palette").click();
    await page.getByRole("combobox", { name: "Search commands" }).fill("xyzzy");
    await expect(page.getByText("No commands match.")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("no accessibility violations while open", { tag: "@mobile" }, async ({ page }) => {
    await page.getByTestId("open-palette").click();
    await expect(page.getByRole("combobox", { name: "Search commands" })).toBeVisible();
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector(".echo-command__popup")!).opacity === "1",
    );
    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
