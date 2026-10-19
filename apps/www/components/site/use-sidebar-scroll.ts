"use client";

/**
 * Keeps the sidebar where you left it.
 *
 * Within one section (docs → docs) the sidebar is never unmounted now that
 * its links are next/link, so its scroll survives on its own. Across sections
 * it cannot: /docs, /gallery, /templates, /brand and the tools each have their
 * own layout, so each renders its own SiteShell, and going from a doc to a
 * gallery builds a new sidebar at scrollTop 0. That is the "it takes me back
 * to the top" the list used to do on every click, when every link was a full
 * page load.
 *
 * So the position is saved as you scroll (per tab, sessionStorage) and put
 * back when a sidebar mounts. Then, if the page you landed on is not visible
 * in the list — a link followed from somewhere else — it is brought into view,
 * nearest edge only, so a list you just scrolled is not yanked.
 */
import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "echo-sidenav-scroll";
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const read = () => {
  try {
    return Number(window.sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};
const write = (y: number) => {
  try {
    window.sessionStorage.setItem(KEY, String(Math.round(y)));
  } catch {
    /* storage blocked — the list just starts at the top */
  }
};

export function useSidebarScroll(selector = ".echo-shell__side") {
  const pathname = usePathname();

  // Restore before paint, so the list never flashes at the top first.
  useIsoLayoutEffect(() => {
    const side = document.querySelector<HTMLElement>(selector);
    if (!side) return;
    side.scrollTop = read();

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => write(side.scrollTop));
    };
    side.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      side.removeEventListener("scroll", onScroll);
    };
  }, [selector]);

  // On every navigation: make sure the current page's entry is on screen.
  useIsoLayoutEffect(() => {
    const side = document.querySelector<HTMLElement>(selector);
    const current = side?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!side || !current) return;
    const s = side.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    // Moves the SIDEBAR only. scrollIntoView would also scroll the page,
    // and a page you just opened belongs at its top.
    const pad = 24;
    if (c.top < s.top) side.scrollTop -= s.top - c.top + pad;
    else if (c.bottom > s.bottom) side.scrollTop += c.bottom - s.bottom + pad;
    else return;
    write(side.scrollTop);
  }, [pathname, selector]);
}
