import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * One axe scan, configured once, for both engines.
 *
 * Base UI renders focus sentinels around a portalled overlay —
 * `<span tabindex="0" data-base-ui-focus-guard role="button">`, visually
 * hidden, with no accessible name. They are how focus is kept inside an open
 * dialog, and they are not Echo's markup: nothing in this repo creates them
 * and nothing here can name them.
 *
 * They are excluded because axe disagrees with ITSELF about them across
 * engines. Chromium's run does not flag them; WebKit's reports
 * `aria-command-name` on every one, which turned four overlay specs red for a
 * span the user never meets. Leaving the scan engine-dependent would make the
 * WebKit project noise, and noise is how a real violation gets waved through.
 *
 * Everything Echo actually authors is still scanned, on both engines. If Base
 * UI gives these guards a name or drops the role, delete this and the tests
 * will not notice.
 *
 * A scan waits for what's entering the page to land first: text
 * caught halfway through a fade-in is measured at the contrast it has for a
 * frame. Only animations that end are waited for, and never more than 3s, so
 * a spinner or a breathing light doesn't hold the scan up.
 */
export function axe(page: Page): AxeBuilder {
  const builder = new AxeBuilder({ page }).exclude("[data-base-ui-focus-guard]");
  const analyze = builder.analyze.bind(builder);
  builder.analyze = async () => {
    await settled(page);
    return analyze();
  };
  return builder;
}

/** Every animation on the page that ends has ended (3s at most). */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ending = document.getAnimations().filter((a) => a.playState === "running" && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
    const landed = Promise.all(ending.map((a) => a.finished.then(() => undefined, () => undefined)));
    return Promise.race([landed, new Promise((done) => setTimeout(done, 3_000))]);
  });
}
