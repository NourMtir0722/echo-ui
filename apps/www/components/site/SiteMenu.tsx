"use client";

/**
 * The site's destinations on a narrow window, where the bar alone wasn't made
 * for a phone. Under 56.25rem the rail can't hold them in a row: they
 * scrolled sideways under a fade, the page's own keys (GitHub, X) and Support
 * Echo out of sight past them. Instead the rail keeps the wordmark and one key,
 * Menu, its three lines alone (wordmark, Support Echo and a worded Menu
 * crowded a phone's bar). It opens a sheet with every destination
 * one under another, as big as a finger needs, the current one lit as the bar
 * lights it, and under them the bar's right-hand side: the page's own keys and
 * Support Echo.
 *
 * The key is the docs' phone toggle (`echo-navtoggle`, site-shell.css): chrome,
 * not a cap, shown at the same width the docs show theirs. The list is
 * TOP_NAV, so the bar and the menu are one list.
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Sheet } from "@registry/echo/sheet";
import { TOP_NAV, type NavLink } from "@/components/site/site-nav";

export function SiteMenu({ links = TOP_NAV, tools }: { links?: readonly NavLink[]; tools?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = (link: { href: string; covers?: readonly string[] }) =>
    [link.href, ...(link.covers ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "page" : undefined;

  return (
    <Sheet side="right" open={open} onOpenChange={setOpen}>
      <Sheet.Trigger className="echo-navtoggle echo-navtoggle--icon" aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </Sheet.Trigger>
      <Sheet.Content title="Menu" className="echo-sitemenu">
        <nav aria-label="Site">
          <ul className="echo-sitemenu__list">
            {links.map((link) => (
              <li key={link.href}>
                <Link className="echo-sitemenu__link" href={link.href} aria-current={current(link)} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="echo-sitemenu__tools">
          {tools}
          <HardwareButton variant="primary" href="/support" aria-current={pathname === "/support" ? "page" : undefined}>
            Support Echo
          </HardwareButton>
        </div>
      </Sheet.Content>
    </Sheet>
  );
}
