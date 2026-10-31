import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

/** The site's entry in the studio's own Umami, at stats.nawwara.studio. Public: it's in every page. */
const WEBSITE_ID = "8e88946f-d11c-4032-8bd8-e4d745c7c482";

/**
 * The script that counts visits: which pages, and where visitors came from. No
 * cookies, and nothing that follows anyone across sites (the privacy page says so).
 *
 * Only in the build that deploys: the tests, a dev server and `next build` never
 * reach for another origin, and the tracker itself ignores any host but the
 * site's, so a preview can't count either. A plain deferred script, not
 * next/script, which preloads it at high priority beside the stylesheets the
 * homepage's first paint waits for. If the stats server is down, the site doesn't notice.
 */
export function analyticsScript() {
  if (process.env.ECHO_STATIC_EXPORT !== "1") return null;
  return {
    src: "https://stats.nawwara.studio/s.js",
    defer: true,
    "data-website-id": WEBSITE_ID,
    "data-domains": new URL(REGISTRY_HOMEPAGE).hostname,
    "data-do-not-track": "true",
  };
}
