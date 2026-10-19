import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND_PAGES, getBrandPage } from "@/components/brand/brand-manifest";
import { BrandPageView } from "@/components/brand/BrandPages";

export const dynamicParams = false;

export function generateStaticParams() {
  return BRAND_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getBrandPage((await params).slug);
  return page ? { title: `${page.title} — Echo UI`, description: page.lede } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getBrandPage(slug)) notFound();
  return <BrandPageView slug={slug} />;
}
