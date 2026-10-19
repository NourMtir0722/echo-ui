import { test, expect } from "@playwright/test";
import { findHorizontalOverflow } from "./helpers/layout";

/**
 * The overflow sweep only exempted the visually-hidden idiom when it
 * measured 1px, but Base UI sizes the Slider's hidden range input to the
 * thumb (so VoiceOver's focus ring matches it). WebKit 26.6 gives a range
 * input 24px of internal width, so the small slider's 20px input reported
 * `24 > 20` and failed the reflow and layout sweeps on a page that did not
 * scroll sideways at all. An element clipped away by `clip-path: inset(50%)`
 * shows nothing, whatever its size, so nothing in it can be lost.
 *
 * Built with setContent so it fails the same way in every engine, not only in
 * the WebKit that exposed it.
 */
test("a visually hidden element larger than 1px is not reported as overflow", async ({ page }) => {
  await page.setContent(`
    <div id="hidden" style="clip-path: inset(50%); overflow: hidden; width: 20px; height: 20px">
      <div style="width: 40px; height: 10px"></div>
    </div>
  `);
  expect(await findHorizontalOverflow(page)).toEqual([]);
});

test("the same box, visible, still is", async ({ page }) => {
  await page.setContent(`
    <div class="echo-visible" style="overflow: hidden; width: 20px; height: 20px">
      <div style="width: 40px; height: 10px"></div>
    </div>
  `);
  const found = await findHorizontalOverflow(page);
  expect(found.map((o) => o.selector)).toContain("html > body > .echo-visible");
});
