import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { HOSTED_MCP_URL } from "@registry/agent/guidance";

import { createWorker, type Env } from "./worker";

/**
 * The Worker's own part, around the MCP handler: its routes, CORS, and the
 * limit per address. The handler is a stand-in here; `http.test.ts` drives
 * the real one.
 */
function setUp(env: Env = {}) {
  const seen: Request[] = [];
  const worker = createWorker(async (request) => {
    seen.push(request);
    return Response.json({ jsonrpc: "2.0", result: {}, id: 1 });
  });
  const call = (path: string, init?: RequestInit) => worker.fetch(new Request(new URL(path, HOSTED_MCP_URL), init), env);
  return { call, seen };
}

const post = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };

test("an MCP request reaches the handler and comes back with CORS", async () => {
  const { call, seen } = setUp();
  const response = await call("/mcp", post);
  assert.equal(response.status, 200);
  assert.equal(seen.length, 1);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

test("a browser's preflight is answered without touching the handler", async () => {
  const { call, seen } = setUp();
  const response = await call("/mcp", { method: "OPTIONS" });
  assert.equal(response.status, 204);
  assert.equal(seen.length, 0);
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /mcp-protocol-version/);
});

test("past the limit, an address gets 429 with a time to wait, and the handler never runs", async () => {
  const keys: string[] = [];
  const { call, seen } = setUp({
    LIMITER: {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: false };
      },
    },
  });
  const response = await call("/mcp", { ...post, headers: { ...post.headers, "cf-connecting-ip": "203.0.113.7" } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "10");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(keys, ["203.0.113.7"]);
  assert.equal(seen.length, 0);
});

test("under the limit, the request goes through", async () => {
  const { call, seen } = setUp({ LIMITER: { limit: async () => ({ success: true }) } });
  assert.equal((await call("/mcp", post)).status, 200);
  assert.equal(seen.length, 1);
});

/**
 * What a call costs is the code it carries: a 200,000-character check_code is about a hundred times the
 * CPU of a search. Counting requests alone, one address at the limit with the largest bodies could run
 * the server's bill up by hundreds of dollars a month. Past the first 16 KiB, each 16 KiB of a body
 * draws on a budget of its own, LARGE: small calls never touch it.
 */
test("a large body draws on its own budget, a unit per 16 KiB past the first, and past it waits a minute", async () => {
  const drawn: string[] = [];
  let left = 3;
  const { call, seen } = setUp({
    LIMITER: { limit: async () => ({ success: true }) },
    LARGE: {
      limit: async ({ key }) => {
        drawn.push(key);
        return { success: left-- > 0 };
      },
    },
  });
  const sized = (bytes: number) => ({ ...post, headers: { ...post.headers, "cf-connecting-ip": "203.0.113.9" }, body: "x".repeat(bytes) });
  // Under 16 KiB: nothing drawn.
  assert.equal((await call("/mcp", sized(16 * 1024 - 1))).status, 200);
  assert.equal(drawn.length, 0);
  // 40 KiB: two units, both granted, and the handler gets the body whole.
  assert.equal((await call("/mcp", sized(40 * 1024))).status, 200);
  assert.equal(drawn.length, 2);
  assert.equal(await seen.at(-1)!.text().then((t) => t.length), 40 * 1024);
  // 48 KiB: three units, and the budget has one left.
  const refused = await call("/mcp", sized(48 * 1024));
  assert.equal(refused.status, 429);
  assert.equal(refused.headers.get("retry-after"), "60");
  assert.equal(refused.headers.get("access-control-allow-origin"), "*");
  assert.match(((await refused.json()) as { error: { message: string } }).error.message, /large/);
  assert.equal(seen.length, 2, "the refused call never reached the handler");
  assert.deepEqual([...new Set(drawn)], ["203.0.113.9"]);
});

test("a body with no length is counted as it's read, so leaving the header out saves nothing", async () => {
  let drawn = 0;
  const { call } = setUp({ LARGE: { limit: async () => (drawn++, { success: true }) } });
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode("x".repeat(33 * 1024)));
      c.close();
    },
  });
  const response = await call("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
  assert.equal(response.status, 200);
  assert.equal(drawn, 2);
});

test("OpenAI's domain token is served once it's set, and is a 404 until then", async () => {
  assert.equal((await setUp().call("/.well-known/openai-apps-challenge")).status, 404);
  const response = await setUp({ OPENAI_APPS_CHALLENGE: "token-from-the-portal" }).call("/.well-known/openai-apps-challenge");
  assert.equal(response.status, 200);
  // Only the token: the portal reads the body as it is.
  assert.equal(await response.text(), "token-from-the-portal");
});

test("the root says where to connect, and any other path is a 404", async () => {
  const { call, seen } = setUp();
  const root = await call("/");
  assert.equal(root.status, 200);
  assert.match(await root.text(), new RegExp(HOSTED_MCP_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((await call("/r/catalog.json")).status, 404);
  assert.equal(seen.length, 0);
});

/** wrangler.jsonc without its comments. Only `//` outside a string starts one. */
function readJsonc(path: URL): Record<string, unknown> {
  const source = readFileSync(path, "utf8");
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (c === '"') {
      const end = source.indexOf('"', i + 1);
      let j = end;
      while (source[j - 1] === "\\") j = source.indexOf('"', j + 1);
      out += source.slice(i, j + 1);
      i = j;
    } else if (source.startsWith("//", i)) {
      i = source.indexOf("\n", i) - 1;
    } else if (source.startsWith("/*", i)) {
      i = source.indexOf("*/", i) + 1;
    } else out += c;
  }
  return JSON.parse(out) as Record<string, unknown>;
}

test("wrangler.jsonc deploys this Worker, at the hosted address, with the package's version", () => {
  const config = readJsonc(new URL("../wrangler.jsonc", import.meta.url));
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

  assert.equal(config.main, "src/worker.ts");
  assert.deepEqual(config.routes, [{ pattern: new URL(HOSTED_MCP_URL).host, custom_domain: true }]);
  // What an MCP client shows has to be the version that's running.
  assert.deepEqual(config.define, { __ECHO_MCP_VERSION__: JSON.stringify(pkg.version) });
  // The hash checks and PostCSS need Node's modules.
  assert.ok((config.compatibility_flags as string[]).includes("nodejs_compat"));
  // The binding `src/worker.ts` reads, under the name it reads it by.
  assert.deepEqual((config.ratelimits as { name: string }[]).map((r) => r.name), ["LIMITER", "LARGE"]);
  // A ceiling on any one call's CPU: the largest check_code is about 100ms on a laptop.
  assert.equal((config.limits as { cpu_ms: number }).cpu_ms, 1000);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
});
