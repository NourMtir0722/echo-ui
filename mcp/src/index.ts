/**
 * stdio entry point. MCP speaks JSON-RPC over stdout, so NOTHING else may be
 * written there — diagnostics go to stderr or the stream is corrupt.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server";

async function main() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("[echo-ui-mcp] failed to start:", err);
  process.exit(1);
});
