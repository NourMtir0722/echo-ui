import { test, expect, type Page } from "@playwright/test";

/**
 * The Motion gallery's other items: the morph family (SaveButton, Timer,
 * Stopwatch, VoiceNote, AddToBag, useBudOff) and the other kinds of physics
 * (PullCord, SplitFlap, useRoll, LightSource, Magnetic, ThrowStack, Ripple).
 *
 * What each one must never cost a keyboard or screen-reader user, and that
 * each one does the thing it's for.
 */
const card = (page: Page, title: string) =>
  page.locator(".echo-motion__card", {
    has: page.locator(".echo-motion__name", { hasText: new RegExp(`^${title}$`) }),
  });

test.beforeEach(async ({ page }) => {
  await page.goto("/motion");
  await card(page, "SaveButton").getByRole("button", { name: "Save" }).waitFor();
});

test("SaveButton: busy while saving, then Saved, then back", async ({ page }) => {
  const save = card(page, "SaveButton");
  await save.getByRole("button", { name: "Save" }).click();
  const busy = save.getByRole("button", { name: "Saving" });
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(busy).toBeDisabled();
  await expect(save.getByRole("button", { name: "Saved" })).toBeDisabled({ timeout: 4000 });
  await expect(save.locator(".echo-morph__status")).toHaveText("Saved");
  await expect(save.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 4000 });
});

test("focus comes back to the button after it was busy", async ({ page }) => {
  // The busy and Saved caps can't take focus, and there's no other button to
  // hand it to: it waits, and returns to Save when Save is back.
  const save = card(page, "SaveButton");
  await save.getByRole("button", { name: "Save" }).focus();
  await page.keyboard.press("Enter");
  await expect(save.getByRole("button", { name: "Saving" })).toBeVisible();
  await expect(save.getByRole("button", { name: "Save" })).toBeFocused({ timeout: 6000 });
});

test("Timer: opens into durations, runs down, pauses, and Escape folds it", async ({ page }) => {
  const timer = card(page, "Timer");
  await timer.getByRole("button", { name: "Timer" }).focus();
  await page.keyboard.press("Enter");
  await expect(timer.getByRole("group", { name: "Timer durations" })).toBeVisible();
  await expect(timer.getByRole("button", { name: "10s timer" })).toBeFocused();
  await page.keyboard.press("Enter");
  const running = timer.getByRole("button", { name: /^Pause timer, 0:\d\d left$/ });
  await expect(running).toBeVisible();
  // The level drains as it runs.
  const fill = () => running.evaluate((el) => Number((el as HTMLElement).style.getPropertyValue("--hw-fill")));
  const a = await fill();
  await page.waitForTimeout(600);
  expect(await fill()).toBeLessThan(a);
  await running.click();
  const resume = timer.getByRole("button", { name: /^Resume timer/ });
  await expect(resume).toBeVisible();
  await expect(timer.locator(".echo-morph__status")).toHaveText("Paused");
  // Safari doesn't focus a button on click: focus it, as a keyboard user would be.
  await resume.focus();
  await page.keyboard.press("Escape");
  await expect(timer.getByRole("button", { name: "Timer", exact: true })).toBeVisible();
});

test("Stopwatch: start, lap into the count, pause into Reset, reset to Start", async ({ page }) => {
  const sw = card(page, "Stopwatch");
  await sw.getByRole("button", { name: "Start" }).click();
  await expect(sw.getByRole("button", { name: "Pause stopwatch" })).toBeVisible();
  await sw.getByRole("button", { name: "Lap" }).click();
  await expect(sw.getByRole("status", { name: "1 lap" })).toBeVisible({ timeout: 3000 });
  await sw.getByRole("button", { name: "Pause stopwatch" }).click();
  await expect(sw.getByRole("button", { name: "Reset" })).toBeVisible();
  await sw.getByRole("button", { name: "Reset" }).click();
  await expect(sw.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(sw.getByRole("status", { name: /lap/ })).toHaveCount(0);
});

/*
 * The running time is the Pause cap's label, and it was written with
 * textContent, which swaps its text node for a new one every frame. A press
 * that landed on a node gone by release was a click WebKit dropped: about
 * half of these loops failed there before the fix.
 */
test("Pause takes on every press while the time runs", async ({ page }) => {
  const sw = card(page, "Stopwatch");
  for (let i = 0; i < 25; i++) {
    await sw.getByRole("button", { name: /^(Start|Resume stopwatch)$/ }).click();
    await sw.getByRole("button", { name: "Pause stopwatch" }).click();
    await expect(sw.getByRole("button", { name: "Resume stopwatch" })).toBeVisible({ timeout: 1000 });
  }
});

test("AddToBag: the count goes up when the drop lands", async ({ page }) => {
  const bag = card(page, "AddToBag");
  await expect(bag.getByRole("status", { name: "2 in bag" })).toBeVisible();
  await bag.getByRole("button", { name: "Add to bag" }).click();
  await expect(bag.getByRole("status", { name: "3 in bag" })).toBeVisible({ timeout: 3000 });
  // The drop is gone once it has landed.
  await expect(page.locator(".echo-bud-off")).toHaveCount(0, { timeout: 3000 });
});

test("a PullCord at rest stops drawing, and a pull wakes it", async ({ page }) => {
  // The cord was simulated every frame for as long as it was on the page,
  // hanging still or scrolled away: sixty callbacks a second for nothing.
  const cord = card(page, "PullCord");
  await cord.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  const frames = () =>
    cord.locator(".echo-pull-cord__rope").evaluate(
      (rope) =>
        new Promise<number>((done) => {
          let n = 0;
          const seen = new MutationObserver(() => n++);
          seen.observe(rope, { attributes: true, attributeFilter: ["d"] });
          setTimeout(() => (seen.disconnect(), done(n)), 600);
        }),
    );
  expect(await frames()).toBe(0);
  // A tug from the Switch sets it moving again.
  await cord.getByRole("switch", { name: "Lamp" }).click();
  expect(await frames()).toBeGreaterThan(5);
});

test("PullCord: Space tugs the cord and flips the switch", async ({ page }) => {
  const cord = card(page, "PullCord");
  const sw = cord.getByRole("switch", { name: "Lamp" });
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.focus();
  await page.keyboard.press("Space");
  await expect(sw).toHaveAttribute("aria-checked", "true", { timeout: 2000 });
  await page.keyboard.press("Enter");
  await expect(sw).toHaveAttribute("aria-checked", "false", { timeout: 2000 });
});

test("PullCord: the Switch is the control, and the cord is a hand's way to it", async ({ page }) => {
  const cord = card(page, "PullCord");
  // One switch, the real one; the cap is not a second control.
  await expect(cord.getByRole("switch")).toHaveCount(1);
  await expect(cord.locator(".echo-switch")).toHaveAttribute("aria-label", "Lamp");
  await expect(cord.locator(".echo-pull-cord__bead")).toHaveAttribute("aria-hidden", "true");
  // A click on the Switch flips it, and the cord gives a tug.
  const sw = cord.getByRole("switch", { name: "Lamp" });
  const cap = cord.locator(".echo-pull-cord__bead");
  await sw.scrollIntoViewIfNeeded();
  const hang = async () => (await cap.boundingBox())!.y - (await sw.boundingBox())!.y;
  const rest = await hang();
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await hang()) - rest).toBeGreaterThan(10);
});

test("PullCord: a pull past the detent flips it; a short one doesn't", async ({ page }) => {
  const cord = card(page, "PullCord");
  const sw = cord.getByRole("switch", { name: "Lamp" });
  const cap = cord.locator(".echo-pull-cord__bead");
  await cap.scrollIntoViewIfNeeded();
  const pull = async (dy: number) => {
    const b = (await cap.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  await pull(8);
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await pull(60);
  await expect(sw).toHaveAttribute("aria-checked", "true");
});

/**
 * The server renders the cord's SVG at the width it would like to
 * swing in (348px at the default length), and only the effect that runs after
 * hydration shrinks it to the container. Until then — and for good without
 * JavaScript — a narrow screen scrolled sideways: `/docs/pull-cord` measured
 * 401px wide at 320 on a cold load. JavaScript off pins that state down.
 */
test("before the script runs, the cord fits a 320px screen", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 640 },
    baseURL: testInfo.project.use.baseURL,
  });
  const page = await context.newPage();
  try {
    for (const route of ["/docs/pull-cord", "/motion"]) {
      await page.goto(route);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `${route} scrolls sideways before hydration`).toBeLessThanOrEqual(320);
    }
  } finally {
    await context.close();
  }
});

test("SplitFlap: it turns over to the new value and says it", async ({ page }) => {
  const flap = card(page, "SplitFlap");
  await expect(flap.getByRole("img", { name: "Counter 1024" })).toBeVisible();
  await flap.getByRole("button", { name: "+1" }).click();
  await expect(flap.getByRole("img", { name: "Counter 1025" })).toBeVisible();
  await expect(flap.locator(".echo-split-flap__half[data-half='bottom']").last()).toHaveText("5", { timeout: 3000 });
});

test("useRoll: a step rolls the digits through the ones in between and says only the value", async ({ page }) => {
  const roll = card(page, "useRoll");
  const field = roll.getByRole("textbox", { name: "Floor" });
  const tile = roll.locator(".echo-stat-tile");
  await expect(field).toHaveValue("18");
  // Watch the tile's drawn digits from the moment the value changes.
  await tile.evaluate((el) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    const drawn = el.querySelector("[aria-hidden]")!;
    new MutationObserver(() => seen.push(drawn.textContent ?? "")).observe(drawn, { childList: true, characterData: true, subtree: true });
  });
  // From the keyboard: arrow up three times, 18 → 21 (216 → 252 on the tile).
  await field.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowUp");
  await expect(field).toHaveValue("21");
  await expect(tile.locator("[aria-hidden]")).toHaveText("252", { timeout: 4000 });
  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  expect(seen.length, `steps seen: ${seen.join(" ")}`).toBeGreaterThan(3);
  // What's read is the reading, once: never a digit in between.
  await expect(tile).toHaveAccessibleName("Requests");
  await expect(tile.locator(".echo-stat-tile__said")).toHaveText("252");
  await expect(roll.locator(".echo-lcd-chip__said")).toHaveText("21");
  // The field's rolling copy is drawn over the input only while it rolls.
  await expect(roll.locator(".echo-number-field__roll")).toBeHidden();
});

test("useRoll: under reduced motion the digits jump to the value", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const roll = card(page, "useRoll");
  const tile = roll.locator(".echo-stat-tile");
  await tile.locator("[aria-hidden]").waitFor();
  await tile.evaluate((el) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    const drawn = el.querySelector("[aria-hidden]")!;
    new MutationObserver(() => seen.push(drawn.textContent ?? "")).observe(drawn, { childList: true, characterData: true, subtree: true });
  });
  await roll.getByRole("button", { name: "Increase" }).click();
  await expect(tile.locator("[aria-hidden]")).toHaveText("228");
  await page.waitForTimeout(600);
  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  expect(new Set(seen)).toEqual(new Set(["228"]));
});

test("useRoll: typing never rolls", async ({ page }) => {
  const roll = card(page, "useRoll");
  const field = roll.getByRole("textbox", { name: "Floor" });
  await field.fill("42");
  await expect(roll.locator(".echo-number-field")).not.toHaveAttribute("data-rolling", "");
  await expect(roll.locator(".echo-number-field__roll")).toBeHidden();
});

test("LightSource: the caps' shadows fall away from the pointer", async ({ page }) => {
  const light = card(page, "LightSource");
  const pad = light.locator(".echo-light-source");
  await pad.scrollIntoViewIfNeeded();
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 2, b.y + 2);
  await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 6 });
  await page.waitForTimeout(500);
  // The pointer is to the right: the first key's shadow falls to the left.
  const x = await light
    .locator(".echo-hw__cap")
    .first()
    .evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue("--hw-light-x")));
  expect(x).toBeLessThan(0);
});

test("a key's digit is drawn whole, not cut off by the cap's icon slot", async ({ page }) => {
  const pad = card(page, "LightSource").locator(".echo-light-source");
  await pad.scrollIntoViewIfNeeded();
  const cut = await pad.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>(".echo-hw__icon")].flatMap((icon) => {
      const range = document.createRange();
      range.selectNodeContents(icon);
      const glyph = range.getBoundingClientRect();
      const clipped: string[] = [];
      for (let el: HTMLElement | null = icon; el && !el.classList.contains("echo-hw"); el = el.parentElement) {
        if (getComputedStyle(el).overflow === "visible") continue;
        const box = el.getBoundingClientRect();
        const outside =
          glyph.top < box.top - 0.5 || glyph.bottom > box.bottom + 0.5 || glyph.left < box.left - 0.5 || glyph.right > box.right + 0.5;
        if (outside) clipped.push(`${icon.textContent} by ${el.className}`);
      }
      return clipped;
    }),
  );
  expect(cut).toEqual([]);
});

test("Magnetic: a button leans toward the pointer before it's touched", async ({ page }) => {
  const mag = card(page, "Magnetic");
  const home = mag.getByRole("button", { name: "Home" });
  await home.scrollIntoViewIfNeeded();
  const b = (await home.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 4 });
  await page.waitForTimeout(500);
  const t = await home.evaluate((el) => (el.closest(".echo-hw") as HTMLElement).style.translate);
  expect(parseFloat(t)).toBeGreaterThan(0);
});

test("ThrowStack: → throws the top card and the next is announced and focused", async ({ page }) => {
  const stack = card(page, "ThrowStack");
  const group = stack.getByRole("group", { name: "Today" });
  await expect(group.locator(".echo-throw-stack__live")).toHaveText("1 of 4");
  await group.locator(".echo-throw-stack__card[data-top]").focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.locator(".echo-throw-stack__live")).toHaveText("2 of 4");
  await expect(group.locator(".echo-throw-stack__card[data-top]")).toBeFocused();
  await expect(group.locator(".echo-throw-stack__card[data-top]")).toContainText("Review");
});

test("ThrowStack: a flick throws it; a short drag springs back", async ({ page }) => {
  const stack = card(page, "ThrowStack");
  const live = stack.locator(".echo-throw-stack__live");
  const top = stack.locator(".echo-throw-stack__card[data-top]");
  await top.scrollIntoViewIfNeeded();
  const drag = async (dx: number, steps: number) => {
    const b = (await top.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 3);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(b.x + b.width / 2 + (dx * i) / steps, b.y + b.height / 3);
      if (steps > 6) await page.waitForTimeout(20);
    }
    // A short drag that has come to rest before it's let go: no flick.
    if (steps > 6) await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(700);
  };
  await drag(30, 15);
  await expect(live).toHaveText("1 of 4");
  await drag(200, 6);
  await expect(live).toHaveText("2 of 4");
});

test("Ripple: a press on the surface sends a wave", async ({ page }) => {
  const ripple = card(page, "Ripple");
  const surface = ripple.locator(".echo-ripple");
  await surface.scrollIntoViewIfNeeded();
  const b = (await surface.boundingBox())!;
  await page.mouse.click(b.x + 20, b.y + 20);
  await expect(ripple.getByRole("button", { name: "Waves: 1" })).toBeVisible();
});

test.describe("VoiceNote", () => {
  test("records, becomes a note that plays, and Escape deletes it", async ({ page }) => {
    // A microphone that hums: an oscillator's stream, in every browser, with
    // no permission prompt.
    // On the prototype: WebKit ignores an own property set on the instance.
    await page.addInitScript(() => {
      Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
        configurable: true,
        value: async () => {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const out = ctx.createMediaStreamDestination();
          osc.connect(out);
          osc.start();
          return out.stream;
        },
      });
    });
    await page.goto("/motion");
    const voice = card(page, "VoiceNote");
    await voice.getByRole("button", { name: "Record a voice note" }).click();
    await expect(voice.getByRole("button", { name: "Stop recording" })).toBeVisible();
    await expect(voice.locator(".echo-morph__status")).toHaveText("Recording");
    await page.waitForTimeout(1200);
    await voice.getByRole("button", { name: "Stop recording" }).click();
    const note = voice.getByRole("button", { name: /^Play voice note, 0:0\d$/ });
    await expect(note).toBeVisible();
    await expect(voice.locator(".echo-morph__status")).toHaveText(/^Voice note, 0:0\d$/);
    await note.click();
    await expect(voice.getByRole("button", { name: /^Pause voice note/ })).toBeVisible();
    await voice.getByRole("button", { name: "Delete voice note" }).focus();
    await page.keyboard.press("Escape");
    await expect(voice.getByRole("button", { name: "Record a voice note" })).toBeVisible();
    await expect(voice.locator(".echo-morph__status")).toHaveText("Voice note deleted");
  });

  /*
   * The note's countdown is the playing cap's label and changes every frame,
   * the way the Stopwatch's time did when a press on its Pause could be
   * dropped. This cap takes every press; this holds it there.
   */
  test("Pause takes on every press while the note plays", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
        configurable: true,
        value: async () => {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const out = ctx.createMediaStreamDestination();
          osc.connect(out);
          osc.start();
          return out.stream;
        },
      });
    });
    await page.goto("/motion");
    const voice = card(page, "VoiceNote");
    await voice.getByRole("button", { name: "Record a voice note" }).click();
    // Long enough that the presses below never reach the end of the note:
    // a note that ends just before a press on Pause turns it into Play.
    await page.waitForTimeout(6000);
    await voice.getByRole("button", { name: "Stop recording" }).click();
    for (let i = 0; i < 8; i++) {
      await voice.getByRole("button", { name: /^Play voice note/ }).click();
      await voice.getByRole("button", { name: /^Pause voice note/ }).click();
      await expect(voice.getByRole("button", { name: /^Play voice note/ })).toBeVisible({ timeout: 1000 });
    }
  });

  test("no microphone: it says so and stays closed", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      });
    });
    await page.goto("/motion");
    const voice = card(page, "VoiceNote");
    await voice.getByRole("button", { name: "Record a voice note" }).click();
    await expect(voice.locator(".echo-morph__status")).toHaveText("Microphone unavailable");
    await expect(voice.getByRole("button", { name: "Record a voice note" })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test("AddToBag counts at once, with no drop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/motion");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const bag = card(page, "AddToBag");
    await bag.getByRole("button", { name: "Add to bag" }).click();
    await expect(bag.getByRole("status", { name: "3 in bag" })).toBeVisible();
    await expect(page.locator(".echo-bud-off")).toHaveCount(0);
  });
});

test.describe("fixes", () => {
  /**
   * A microphone that takes a moment to be granted, and remembers every
   * stream it hands out so the test can ask which are still open.
   */
  const slowMicrophone = (page: Page) =>
    page.addInitScript(() => {
      const w = window as unknown as { __streams: MediaStream[] };
      w.__streams = [];
      Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
        configurable: true,
        value: async () => {
          await new Promise((r) => setTimeout(r, 400));
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const out = ctx.createMediaStreamDestination();
          osc.connect(out);
          osc.start();
          w.__streams.push(out.stream);
          return out.stream;
        },
      });
    });
  const openStreams = (page: Page) =>
    page.evaluate(
      () =>
        (window as unknown as { __streams: MediaStream[] }).__streams.filter((s) =>
          s.getTracks().some((t) => t.readyState === "live"),
        ).length,
    );

  test("VoiceNote pressed twice while asking for the microphone leaves none open", async ({ page }) => {
    await slowMicrophone(page);
    await page.goto("/motion");
    const voice = card(page, "VoiceNote");
    // Two presses before the browser answers the first.
    await voice
      .getByRole("button", { name: "Record a voice note" })
      .evaluate((el) => ((el as HTMLElement).click(), (el as HTMLElement).click()));
    await voice.getByRole("button", { name: "Stop recording" }).click();
    await expect(voice.getByRole("button", { name: /^Play voice note/ })).toBeVisible();
    // Long enough for a second request to have been granted too.
    await page.waitForTimeout(700);
    expect(await openStreams(page)).toBe(0);
  });

  test("VoiceNote gone before the microphone is granted leaves none open", async ({ page }) => {
    await slowMicrophone(page);
    await page.goto("/motion");
    const voice = card(page, "VoiceNote");
    await voice.getByRole("button", { name: "Record a voice note" }).click();
    // Leave the page in-app, so the component unmounts while it's still asking.
    await page.locator("a[href='/']").first().click();
    await page.waitForURL((url) => url.pathname === "/");
    // Waited for, not timed: the homepage it lands on keeps a browser busy a while (WebKit since
    // Playwright 1.64), and the microphone's answer comes when it comes.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.length)).toBe(1);
    await expect.poll(() => openStreams(page)).toBe(0);
  });

  test("under reduced motion, a card thrown by dragging goes to the back straight", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/motion");
    const stack = card(page, "ThrowStack");
    const top = stack.locator(".echo-throw-stack__card[data-top]");
    await top.scrollIntoViewIfNeeded();
    const thrown = (await top.elementHandle())!;
    const b = (await top.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 3);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 200, b.y + b.height / 3 + 20, { steps: 6 });
    await page.mouse.up();
    await expect(stack.locator(".echo-throw-stack__live")).toHaveText("2 of 4");
    await page.waitForTimeout(300);
    const at = await thrown.evaluate((el) => ({
      x: parseFloat((el as HTMLElement).style.translate),
      r: parseFloat((el as HTMLElement).style.rotate),
    }));
    expect(at).toEqual({ x: 0, r: 0 });
  });

  test("under reduced motion, Ripple's dots are drawn and stay drawn after a resize", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/motion");
    const surface = card(page, "Ripple").locator(".echo-ripple");
    const dots = surface.locator("canvas");
    const inked = () =>
      dots.evaluate((c: HTMLCanvasElement) => {
        const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) n++;
        return n;
      });
    await page.waitForTimeout(300);
    expect(await inked()).toBeGreaterThan(0);
    await surface.evaluate((el) => ((el as HTMLElement).style.width = "240px"));
    await page.waitForTimeout(300);
    expect(await inked()).toBeGreaterThan(0);
  });

  test("holding Space tugs PullCord once", async ({ page }) => {
    const sw = card(page, "PullCord").getByRole("switch", { name: "Lamp" });
    await sw.focus();
    await sw.evaluate((el) => {
      const w = window as unknown as { __flips: number };
      w.__flips = 0;
      new MutationObserver(() => w.__flips++).observe(el, { attributes: true, attributeFilter: ["aria-checked"] });
    });
    await page.keyboard.down("Space");
    // The key's own auto-repeat, which Playwright doesn't send by itself.
    for (let i = 0; i < 15; i++) {
      await sw.dispatchEvent("keydown", { key: " ", code: "Space", repeat: true, bubbles: true });
      await page.waitForTimeout(35);
    }
    await page.keyboard.up("Space");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __flips: number }).__flips)).toBe(1);
    await expect(sw).toHaveAttribute("aria-checked", "true");
  });

  test("a lap still in flight when Stopwatch resets doesn't come back", async ({ page }) => {
    const sw = card(page, "Stopwatch");
    await sw.getByRole("button", { name: "Start" }).click();
    await sw.getByRole("button", { name: "Lap" }).click();
    await expect(sw.getByRole("status", { name: "1 lap" })).toBeVisible({ timeout: 3000 });
    // A second lap, and Reset before its drop lands (it takes ~0.4s).
    await sw.getByRole("button", { name: "Lap" }).dispatchEvent("click");
    await sw.getByRole("button", { name: "Pause stopwatch" }).dispatchEvent("click");
    await sw.getByRole("button", { name: "Reset" }).dispatchEvent("click");
    await expect(sw.getByRole("button", { name: "Start" })).toBeVisible();
    await page.waitForTimeout(800);
    // Everything the lap count says from here on.
    await sw.evaluate((el) => {
      const w = window as unknown as { __said: string[] };
      w.__said = [];
      const read = () => {
        const count = el.querySelector(".echo-stopwatch__laps");
        if (count) w.__said.push(count.textContent ?? "");
      };
      new MutationObserver(read).observe(el, { subtree: true, childList: true, characterData: true });
    });
    await sw.getByRole("button", { name: "Start" }).click();
    await sw.getByRole("button", { name: "Lap" }).click();
    await expect(sw.getByRole("status", { name: "1 lap" })).toBeVisible({ timeout: 3000 });
    const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said);
    expect(said.filter((t) => /\d/.test(t) && !/^\D*[01]\D*$/.test(t))).toEqual([]);
  });
});
