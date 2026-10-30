"use client";

/**
 * The site's rail contents.
 *
 * The rail's CHASSIS is now `echo-app-shell`'s. What survives here is the part
 * that is this site's rather than any app's: the wordmark, the destinations
 * with the current one lit, and one filled key, Support Echo, on every page:
 * the same key the homepage's hero ends its nav with, so it doesn't change
 * when the hero scrolls away.
 *
 * The homepage renders these directly into its own AppShell.Rail (it wants the
 * rail without the 46-item sidebar); the docs shell renders them alongside its
 * phone-nav toggle. Both get one implementation, so "one list" survives having
 * two surfaces.
 *
 * Client-side only because of `usePathname` (the current-section rail).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardwareButton } from "@registry/echo/hardware-button";
import { TOP_NAV, type NavLink } from "@/components/site/site-nav";
import { Flower } from "@/components/brand/Logo";
import { DeviceSwitch } from "@/components/site/DeviceSwitch";
import type { Seed } from "@/components/site/seeds";
import "./site-shell.css";

export function Wordmark() {
  return (
    // The brand mark, not a type treatment of it: the flower, the Fredoka
    // wordmark, and "UI" in the text face to say which Echo this is.
    <Link className="echo-wordmark" href="/" aria-label="Echo UI — home">
      <Flower m={18} tier="standard" />
      <span className="echo-wordmark__word" aria-hidden="true">
        ECHO
      </span>
      {/* The words' own space: without it the text reads "ECHOUI", which isn't in the
          link's name. A flex container draws no box for it, so the gap still spaces them. */}{" "}
      <span className="echo-wordmark__ui" aria-hidden="true">
        UI
      </span>
    </Link>
  );
}

export function TopNavLinks({
  links = TOP_NAV,
  opening,
  tools,
}: {
  /** The destinations: every one but on the landing, which has a list of its own. */
  links?: readonly NavLink[];
  /** The page's opening colour, for the light key. */
  opening?: Seed;
  /** In the light key's place: the landing's own (GitHub, X). */
  tools?: React.ReactNode;
} = {}) {
  const pathname = usePathname();

  /** A destination stays lit while you are anywhere beneath it. */
  const current = (link: { href: string; covers?: readonly string[] }) => {
    const prefixes = [link.href, ...(link.covers ?? [])];
    return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "page" : undefined;
  };

  return (
    <>
      {links.map((link) => (
        <Link key={link.href} className="echo-topnav__link" href={link.href} aria-current={current(link)}>
          {link.label}
        </Link>
      ))}
      {/* Echo's two devices, at a press: light plastic or dark, the same accent. Or the page's own tools. */}
      {tools ?? <DeviceSwitch opening={opening} />}
      {/* Support, on every page: the bar's one key, lit like a destination on /support itself. */}
      <span className="echo-topnav__key">
        <HardwareButton size="sm" variant="primary" href="/support" aria-current={current({ href: "/support" })}>
          Support Echo
        </HardwareButton>
      </span>
    </>
  );
}
