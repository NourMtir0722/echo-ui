/**
 * One route for every registry item. The manifest is the
 * single source of truth: add an item there and its page exists, its slug is
 * prerendered, and the docs index links it — no per-component route file to
 * forget.
 */
import { notFound } from "next/navigation";
import { DOC_SLUGS, getDocItem } from "@/components/docs-manifest";
import { DocPage } from "@/components/DocPage";
import { docPageData } from "@/components/docs-server";

/** Only the manifest's slugs exist; anything else 404s instead of rendering. */
export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDocItem(slug);
  if (!entry) return {};
  return { title: `${entry.meta.title} — Echo UI`, description: entry.meta.description };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDocItem(slug);
  if (!entry) notFound();
  // The zod schema stays here: it isn't data a client component can receive,
  // and `entry.props` is already its rows.
  const { props: _schema, ...meta } = entry.meta;
  return <DocPage slug={entry.slug} meta={meta} props={entry.props} data={docPageData(entry)} />;
}
