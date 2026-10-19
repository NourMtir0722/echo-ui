/**
 * The brand pages — one list, read by the route's static params, the page
 * header and the sidebar. A plain module (not "use client") for the same
 * reason docs-manifest is: a server component reads it for
 * generateStaticParams, and a client module would hand it a reference proxy
 * instead of the array.
 *
 * The brand is site-only: the creature, the mark and
 * the brand grain are not registry items and never take a user's seed.
 */
export interface BrandPage {
  slug: string;
  title: string;
  lede: string;
}

export const BRAND_PAGES: readonly BrandPage[] = [
  {
    slug: "identity",
    title: "Logo & identity",
    lede: "The flower is the O. One fused signature, plus a detachable family for every context. It also writes itself.",
  },
  {
    slug: "logo-use",
    title: "Logo use",
    lede: "The mark wears the seed's colour, so it only has contrast on neutral grounds. On colour, a photo or the aura, switch to the white or ink knockout. The eyes never change; only the fill does.",
  },
  {
    slug: "creature",
    title: "The creature",
    lede: "Canonical Echo: one flower, eyes that follow you, and a small composed behaviour set. The personality of the whole brand — and, like everything else, it wears your seed.",
  },
  {
    slug: "movement",
    title: "Movement set",
    lede: "Echo's full performance rig: one canonical body, a composed behaviour vocabulary, and legs that sprout only while it moves — so the mark's silhouette stays leg-less and locked.",
  },
  {
    slug: "world",
    title: "Brand world",
    lede: "The marketing register — grain gradients and the display face at its heaviest — the warm, alive counterpart to the contained, tactile components.",
  },
  {
    slug: "materials",
    title: "Texture & materials",
    lede: "Materials and light are the system; colour rides on top. Matte hardware, a recessed screen, neutral glass — and grain on everything.",
  },
  {
    slug: "voice",
    title: "Voice & tone",
    lede: "Warm, quiet, precise. Echo is a companion, not a coach: it notices, it does not nag.",
  },
];

export function getBrandPage(slug: string): BrandPage | undefined {
  return BRAND_PAGES.find((p) => p.slug === slug);
}
