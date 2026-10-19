import { test } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { createHttpHandler } from "./http";
import { TOOL_DEFINITIONS } from "./tools";
import { sampleCatalog, sampleRegistry } from "./sample-catalog";

/**
 * A real MCP client speaking HTTP to the handler, with the network taken out:
 * the client's fetch calls the handler directly. What these cover is what only
 * the HTTP way in does — one server per request, caches that outlive it, POST
 * only — over the same tools the stdio tests already hold to their answers.
 */
function setUp() {
  let catalogReads = 0;
  const fetchImpl = (async () => {
    catalogReads++;
    return new Response(JSON.stringify(sampleCatalog));
  }) as unknown as typeof fetch;
  const handle = createHttpHandler({
    source: "https://example.test/catalog.json",
    fetchImpl,
    registry: "https://example.test/e",
    registryFetcher: sampleRegistry.fetcher,
  });
  const fetchToHandler = (url: string | URL, init?: RequestInit) => handle(new Request(url, init));

  async function connect() {
    const client = new Client({ name: "http-test", version: "0.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL("https://mcp.example.test/mcp"), { fetch: fetchToHandler }));
    return client;
  }
  return { handle, connect, catalogReads: () => catalogReads };
}

const body = (result: unknown) =>
  ((result as { content: { text?: string }[] }).content ?? []).map((c) => c.text ?? "").join("\n");

test("over HTTP, a client sees the same tools the stdio server registers", async () => {
  const { connect } = setUp();
  const client = await connect();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), Object.keys(TOOL_DEFINITIONS).sort());
    assert.match(client.getInstructions() ?? "", /npx echo-ui-cli init/);
  } finally {
    await client.close();
  }
});

test("over HTTP, every tool answers", async () => {
  const { connect } = setUp();
  const client = await connect();
  try {
    const calls: [string, Record<string, unknown>, RegExp][] = [
      ["search_components", { query: "tactile" }, /echo-hardware-button/],
      ["get_component", { name: "echo-hardware-button" }, /Anti-patterns/],
      ["get_tokens", {}, /--echo-accent/],
      ["get_examples", { name: "echo-hardware-button" }, /examples|no examples/],
      ["get_accessibility", {}, /WCAG/],
      ["check_code", { code: 'export const A = () => <div style={{ color: "#ff0000" }} />;', file: "a.tsx" }, /problem/],
      ["list_styles", {}, /`echo` \(Echo\)/],
      ["fit_styles", { profile: "W4 V3 D3 F2 E3 C5 O3" }, /1\. `echo`/],
      ["check_style", { style: sampleRegistry.styles.echo! }, /a style Echo can apply/],
      ["wear_style", { name: "echo", files: false }, /init --style echo/],
    ];
    assert.equal(calls.length, Object.keys(TOOL_DEFINITIONS).length, "a tool added to the server needs a call here");
    for (const [name, args, expected] of calls) {
      const result = await client.callTool({ name, arguments: args });
      assert.notEqual((result as { isError?: boolean }).isError, true, `${name} failed: ${body(result)}`);
      assert.match(body(result), expected, name);
    }
  } finally {
    await client.close();
  }
});

test("over HTTP, the catalog is read once for many requests, not once for each", async () => {
  const { connect, catalogReads } = setUp();
  // Two clients, several requests each: every one builds a server of its own,
  // and all of them share the one cached catalog.
  for (let i = 0; i < 2; i++) {
    const client = await connect();
    await client.callTool({ name: "search_components", arguments: { query: "button" } });
    await client.callTool({ name: "get_tokens", arguments: {} });
    await client.close();
  }
  assert.equal(catalogReads(), 1);
});

test("over HTTP, a GET is refused with 405: no sessions, so no stream to open", async () => {
  const { handle } = setUp();
  const response = await handle(new Request("https://mcp.example.test/mcp", { headers: { accept: "text/event-stream" } }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  const json = (await response.json()) as { error: { message: string } };
  assert.match(json.error.message, /POST/);
});

/**
 * check_code's ceiling (MAX_CODE) is a schema rule, and the schema
 * only sees a body the transport has already read whole and parsed. So the
 * hosted server read whatever it was sent, up to the platform's 100 MB, in an
 * isolate with 128 MB to work in: one request could take down the answers of
 * everyone else on it. The ceiling is now at the door, on the bytes.
 */
test("a body past the ceiling is refused with 413, declared or streamed, and never read whole", async () => {
  const { MAX_BODY } = await import("./http");
  const { MAX_CODE } = await import("./tools");
  // The ceiling leaves room for the largest call the schema takes, at its worst.
  assert.ok(MAX_BODY >= 6 * MAX_CODE, "a check_code of MAX_CODE characters, each escaped, fits");

  const { handle, connect } = setUp();
  const url = "https://mcp.example.test/mcp";
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };

  const declared = await handle(new Request(url, { method: "POST", headers: { ...headers, "content-length": String(MAX_BODY + 1) }, body: "{}" }));
  assert.equal(declared.status, 413);
  assert.match(((await declared.json()) as { error: { message: string } }).error.message, /too large/i);

  // No length given: the server stops reading once it's past the ceiling.
  let pulled = 0;
  const chunk = new Uint8Array(64 * 1024).fill(0x20);
  const endless = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += chunk.byteLength;
      if (pulled > 4 * MAX_BODY) controller.close();
      else controller.enqueue(chunk);
    },
  });
  const streamed = await handle(new Request(url, { method: "POST", headers, body: endless, duplex: "half" } as RequestInit));
  assert.equal(streamed.status, 413);
  assert.ok(pulled < MAX_BODY + 4 * chunk.byteLength, `read ${pulled} bytes of a body past a ${MAX_BODY}-byte ceiling`);

  // And a call at the schema's own ceiling still reaches the schema.
  const client = await connect();
  try {
    const result = await client.callTool({ name: "check_code", arguments: { code: "\n".repeat(MAX_CODE) } });
    assert.notEqual((result as { isError?: boolean }).isError, true, body(result));
  } finally {
    await client.close();
  }
});
