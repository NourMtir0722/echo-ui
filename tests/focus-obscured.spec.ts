import { test, expect, type Page } from "@playwright/test";

/**
 * Focus is never hidden behind sticky chrome (WCAG 2.4.11 Focus Not Obscured).
 *
 * Tabbing backwards up a long page is where this fails: the browser scrolls
 * the focused element to the top edge of the viewport, under a sticky header.
 * After every Tab and Shift+Tab, some part of the focused element has to be
 * what the pointer would hit.
 */
const PAGES = ["/docs/hardware-button", "/docs/theming", "/gallery/controls", "/templates/console"];

/**
 * Wait for the scroll this keypress started to finish.
 *
 * WebKit scrolls asynchronously — the scroll is driven outside the page's own
 * event loop, so the position script can read lags the keypress by a frame or
 * more. Measuring immediately caught elements mid-flight, below the fold, and
 * reported them as hidden under chrome they were nowhere near. Chromium
 * happened to have settled by the time the assertion ran, which is why one
 * engine never showed it.
 *
 * This waits for the position to stop changing rather than sleeping a fixed
 * time: no delay once it has settled, and no guess that is too short on a
 * loaded machine.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const deadline = Date.now() + 2000;
        let last = window.scrollY;
        let still = 0;
        const tick = () => {
          if (window.scrollY === last) still++;
          else {
            still = 0;
            last = window.scrollY;
          }
          if (still >= 3 || Date.now() > deadline) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

async function visible(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;

    /*
     * Only chrome that FOLLOWS the scroll can obscure focus the way 2.4.11
     * means it, and that is what this spec is named for.
     *
     * Several Echo controls put a visually hidden native input inside the part
     * that draws the ring — Slider focuses an `<input type="range">` inside
     * `.echo-slider__thumb`, and the thumb matches `:has(:focus-visible)`
     * because the input never does. `elementFromPoint` over that input
     * returns the thumb's own grip, a sibling, so a plain "is the hit me or
     * mine" test called the control's own rendering an obstruction. The focus
     * ring was on screen the whole time.
     *
     * So a cover only counts when it sits in a sticky or fixed subtree. That
     * narrows the spec to the failure it exists for; an overlay that is neither
     * is a modal, and a modal traps focus rather than hiding it.
     */
    const isChrome = (node: Element | null): boolean => {
      for (let n = node; n && n !== document.body; n = n.parentElement) {
        const position = getComputedStyle(n).position;
        if (position === "sticky" || position === "fixed") return true;
      }
      return false;
    };

    const xs = [r.left + 2, r.left + r.width / 2, r.right - 2];
    const ys = [r.top + 2, r.top + r.height / 2, r.bottom - 2];
    let covering: Element | null = null;
    for (const x of xs) {
      for (const y of ys) {
        if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) continue;
        const hit = document.elementFromPoint(x, y);
        // An ancestor hit (body under a fixed ::before) means something is
        // covering it, so only the element itself or its own descendants count.
        if (hit && (hit === el || el.contains(hit))) return null;
        if (hit && !covering && isChrome(hit)) covering = hit;
      }
    }
    if (!covering) return null;
    const label = (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30);
    const by = `${covering.tagName.toLowerCase()}.${String(covering.className).split(" ")[0]}`;
    return `<${el.tagName.toLowerCase()}> "${label}" at y=${Math.round(r.top)} under ${by}`;
  });
}

for (const path of PAGES) {
  test(`focus is never hidden under sticky chrome: ${path}`, async ({ page }) => {
    /*
     * Runs on WebKit too, unmasked (fixed).
     *
     * It was `test.fixme` here on the reading that WebKit does not apply
     * `scroll-padding` to sequential focus navigation. It does. The rule that
     * was tried read `--echo-shell-rail-h` from `:root`, where a property
     * declared on `.echo-shell` is out of scope, so the `calc()` was invalid at
     * computed-value time and the declaration computed to `auto` — on BOTH
     * engines. `app-shell.css` now sets `scroll-margin-block-start` inside the
     * subtree that owns the property, and `targets.css` pads the document
     * scrollport for the nested `overflow: hidden` case.
     *
     * Keep it on WebKit. The rail failure here is engine-visible only because
     * Chromium's backward-tab scroll happens to land clear of the rail; that is
     * alignment luck, not a contract, and the same page failed on Chromium the
     * moment it was reproduced in isolation.
     */
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const hidden: string[] = [];
    const stops = await page.locator("a[href], button:not([disabled]), input:not([type=hidden]), textarea, [tabindex='0']").count();
    const steps = Math.min(stops, 80);
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("Tab");
      await settled(page);
      const h = await visible(page);
      if (h) hidden.push(`Tab: ${h}`);
    }
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("Shift+Tab");
      await settled(page);
      const h = await visible(page);
      if (h) hidden.push(`Shift+Tab: ${h}`);
    }
    expect([...new Set(hidden)]).toEqual([]);
  });
}
