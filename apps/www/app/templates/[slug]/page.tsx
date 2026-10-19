/**
 * One route per template. The manifest is the source of truth,
 * so adding a block gives it a route, a note and a place in the nav at once.
 */
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { TEMPLATE_SLUGS, getTemplate } from "@/components/templates-manifest";
import { TemplatePage } from "@/components/TemplatePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getTemplate(slug);
  if (!entry) return {};
  return { title: `${entry.title} template — Echo UI`, description: entry.description };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getTemplate(slug);
  if (!entry) notFound();
  return (
    <SiteShell>
      <TemplatePage entry={entry} />
    </SiteShell>
  );
}
