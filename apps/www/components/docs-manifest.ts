/**
 * The docs manifest. ONE list drives the docs index, the
 * static params for /docs/[slug], and the page each slug renders — so a new
 * registry item can never quietly end up with no page, the way a missing
 * METAS entry used to leave an item with no examples.
 *
 * Deliberately a plain module (no "use client"): a server component reads it
 * to generate routes, and a client component reads it for copy. Previews are
 * the client half and live in docs-previews.tsx.
 */
import { describeProps, type CatalogProp } from "@registry/agent/props";
import { ALL_METAS, type MetaName } from "@registry/agent/metas";
import type { MetaDocsFields } from "@registry/agent/meta-types";
import { DOC_GROUPS, GROUP_OF, type DocGroup } from "@registry/agent/groups";

export { DOC_GROUPS, type DocGroup };

/** A meta as the docs read it: the core meta fields plus the docs fields. */
export interface DocMeta extends MetaDocsFields {
  name: string;
  title: string;
  description: string;
  /**
   * The zod prop schema. `unknown` rather than a zod type
   * because the walker in `describeProps` is the only thing that reads it —
   * typing it as a ZodObject here would pull zod into the site's type graph
   * for no gain.
   */
  props?: unknown;
  /**
   * Prose to show instead of a table, for the two compound components whose
   * props are Base UI's rather than Echo's. Tabulating a passthrough would
   * restate Base UI's docs and go stale against them.
   */
  propsNote?: string;
  examples: readonly { title: string; description: string; code: string }[];
  antiPatterns: readonly string[];
}

export interface DocItem {
  /** URL segment. The registry name minus the `echo-` prefix. */
  slug: string;
  group: DocGroup;
  meta: DocMeta;
  /**
   * Prop rows for the doc page's table, walked out of `meta.props` by the SAME
   * function that builds the agent catalog — so the table a human reads and
   * the props an agent is told about cannot drift apart. Derived once at module
   * scope, not per render.
   */
  props: readonly CatalogProp[];
}

/** Registry name → URL slug. Keeps /docs/hardware-button stable. */
const toSlug = (name: string) => name.replace(/^echo-/, "");

const item = (group: DocGroup, meta: DocMeta): DocItem => ({
  slug: toSlug(meta.name),
  group,
  meta,
  props: describeProps(meta.props),
});

const metaByName = new Map<string, DocMeta>(ALL_METAS.map((m) => [m.name, m]));

export const DOC_ITEMS: readonly DocItem[] = (Object.keys(GROUP_OF) as MetaName[]).map((name) =>
  item(GROUP_OF[name], metaByName.get(name)!),
);

export const DOC_SLUGS: readonly string[] = DOC_ITEMS.map((d) => d.slug);

export function getDocItem(slug: string): DocItem | undefined {
  return DOC_ITEMS.find((d) => d.slug === slug);
}
