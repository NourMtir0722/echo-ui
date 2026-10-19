import type { MetadataRoute } from "next";
import { CLI_RELEASED, REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

/**
 * Whether a search engine may index this site.
 *
 * The site has been publicly reachable with no `robots.txt` and no `noindex`
 * the whole time, serving a build from before the CLI existed — so the install
 * lines a crawler picked up were lines that cannot work. Nothing links to it
 * except two npm `homepage` fields, so what is at stake is search results
 * accruing against an archaeological build: real, cumulative, cheap to undo,
 * and not something to leave running indefinitely.
 *
 * Hung on `CLI_RELEASED` rather than on a second flag of its own, because it
 * is the same fact. That constant means "the packages resolve and the install
 * works", and a site whose install does not work is exactly the site that
 * should not be the first result for anyone. One switch, flipped once,
 * checked in both directions by `release-state.test.ts`.
 */
/*
 * The site deploys as a STATIC EXPORT, and a metadata route in an
 * `output: export` build has to say it is static or the build refuses to
 * collect it — "export const dynamic = \"force-static\" not configured on
 * route /robots.txt". This file is a pure function of a compile-time constant,
 * so the declaration is a formality; the build has no way to know that.
 *
 * It matters because `next build` and `ECHO_STATIC_EXPORT=1 next build` are
 * different builds, and only the second one deploys.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!CLI_RELEASED) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  /*
   * No disallow list. The obvious thing to put here is the conformance
   * fixtures under /checks and /stress — but the static export prunes those
   * routes before the deploy, so naming them would be telling crawlers about
   * paths production does not serve. `fixture-routes.test.mjs` caught exactly
   * that, which is the same class of mistake it was written for.
   */
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    host: REGISTRY_HOMEPAGE,
    // Written into the static export by scripts/sitemap.mjs, from the pages it serves.
    sitemap: `${REGISTRY_HOMEPAGE}/sitemap.xml`,
  };
}
