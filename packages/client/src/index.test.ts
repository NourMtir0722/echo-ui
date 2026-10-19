import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RegistryClient,
  RegistryError,
  assertFetchableRegistry,
  catalogUrl,
  createFetcher,
  fetchCatalog,
  hashContent,
  isSafeItemPath,
  resolveItems,
  satisfies,
  verifyItem,
  withoutTrailingSlashes,
  type EItem,
} from "./index";

/**
 * The client is what stands between a registry and a user's disk.
 * Most of these tests are about refusing things: a bad hash, a path that leaves
 * the folder, a plain-http registry, a dependency cycle.
 */
const file = (path: string, content: string) => ({ path, content, sha256: hashContent(content) });

function item(name: string, over: Partial<EItem> = {}): EItem {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    kind: "component",
    title: name,
    description: "",
    core: ">=0.1.0 <0.2.0",
    dependencies: {},
    items: [],
    files: [file(`${name}/${name}.tsx`, `// ${name}\n`)],
    setup: [],
    motion: [],
    sound: [],
    a11y: { standard: "WCAG 2.2 AA", tested: [], limits: [] },
    changes: [],
    ...over,
  };
}

/** A registry served from memory, the way the CLI's tests serve one from disk. */
function serve(items: Record<string, EItem>, index?: unknown) {
  return new RegistryClient("https://echo.example/e", async (url) => {
    const name = decodeURIComponent(url.split("/").pop()!).replace(/\.json$/, "");
    if (name === "index") {
      return JSON.stringify(
        index ?? {
          schemaVersion: 1,
          version: "1.0.0",
          core: "0.1.0",
          items: Object.values(items).map((i) => ({
            name: i.name,
            version: i.version,
            kind: i.kind,
            title: i.title,
            description: i.description,
            items: i.items,
          })),
        },
      );
    }
    const found = items[name.replace(/@.*$/, "")];
    if (!found) throw new RegistryError(`404 for ${url}`);
    return JSON.stringify(found);
  });
}

test("a registry that isn't https is refused, unless it's local", () => {
  assert.doesNotThrow(() => assertFetchableRegistry("https://registry.example/e"));
  assert.doesNotThrow(() => assertFetchableRegistry("http://localhost:4000/e"));
  assert.doesNotThrow(() => assertFetchableRegistry("file:///tmp/e"));
  assert.throws(() => assertFetchableRegistry("http://registry.example/e"), /https only/);
  assert.throws(() => assertFetchableRegistry("not a url"), /Not a registry URL/);
});

test("a file whose content doesn't match its hash is refused", () => {
  const tampered = item("tabs");
  tampered.files[0]!.content = "// something else\n";
  assert.throws(() => verifyItem(tampered), /does not match its hash/);
});

test("a file that would land outside the Echo folder is refused", () => {
  const escaping = item("tabs", { files: [{ path: "../../.ssh/authorized_keys", content: "x", sha256: hashContent("x") }] });
  assert.throws(() => verifyItem(escaping), /leaves the Echo folder/);
  assert.equal(isSafeItemPath("tabs/tabs.tsx"), true);
  assert.equal(isSafeItemPath("../x"), false);
});

test("an index from a newer schema stops the install rather than half-reading it", async () => {
  const client = serve({}, { schemaVersion: 99, version: "1.0.0", core: "0.1.0", items: [] });
  await assert.rejects(() => client.index(), /Update echo-ui-cli/);
});

test("resolving an item brings its Echo dependencies, dependencies first", async () => {
  const client = serve({
    chat: item("chat", { items: ["field", "hardware-button"] }),
    field: item("field"),
    "hardware-button": item("hardware-button"),
  });
  const resolved = await resolveItems(client, ["chat"]);
  assert.deepEqual(resolved.map((i) => i.name), ["field", "hardware-button", "chat"]);
});

test("each item is resolved once, however many things need it", async () => {
  const client = serve({
    chat: item("chat", { items: ["field"] }),
    console: item("console", { items: ["field"] }),
    field: item("field"),
  });
  const resolved = await resolveItems(client, ["chat", "console"]);
  assert.deepEqual(resolved.map((i) => i.name), ["field", "chat", "console"]);
});

test("a dependency cycle stops the install and says where it is", async () => {
  const client = serve({ a: item("a", { items: ["b"] }), b: item("b", { items: ["a"] }) });
  await assert.rejects(() => resolveItems(client, ["a"]), /dependency cycle: a → b → a/);
});

test("core ranges are read the way the format writes them", () => {
  assert.equal(satisfies("0.1.0", ">=0.1.0 <0.2.0"), true);
  assert.equal(satisfies("0.1.9", ">=0.1.0 <0.2.0"), true);
  assert.equal(satisfies("0.2.0", ">=0.1.0 <0.2.0"), false);
  assert.equal(satisfies("0.0.9", ">=0.1.0 <0.2.0"), false);
  assert.equal(satisfies("2.0.0", ">=1.2.0 <2.0.0"), false);
});

/* ----------------------------------------------------------------- catalog */

test("the catalog sits beside /e/ as /r/catalog.json, on the site and in a file: build", () => {
  assert.equal(catalogUrl("https://echo.example/e"), "https://echo.example/r/catalog.json");
  assert.equal(catalogUrl("https://echo.example/e/"), "https://echo.example/r/catalog.json");
  assert.equal(catalogUrl("file:///work/apps/www/public/e"), "file:///work/apps/www/public/r/catalog.json");
  assert.throws(() => catalogUrl("http://evil.example/e"), /https only/);
});

test("a catalog in a newer format is refused with what to do; an unversioned one is read", async () => {
  const body = (over: object) => JSON.stringify({ name: "echo-ui", homepage: "", components: [], tokens: { colorRoles: [], sound: [], motion: [] }, ...over });
  const read = (text: string) => fetchCatalog("https://echo.example/e", async () => text);
  assert.equal((await read(body({ catalogVersion: 1 }))).components.length, 0);
  assert.equal((await read(body({}))).name, "echo-ui");
  await assert.rejects(read(body({ catalogVersion: 99 })), /format 99.*Update echo-ui-cli/);
  await assert.rejects(read("<html>"), /is not a catalog/);
  await assert.rejects(read("{}"), /lists no components/);
});

/**
 * Registry reads had no time limit of their own, so a host that took
 * the connection and never answered held `add`, `init` and every MCP tool for
 * as long as Node's own limit, five minutes, with nothing said.
 */
test("a registry that never answers is given up on, and says so", async () => {
  const { createServer } = await import("node:http");
  const held: import("node:http").ServerResponse[] = [];
  const server = createServer((_request, response) => void held.push(response));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as { port: number };
  try {
    const started = Date.now();
    await assert.rejects(createFetcher(300)(`http://127.0.0.1:${port}/e/index.json`), (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      assert.match((error as Error).message, /didn't answer within 0\.3 seconds/);
      return true;
    });
    assert.ok(Date.now() - started < 3000, "given up on near the limit, not at Node's five minutes");
  } finally {
    for (const response of held) response.destroy();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
});

/**
 * A read was tried once: one reset connection, or one 502 from the
 * edge, failed a whole `add` that had read every other document, and all it
 * said was "fetch failed".
 */
test("a dropped connection or a server's error is tried again, and a 404 is an answer", async () => {
  const { createServer } = await import("node:http");
  const plan: Record<string, ("drop" | number)[]> = {
    "/flaky.json": ["drop", 503, 200],
    "/missing.json": [404, 200],
    "/down.json": [502, 502, 502, 200],
  };
  const asked: Record<string, number> = {};
  const server = createServer((request, response) => {
    const path = request.url!;
    const step = plan[path]![asked[path] ?? 0]!;
    asked[path] = (asked[path] ?? 0) + 1;
    if (step === "drop") return void request.socket.destroy();
    response.writeHead(step, { "content-type": "application/json" }).end(step === 200 ? '{"ok":true}' : "");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as { port: number };
  const read = createFetcher(5000, { retryDelays: [10, 10] });
  try {
    assert.equal(await read(`http://127.0.0.1:${port}/flaky.json`), '{"ok":true}');
    assert.equal(asked["/flaky.json"], 3, "the drop and the 503 were each tried again");
    await assert.rejects(read(`http://127.0.0.1:${port}/missing.json`), /404/);
    assert.equal(asked["/missing.json"], 1, "a 404 isn't asked twice");
    await assert.rejects(read(`http://127.0.0.1:${port}/down.json`), /502 .*after 3 tries/);
    assert.equal(asked["/down.json"], 3, "two tries again, then it gives up");
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
  // Nothing there at all: what went wrong under "fetch failed" is said, by its code. which code
  // depends on the platform: macOS says the connection was refused (ECONNREFUSED), Linux's Node says
  // the socket closed (UND_ERR_SOCKET), so any code passes and the bare "fetch failed" doesn't.
  await assert.rejects(createFetcher(5000, { retryDelays: [] })(`http://127.0.0.1:${port}/flaky.json`), (error: unknown) => {
    assert.ok(error instanceof RegistryError);
    assert.match((error as Error).message, /fetch failed \([A-Z][A-Z_]+\)/);
    return true;
  });
});

/**
 * Cloudflare answers `{name}@{version}.json` with a 307 to the `%40`
 * spelling, and only that one is served under the immutable rule. Asked for as
 * served, a pinned read costs one request, not two.
 */
test("a pinned version is asked for as it's served, at %40, and a file: build still reads", async () => {
  const asked: string[] = [];
  const client = new RegistryClient("https://echo.example/e", async (url) => {
    asked.push(url);
    return JSON.stringify(item("modal"));
  });
  await client.item("modal", "1.0.0");
  await client.item("modal");
  assert.deepEqual(asked, ["https://echo.example/e/modal%401.0.0.json", "https://echo.example/e/modal.json"]);

  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const dir = await mkdtemp(join(tmpdir(), "echo-e-"));
  try {
    // The build writes the file with its `@`; a file: URL's `%40` reads it.
    await writeFile(join(dir, "modal@1.0.0.json"), JSON.stringify(item("modal")));
    assert.equal((await new RegistryClient(pathToFileURL(dir).href).item("modal", "1.0.0")).name, "modal");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/**
 * A registry address was trimmed of its trailing slashes with
 * /\/+$/, which is quadratic on a long run of slashes that isn't at the end:
 * an address in someone's echo.json, or one a registry hands back, could hold
 * the CLI for minutes. A version range was read with a pattern of the same
 * kind. Both are read in one pass now.
 */
test("an address or a range made to be slow is read in a moment", () => {
  const run = "/".repeat(200_000);
  const started = performance.now();
  assert.equal(withoutTrailingSlashes(`https://a.dev${run}x`), `https://a.dev${run}x`);
  assert.equal(new RegistryClient(`https://a.dev/e${run}x`).registry.length, `https://a.dev/e${run}x`.length);
  assert.ok(catalogUrl(`https://a.dev/e${run}x`).endsWith("/r/catalog.json"));
  assert.equal(satisfies("1.0.0", `>=0.0.0${"0".repeat(200_000)}`), true);
  assert.ok(performance.now() - started < 2000, `took ${Math.round(performance.now() - started)}ms`);
  // What they trim and read is unchanged.
  assert.equal(withoutTrailingSlashes("https://a.dev/e///"), "https://a.dev/e");
  assert.equal(withoutTrailingSlashes("///"), "");
  assert.equal(satisfies("1.2.3", ">=1.0.0 <2.0.0"), true);
  assert.equal(satisfies("2.0.0", ">=1.0.0 <2.0.0"), false);
  assert.throws(() => satisfies("1.0.0", ">=one"), RegistryError);
});
