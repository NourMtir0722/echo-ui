/**
 * The smoke check, proven offline.
 *
 * `smoke.ts` runs against the network, so once production is healthy it can
 * only ever be observed passing — and a check nobody can show failing proves
 * nothing. So every assertion is proven
 * capable of failing here instead, offline, against fixture worlds: a 404
 * index, a stale version, a range npm cannot satisfy, a package with no `bin`,
 * a dead docs route. Each mutation must turn ONE assertion red and leave the
 * rest alone — otherwise the report cannot tell a 3am reader which contract
 * broke, which is the whole point of reporting per assertion.
 *
 * These run in `pnpm test`. The live check does not: it needs a network, and a
 * check that cannot run on a plane gets skipped, then ignored (the same
 * reasoning that keeps `published-core.json` offline).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { REGISTRY_HOMEPAGE } from "../src/agent/guidance";
import { runSmoke, routesFromReadmes, type SmokeFetch, type SmokeTarget } from "./smoke";

const SITE = "https://site.test";
const NPM = "https://npm.test";
const MCP = "https://mcp.site.test/mcp";
const TOOLS = ["search_components", "check_code", "wear_style"];

/** A JSON-RPC result, as the hosted server sends it. */
const rpc = (result: unknown) => ({ status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result }) });

const bin = { "echo-ui": "./dist/index.js" };
/** The commands the fixture's docs teach, and its published CLI has. */
const COMMANDS = ["init", "add", "which"];

/** A world where everything Echo promises is true. */
function healthyWorld(): Record<string, { status: number; body: string }> {
  const json = (value: unknown) => ({ status: 200, body: JSON.stringify(value) });
  return {
    [`${SITE}/e/index.json`]: json({ schemaVersion: 1, version: "0.2.0", core: "0.1.0", items: [] }),
    [`${NPM}/echo-ui-core`]: json({ "dist-tags": { latest: "0.1.0" }, versions: { "0.0.1": {}, "0.1.0": {} } }),
    [`${NPM}/echo-ui-cli`]: json({ "dist-tags": { latest: "0.1.0" }, versions: { "0.1.0": { bin, echoUi: { commands: COMMANDS } } } }),
    [`${NPM}/echo-ui-mcp`]: json({ "dist-tags": { latest: "0.1.0" }, versions: { "0.1.0": { bin } } }),
    [`${SITE}/`]: { status: 200, body: "<html>" },
    [`${SITE}/docs/installation`]: { status: 200, body: "<html>" },
    [`${SITE}/llms.txt`]: { status: 200, body: "Echo" },
    // The hosted MCP server, keyed by the call: it takes POSTs only.
    [`POST ${MCP} initialize`]: rpc({ protocolVersion: "2025-06-18", serverInfo: { name: "echo-ui", version: "0.1.0" }, capabilities: {} }),
    [`POST ${MCP} tools/list`]: rpc({ tools: TOOLS.map((name) => ({ name })) }),
    // Deliberately absent: `${SITE}/e`. Nothing is served there — the CLI
    // appends `/index.json` — so a check that probes it reports a failure that
    // is not one.
  };
}

function worldFetch(world: Record<string, { status: number; body: string }>): SmokeFetch {
  return async (url, post) => {
    const key = post ? `POST ${url} ${(JSON.parse(post.body) as { method: string }).method}` : url;
    const found = world[key];
    if (found?.status === -1) throw new Error("getaddrinfo ENOTFOUND");
    return found ?? { status: 404, body: "not found" };
  };
}

function target(world: Record<string, { status: number; body: string }>): SmokeTarget {
  return {
    site: SITE,
    npmRegistry: NPM,
    expected: { version: "0.2.0", source: "the fixture" },
    packages: [
      { name: "echo-ui-core", bin: false },
      { name: "echo-ui-cli", bin: true, commands: COMMANDS },
      { name: "echo-ui-mcp", bin: true },
    ],
    routes: [`${SITE}`, `${SITE}/e`, `${SITE}/docs/installation`, `${SITE}/llms.txt`],
    mcp: { url: MCP, version: "0.1.0", tools: TOOLS },
    fetch: worldFetch(world),
  };
}

/** The assertions a world turns red, in report order. Blocked counts as not-passing. */
async function redsFor(world: Record<string, { status: number; body: string }>): Promise<string[]> {
  const report = await runSmoke(target(world));
  return report.problems.map((problem) => `${problem.assertion}${problem.blocked ? " (blocked)" : ""}`);
}

test("a healthy production turns nothing red", async () => {
  const report = await runSmoke(target(healthyWorld()));
  assert.deepEqual(report.problems, [], "the check must be capable of passing, or it is noise");
  assert.equal(report.passed.length, 5);
});

test("the /e base URL is proven by the resource the CLI asks for, not by probing the base", async () => {
  // `${SITE}/e` 404s in the healthy world and the run is still green; make the
  // resource itself disappear and site-routes goes red.
  const world = healthyWorld();
  delete world[`${SITE}/e/index.json`];
  const reds = await redsFor(world);
  assert.ok(reds.includes("site-routes"), `expected site-routes to notice; got ${reds.join(", ")}`);
});

test("registry-index goes red alone when production serves a stale release", async () => {
  const world = healthyWorld();
  world[`${SITE}/e/index.json`] = {
    status: 200,
    body: JSON.stringify({ schemaVersion: 1, version: "0.1.0", core: "0.1.0", items: [] }),
  };
  assert.deepEqual(await redsFor(world), ["registry-index"]);
});

test("registry-index goes red alone when the index speaks a schema this repo does not write", async () => {
  const world = healthyWorld();
  world[`${SITE}/e/index.json`] = {
    status: 200,
    body: JSON.stringify({ schemaVersion: 99, version: "0.2.0", core: "0.1.0", items: [] }),
  };
  assert.deepEqual(await redsFor(world), ["registry-index"]);
});

test("core-range goes red alone when npm holds nothing the declared range admits", async () => {
  const world = healthyWorld();
  // What is true today: `/e/` declares >=0.1.0 <0.2.0 and npm's highest is 0.0.1.
  world[`${NPM}/echo-ui-core`] = {
    status: 200,
    body: JSON.stringify({ "dist-tags": { latest: "0.0.1" }, versions: { "0.0.1": {} } }),
  };
  assert.deepEqual(await redsFor(world), ["core-range"]);
});

test("npm-packages goes red alone when the published CLI has no bin", async () => {
  const world = healthyWorld();
  // `echo-ui-cli@0.0.0`, the name-reservation stub, exactly as npm holds it.
  world[`${NPM}/echo-ui-cli`] = {
    status: 200,
    body: JSON.stringify({ "dist-tags": { latest: "0.0.0" }, versions: { "0.0.0": {} } }),
  };
  // The stub has no commands either, so npm-packages says two things; it's still the one red.
  assert.deepEqual([...new Set(await redsFor(world))], ["npm-packages"]);
});

test("npm-packages goes red alone when the published CLI lacks a command the docs teach", async () => {
  const world = healthyWorld();
  // What npm held on 2026-10-12: echo-ui-cli 0.1.0, from before which, check and style.
  world[`${NPM}/echo-ui-cli`] = {
    status: 200,
    body: JSON.stringify({ "dist-tags": { latest: "0.1.0" }, versions: { "0.1.0": { bin } } }),
  };
  assert.deepEqual(await redsFor(world), ["npm-packages"]);
});

test("npm-packages goes red alone when an advertised package was never published", async () => {
  const world = healthyWorld();
  delete world[`${NPM}/echo-ui-mcp`];
  assert.deepEqual(await redsFor(world), ["npm-packages"]);
});

test("site-routes goes red alone when a documented route 404s", async () => {
  const world = healthyWorld();
  delete world[`${SITE}/docs/installation`];
  assert.deepEqual(await redsFor(world), ["site-routes"]);
});

/**
 * Production before its first registry deploy.
 *
 * With no `/e/` deployed there is no declared range to resolve, so `core-range`
 * cannot fail for its own reason. It must not report green, and it must not
 * report a range failure it did not observe.
 */
test("with no /e/ deployed, core-range reports blocked rather than passing or inventing a failure", async () => {
  const world = healthyWorld();
  delete world[`${SITE}/e/index.json`];
  const report = await runSmoke(target(world));
  const core = report.problems.filter((problem) => problem.assertion === "core-range");
  assert.equal(core.length, 1);
  assert.equal(core[0]!.blocked, true, "a red that fires for the wrong reason is not evidence");
  assert.ok(!report.passed.includes("core-range"), "blocked is not a pass");
  assert.match(core[0]!.detail, /Deploy the site/, "the detail should say where the answer comes from");
});

test("a network failure is reported as blocked, not as a broken contract", async () => {
  const world = healthyWorld();
  const base = worldFetch(world);
  const report = await runSmoke({
    ...target(world),
    fetch: async (url, post) => {
      if (url === `${NPM}/echo-ui-cli`) throw new Error("getaddrinfo ENOTFOUND npm.test");
      return base(url, post);
    },
  });
  assert.deepEqual(
    report.problems.map((problem) => [problem.assertion, problem.blocked === true]),
    [["npm-packages", true]],
    "DNS falling over is not the same claim as `echo-ui-cli has no bin`",
  );
});

/**
 * The route list is derived from the READMEs so it cannot go stale the way a
 * hand-written list does. This checks the derivation still finds every
 * README — including the npm package READMEs, which it once missed.
 */
test("the routes are read out of the published READMEs", async () => {
  const routes = await routesFromReadmes();
  for (const path of ["/docs/installation", "/e", "/llms.txt", "/r/catalog.json"]) {
    const expected = `${REGISTRY_HOMEPAGE}${path}`;
    assert.ok(routes.includes(expected), `${expected} is linked in a README but not checked`);
  }
  assert.ok(
    routes.every((route) => route.startsWith(REGISTRY_HOMEPAGE)),
    "only the site's own routes belong here",
  );
});

/* ------------------------------------------ found reviewing the check itself */
/**
 * `checkIndex` was the one assertion that reported a transport failure
 * as a hard red. The others already treat it as blocked, for the reason stated
 * at the top of `smoke.ts`: a red that fires for the wrong reason is not
 * evidence. This check runs on a schedule, so the wrong reason is a 3am page.
 */
test("an unreachable index is blocked, not a claim that production serves no registry", async () => {
  const world = healthyWorld();
  const base = worldFetch(world);
  const report = await runSmoke({
    ...target(world),
    fetch: async (url) => {
      if (url === `${SITE}/e/index.json`) throw new Error("getaddrinfo ENOTFOUND site.test");
      return base(url);
    },
  });
  const index = report.problems.filter((problem) => problem.assertion === "registry-index");
  assert.equal(index.length, 1);
  assert.equal(index[0]!.blocked, true, "DNS falling over is not the claim `/e/index.json` is 404");

  const core = report.problems.filter((problem) => problem.assertion === "core-range");
  assert.equal(core.length, 1);
  assert.equal(core[0]!.blocked, true);
  assert.doesNotMatch(
    core[0]!.detail,
    /Deploy the site/,
    "the range went unjudged because the index could not be read, not because no deploy has happened",
  );
});

/**
 * A 200 carrying well-formed JSON of the wrong shape threw a TypeError
 * out of `coreRange(index.core)`, which ended the run before `npm-packages` and
 * `site-routes` were judged at all — replacing the per-assertion report the check
 * exists to give with a single stack trace.
 */
test("an index of the wrong shape is one red, not a stack trace that ends the run", async () => {
  const world = healthyWorld();
  world[`${SITE}/e/index.json`] = {
    status: 200,
    body: JSON.stringify({ schemaVersion: 1, version: "0.2.0", items: [] }),
  };
  const report = await runSmoke(target(world));
  assert.deepEqual(
    report.problems.map((problem) => [problem.assertion, problem.blocked === true]),
    [
      ["registry-index", false],
      ["core-range", true],
    ],
  );
  assert.ok(
    report.passed.includes("npm-packages") && report.passed.includes("site-routes"),
    "a malformed index must not stop the other assertions being judged",
  );
});

/**
 * The range is satisfiable and the install is still broken for
 * everyone: `init` installs a bare `echo-ui-core` (`init.ts`), which is npm's
 * `latest` dist-tag, and `add` then holds THAT version against the range
 * (`add.ts`). Membership somewhere in `versions` is not the question the
 * install asks.
 */
test("core-range goes red when `latest` is outside the range, though another version satisfies it", async () => {
  const world = healthyWorld();
  world[`${NPM}/echo-ui-core`] = {
    status: 200,
    body: JSON.stringify({ "dist-tags": { latest: "0.0.1" }, versions: { "0.0.1": {}, "0.1.0": {} } }),
  };
  assert.deepEqual(await redsFor(world), ["core-range"]);
});

test("hosted-mcp goes red alone when the Worker is behind this repo's server", async () => {
  const world = healthyWorld();
  world[`POST ${MCP} initialize`] = rpc({ serverInfo: { name: "echo-ui", version: "0.0.9" } });
  const report = await runSmoke(target(world));
  assert.deepEqual(report.problems.map((p) => p.assertion), ["hosted-mcp"]);
  assert.match(report.problems[0]!.detail, /version 0\.0\.9; mcp\/package\.json says 0\.1\.0: deploy the Worker/);
});

test("hosted-mcp goes red alone when a tool the README lists isn't served, or one it doesn't is", async () => {
  const missing = healthyWorld();
  missing[`POST ${MCP} tools/list`] = rpc({ tools: [{ name: "search_components" }, { name: "check_code" }] });
  const report = await runSmoke(target(missing));
  assert.deepEqual(report.problems.map((p) => p.assertion), ["hosted-mcp"]);
  assert.match(report.problems[0]!.detail, /lists wear_style, which .* doesn't serve/);

  const extra = healthyWorld();
  extra[`POST ${MCP} tools/list`] = rpc({ tools: [...TOOLS, "secret_tool"].map((name) => ({ name })) });
  assert.match((await runSmoke(target(extra))).problems[0]!.detail, /serves secret_tool, which mcp\/README\.md doesn't list/);
});

test("hosted-mcp is blocked, not failed, when the server can't be reached; a wrong answer is a failure", async () => {
  const down = healthyWorld();
  down[`POST ${MCP} initialize`] = { status: -1, body: "" };
  assert.deepEqual(await redsFor(down), ["hosted-mcp (blocked)"]);

  const broken = healthyWorld();
  broken[`POST ${MCP} initialize`] = { status: 500, body: "Internal Server Error" };
  assert.deepEqual(await redsFor(broken), ["hosted-mcp"]);
});
