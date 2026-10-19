import type { Page } from "@playwright/test";

/**
 * An overlay's exit, watched from inside the page every frame.
 *
 * A test that presses Escape, waits a few milliseconds and then looks sees
 * wherever the exit has got to on that machine at that moment: a busy runner
 * looked after the popup had gone, a quiet one before it began to fade. Both
 * of these start before the press and follow the exit frame by frame instead.
 */

/** The popup's opacity on every frame from now until it unmounts. */
export function opacityUntilUnmount(page: Page, popup: string): Promise<number[]> {
  return page.evaluate(
    (selector) =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        const tick = () => {
          const el = document.querySelector(selector);
          if (!el) return resolve(seen);
          seen.push(parseFloat(getComputedStyle(el).opacity));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    popup,
  );
}

/**
 * Presses `trigger` on the first frame the popup is fading out, so it reopens
 * mid-exit however busy the machine. False if the popup had gone first.
 */
export function reopenMidExit(page: Page, popup: string, trigger: string): Promise<boolean> {
  return page.evaluate(
    ([popupSelector, triggerSelector]) =>
      new Promise<boolean>((resolve) => {
        const tick = () => {
          const el = document.querySelector(popupSelector);
          if (!el) return resolve(false);
          if (parseFloat(getComputedStyle(el).opacity) < 1) {
            document.querySelector<HTMLElement>(triggerSelector)!.click();
            return resolve(true);
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [popup, trigger] as const,
  );
}
