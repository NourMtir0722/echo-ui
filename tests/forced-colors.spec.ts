import { test, expect, type Page } from "@playwright/test";

/**
 * Focus and state stay visible in Windows High Contrast (forced colors) as well
 * as normally (WCAG 2.4.7, 1.4.11).
 *
 * Forced colors removes box-shadow and replaces colors with system colors,
 * and Echo drew its focus rings and most control states with exactly those.
 * axe runs in normal mode and can't see it, so these tests judge by pixels:
 * focusing a part, or changing a control's state, has to change what's on
 * screen. Reduced motion is on so breathing LEDs can't fake a change.
 *
 * Also the regression test for two normal-mode bugs it found: the slider thumb
 * never showed keyboard focus, and the current pagination page lost its
 * focus ring to its own box-shadow.
 */

const MODES = ["none", "active"] as const;

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

const FOCUSABLE = [
  "main button:not([disabled])",
  "main a[href]",
  "main input:not([disabled]):not([type=hidden])",
  "main textarea:not([disabled])",
  'main [tabindex="0"]',
].join(", ");

type Clip = { x: number; y: number; width: number; height: number };

/** Screenshot a region with the pointer out of the way. */
async function shot(page: Page, clip: Clip) {
  await page.mouse.move(0, 0);
  return page.screenshot({ clip, animations: "disabled" });
}

for (const mode of MODES) {
  test.describe(`forced colors: ${mode}`, () => {
    // Through emulateMedia: `test.use({ forcedColors })` is silently ignored in
    // this setup, which once made the whole "active" half run in normal mode.
    // The assertion keeps that from passing quietly again.
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ forcedColors: mode, reducedMotion: "reduce" });
    });
    test.afterEach(async ({ page }) => {
      const active = await page.evaluate(() => matchMedia("(forced-colors: active)").matches);
      expect(active, "the page isn't in the forced-colors mode this test is named for").toBe(mode === "active");
    });

    for (const gallery of GALLERIES) {
      test(`every focusable part shows focus: /gallery/${gallery}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.goto(`/gallery/${gallery}`);
        // Keyboard modality, so programmatic focus below matches :focus-visible.
        await page.keyboard.press("Tab");

        const count = await page.evaluate((selector) => {
          const all = [...document.querySelectorAll<HTMLElement>(selector)].filter(
            (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden",
          );
          (window as unknown as { __focusables: HTMLElement[] }).__focusables = all;
          return all.length;
        }, FOCUSABLE);
        test.skip(count === 0, "no focusable parts on this page");

        const invisible: string[] = [];
        for (let i = 0; i < count; i++) {
          // Where the ring is drawn: a text input's ring is on its well; a
          // visually hidden input (the slider's) shows it on its echo- part.
          const clip = await page.evaluate((index) => {
            const el = (window as unknown as { __focusables: HTMLElement[] }).__focusables[index]!;
            (document.activeElement as HTMLElement | null)?.blur();
            el.scrollIntoView({ block: "center", inline: "center" });
            let box: Element = el.matches("input, textarea") && !el.matches('[type="range"]') ? el.parentElement! : el;
            if (box.getBoundingClientRect().width < 8) box = el.closest('[class*="echo-"]:not(input)') ?? box;
            const r = box.getBoundingClientRect();
            const pad = 8;
            const x = Math.max(0, r.left - pad);
            const y = Math.max(0, r.top - pad);
            return { x, y, width: Math.min(innerWidth - x, r.width + pad * 2), height: Math.min(innerHeight - y, r.height + pad * 2) };
          }, i);
          if (clip.width < 1 || clip.height < 1) continue;
          const before = await shot(page, clip);
          const label = await page.evaluate((index) => {
            const el = (window as unknown as { __focusables: HTMLElement[] }).__focusables[index]!;
            el.focus({ preventScroll: true });
            if (document.activeElement !== el) return null;
            const cls = [...el.classList].find((c) => c.startsWith("echo-"));
            const owner = el.closest('[class*="echo-"]');
            const ownerCls = owner && [...owner.classList].find((c) => c.startsWith("echo-"));
            return `${cls ?? `${ownerCls ?? "?"} > ${el.tagName.toLowerCase()}`} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24)}"`;
          }, i);
          if (label === null) continue;
          await page.waitForTimeout(200);
          const after = await shot(page, clip);
          if (before.equals(after)) invisible.push(label);
        }
        expect(invisible, "focus makes no visible change on these parts").toEqual([]);
      });
    }

    /** Each control, and how to change its state. The clip is the control. */
    const STATES: { name: string; path: string; control: string; change: (page: Page) => Promise<void> }[] = [
      {
        name: "switch",
        path: "/gallery/controls",
        control: ".echo-switch >> nth=0",
        change: (page) => page.locator(".echo-switch").first().click(),
      },
      {
        name: "checkbox",
        path: "/gallery/controls",
        control: ".echo-checkbox >> nth=0",
        change: (page) => page.locator(".echo-checkbox").first().click(),
      },
      {
        name: "radio group",
        path: "/gallery/controls",
        control: '[role="radiogroup"][aria-label="Output routing"]',
        change: (page) => page.getByRole("radio", { name: "Headphones" }).click(),
      },
      {
        name: "segmented",
        path: "/gallery/controls",
        control: ".echo-segmented",
        change: (page) => page.getByRole("radio", { name: "Break" }).click(),
      },
      {
        name: "slider",
        path: "/gallery/controls",
        control: ".echo-slider >> nth=0",
        change: async (page) => {
          await page.getByRole("slider", { name: "Level" }).focus();
          await page.keyboard.press("Home");
        },
      },
      {
        name: "tabs",
        path: "/gallery/structure",
        control: '[role="tablist"] >> nth=0',
        change: (page) => page.getByTestId("tab-log").click(),
      },
      {
        // The gallery's key, not the site bar's light key.
        name: "toggle LedKey",
        path: "/gallery/keys",
        control: "main .echo-led-key:has([aria-pressed])",
        change: (page) => page.locator("main button[aria-pressed]").first().click(),
      },
    ];

    // The pixel checks prove state and focus are VISIBLE, not that they're
    // readable: a selected segment once passed while forced colors' text
    // backplate hid its label. These baselines lock in the reviewed look.
    if (mode === "active") {
      for (const gallery of ["controls", "keys", "structure", "hardware-button"]) {
        // Named `visual:` so Linux CI skips it: baselines are macOS-only.
        test(`visual: forced colors /gallery/${gallery}`, async ({ page }) => {
          await page.goto(`/gallery/${gallery}`);
          await expect(page.locator("main")).toHaveScreenshot(`forced-colors-${gallery}.png`, {
            animations: "disabled",
          });
        });
      }
    }

    for (const state of STATES) {
      test(`${state.name} shows its state`, async ({ page }) => {
        await page.goto(state.path);
        const control = page.locator(state.control);
        await control.scrollIntoViewIfNeeded();
        const box = (await control.boundingBox())!;
        const clip = { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 };
        const before = await shot(page, clip);
        await state.change(page);
        // Judge the state, not the focus ring the change left behind.
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.waitForTimeout(300);
        const after = await shot(page, clip);
        expect(before.equals(after), `${state.name}: changing its state changes nothing on screen`).toBe(false);
      });
    }

    if (mode === "active") {
      // Forced colors drops backgrounds, and a background was all that
      // told the current step from an upcoming one: the lit pip in its hole.
      test("steps shows which step is current", async ({ page }) => {
        await page.goto("/gallery/navigation");
        const steps = page.locator(".echo-steps").first();
        await steps.scrollIntoViewIfNeeded();
        const marker = async (state: string) => {
          const box = (await steps.locator(`[data-state="${state}"] .echo-steps__marker`).first().boundingBox())!;
          return shot(page, { x: box.x, y: box.y, width: box.width, height: box.height });
        };
        const current = await marker("current");
        const upcoming = await marker("upcoming");
        expect(current.equals(upcoming), "the current step's marker looks like an upcoming one").toBe(false);
      });
    }
  });
}
