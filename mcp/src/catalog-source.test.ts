import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCatalogSource,
  resolveSource,
  DEFAULT_CATALOG_URL,
  CATALOG_TTL_MS,
  CatalogLoadError,
  STALE_RETRY_MS,
} from "./catalog-source";
import { sampleCatalog } from "./sample-catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));

function stubFetch(body: unknown, ok = true) {
  let calls = 0;
  const impl = (async () => {
    calls += 1;
    return {
      ok,
      status: ok ? 200 : 503,
      statusText: ok ? "OK" : "Service Unavailable",
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, get calls() { return calls; } };
}

test("the default URL tracks registry.json's homepage", async () => {
  const registry = JSON.parse(
    await readFile(resolve(__dirname, "../../registry/registry.json"), "utf8"),
  ) as { homepage: string };

  // The registry URL is forever. If the docs domain moves, this
  // constant has to move with it or every installed server reads a dead host.
  assert.equal(DEFAULT_CATALOG_URL, `${registry.homepage}/r/catalog.json`);
});

test("resolveSource prefers the explicit option, then the env var, then the default", () => {
  assert.equal(resolveSource({ source: "/tmp/catalog.json" }), "/tmp/catalog.json");

  const original = process.env.ECHO_CATALOG;
  process.env.ECHO_CATALOG = "https://example.test/r/catalog.json";
  try {
    assert.equal(resolveSource(), "https://example.test/r/catalog.json");
    assert.equal(resolveSource({ source: "/tmp/x.json" }), "/tmp/x.json");
  } finally {
    if (original === undefined) delete process.env.ECHO_CATALOG;
    else process.env.ECHO_CATALOG = original;
  }
});

test("a URL source is fetched once per TTL", async () => {
  const fetchStub = stubFetch(sampleCatalog);
  let clock = 0;
  const source = createCatalogSource({
    source: "https://example.test/r/catalog.json",
    fetchImpl: fetchStub.impl,
    now: () => clock,
  });

  assert.equal((await source.get()).name, "echo-ui");
  assert.equal((await source.get()).name, "echo-ui");
  assert.equal(fetchStub.calls, 1, "second read inside the TTL should be cached");

  clock += CATALOG_TTL_MS + 1;
  await source.get();
  assert.equal(fetchStub.calls, 2, "the catalog should be re-read once the TTL lapses");
});

test("concurrent cold reads share one fetch", async () => {
  const fetchStub = stubFetch(sampleCatalog);
  const source = createCatalogSource({
    source: "https://example.test/r/catalog.json",
    fetchImpl: fetchStub.impl,
  });

  // An agent fires several tools at once; three cold starts must not mean
  // three fetches of the same document.
  await Promise.all([source.get(), source.get(), source.get()]);
  assert.equal(fetchStub.calls, 1);
});

test("a filesystem source is read without fetching", async () => {
  // The path that matters in practice: ECHO_CATALOG pointed at
  // apps/www/public/r/catalog.json so the server runs against an unpublished
  // registry.
  const dir = await mkdtemp(resolve(tmpdir(), "echo-mcp-"));
  const file = resolve(dir, "catalog.json");
  await writeFile(file, JSON.stringify(sampleCatalog));

  const fetchStub = stubFetch(sampleCatalog);
  const source = createCatalogSource({ source: file, fetchImpl: fetchStub.impl });

  const catalog = await source.get();
  assert.equal(catalog.components[0]?.name, "echo-hardware-button");
  assert.equal(fetchStub.calls, 0);
});

test("a failed load names the source it tried", async () => {
  const source = createCatalogSource({
    source: "https://example.test/r/catalog.json",
    fetchImpl: stubFetch(null, false).impl,
    retryDelays: [],
  });

  const err = await source.get().then(() => null, (e: unknown) => e);
  assert.ok(err instanceof CatalogLoadError);
  assert.match(err.message, /https:\/\/example\.test\/r\/catalog\.json/);
  assert.match(err.message, /503/);
});

test("a failed load is retried rather than cached", async () => {
  let attempt = 0;
  const impl = (async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("network down");
    return new Response(JSON.stringify(sampleCatalog));
  }) as unknown as typeof fetch;

  const source = createCatalogSource({ source: "https://example.test/r/catalog.json", fetchImpl: impl, retryDelays: [] });
  await assert.rejects(() => source.get());
  // A server that gave up on one flaky fetch would be dead for its whole
  // session; nothing was cached, so the next call tries again.
  assert.equal((await source.get()).name, "echo-ui");
});

/**
 * In the hosted server, a catalog read tried only once would let one
 * dropped connection or one 503 on a cold isolate fail every tool for the
 * call, though the next read would have worked.
 */
test("a catalog read that meets a dropped connection or a 503 tries again", async () => {
  let attempt = 0;
  const impl = (async () => {
    attempt += 1;
    if (attempt === 1) throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    if (attempt === 2) return new Response("", { status: 503, statusText: "Service Unavailable" });
    return new Response(JSON.stringify(sampleCatalog), { status: 200 });
  }) as unknown as typeof fetch;
  const source = createCatalogSource({ source: "https://example.test/r/catalog.json", fetchImpl: impl, retryDelays: [1, 1] });
  assert.equal((await source.get()).name, "echo-ui");
  assert.equal(attempt, 3);
});

test("a catalog host that never answers is given up on, and the error says so", async () => {
  // A fetch that only ever ends by being aborted. It holds the event loop open as a real one's socket
  // does: the abort's timer doesn't, and without it Node 22 ends the test before the limit is reached.
  const impl = ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      const socket = setInterval(() => {}, 1000);
      init?.signal?.addEventListener("abort", () => {
        clearInterval(socket);
        reject(init.signal!.reason);
      });
    })) as unknown as typeof fetch;
  const source = createCatalogSource({ source: "https://example.test/r/catalog.json", fetchImpl: impl, timeoutMs: 50 });
  const err = await source.get().then(() => null, (e: unknown) => e);
  assert.ok(err instanceof CatalogLoadError);
  assert.match(err.message, /didn't answer within 0\.05 seconds/);
});

test("a catalog that has only aged out answers while the site can't be read, and is tried again a minute on", async () => {
  let clock = 0;
  let down = false;
  let calls = 0;
  const impl = (async () => {
    calls += 1;
    if (down) throw new Error("network down");
    return new Response(JSON.stringify({ ...sampleCatalog, name: `echo-ui-${calls}` }));
  }) as unknown as typeof fetch;
  // One try a read, so the count is of reads: the tries within one have their own test.
  const source = createCatalogSource({ source: "https://example.test/r/catalog.json", fetchImpl: impl, now: () => clock, retryDelays: [] });

  assert.equal((await source.get()).name, "echo-ui-1");
  down = true;
  clock += CATALOG_TTL_MS + 1;
  // The site blinked: the copy in hand is still Echo's catalog, so every tool keeps answering.
  assert.equal((await source.get()).name, "echo-ui-1");
  assert.equal(calls, 2);
  // Not hammered: inside the minute, nothing is fetched.
  clock += STALE_RETRY_MS - 1;
  assert.equal((await source.get()).name, "echo-ui-1");
  assert.equal(calls, 2);
  // A minute on, it's tried again, and a catalog that reads replaces it.
  down = false;
  clock += 2;
  assert.equal((await source.get()).name, "echo-ui-3");
});
