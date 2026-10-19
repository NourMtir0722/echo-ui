"use client";

/* ----------------------------------------------------- try-it previews */

/*
 * The display parts move when something changes (a count, a reading, a
 * power-on), and a static preview never changes. These give each one the
 * controls to make it happen.
 */

/**
 * Readouts power on the first time they scroll into view, which on a docs
 * page has already happened. This plays it again: off, then on a frame later,
 * so the boot animation restarts.
 */
export function powerCycle(root: HTMLElement | null, selector: string) {
  root?.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.setAttribute("data-boot", "off");
    requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute("data-boot", "on")));
  });
}
