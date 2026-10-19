/**
 * The page wearing a style for a while: what Echo's press on "Wear this
 * style" does (chapter 3).
 *
 * It isn't the visitor's choice, so it's never saved and never touches the
 * site's own theme (theme-store.ts). It's one stylesheet of its own, written
 * after every other, under `:root[data-journey-wear]`: as specific as the
 * homepage's opening colours (`:root:not([data-seed-chosen])`) and later, so
 * it wins over them and over a colour the visitor picked, and comes off
 * cleanly. A drawn style also marks <html> as drawn, the way the site's own
 * drawn look does, so the page's drawn rules apply.
 *
 * Echo in 3D reads the page's colours only when told to (`RELIGHT_EVENT`).
 */
import { siteTheme } from "@/components/site/site-theme";
import { DRAWN_ATTR } from "@/components/site/theme-boot";

type Seed = NonNullable<Parameters<typeof siteTheme>[0]>;

const ID = "echo-journey-wear";
const ATTR = "data-journey-wear";
export const RELIGHT_EVENT = "echo-relight";

/** Whether <html> was drawn before the page put a style on, so taking it off puts that back. */
let drawnBefore: boolean | null = null;

export function wearOnPage(seed: Seed | null) {
  const root = document.documentElement;
  const el = document.getElementById(ID);
  if (seed === null) {
    if (!el) return;
    el.remove();
    root.removeAttribute(ATTR);
    if (drawnBefore !== null) root.toggleAttribute(DRAWN_ATTR, drawnBefore);
    drawnBefore = null;
  } else {
    const style = el ?? document.createElement("style");
    style.id = ID;
    style.textContent = siteTheme(seed, { selector: `:root[${ATTR}]` }).css;
    // Last in the document, so it comes after the page's own opening colours too.
    document.body.append(style);
    if (drawnBefore === null) drawnBefore = root.hasAttribute(DRAWN_ATTR);
    root.setAttribute(ATTR, "");
    root.toggleAttribute(DRAWN_ATTR, seed.render === "drawn");
  }
  window.dispatchEvent(new Event(RELIGHT_EVENT));
}
