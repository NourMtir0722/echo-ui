/**
 * The supporters server (apps/supporters-api), on its own subdomain of the
 * site's host: where the thank-you page sends what a supporter types, and
 * where the island, the crowd and the heap read who's on the island.
 *
 * Only the site itself talks to it. Anywhere else (a dev server, the build
 * the browser tests run against) asks the same paths on its own origin
 * instead, so a copy of the site never reads or writes the real island. There,
 * public/supporters-api/supporters answers the list with no one on it yet,
 * and the tests answer whatever else they need themselves.
 */
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

const SITE = new URL(REGISTRY_HOMEPAGE);

/** The server's address, as seen from the page that's open (browser only). */
export function supportersApi(): string {
  return location.hostname === SITE.hostname ? `https://api.${SITE.host}` : `${location.origin}/supporters-api`;
}
