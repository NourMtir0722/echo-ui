/**
 * The Echo UI MCP server: a thin reader over what the
 * docs site publishes, exposing the catalog's tool contracts plus the
 * accessibility rules.
 *
 * It reads two documents. `/r/catalog.json` is what a component IS; `/e/` — the
 * same registry `npx echo-ui-cli` installs from, read with the same client —
 * is what it SHIPS AS. Sharing the client is deliberate: the server cannot
 * tell an agent a version, a core range or a dependency that the CLI would
 * then contradict.
 *
 * The server holds no state beyond cached copies of both. Every answer traces
 * back to a registry.json entry or a meta.ts — if a tool says something wrong,
 * the fix is in the registry, not here.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AGENT_INSTRUCTIONS } from "@registry/agent/guidance";

import { createCatalogSource, type CatalogSource, type CatalogSourceOptions } from "./catalog-source";
import { createRegistrySource, type RegistrySource, type RegistrySourceOptions } from "./registry-source";
import { createHandlers, TOOL_DEFINITIONS } from "./tools";

export const SERVER_NAME = "echo-ui";

/**
 * Injected by the bundler from package.json, so what an MCP client displays is
 * the version that was actually published. It was hardcoded to "0.0.0" and
 * stayed there through 0.1.0 — a client listing this server showed a version
 * that had never been true.
 *
 * `typeof` on an undeclared identifier is safe in JS, so running from source
 * (tests, `tsx`) falls through to the -dev marker instead of throwing.
 */
declare const __ECHO_MCP_VERSION__: string | undefined;
export const SERVER_VERSION =
  typeof __ECHO_MCP_VERSION__ === "string" ? __ECHO_MCP_VERSION__ : "0.0.0-dev";

export type ServerOptions = CatalogSourceOptions & RegistrySourceOptions;

/**
 * What the server reads from, with the caches that go with it. The stdio
 * server makes one set and keeps it for its life; the HTTP server builds a
 * server per request, so it makes these once and hands them to each, or every
 * request would fetch the catalog again.
 */
export interface ServerSources {
  catalog: CatalogSource;
  registry: RegistrySource;
}

export function createSources(options: ServerOptions = {}): ServerSources {
  return { catalog: createCatalogSource(options), registry: createRegistrySource(options) };
}

export function createServer(options: ServerOptions = {}, sources: ServerSources = createSources(options)): McpServer {
  const catalogSource = sources.catalog;
  const registrySource = sources.registry;
  const handlers = createHandlers(catalogSource, registrySource);

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: [
        AGENT_INSTRUCTIONS,
        "",
        `Catalog source: ${catalogSource.source}`,
        `Registry: ${registrySource.registry}`,
      ].join("\n"),
    },
  );

  server.registerTool(
    "search_components",
    TOOL_DEFINITIONS.search_components,
    ({ query }) => handlers.search_components({ query }),
  );
  server.registerTool("get_component", TOOL_DEFINITIONS.get_component, ({ name }) =>
    handlers.get_component({ name }),
  );
  server.registerTool("get_tokens", TOOL_DEFINITIONS.get_tokens, () => handlers.get_tokens());
  server.registerTool("get_examples", TOOL_DEFINITIONS.get_examples, ({ name }) =>
    handlers.get_examples({ name }),
  );
  server.registerTool("get_accessibility", TOOL_DEFINITIONS.get_accessibility, ({ name }) =>
    handlers.get_accessibility({ name }),
  );
  server.registerTool("check_code", TOOL_DEFINITIONS.check_code, ({ code, file }) => handlers.check_code({ code, file }));
  server.registerTool("list_styles", TOOL_DEFINITIONS.list_styles, ({ name }) => handlers.list_styles({ name }));
  server.registerTool("fit_styles", TOOL_DEFINITIONS.fit_styles, ({ profile, tolerance, yours }) => handlers.fit_styles({ profile, tolerance, yours }));
  server.registerTool("check_style", TOOL_DEFINITIONS.check_style, ({ style }) => handlers.check_style({ style }));
  server.registerTool("wear_style", TOOL_DEFINITIONS.wear_style, ({ name, style, files }) => handlers.wear_style({ name, style, files }));

  return server;
}
