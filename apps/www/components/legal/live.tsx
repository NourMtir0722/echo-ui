/**
 * The values the privacy policy, the terms and the contact page print, from
 * the registry's constants, so a page can't name a host or an address that has
 * moved (`identity.test.ts` refuses a spelled-out host anywhere else).
 */
import { HOSTED_MCP_URL, REGISTRY_HOMEPAGE, SUPPORT_EMAIL } from "@registry/agent/guidance";

/** The one address people write to, as a link. */
export function Email() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

/** The site's host, as people type it. */
export function Host() {
  return <>{new URL(REGISTRY_HOMEPAGE).host}</>;
}

/** The hosted MCP server's host. */
export function McpHost() {
  return <>{new URL(HOSTED_MCP_URL).host}</>;
}
