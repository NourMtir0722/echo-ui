import { test } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer, SERVER_NAME, SERVER_VERSION } from "./server";
import { sampleCatalog } from "./sample-catalog";

/**
 * The handler tests call the functions directly; these drive a real MCP client
 * through a real transport, so the parts only the SDK sees — tool
 * registration, input schemas, the instructions block — are actually exercised.
 */
async function connect() {
  const fetchImpl = (async () =>
    new Response(JSON.stringify(sampleCatalog))) as unknown as typeof fetch;

  // No `/e/` registry in these: a server whose registry is unreachable still
  // has to advertise its tools and answer from the catalog.
  const server = createServer({ source: "https://example.test/catalog.json", fetchImpl });
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

const body = (result: unknown) =>
  ((result as { content: { text?: string }[] }).content ?? []).map((c) => c.text ?? "").join("\n");

test("the server advertises its tools with usable schemas", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

    assert.deepEqual(Object.keys(byName).sort(), [
      "check_code",
      "check_style",
      "fit_styles",
      "get_accessibility",
      "get_component",
      "get_examples",
      "get_tokens",
      "list_styles",
      "search_components",
      "wear_style",
    ]);

    // A tool an agent cannot tell apart from its neighbours never gets called.
    for (const tool of tools) {
      assert.ok((tool.description?.length ?? 0) > 40, `${tool.name} needs a real description`);
    }

    assert.deepEqual(byName.get_component?.inputSchema.required, ["name"]);
    // search_components must be callable with no arguments at all, and so must
    // get_accessibility: the rules that apply everywhere need no component.
    assert.equal(byName.search_components?.inputSchema.required, undefined);
    assert.equal(byName.get_accessibility?.inputSchema.required, undefined);
    assert.deepEqual(byName.check_code?.inputSchema.required, ["code"]);
    assert.deepEqual(byName.fit_styles?.inputSchema.required, ["profile"]);
    assert.deepEqual(byName.check_style?.inputSchema.required, ["style"]);
    // wear_style takes a name or a style.json, so neither is required by the schema; the handler asks for one.
    assert.equal(byName.wear_style?.inputSchema.required, undefined);
    assert.equal(byName.list_styles?.inputSchema.required, undefined);
  } finally {
    await close();
  }
});

test("every tool says it only reads, which both plugin directories require", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      assert.ok(tool.title, `${tool.name} needs a title`);
      assert.deepEqual(
        { readOnly: tool.annotations?.readOnlyHint, destructive: tool.annotations?.destructiveHint, openWorld: tool.annotations?.openWorldHint },
        { readOnly: true, destructive: false, openWorld: false },
        tool.name,
      );
    }
  } finally {
    await close();
  }
});

/**
 * Claude's directory rejects a tool description that tells the model how to
 * behave ("describe what the tool does, and don't tell Claude how to
 * behave"), and OpenAI's asks for what a tool does and when it's for. So a
 * description says what the tool returns and when it's the one to call; the
 * rules for writing Echo code live in the server's instructions and the
 * skills, not here.
 */
test("no tool description tells the model what to do", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    const orders = /(^|[.!?—:]\s*)(call|read|use|run|fix|never|always|do not|don't)\b|\bmust\b/i;
    const offenders = tools.filter((tool) => orders.test(tool.description ?? "")).map((tool) => `${tool.name}: ${tool.description?.match(orders)?.[0]}`);
    assert.deepEqual(offenders, []);
  } finally {
    await close();
  }
});

test("check_code refuses a file past its size before reading any of it", async () => {
  const { client, close } = await connect();
  try {
    const { MAX_CODE } = await import("./tools");
    const result = await client.callTool({ name: "check_code", arguments: { code: "x".repeat(MAX_CODE + 1) } });
    assert.equal((result as { isError?: boolean }).isError, true);
    assert.match(body(result), /200000|200,000|too big|too_big/i);
  } finally {
    await close();
  }
});

test("the server's instructions carry the setup a fresh app needs", async () => {
  // Each of these is a failure the fresh-app test hit when it followed the
  // tools and nothing else.
  const { client, close } = await connect();
  try {
    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /echo-theme\.css/);
    assert.match(instructions, /SoundProvider/);
    assert.match(instructions, /"use client"/);
    // The setup is now one command rather than a components.json to paste.
    assert.match(instructions, /npx echo-ui-cli init/);
  } finally {
    await close();
  }
});

test("the server's instructions carry the Base UI correction", async () => {
  const { client, close } = await connect();
  try {
    // Agents' training data still says @base-ui-components/react; this is the
    // one correction that has to arrive before the first tool call.
    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /@base-ui\/react/);
    assert.match(instructions, /NOT `@base-ui-components\/react`/);
    assert.match(instructions, /var\(--echo-\*\)/);
    assert.equal(client.getServerVersion()?.name, SERVER_NAME);
  } finally {
    await close();
  }
});

test("a client can search, then read the component it found", async () => {
  const { client, close } = await connect();
  try {
    const search = await client.callTool({ name: "search_components", arguments: { query: "tactile" } });
    assert.match(body(search), /echo-hardware-button/);

    const component = await client.callTool({
      name: "get_component",
      arguments: { name: "echo-hardware-button" },
    });
    assert.match(body(component), /Anti-patterns/);
    assert.match(body(component), /\| `loading` \|/);
  } finally {
    await close();
  }
});

test("get_tokens takes no arguments and still answers", async () => {
  const { client, close } = await connect();
  try {
    const result = await client.callTool({ name: "get_tokens", arguments: {} });
    assert.match(body(result), /--echo-accent/);
  } finally {
    await close();
  }
});

test("a bad argument is rejected by the schema, not by the handler", async () => {
  const { client, close } = await connect();
  try {
    // name is required; the SDK should refuse this before any handler runs.
    const result = await client.callTool({ name: "get_component", arguments: {} });
    assert.equal((result as { isError?: boolean }).isError, true);
  } finally {
    await close();
  }
});

/**
 * The version an MCP client displays is injected from package.json at build
 * time. Running from source gives the -dev marker; a build must not.
 */
test("the reported version is injected, never a stale literal", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };

  // From source there is no define, so it identifies itself as a dev build
  // rather than claiming a version it was not built at.
  assert.equal(SERVER_VERSION, "0.0.0-dev");

  const built = await readFile(new URL("../dist/index.js", import.meta.url), "utf8").catch(
    () => null,
  );
  if (built) {
    assert.ok(
      built.includes(`"${pkg.version}"`),
      `the built bundle does not carry version ${pkg.version} — rebuild before publishing`,
    );
  }
});
