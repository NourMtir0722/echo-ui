/**
 * The link that makes the whole Echo site wear a seed's colours, so a builder
 * can feel a style before any project wears it:
 * `/generator?accent=8b6fe8&chassis=232130&paper=efebfa`.
 *
 * The site reads it with `seedFromSearch` (apps/www/components/site/seed-link.ts),
 * and the site's own test reads this function's links with it, so the two
 * can't drift into different formats.
 *
 * Only the colours travel: a link carries no radius, density or finish. What
 * says so is whoever hands the link over.
 */
import { SEED_DEFAULTS } from "echo-ui-core/theme";

import { REGISTRY_HOMEPAGE } from "./guidance";

const ROLES = ["accent", "chassis", "paper"] as const;

export function generatorLink(seed: Partial<Record<(typeof ROLES)[number], string>> = {}): string {
  const params = new URLSearchParams();
  // Plain hex, no "#": a "#" would start the URL's fragment and lose the rest.
  for (const role of ROLES) params.set(role, (seed[role] ?? SEED_DEFAULTS[role]).replace(/^#/, "").toLowerCase());
  return `${REGISTRY_HOMEPAGE}/generator?${params}`;
}
