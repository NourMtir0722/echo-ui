/**
 * The docs sections of the sidebar, derived from the docs manifest, never
 * hand-maintained: the manifest already drives the docs index and
 * `/docs/[slug]`'s static params, so deriving the sidebar from it too means a
 * new registry item cannot appear in one list and be missing from another.
 *
 * Server-only: the manifest carries every component's metadata, and SiteShell
 * passes the sidebar just the links it draws.
 */
import { DOC_GROUPS, DOC_ITEMS, getDocItem, type DocGroup } from "@/components/docs-manifest";
import { GUIDES } from "@/components/guides";
import { GROUP_OVERVIEW, type NavSection, type OverviewLink } from "@/components/site/site-nav";

export const NAV_SECTIONS: readonly NavSection[] = DOC_GROUPS.map((group) => ({
  group,
  overview: GROUP_OVERVIEW[group],
  items: DOC_ITEMS.filter((d) => d.group === group).map((d) => ({
    href: `/docs/${d.slug}`,
    label: d.meta.title,
  })),
})).filter((s) => s.items.length > 0);

/** The group overviews, for the docs index cards. */
export const GROUP_OVERVIEWS: readonly (OverviewLink & { group: DocGroup; count: number })[] =
  NAV_SECTIONS.filter((s) => s.overview).map((s) => ({
    ...s.overview!,
    group: s.group,
    count: s.items.length,
  }));

/*
 * A guide and a component page share /docs/<slug>. Next resolves the static
 * guide route first and would silently hide the component's page, so a clash
 * stops the build here instead.
 */
for (const g of GUIDES) {
  if (g.slug && getDocItem(g.slug)) {
    throw new Error(`Guide "/docs/${g.slug}" collides with the component page of the same slug`);
  }
}
