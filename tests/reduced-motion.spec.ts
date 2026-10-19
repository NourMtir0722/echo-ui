import { expect, test, type Page } from "@playwright/test";

/**
 * Reduced motion as the SUBJECT, not as a stabilizer.
 *
 * Five specs already emulate `reducedMotion: "reduce"` — `device`, `rtl`,
 * `forced-colors`, `focus-contrast`, `focus-obscured` — and every one of them
 * does it to stop animation making a screenshot or a measurement flaky. None
 * of them asserts anything about reduced motion itself. So nothing failed if a
 * component stopped consulting the resolver, if a CSS transition arrived
 * without a `prefers-reduced-motion` guard, or if a GSAP tween ran at full
 * amplitude for someone who asked it not to.
 *
 * For a library whose whole proposition is motion, sound and tactile feedback,
 * and which claims WCAG 2.2 AA as a floor, that was the most consequential gap
 * in the suite. The resolver itself is well covered by unit tests
 * (`echo-tactile.test.ts`); what was missing is the WIRING, which only a
 * browser can show.
 *
 * Two halves, matching the two ways motion reaches the screen:
 *
 * 1. CSS transitions — nothing may animate a transform under `reduce`.
 * 2. GSAP exits — an overlay must LEAVE immediately rather than waiting out a
 *    tween that is not going to run. That one is the accessibility bug users
 *    actually feel: a dialog that takes 300ms to disappear when you asked for
 *    no animation still takes 300ms.
 */
/*
 * `page.emulateMedia`, not `test.use({ reducedMotion })`. The declarative form
 * did not reach the page here — `matchMedia("(prefers-reduced-motion: reduce)")`
 * still reported false — so the first version of this spec measured ordinary
 * motion and "failed" for the wrong reason. The imperative call is also what
 * the five existing specs use, and it is verified below before anything is
 * asserted, because a reduced-motion test that is not in reduced motion passes
 * or fails at random and means nothing either way.
 */
async function reduceMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const applied = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  expect(applied, "reduced motion was not applied — this spec would prove nothing").toBe(true);
}

/** Pages that between them render every animated surface Echo ships. */
const GALLERIES = [
  "/gallery/controls",
  "/gallery/hardware-button",
  "/gallery/keys",
  "/gallery/surfaces",
  "/gallery/primitives",
  "/gallery/navigation",
];

/**
 * Every element's transform, keyed by a stable identity.
 *
 * The subject is MOVEMENT, not position. Echo renders plenty of static
 * transforms by design — a centred aura is a translate, an engraved plate is
 * a fixed 3-degree rotation — and those are layout, not animation. What must
 * not happen under `reduce` is a transform CHANGING when you touch something.
 * So this samples, and the test compares two samples.
 */
async function transforms(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    document.querySelectorAll<HTMLElement>("*").forEach((el, i) => {
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return;
      out[`${i}:${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)] = t;
    });
    return out;
  });
}

/** Which keys differ between two samples, and how. */
function moved(before: Record<string, string>, after: Record<string, string>): string[] {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(after)) {
    const was = before[key];
    if (was !== undefined && was !== value) changed.push(`${key}: ${was} → ${value}`);
  }
  return changed;
}

/**
 * Hovering and pressing every control is where movement would show: Echo's
 * caps travel on press, its keys depress, its tabs slide. Under `reduce` all
 * of that has to resolve to nothing, so the transform a control has at rest
 * is the transform it keeps while held down.
 */
for (const path of GALLERIES) {
  test(`nothing travels under reduced motion: ${path}`, async ({ page }) => {
    await reduceMotion(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const atRest = await transforms(page);

    const controls = page.locator("button:not([disabled]), [role='tab'], [role='radio']");
    const n = Math.min(await controls.count(), 20);
    const travelled: string[] = [];

    for (let i = 0; i < n; i++) {
      const el = controls.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;

      /*
       * Pressing a real control can open a Select, a menu or a dialog, which
       * moves the page under the next iteration. Each press is therefore
       * isolated: anything it opened is dismissed before the next one, and a
       * control that refuses to be pressed is skipped rather than failing a
       * test about motion.
       */
      try {
        await el.hover({ timeout: 2000 });
        await page.mouse.down();
        // Mid-press is the moment a travelling cap would be caught in flight.
        travelled.push(...moved(atRest, await transforms(page)));
      } catch {
        continue;
      } finally {
        await page.mouse.up().catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
      }
    }

    expect(
      [...new Set(travelled)],
      `${path} moved something mid-press under reduced motion`,
    ).toEqual([]);
  });
}

/*
 * THE GSAP HALF IS NOT HERE, AND THAT IS DELIBERATE.
 *
 * The obvious ask is a per-component assertion that the exit tween "resolves
 * immediately" under reduced motion. Two versions were written and both were
 * thrown away, because neither had teeth:
 *
 * 1. "The exit is under 150ms." Measured from the test side that is ~60ms of
 *    key dispatch and locator polling on top of the real unmount, so it was
 *    measuring the harness as much as the component.
 * 2. "The exit is shorter under reduce than without it." Modal reads 290ms
 *    animated and 181ms reduced, which looks like proof — until you disable
 *    the reduced branch in `use-gsap-presence.ts` and it STILL reads 181ms,
 *    and delete modal's `prefers-reduced-motion` CSS block and it still
 *    passes. The difference is real but not attributable, so the assertion
 *    would have gone green over exactly the regressions it named.
 *
 * A transform-value check does not work either: GSAP normalises an element's
 * transform even when it is only tweening opacity, so sampling every frame
 * reports movement on correct code.
 *
 * The honest conclusion is that the GSAP exit contract is not observable from
 * outside the browser API — it needs a unit test of `use-gsap-presence` that
 * drives the hook and asserts which vars GSAP was handed, and that test does
 * not exist yet. What is above covers
 * the CSS half properly, which is where the untested surface actually was:
 * 49 components' worth of transitions, none of which had an assertion before.
 *
 * `resolve-motion.ts` itself remains well covered by `echo-tactile.test.ts`.
 */
