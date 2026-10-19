import { test, expect, type Page } from "@playwright/test";
import { axe } from "./axe";

/**
 * The Motion gallery's morph items: your own HardwareButtons in a Morph, and
 * the three built on it.
 *
 * Two kinds of test. The first kind is about what the shape change must
 * never cost a keyboard or screen-reader user — focus follows the buttons,
 * Escape folds, the state is announced, reduced motion lands in the same end
 * state. The second films the change frame by frame and checks what the eye
 * gets: text on every frame, labels on the body, a clean colour change, a
 * hand-off that fades rather than cuts. Those read only what is on screen
 * (opacity, boxes, the drawn path), not how Morph is built.
 */
const card = (page: Page, title: string) => page.locator(".echo-motion__card", { hasText: title });

/** One frame of a change, as the eye gets it. */
interface Frame {
  at: number;
  /** The strongest text anywhere in the stage: 0 is a blank body. */
  text: number;
  /** Text boxes (clipped as drawn) that show, and the drawn body's extent. */
  labels: { left: number; right: number }[];
  body: { left: number; right: number; top: number; bottom: number; opacity: number } | null;
  /** How lit each stretch of the drawn body is (0 neutral, 1 primary). */
  lit: number[];
}

/**
 * Press `name` in the card titled `title`, then record every frame for `ms`.
 * The press happens inside the page, in the same task as the first frame, so
 * nothing is missed.
 */
async function film(page: Page, title: string, name: string, ms: number): Promise<Frame[]> {
  await card(page, title).scrollIntoViewIfNeeded();
  return page.evaluate(
    ({ title, name, ms }) =>
      new Promise<Frame[]>((resolve) => {
        const stage = [...document.querySelectorAll<HTMLElement>(".echo-motion__card")]
          .find((c) => c.textContent?.includes(title))!
          .querySelector<HTMLElement>(".echo-motion__stage")!;
        const opacity = (el: Element) => {
          let o = 1;
          for (let e: Element | null = el; e && e !== stage; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.visibility === "hidden" || cs.display === "none") return 0;
            o *= Number(cs.opacity);
          }
          return o;
        };
        /** The part of an element's box that is drawn, after its clipping ancestors. */
        const drawn = (el: Element) => {
          const r = el.getBoundingClientRect();
          let left = r.left;
          let right = r.right;
          for (let e = el.parentElement; e && e !== stage; e = e.parentElement) {
            if (getComputedStyle(e).overflow === "visible") continue;
            const c = e.getBoundingClientRect();
            left = Math.max(left, c.left);
            right = Math.min(right, c.right);
          }
          return { left, right };
        };
        const texts = () =>
          [...stage.querySelectorAll<HTMLElement>("span, button")].filter(
            (el) =>
              !el.closest('[aria-live="polite"]') &&
              [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()),
          );
        const frame = (t0: number): Frame => {
          const shown = texts().map((el) => ({ el, o: opacity(el) }));
          const svg = stage.querySelector("svg:has(linearGradient)");
          const cap = svg?.querySelector<SVGPathElement>('path[fill$="-cap)"]');
          const r = cap?.getAttribute("d") ? cap.getBoundingClientRect() : null;
          return {
            at: Math.round(performance.now() - t0),
            text: Math.max(0, ...shown.map((s) => s.o)),
            labels: shown.filter((s) => s.o > 0.25).map((s) => drawn(s.el)).filter((b) => b.right - b.left > 1),
            body:
              svg && r
                ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, opacity: opacity(svg) }
                : null,
            lit: svg
              ? [...svg.querySelectorAll('linearGradient[id$="-lit"] stop')].map((s) =>
                  Number(s.getAttribute("stop-opacity") ?? 0),
                )
              : [],
          };
        };
        const button = [...stage.querySelectorAll("button")].find((b) => b.textContent?.trim().toLowerCase() === name.toLowerCase())!;
        const t0 = performance.now();
        const frames: Frame[] = [];
        button.click();
        const tick = () => {
          frames.push(frame(t0));
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve(frames);
        };
        tick();
      }),
    { title, name, ms },
  );
}

test.describe("Motion gallery · morph", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/motion");
    await card(page, "DoneButton").getByRole("button", { name: "Mark as done" }).waitFor();
  });

  test("DoneButton: Enter divides, Undo takes focus, the state is announced", async ({ page }) => {
    const done = card(page, "DoneButton");
    await done.getByRole("button", { name: "Mark as done" }).focus();
    await page.keyboard.press("Enter");
    await expect(done.getByRole("button", { name: "Undo" })).toBeFocused();
    await expect(done.locator(".echo-morph__status")).toHaveText("Marked as done");
    // The whole is gone while divided. "Done" is the state reached: a lit cap
    // that is announced as unavailable, not a button that does nothing.
    await expect(done.getByRole("button", { name: "Mark as done" })).toHaveCount(0);
    await expect(done.getByRole("button", { name: "Done" })).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect(done.getByRole("button", { name: "Mark as done" })).toBeFocused();
  });

  test("ConfirmButton: Cancel takes focus, so Enter twice never confirms", async ({ page }) => {
    const confirm = card(page, "ConfirmButton");
    await confirm.getByRole("button", { name: "Delete project" }).focus();
    await page.keyboard.press("Enter");
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(confirm.getByRole("button", { name: "Delete project" })).toBeFocused();
    await expect(confirm.locator(".echo-morph__status")).toHaveText("Cancelled");
  });

  test("ConfirmButton: confirming says what happened, then returns", async ({ page }) => {
    const confirm = card(page, "ConfirmButton");
    await confirm.getByRole("button", { name: "Delete project" }).click();
    await confirm.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(confirm.locator(".echo-morph__status")).toHaveText("Deleted");
    await expect(confirm.getByRole("button", { name: "Deleted" })).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Delete project" })).toBeVisible({ timeout: 4000 });
  });

  test("ActionFan: Escape folds the fan and focus returns to the whole", async ({ page }) => {
    const fan = card(page, "ActionFan");
    await fan.getByRole("button", { name: "Share" }).focus();
    await page.keyboard.press("Enter");
    await expect(fan.getByRole("button", { name: "Link" })).toBeFocused();
    await expect(fan.getByRole("button", { name: "Close" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(fan.getByRole("button", { name: "Share" })).toBeFocused();
    await expect(fan.getByRole("button", { name: "Link" })).toHaveCount(0);
  });

  test("focus follows the buttons even when it arrived before the page hydrated", async ({ page }) => {
    // Focus the server-rendered button before React is listening, as a quick
    // Tab would; the press after hydration still moves focus to the new buttons.
    await page.goto("/motion", { waitUntil: "commit" });
    const fan = card(page, "ActionFan");
    await fan.getByRole("button", { name: "Share" }).focus();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Enter");
    await expect(fan.getByRole("button", { name: "Link" })).toBeFocused();
  });

  test("Morph: your own buttons divide, change label in place, and fold", async ({ page }) => {
    const morph = card(page, "The base");
    await morph.getByRole("button", { name: "Follow" }).click();
    await expect(morph.getByRole("button", { name: "Following" })).toBeVisible();
    await morph.getByRole("button", { name: "Notify me" }).click();
    await expect(morph.getByRole("button", { name: "Notifying" })).toBeVisible();
    await morph.getByRole("button", { name: "Following" }).click();
    await expect(morph.getByRole("button", { name: "Follow" })).toBeVisible();
    await expect(morph.locator(".echo-morph__body")).toHaveCount(0, { timeout: 3000 });
  });

  test("the body is drawn only while the shape changes; at rest it's real HardwareButtons", async ({ page }) => {
    const done = card(page, "DoneButton");
    await expect(done.locator(".echo-morph__body")).toHaveCount(0);
    await done.getByRole("button", { name: "Mark as done" }).click();
    await expect(done.locator(".echo-morph__body")).toHaveCount(1);
    await expect(done.locator(".echo-morph__body")).toHaveCount(0, { timeout: 3000 });
    await expect(done.locator(".echo-hw__cap")).toHaveCount(2);
    await expect(done.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("a change mid-way lands on the latest state", async ({ page }) => {
    const done = card(page, "DoneButton");
    await done.getByRole("button", { name: "Mark as done" }).click();
    await page.waitForTimeout(120);
    await done.getByRole("button", { name: "Undo" }).click();
    await expect(done.locator(".echo-morph__body")).toHaveCount(0, { timeout: 3000 });
    await expect(done.getByRole("button", { name: "Mark as done" })).toBeVisible();
    await expect(done.locator(".echo-hw").first()).toHaveCSS("opacity", "1");
  });

  test("the gallery is by component: every card says where its motion lives and links there", async ({ page }) => {
    const sections = page.locator(".echo-motion__kind");
    await expect(sections).toHaveCount(7);
    // No single-card rows: every family holds at least two.
    for (const count of await sections.evaluateAll((els) => els.map((el) => el.querySelectorAll(".echo-motion__card").length))) {
      expect(count).toBeGreaterThanOrEqual(2);
    }
    const cards = page.locator(".echo-motion__card");
    for (const card of await cards.all()) {
      const lives = card.locator(".echo-motion__lives");
      await expect(lives).toBeVisible();
      await expect(lives.getByRole("link").first()).toHaveAttribute("href", /^\/docs\/[a-z-]+$/);
    }
  });

  test("the motion every component carries is there too, tagged built in", async ({ page }) => {
    for (const name of ["Press", "Latch", "Hold", "Bud", "Pip", "Typing", "Error shake", "Liquid highlight", "Bloom", "Springs", "Detents", "Slosh", "Ballistics", "Press through", "Pile and flick", "Swipe"]) {
      const card = page.locator(".echo-motion__card", { has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.locator(".echo-motion__tag")).toHaveText("Built in");
    }
  });

  test("no axe violations, whole and divided", async ({ page }) => {
    expect((await axe(page).include(".echo-motion").analyze()).violations).toEqual([]);
    await card(page, "DoneButton").getByRole("button", { name: "Mark as done" }).click();
    await card(page, "ActionFan").getByRole("button", { name: "Share" }).click();
    await page.waitForTimeout(800);
    expect((await axe(page).include(".echo-motion").analyze()).violations).toEqual([]);
  });
});

test.describe("Motion gallery · morph, frame by frame", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/motion");
    await card(page, "DoneButton").getByRole("button", { name: "Mark as done" }).waitFor();
  });

  test("the body is never blank — text shows on every frame of a divide and a fold", async ({ page }) => {
    for (const [title, press] of [
      ["DoneButton", "Mark as done"],
      ["DoneButton", "Undo"],
      ["ConfirmButton", "Delete project"],
    ] as const) {
      const frames = await film(page, title, press, 700);
      const blank = frames.filter((f) => f.text < 0.3);
      expect(blank.map((f) => `${f.at}ms: ${f.text.toFixed(2)}`), `${title} · ${press}`).toEqual([]);
      await page.waitForTimeout(300);
    }
  });

  test("no label shows past the body it rides on", async ({ page }) => {
    await film(page, "ConfirmButton", "Delete project", 900);
    for (const [title, press] of [
      ["ConfirmButton", "Delete"],
      ["DoneButton", "Mark as done"],
      ["DoneButton", "Undo"],
    ] as const) {
      const frames = await film(page, title, press, 700);
      const outside = frames.flatMap((f) =>
        f.body && f.body.opacity > 0.9
          ? f.labels
              .filter((l) => l.left < f.body!.left - 1 || l.right > f.body!.right + 1)
              .map((l) => `${f.at}ms: label ${l.left.toFixed(0)}–${l.right.toFixed(0)}, body ${f.body!.left.toFixed(0)}–${f.body!.right.toFixed(0)}`)
          : [],
      );
      expect(outside, `${title} · ${press}`).toEqual([]);
      await page.waitForTimeout(300);
    }
  });

  test("the colour changes quickly, not through a long muddy mix", async ({ page }) => {
    const frames = await film(page, "DoneButton", "Mark as done", 700);
    // Frames where some stretch is between neutral and primary: a few are the
    // change itself; more is a mauve you can see.
    const mixed = frames.filter((f) => f.lit.some((o) => o > 0.2 && o < 0.8));
    expect(frames.some((f) => f.body)).toBe(true);
    const span = mixed.length ? mixed[mixed.length - 1]!.at - mixed[0]!.at : 0;
    expect(span, mixed.map((f) => f.at).join(",")).toBeLessThanOrEqual(150);
  });

  test("the hand-off fades — the body is already fading on the last frame it's drawn", async ({ page }) => {
    for (const [title, press] of [
      ["DoneButton", "Mark as done"],
      ["DoneButton", "Undo"],
    ] as const) {
      const frames = await film(page, title, press, 1200);
      const drawn = frames.filter((f) => f.body);
      expect(drawn.length, `${title} · ${press}: a body was drawn`).toBeGreaterThan(0);
      const lastDrawn = drawn[drawn.length - 1]!;
      expect(lastDrawn.body!.opacity, `${title} · ${press} at ${lastDrawn.at}ms`).toBeLessThan(0.7);
      await page.waitForTimeout(300);
    }
  });

  test("'Deleted' flows back to its first label instead of snapping", async ({ page }) => {
    await film(page, "ConfirmButton", "Delete project", 800);
    // Confirm, then watch past the 2s the confirmed label stays.
    const frames = await film(page, "ConfirmButton", "Delete", 2800);
    const late = frames.filter((f) => f.at > 1600 && f.body);
    expect(late.length, "a body drawn as the label changes back").toBeGreaterThan(3);
  });
});

test.describe("Motion gallery · reduced motion", () => {
  test("dividing swaps straight to the real buttons: no drawn motion", async ({ page }) => {
    // `emulateMedia`, not `test.use({ reducedMotion })`, which doesn't reach
    // the page here (see reduced-motion.spec.ts); verified before asserting.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/motion");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const done = card(page, "DoneButton");
    await done.getByRole("button", { name: "Mark as done" }).click();
    await expect(done.getByRole("button", { name: "Undo" })).toBeVisible();
    await expect(done.locator(".echo-morph__body")).toHaveCount(0);
  });
});
