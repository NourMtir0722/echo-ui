import { test, expect } from "@playwright/test";

/**
 * SoundProvider opens an AudioContext on the first press and never
 * closed it, so a provider inside a page (as on Echo's own gallery, audition
 * and tactile pages) left one open for every visit: each one an audio thread
 * the browser keeps running, until it refuses to make more. The context goes
 * with the provider now.
 */
test("the AudioContext a SoundProvider opened closes when it unmounts", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "one engine is enough to count audio contexts");
  await page.addInitScript(() => {
    const opened: AudioContext[] = [];
    (window as unknown as { __contexts: AudioContext[] }).__contexts = opened;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        opened.push(this);
      }
    } as typeof AudioContext;
  });
  await page.goto("/checks/sound-remount");
  const states = () => page.evaluate(() => (window as unknown as { __contexts: AudioContext[] }).__contexts.map((c) => c.state));

  for (let visit = 0; visit < 3; visit++) {
    await page.getByRole("button", { name: "Mount sound" }).click();
    await page.getByRole("button", { name: "Press" }).click();
    await page.getByRole("button", { name: "Unmount sound" }).click();
  }
  await expect.poll(states).toEqual(["closed", "closed", "closed"]);
});
