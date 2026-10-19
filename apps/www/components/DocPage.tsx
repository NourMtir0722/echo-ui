"use client";

/**
 * The client half of a doc page: theme + sound context, then ComponentDoc
 * rendered from the manifest entry, the matching live preview, and the data
 * the server read from registry.json and CHANGELOG.md (docs-server.ts).
 */
import { SoundProvider } from "echo-ui-core/sound";
import "echo-ui-core/theme/material.css";
import type { CatalogProp } from "@registry/agent/props";
import { ComponentDoc } from "@/components/ComponentDoc";
import type { DocMeta } from "@/components/docs-manifest";
import { DOC_PREVIEWS } from "@/components/docs-previews";
import type { DocPageData } from "@/components/docs-server";

/**
 * `meta` and `props` come from the server page, read from the manifest there:
 * the manifest holds every component's metadata, and a page needs its own.
 * `meta` arrives without its zod schema, which `props` already describes.
 */
export function DocPage({ slug, meta, props, data }: { slug: string; meta: DocMeta; props: readonly CatalogProp[]; data: DocPageData }) {
  // Only this page's preview is loaded: each is its own module.
  const Preview = DOC_PREVIEWS[slug];
  return (
    <SoundProvider>
      <ComponentDoc meta={meta} props={props} preview={Preview ? <Preview /> : null} data={data} />
    </SoundProvider>
  );
}
