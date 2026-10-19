import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The objects: whole small devices and the instruments they're made of.
 * SegmentDisplay, Tuner, Keypad, FilterTray, StatusIsland, Creature and
 * Receipt, driven on their docs pages.
 */
const preview = (page: Page) => page.getByTestId("preview");

test.describe("SegmentDisplay", () => {
  test("the reading is said once, as it is, with its unit; the face is drawing", async ({ page }) => {
    await page.goto("/docs/segment-display");
    const freq = preview(page).getByRole("group", { name: "Frequency", exact: true });
    await expect(freq).toContainText("88.5 MHz");
    await expect(freq.locator("svg")).toHaveAttribute("aria-hidden", "true");
    // Four digits wide: one dim padding zero, and the dark segments under the rest.
    await expect(freq.locator('[data-state="dim"]')).toHaveCount(6);
    expect(await freq.locator('[data-state="off"]').count()).toBeGreaterThan(0);
  });

  test("ghost segments can be switched off", async ({ page }) => {
    await page.goto("/docs/segment-display", { waitUntil: "networkidle" });
    const freq = preview(page).getByRole("group", { name: "Frequency", exact: true });
    const fill = () => freq.locator('[data-state="off"]').first().evaluate((el) => getComputedStyle(el).fill);
    expect(await fill()).not.toBe("rgba(0, 0, 0, 0)");
    await preview(page).getByRole("switch", { name: "Ghost segments" }).click();
    await expect.poll(fill).toBe("rgba(0, 0, 0, 0)");
  });

  test("visual: segment displays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/segment-display");
    await expect(preview(page)).toHaveScreenshot("segment-displays.png");
  });
});

test.describe("Tuner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/tuner", { waitUntil: "networkidle" });
  });

  test("a named slider with its unit in words, and every slider key", async ({ page }) => {
    const weight = preview(page).getByRole("slider", { name: "Weight" });
    await expect(weight).toHaveAttribute("aria-valuetext", "72.5 kg");
    await weight.focus();
    await page.keyboard.press("ArrowRight");
    await expect(weight).toHaveAttribute("aria-valuenow", "73");
    await page.keyboard.press("PageDown");
    await expect(weight).toHaveAttribute("aria-valuenow", "68");
    await page.keyboard.press("End");
    await expect(weight).toHaveAttribute("aria-valuenow", "150");
    await page.keyboard.press("Home");
    await expect(weight).toHaveAttribute("aria-valuenow", "30");
  });

  test("dragging moves the scale with the hand; a value from outside travels there", async ({ page }) => {
    const weight = preview(page).getByRole("slider", { name: "Weight" });
    const b = (await weight.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    // Slowly, so it lands where the hand left it rather than coasting on.
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(b.x + b.width / 2 - i * 5, b.y + b.height / 2);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(weight).toHaveAttribute("aria-valuenow", "75");
    await preview(page).getByRole("button", { name: "95 kg" }).click();
    await expect(weight).toHaveAttribute("aria-valuenow", "95");
  });

  test("visual: tuners", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("tuners.png");
  });
});

test.describe("Keypad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/keypad", { waitUntil: "networkidle" });
  });

  test("an amount fills from the right, typed on keys or on the keyboard", async ({ page }) => {
    const pad = preview(page).getByRole("group", { name: "Split the bill" });
    const said = pad.locator(".echo-keypad__said");
    await expect(said).toHaveText("$12.40");
    await pad.getByRole("button", { name: "Delete" }).click();
    await expect(said).toHaveText("$1.24");
    await page.keyboard.type("5");
    await expect(said).toHaveText("$12.45");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await expect(said).toHaveText("$0.00");
    await expect(preview(page).getByRole("button", { name: "Enter an amount" })).toBeDisabled();
  });

  test("one tab stop, arrows between keys, and a typed key goes down on screen", async ({ page }) => {
    const pad = preview(page).getByRole("group", { name: "Split the bill" });
    const tabbable = await pad.locator(".echo-keypad__keys button").evaluateAll((els) => els.filter((b) => (b as HTMLButtonElement).tabIndex === 0).length);
    expect(tabbable).toBe(1);
    await pad.getByRole("button", { name: "1", exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(pad.getByRole("button", { name: "4", exact: true })).toBeFocused();
    const seven = pad.getByRole("button", { name: "7", exact: true });
    const y = () => seven.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    const rest = await y();
    await page.keyboard.down("7");
    await expect.poll(y).toBeGreaterThan(rest);
    await page.keyboard.up("7");
  });

  test("a PIN says how many digits are in, never which, and calls back when full", async ({ page }) => {
    const pin = preview(page).getByRole("group", { name: "Passcode" });
    await pin.getByRole("button", { name: "4", exact: true }).click();
    await page.keyboard.type("82");
    await expect(pin.locator(".echo-keypad__said")).toHaveText("3 of 4 digits entered");
    await page.keyboard.type("1");
    await expect(preview(page).getByText("Unlocked")).toBeVisible();
  });

  test("a typed digit sends no Space of its own, and its key still goes down", async ({ page }) => {
    const pad = preview(page).getByRole("group", { name: "Split the bill" });
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { keys: string[] }).keys = seen;
      document.addEventListener("keydown", (e) => seen.push(e.key));
    });
    await pad.getByRole("button", { name: "1", exact: true }).focus();
    const seven = pad.getByRole("button", { name: "7", exact: true });
    const y = () => seven.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    const rest = await y();
    await page.keyboard.down("7");
    await expect.poll(y).toBeGreaterThan(rest);
    await page.keyboard.up("7");
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toEqual(["7"]);
  });

  test("a key typed on the keyboard stays down while it's held, and comes up when it's let go", async ({ page }) => {
    const pad = preview(page).getByRole("group", { name: "Split the bill" });
    await pad.getByRole("button", { name: "1", exact: true }).focus();
    const seven = pad.getByRole("button", { name: "7", exact: true });
    const y = () => seven.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    const rest = await y();
    await page.keyboard.down("7");
    // Held well past a tap: it was drawn down for 90ms and let up while the finger stayed on the key.
    await page.waitForTimeout(400);
    expect(await y()).toBeGreaterThan(rest);
    await page.keyboard.up("7");
    await expect.poll(async () => Math.abs((await y()) - rest)).toBeLessThan(0.5);
  });

  test("focusing the pad itself hands focus to a key, so the arrows work", async ({ page }) => {
    const pad = preview(page).getByRole("group", { name: "Split the bill" });
    await pad.evaluate((el) => (el as HTMLElement).focus());
    await expect(pad.getByRole("button", { name: "1", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(pad.getByRole("button", { name: "2", exact: true })).toBeFocused();
  });

  test("visual: keypads", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("keypads.png");
  });
});

test.describe("FilterTray", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/filter-tray", { waitUntil: "networkidle" });
  });

  test("pads are pressed buttons, and the action counts them", async ({ page }) => {
    const tray = preview(page).getByRole("group", { name: "Places", exact: true });
    const nearby = tray.getByRole("button", { name: "Nearby" });
    await expect(nearby).toHaveAttribute("aria-pressed", "false");
    await nearby.click();
    await expect(nearby).toHaveAttribute("aria-pressed", "true");
    await expect(tray.getByRole("button", { name: "Filter: 3 filters" })).toBeVisible();
  });

  test("applying folds the pads into one key that says what's on; Escape brings them back", async ({ page }) => {
    const tray = preview(page).getByRole("group", { name: "Places", exact: true });
    await tray.getByRole("button", { name: /^Filter/ }).click();
    const key = tray.getByRole("button", { name: "2 filters: Open now, Top rated. Change filters" });
    await expect(key).toBeVisible();
    await expect(tray.getByRole("button", { name: "Nearby" })).toHaveCount(0);
    await expect(tray.locator(".echo-morph__status")).toHaveText("2 filters on: Open now, Top rated");
    await key.focus();
    await page.keyboard.press("Escape");
    await expect(tray.getByRole("button", { name: "Nearby" })).toBeVisible();
  });

  test("after the pads are cleared from outside, a pad lights without folding the tray", async ({ page }) => {
    const tray = preview(page).getByRole("group", { name: "Places", exact: true });
    await tray.getByRole("button", { name: /^Filter/ }).click();
    await expect(tray.getByRole("button", { name: "Nearby" })).toHaveCount(0);
    await preview(page).getByRole("button", { name: "Clear filters" }).click();
    const nearby = tray.getByRole("button", { name: "Nearby" });
    await expect(nearby).toBeVisible();
    await nearby.click();
    await expect(nearby).toHaveAttribute("aria-pressed", "true");
    await expect(tray.getByRole("button", { name: "Filter: 1 filter" })).toBeVisible();
  });

  test("visual: filter trays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("filter-trays.png");
  });
});

test.describe("StatusIsland", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/status-island", { waitUntil: "networkidle" });
  });

  test("the pill opens and closes the detail, and Escape puts focus back on it", async ({ page }) => {
    const pill = preview(page).getByRole("button", { name: /Exporting/ });
    await expect(pill).toHaveAttribute("aria-expanded", "false");
    await pill.click();
    await expect(pill).toHaveAttribute("aria-expanded", "true");
    await expect(preview(page).getByText("Q3 report.pdf")).toBeVisible();
    await expect(preview(page).getByRole("progressbar", { name: "Q3 report.pdf" })).toBeVisible();
    await preview(page).getByRole("button", { name: "Cancel" }).focus();
    await page.keyboard.press("Escape");
    await expect(pill).toHaveAttribute("aria-expanded", "false");
    await expect(pill).toBeFocused();
  });

  test("it says when the work stops, once", async ({ page }) => {
    await preview(page).getByRole("button", { name: /Exporting/ }).click();
    await preview(page).getByRole("button", { name: "Cancel" }).click();
    await expect(preview(page).locator(".echo-status-island__said").first()).toHaveText("Q3 report.pdf: failed");
  });

  test("it opens wider first, then taller", async ({ page }) => {
    const slab = preview(page).locator(".echo-status-island__slab").first();
    // Every frame's size while it opens, measured in the page so no frame is missed.
    const frames = slab.evaluate(
      (el) =>
        new Promise<{ w: number; h: number }[]>((done) => {
          const seen: { w: number; h: number }[] = [];
          const start = performance.now();
          const tick = () => {
            const r = el.getBoundingClientRect();
            seen.push({ w: r.width, h: r.height });
            if (performance.now() - start < 900) requestAnimationFrame(tick);
            else done(seen);
          };
          requestAnimationFrame(tick);
        }),
    );
    await preview(page).getByRole("button", { name: /Exporting/ }).click();
    const sizes = await frames;
    const first = sizes[0]!;
    const last = sizes.at(-1)!;
    const wide = sizes.findIndex((s) => s.w - first.w > (last.w - first.w) * 0.5);
    const tall = sizes.findIndex((s) => s.h - first.h > (last.h - first.h) * 0.5);
    expect(wide).toBeGreaterThanOrEqual(0);
    expect(tall, "it's half as wide as it will be before it's half as tall").toBeGreaterThan(wide);
  });

  test("the pill's name carries its reading, and it holds only phrasing content", async ({ page }) => {
    await expect(preview(page).getByRole("button", { name: /^Exporting \d+%$/ })).toBeVisible();
    await expect(preview(page).getByRole("button", { name: "Recording 04:59", exact: true })).toBeVisible();
    await expect(preview(page).locator(".echo-status-island__pill div")).toHaveCount(0);
  });

  /**
   * Named "Exporting 42%", the pill read "Exporting42%": its label and its reading sat
   * against each other with nothing between, so the words it shows weren't in its name, and voice
   * control couldn't press it by them (WCAG 2.5.3, axe-core 4.14's label-content-name-mismatch).
   */
  test("the pill's name holds the words it shows", async ({ page }) => {
    const results = await axe(page).include(".echo-status-island").withRules(["label-content-name-mismatch"]).analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.html))).toEqual([]);
  });

  test("visual: status island at rest", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page).locator(".echo-status-island").nth(1)).toHaveScreenshot("status-island.png");
  });
});

test.describe("Creature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/creature", { waitUntil: "networkidle" });
  });

  test("it's hidden from assistive tech: the words beside it carry the state", async ({ page }) => {
    const creatures = preview(page).locator(".echo-creature");
    expect(await creatures.count()).toBeGreaterThan(2);
    for (const c of await creatures.all()) await expect(c).toHaveAttribute("aria-hidden", "true");
    await preview(page).getByRole("radio", { name: "Error" }).click();
    await expect(preview(page).getByText("Couldn't reach the server")).toBeVisible();
  });

  test("the vector creature breathes and drifts; reduced motion holds it still", async ({ page }) => {
    const drift = preview(page).locator(".echo-creature__svg > g").first();
    await expect.poll(() => drift.getAttribute("transform")).not.toBeNull();
    const a = await drift.getAttribute("transform");
    await page.waitForTimeout(400);
    expect(await drift.getAttribute("transform")).not.toBe(a);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    const still = preview(page).locator(".echo-creature__svg > g").first();
    const b = await still.getAttribute("transform");
    await page.waitForTimeout(400);
    expect(await still.getAttribute("transform")).toBe(b);
  });

  test("a character of your own is drawn in dots from its paths", async ({ page }) => {
    const dots = preview(page).locator('.echo-creature[data-variant="dots"] canvas').last();
    await expect.poll(() => dots.evaluate((c) => (c as HTMLCanvasElement).width)).toBeGreaterThan(100);
  });

  test("visual: creatures", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(preview(page)).toHaveScreenshot("creatures.png");
  });
});

test.describe("Receipt", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/receipt", { waitUntil: "networkidle" });
  });

  test("a heading, its lines as a list, and a total: all in the page from the start", async ({ page }) => {
    const receipt = preview(page).getByRole("region", { name: "North Street Coffee" });
    await expect(receipt.getByRole("heading", { name: "North Street Coffee" })).toBeVisible();
    await expect(receipt.locator("dt")).toHaveCount(5);
    await expect(receipt.locator("dd").last()).toHaveText("$17.60");
    await expect(receipt.locator("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(receipt.getByText("4821-0925")).toBeVisible();
  });

  test("printing again feeds it out of the slot, then it rests whole", async ({ page }) => {
    await preview(page).getByRole("button", { name: "Print again" }).click();
    const feed = preview(page).locator(".echo-receipt__feed");
    await expect(feed).toHaveAttribute("data-printing", "");
    await expect(feed).not.toHaveAttribute("data-printing", "", { timeout: 5000 });
  });

  test("tearing it off drops it and runs onTear", async ({ page }) => {
    await preview(page).getByRole("button", { name: "Tear off" }).click();
    await expect(preview(page).locator(".echo-receipt")).toHaveCount(0);
  });

  test("printing again mid-print restarts one feed, not two", async ({ page }) => {
    const again = preview(page).getByRole("button", { name: "Print again" });
    const feed = preview(page).locator(".echo-receipt__feed");
    await again.click();
    await expect(feed).toHaveAttribute("data-printing", "");
    // Every frame's feed, measured in the page so no frame is missed.
    const shown = feed.evaluate(
      (el) =>
        new Promise<number[]>((done) => {
          const seen: number[] = [];
          const start = performance.now();
          const tick = () => {
            const v = parseFloat((el as HTMLElement).style.getPropertyValue("--receipt-shown"));
            if (!Number.isNaN(v) && v !== seen.at(-1)) seen.push(v);
            if (performance.now() - start < 1800) requestAnimationFrame(tick);
            else done(seen);
          };
          requestAnimationFrame(tick);
        }),
    );
    await page.waitForTimeout(150);
    await again.click();
    const values = await shown;
    const drops = values.filter((v, i) => i > 0 && v < values[i - 1]!).length;
    expect(drops, `the paper only goes back into the slot once, to restart: ${values.join(", ")}`).toBeLessThanOrEqual(1);
    await expect(feed).not.toHaveAttribute("data-printing", "", { timeout: 5000 });
  });

  test("visual: receipt", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("receipt.png");
  });
});

/**
 * Effects can run again on a component that stays mounted: StrictMode does
 * it to every effect in development, and <Activity> does it when a hidden
 * part is shown. The unmount half cancelled the next feed step, the second
 * run didn't print, and the paper stayed in the slot for good, so a Receipt
 * in any dev build arrived blank (fixture: apps/www/app/checks/receipt-remount).
 */
test("a Receipt whose effects run again mid-print still comes out whole", async ({ page }) => {
  await page.goto("/checks/receipt-remount", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Print" }).click();
  const feed = page.locator(".echo-receipt__feed");
  await expect(feed).toHaveAttribute("data-printing", "");
  // Hidden and shown again while it's still feeding.
  await page.getByRole("button", { name: "Hide" }).click();
  await page.getByRole("button", { name: "Show" }).click();

  await expect(feed).not.toHaveAttribute("data-printing", "", { timeout: 5000 });
  const paper = page.locator(".echo-receipt__paper");
  // Resting whole: the window it feeds through is as tall as the paper.
  await expect
    .poll(async () => ((await feed.boundingBox())?.height ?? 0) - ((await paper.boundingBox())?.height ?? 1))
    .toBeGreaterThanOrEqual(-1);
});

test.describe("DateTile", () => {
  test("one date, said in full; the day turns over when it changes", async ({ page }) => {
    await page.goto("/docs/date-tile", { waitUntil: "networkidle" });
    const big = preview(page).locator("time.echo-date-tile").first();
    await expect(big).toHaveAttribute("datetime", "2026-09-25");
    await expect(big.locator(".echo-date-tile__said")).toHaveText("Friday, September 25, 2026");
    await preview(page).getByRole("button", { name: "Turn the page" }).click();
    await expect(big).toHaveAttribute("datetime", "2026-10-08");
    await expect(big.locator(".echo-date-tile__said")).toHaveText("Thursday, October 8, 2026");
  });

  test("visual: date tiles", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/date-tile");
    await expect(preview(page)).toHaveScreenshot("date-tiles.png");
  });
});

test.describe("WeekStrip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/week-strip", { waitUntil: "networkidle" });
  });

  test("a radio group of days, each named with its full date", async ({ page }) => {
    const days = preview(page).getByRole("radiogroup", { name: "Days, week of September 21" });
    await expect(days.getByRole("radio")).toHaveCount(7);
    const today = days.getByRole("radio", { name: "Friday, September 25, today" });
    await expect(today).toHaveAttribute("aria-checked", "true");
    await days.getByRole("radio", { name: "Tuesday, September 22, has events" }).click();
    await expect(preview(page).getByText("Chosen: 2026-09-22")).toBeVisible();
  });

  test("the week keys move a week, keeping the weekday", async ({ page }) => {
    await preview(page).getByRole("button", { name: "Week after September 21" }).click();
    await expect(preview(page).getByText("Chosen: 2026-10-02")).toBeVisible();
    await expect(preview(page).getByRole("radiogroup", { name: "Days, week of September 28" })).toBeVisible();
  });

  test("visual: week strip", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("week-strip.png");
  });
});

test.describe("DescriptionList", () => {
  test("a real description list, on the page and on a screen", async ({ page }) => {
    await page.goto("/docs/description-list");
    const lists = preview(page).locator("dl");
    await expect(lists).toHaveCount(2);
    await expect(lists.first().locator("dt")).toHaveText(["Order", "Placed", "Ship to"]);
    await expect(lists.last().locator("dd").first()).toHaveText("89%");
  });

  test("visual: description lists", async ({ page }) => {
    await page.goto("/docs/description-list");
    await expect(preview(page)).toHaveScreenshot("description-lists.png");
  });
});

test.describe("SwitchBank", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/switch-bank", { waitUntil: "networkidle" });
  });

  test("each switch is named by its column and row, and a column's checkbox flips it all", async ({ page }) => {
    const table = preview(page).getByRole("table", { name: "Notifications" });
    const pushReplies = table.getByRole("switch", { name: "Push, Replies" });
    await expect(pushReplies).not.toBeChecked();
    await pushReplies.click();
    await expect(pushReplies).toBeChecked();
    const allSms = table.getByRole("checkbox", { name: "All SMS" });
    await allSms.click();
    for (const row of ["Mentions", "Replies", "Weekly digest", "Security alerts"]) {
      await expect(table.getByRole("switch", { name: `SMS, ${row}` })).toBeChecked();
    }
  });

  test("visual: switch bank", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("switch-bank.png");
  });
});

test.describe("JogWheel", () => {
  test("a spin button that steps by key, ten with Shift, and stays inside its ends", async ({ page }) => {
    await page.goto("/docs/jog-wheel", { waitUntil: "networkidle" });
    const ev = preview(page).getByRole("spinbutton", { name: "Exposure" });
    await expect(ev).toHaveAttribute("aria-valuetext", "0.0 EV");
    await ev.focus();
    await page.keyboard.press("ArrowUp");
    await expect(ev).toHaveAttribute("aria-valuenow", "0.1");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(ev).toHaveAttribute("aria-valuenow", "1.1");
    await page.keyboard.press("End");
    await expect(ev).toHaveAttribute("aria-valuetext", "+3.0 EV");
    const position = preview(page).getByRole("spinbutton", { name: "Position" });
    await expect(position).not.toHaveAttribute("aria-valuemax", /.+/);
  });

  test("a twitch near the hub doesn't spin the value", async ({ page }) => {
    await page.goto("/docs/jog-wheel", { waitUntil: "networkidle" });
    const wheel = preview(page).getByRole("spinbutton", { name: "Position" });
    const start = Number(await wheel.getAttribute("aria-valuenow"));
    const box = (await wheel.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx + 2, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 2);
    await page.mouse.move(cx - 2, cy);
    await page.mouse.move(cx, cy - 2);
    await page.mouse.up();
    const now = Number(await wheel.getAttribute("aria-valuenow"));
    expect(Math.abs(now - start), `moved from ${start} to ${now}`).toBeLessThanOrEqual(1);
  });

  test("a sideways swipe turns it the right way, and a small scroll moves it a little", async ({ page }) => {
    await page.goto("/docs/jog-wheel", { waitUntil: "networkidle" });
    const wheel = preview(page).getByRole("spinbutton", { name: "Position" });
    const now = async () => Number(await wheel.getAttribute("aria-valuenow"));
    await wheel.focus();
    await wheel.hover();
    const start = await now();
    for (let i = 0; i < 10; i++) await page.mouse.wheel(3, 0);
    expect(await now(), "a small swipe to the right never steps it down").toBeGreaterThanOrEqual(start);
    const mid = await now();
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -3);
    expect((await now()) - mid, "thirty pixels of scroll is a nudge, not ten steps").toBeLessThanOrEqual(2);
    const before = await now();
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -100);
    expect(await now(), "a real scroll up turns it up").toBeGreaterThan(before);
  });

  test("visual: jog wheels", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/jog-wheel");
    await expect(preview(page)).toHaveScreenshot("jog-wheels.png");
  });
});

test.describe("QuickTile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/quick-tile", { waitUntil: "networkidle" });
  });

  test("a switch named by its label, described by its state, with details on their own key", async ({ page }) => {
    const wifi = preview(page).getByRole("switch", { name: "Wi-Fi" });
    await expect(wifi).toHaveAttribute("aria-checked", "true");
    await expect(wifi).toHaveAccessibleDescription("Home network");
    await wifi.click();
    await expect(wifi).toHaveAttribute("aria-checked", "false");
    await preview(page).getByRole("button", { name: "Wi-Fi settings" }).click();
    await expect(preview(page).getByText("Wi-Fi settings would open here.")).toBeVisible();
  });

  test("visual: quick tiles", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("quick-tiles.png");
  });
});

test.describe("FillSlider", () => {
  test("a vertical slider named by its label, said as a percent", async ({ page }) => {
    await page.goto("/docs/fill-slider", { waitUntil: "networkidle" });
    const brightness = preview(page).getByRole("slider", { name: "Brightness" });
    await expect(brightness).toHaveAttribute("aria-orientation", "vertical");
    await expect(brightness).toHaveAttribute("aria-valuetext", "70%");
    await brightness.focus();
    await page.keyboard.press("ArrowUp");
    await expect(preview(page).getByText("Brightness 71%")).toBeVisible();
    await page.keyboard.press("Home");
    await expect(brightness).toHaveAttribute("aria-valuenow", "0");
  });

  test("visual: fill sliders", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/fill-slider");
    await expect(preview(page)).toHaveScreenshot("fill-sliders.png");
  });
});

test.describe("PatchBay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/patch-bay", { waitUntil: "networkidle" });
  });

  test("a Select per source is the control, and the cables draw what they say", async ({ page }) => {
    const bay = preview(page).getByRole("group", { name: "Import columns" });
    await expect(bay.locator(".echo-patch-bay__cables path[data-link]")).toHaveCount(3);
    const phone = bay.getByRole("combobox", { name: "Phone no. goes to" });
    await phone.click();
    await page.getByRole("option", { name: "Telephone" }).click();
    await expect(bay.locator(".echo-patch-bay__cables path[data-link]")).toHaveCount(4);
    await expect(bay.locator('path[data-from="phone"]')).toHaveAttribute("d", /^M/);
  });

  test("a cable can be pulled from a source's socket to a target's", async ({ page }) => {
    const bay = preview(page).getByRole("group", { name: "Import columns" });
    const from = (await bay.locator('[data-source="phone"]').boundingBox())!;
    const to = (await bay.locator('[data-target="notes"]').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(bay.getByRole("combobox", { name: "Phone no. goes to" })).toHaveText(/Notes/);
  });

  test("visual: patch bay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(preview(page)).toHaveScreenshot("patch-bay.png");
  });
});

test.describe("Annunciator", () => {
  test("says which marks are on, in words", async ({ page }) => {
    await page.goto("/docs/annunciator", { waitUntil: "networkidle" });
    const status = preview(page).getByRole("group", { name: "Status" });
    await expect(status.locator(".echo-annunciator__said")).toHaveText("Recording, Syncing");
    await preview(page).getByRole("button", { name: "Mute" }).click();
    await expect(status.locator(".echo-annunciator__said")).toHaveText("Recording, Syncing, Muted");
  });

  test("visual: annunciator", async ({ page }) => {
    await page.goto("/docs/annunciator");
    await expect(preview(page)).toHaveScreenshot("annunciator.png");
  });
});

test.describe("Ticket", () => {
  test("using it tears the stub off and says Used", async ({ page }) => {
    await page.goto("/docs/ticket", { waitUntil: "networkidle" });
    const ticket = preview(page).getByRole("region", { name: "Night Session" });
    await expect(ticket.getByText("NS-3010-0412")).toBeVisible();
    await ticket.getByRole("button", { name: "Use ticket" }).click();
    await expect(ticket.getByText("Used", { exact: true })).toBeVisible();
    await expect(ticket.getByRole("button", { name: "Use ticket" })).toHaveCount(0);
  });

  test("visual: ticket", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/ticket");
    await expect(preview(page)).toHaveScreenshot("ticket.png");
  });
});

test.describe("NowPlaying", () => {
  test("play is one key that says what it'll do; the position is a slider", async ({ page }) => {
    await page.goto("/docs/now-playing", { waitUntil: "networkidle" });
    const player = preview(page).getByRole("region", { name: "Now playing: Night Drive" });
    await player.getByRole("button", { name: "Play" }).click();
    await expect(player.getByRole("button", { name: "Pause" })).toBeVisible();
    await player.getByRole("button", { name: "Next" }).click();
    await expect(preview(page).getByRole("region", { name: "Now playing: Glass Garden" })).toBeVisible();
    await expect(preview(page).getByRole("slider", { name: "Position" }).first()).toHaveAttribute("max", "187");
  });

  test("visual: now playing", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/now-playing");
    await expect(preview(page)).toHaveScreenshot("now-playing.png");
  });
});

test.describe("Perch", () => {
  test("the creature is hidden and never covers what it sits on", async ({ page }) => {
    await page.goto("/docs/perch", { waitUntil: "networkidle" });
    const perch = preview(page).locator(".echo-perch").first();
    await expect(perch.locator(".echo-perch__ledge")).toHaveAttribute("aria-hidden", "true");
    const ledge = (await perch.locator(".echo-creature").boundingBox())!;
    const card = (await perch.locator(".echo-card").boundingBox())!;
    expect(ledge.y).toBeLessThan(card.y);
    await expect(perch.getByRole("heading", { name: "Welcome" })).toBeVisible();
  });

  test("visual: perch", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/perch");
    await expect(preview(page)).toHaveScreenshot("perch.png");
  });
});

test.describe("ShortcutMap", () => {
  test("the list is the content; pointing at a shortcut lights its keys on the board", async ({ page }) => {
    await page.goto("/docs/shortcut-map", { waitUntil: "networkidle" });
    const list = preview(page).getByRole("list", { name: "Keyboard shortcuts" });
    await expect(list.getByRole("listitem")).toHaveCount(6);
    await expect(preview(page).locator(".echo-shortcut-map__board")).toHaveAttribute("aria-hidden", "true");
    await list.getByRole("listitem").first().hover();
    await expect(preview(page).locator(".echo-shortcut-map__slot[data-lit]")).toHaveCount(3);
  });

  test("pressing a real key presses its cap on the board", async ({ page }) => {
    await page.goto("/docs/shortcut-map", { waitUntil: "networkidle" });
    const k = preview(page).locator(".echo-shortcut-map__board .echo-kbd", { hasText: /^K$/ });
    const press = () => k.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--press")) || 0);
    expect(await press()).toBe(0);
    await page.keyboard.down("k");
    await expect.poll(press).toBeGreaterThan(0);
    await page.keyboard.up("k");
  });

  test("visual: shortcut map", async ({ page }) => {
    await page.goto("/docs/shortcut-map");
    await expect(preview(page)).toHaveScreenshot("shortcut-map.png");
  });
});

test.describe("WidgetGrid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/widget-grid", { waitUntil: "networkidle" });
  });

  test("arranging gives each widget a Move key that moves it by arrow, and says where", async ({ page }) => {
    const grid = preview(page).getByRole("region", { name: "Home" });
    await expect(grid.getByRole("button", { name: "Move Today", exact: true })).toHaveCount(0);
    await grid.getByRole("button", { name: "Arrange Home" }).click();
    const move = grid.getByRole("button", { name: "Move Today", exact: true });
    await move.focus();
    await page.keyboard.press("ArrowRight");
    await expect(grid.getByRole("status")).toHaveText("Today moved to place 2 of 5");
    await expect(grid.getByRole("listitem").nth(1)).toContainText("Fri");
    await grid.getByRole("button", { name: "Remove Latency" }).click();
    await expect(grid.getByRole("listitem")).toHaveCount(4);
    await grid.getByRole("button", { name: "Done arranging Home" }).click();
    await expect(grid.getByRole("button", { name: "Move Today", exact: true })).toHaveCount(0);
  });

  test("a widget dragged onto another takes its place once, not back and forth", async ({ page }) => {
    const grid = preview(page).getByRole("region", { name: "Home" });
    await grid.getByRole("button", { name: "Arrange Home" }).click();
    const order = () => grid.locator(".echo-widget-grid__keys button[aria-label^='Move ']").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!.slice(5)).join(","));
    const start = await order();
    const key = (await grid.getByRole("button", { name: "Move Latency", exact: true }).boundingBox())!;
    const target = (await grid.getByRole("listitem").nth(2).boundingBox())!;
    await page.mouse.move(key.x + key.width / 2, key.y + key.height / 2);
    await page.mouse.down();
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    await page.mouse.move(tx, ty, { steps: 8 });
    const changes: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(tx + (i % 2), ty);
      const o = await order();
      if (o !== changes.at(-1)) changes.push(o);
    }
    await page.mouse.up();
    expect(changes, "the order settles on one arrangement while the hand holds still").toHaveLength(1);
    expect(changes[0], "and that arrangement is a new one").not.toBe(start);
    expect(await order()).toBe("Today,Uptime,Latency,Frequency,Status");
  });

  test("a widget moved again mid-slide carries on from where it is", async ({ page }) => {
    const grid = preview(page).getByRole("region", { name: "Home" });
    await grid.getByRole("button", { name: "Arrange Home" }).click();
    const jump = await grid.getByRole("button", { name: "Move Today", exact: true }).evaluate(async (btn) => {
      const press = () => btn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const slot = btn.closest("li")!;
      const index = () => [...slot.parentElement!.children].indexOf(slot);
      press();
      await new Promise((r) => setTimeout(r, 90));
      const before = slot.getBoundingClientRect().left;
      const was = index();
      press();
      for (let i = 0; i < 20 && index() === was; i++) await Promise.resolve();
      if (index() === was) return null;
      return Math.abs(slot.getBoundingClientRect().left - before);
    });
    expect(jump, "the second move re-rendered").not.toBeNull();
    expect(jump!, "no teleport when the new move lands").toBeLessThan(6);
  });

  test("visual: widget grid", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(preview(page)).toHaveScreenshot("widget-grid.png");
  });
});

test.describe("Scope", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/scope", { waitUntil: "networkidle" });
  });

  test("each item lights in its own colour, and the page keeps its own", async ({ page }) => {
    const cap = (name: string) =>
      preview(page)
        .getByRole("button", { name, exact: true })
        .evaluate((el) => getComputedStyle(el).getPropertyValue("--echo-accent").trim());
    const [design, research, build] = [await cap("Design"), await cap("Research"), await cap("Build")];
    expect(new Set([design, research, build]).size).toBe(3);
    const pageAccent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--echo-accent").trim(),
    );
    expect([design, research, build]).not.toContain(pageAccent);
    // A pad's colour is its own too, and it's a lit primary cap when on.
    const pads = preview(page).getByRole("group", { name: "Colours" });
    await expect(pads.getByRole("button", { name: "Open now", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("a reflective screen is light glass printed in dark ink", async ({ page }) => {
    const display = preview(page).getByRole("group", { name: "Frequency", exact: true }).first();
    await expect(display).toHaveAttribute("data-echo-screen", "reflective");
    // Read both through a canvas: computed colours come back in oklch.
    const { glass, ink } = await display.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.background = "var(--echo-lcd)";
      probe.style.color = "var(--echo-text)";
      el.appendChild(probe);
      const cs = getComputedStyle(probe);
      const ctx = document.createElement("canvas").getContext("2d")!;
      const luminance = (color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const out = { glass: luminance(cs.backgroundColor), ink: luminance(cs.color) };
      probe.remove();
      return out;
    });
    expect(glass).toBeGreaterThan(ink + 100);
  });

  test("soft molding changes the caps inside it and nothing outside", async ({ page }) => {
    const radius = (name: string) =>
      preview(page)
        .getByRole("button", { name, exact: true })
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(await radius("Soft")).toBeGreaterThan(await radius("Crisp"));
  });

  test("visual: scope", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs/scope");
    await expect(preview(page)).toHaveScreenshot("scope.png");
  });
});
