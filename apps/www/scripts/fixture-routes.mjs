/**
 * The routes that exist for Playwright and must not be published, and the ones
 * that look like fixtures but are navigation.
 *
 * Shared by `prune-fixtures.mjs`, which removes the first list from the static
 * export, and by `fixture-routes.test.ts`, which checks that the second list is
 * still linked and the first list still is not. Two lists in one file, because
 * the mistake this guards against is a route quietly moving between them.
 */

/** Removed from the static export. Test scaffolding, never product. */
export const EXPORTED_FIXTURES = ["checks", "stress"];

/**
 * These look like fixtures too. They are not: `/audition` and `/tactile`
 * are top-level nav, and `/gallery/*` is the group overview every component
 * page links to. Listed so a test can prove it is still true.
 */
export const PUBLISHED_TOOLS = ["gallery", "audition", "tactile"];
