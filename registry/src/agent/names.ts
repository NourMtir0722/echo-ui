/**
 * Finding an item by the name someone typed. Shared by the MCP server and the
 * CLI's `docs`, so a name one of them understands the other does too.
 */
import { searchComponents, type RegistryCatalog } from "./catalog";

/**
 * Agents guess the bare component name as often as the registry name, and both
 * spellings appear in the docs (the docs route is /docs/hardware-button, the
 * registry item is echo-hardware-button). Accept either rather than answering
 * "not found" to a question that had an obvious answer.
 */
export function resolveName(catalog: RegistryCatalog, name: string): string | null {
  const wanted = name.trim().toLowerCase();
  const candidates = [wanted, `echo-${wanted}`, wanted.replace(/^echo-/, "")];
  for (const candidate of candidates) {
    const hit = catalog.components.find((c) => c.name.toLowerCase() === candidate);
    if (hit) return hit.name;
  }
  // Last resort: match on the title, so "HardwareButton" works too.
  return catalog.components.find((c) => c.title.toLowerCase() === wanted)?.name ?? null;
}

/**
 * The answer to a name that isn't there: the closest names, and where to look.
 * `listHint` is how the reader lists everything — a tool call for the MCP
 * server, a command for the CLI.
 */
export function notFound(catalog: RegistryCatalog, name: string, listHint = "Call search_components to list what exists."): string {
  const near = searchComponents(catalog, name)
    .slice(0, 5)
    .map((c) => c.name);
  const suggestion = near.length ? `Closest matches: ${near.join(", ")}.` : "";
  return `No component named "${name}" in the Echo UI registry. ${suggestion} ${listHint}`.replace(/\s+/g, " ").trim();
}
