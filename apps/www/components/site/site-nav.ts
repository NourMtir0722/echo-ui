/**
 * The site navigation model: the links, and what the client needs to draw
 * them. The docs sections themselves are derived from the docs manifest in
 * docs-nav.ts, on the server, and handed to the sidebar as plain data: this
 * module is read by client components on every page, and importing the
 * manifest here put every component's metadata into every page's scripts.
 *
 * Galleries are NOT a parallel navigation any more. A gallery is the *group
 * overview* — the whole family composed on one page, which is a different
 * artifact from a component's own page — so it hangs off its group here and
 * off the component page as a "see every state" link. Nothing links to a
 * gallery as a top-level destination.
 */
import type { DocGroup } from "@registry/agent/groups";
import { BRAND_PAGES } from "@/components/brand/brand-manifest";

export interface NavLink {
  href: string;
  label: string;
  /** Extra route prefixes that keep this top-nav entry lit. */
  covers?: readonly string[];
}

/**
 * A group overview. `label` is the *editorial* title of the composed page and
 * is omitted when it would only repeat the group name — "Overlays · Overlays"
 * is noise, and the sidebar falls back to "overview".
 */
export interface OverviewLink {
  href: string;
  label?: string;
}

export interface NavSection {
  group: DocGroup;
  /** The composed showcase for the whole group, if one exists. */
  overview?: OverviewLink;
  items: readonly NavLink[];
}

/** Top bar. Deliberately short: destinations, not a table of contents. */
export const TOP_NAV: readonly NavLink[] = [
  // A gallery is a docs page (the group overview), so Docs stays lit there.
  { href: "/docs", label: "Docs", covers: ["/gallery"] },
  { href: "/motion", label: "Motion" },
  { href: "/templates", label: "Templates" },
  { href: "/generator", label: "Themes" },
  { href: "/styles", label: "Styles" },
  { href: "/audition", label: "Sound" },
  { href: "/tactile", label: "Tactile" },
  // Not Support: the bar ends in its key, Support Echo (SiteTopBar.tsx), on every page.
];

/** The bar on the landing: a first visit meets Echo's own look, and the other styles wait in the docs. */
export const LANDING_NAV: readonly NavLink[] = TOP_NAV.filter((link) => link.href !== "/styles");

/**
 * The interactive tools, pinned above the component groups in the sidebar.
 *
 * They are the same four destinations as the top bar's Themes / Styles /
 * Sound / Tactile, listed again because the sidebar is where people look for
 * everything else — Themes being reachable only from the rail read as Themes
 * not existing. They are not registry items, so they cannot come from the docs
 * manifest; this is the one hand-kept list, and it is four entries long.
 */
export const TOOLS: readonly NavLink[] = [
  { href: "/generator", label: "Theme generator" },
  // Not "Styles": that's the guide, a few lines above it in the same sidebar.
  { href: "/styles", label: "Style switcher" },
  { href: "/audition", label: "Sound audition" },
  { href: "/tactile", label: "Tactile bench" },
];

/**
 * The brand pages, below the tools. Hand-kept for the same reason as TOOLS —
 * the brand belongs to the site alone, so it has no registry items and no
 * docs-manifest entries — but derived from the brand manifest, so the route
 * list and this list cannot disagree.
 */
export const BRAND: readonly NavLink[] = BRAND_PAGES.map((p) => ({
  href: `/brand/${p.slug}`,
  label: p.title,
}));

/**
 * Group → the gallery route that composes that family on one page. The
 * galleries were built before the groups were named for what you're
 * building, so each label says what the page actually shows.
 */
export const GROUP_OVERVIEW: Partial<Record<DocGroup, OverviewLink>> = {
  Forms: { href: "/gallery/controls", label: "switches & sliders" },
  Overlays: { href: "/gallery/overlays" },
  Navigation: { href: "/gallery/navigation", label: "pages & steps" },
  Layout: { href: "/gallery/structure", label: "tabs & accordion" },
  "Data display": { href: "/gallery/primitives", label: "badges & tags" },
  Feedback: { href: "/gallery/surfaces", label: "progress & toasts" },
  Texture: { href: "/gallery/textures" },
  Motion: { href: "/motion", label: "the gallery" },
  Templates: { href: "/templates", label: "every template, side by side" },
};

/**
 * Slug → the gallery that shows every state of that one component. Three
 * galleries are component-scoped rather than group-scoped; this is where that
 * asymmetry is recorded instead of being re-derived per page.
 */
const ITEM_SHOWCASE: Record<string, NavLink> = {
  console: { href: "/templates/console", label: "the screen, running" },
  chat: { href: "/templates/chat", label: "the screen, running" },
  "hardware-button": { href: "/gallery/hardware-button", label: "every state, retheme" },
  modal: { href: "/gallery/modal", label: "open, exit, focus trap" },
  "led-key": { href: "/gallery/keys", label: "keys & plates" },
  "engraved-plate": { href: "/gallery/keys", label: "keys & plates" },
};

export function showcaseFor(slug: string): NavLink | undefined {
  return ITEM_SHOWCASE[slug];
}
