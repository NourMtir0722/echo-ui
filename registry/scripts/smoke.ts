/**
 * The production smoke check.
 *
 * Every other contract test in this repository validates the WORKING TREE.
 * `identity.test.ts` pins the domain across fourteen files, `registry.test.mjs`
 * derives dependencies from imports, `consumer-types.test.ts` compiles shipped
 * files as a stranger would. None of them asks what is being SERVED or
 * PUBLISHED — which is how the repository got six milestones better while the
 * artifact a user meets did not move, and nothing noticed.
 *
 * This asks. Five assertions, against the network:
 *
 *   registry-index  `/e/index.json` resolves, speaks this schema, and is the
 *                   release `main` would deploy.
 *   core-range      the `echo-ui-core` range that index declares is one npm
 *                   can actually satisfy.
 *   npm-packages    every package this repo publishes exists on npm, the
 *                   ones that declare a `bin` have one where it counts, and
 *                   the CLI npm serves has every command the docs teach.
 *   site-routes     every site URL a published README sends someone to is 200.
 *   hosted-mcp      the hosted MCP server answers, reports the release this
 *                   repo's server is at, and serves exactly the tools its
 *                   README lists: the Worker deploys apart from the site, so
 *                   it can be left behind on its own.
 *
 * WHY IT REPORTS PER ASSERTION. It fires after a deploy and on a schedule, so
 * "smoke check failed" is a page at 3am with no lead. Each problem names the
 * assertion it belongs to, in the `problems` + `assert.deepEqual([])` shape
 * `headers.test.ts` and `identity.test.ts` already use.
 *
 * WHY THE TARGET IS AN ARGUMENT. A check nobody can show failing proves
 * nothing. `smoke.test.ts` drives this function against fixture worlds — a
 * 404 index, a version nobody published, a package with no bin — and asserts
 * that ONE assertion goes red each time. That part keeps working long after
 * production is healthy.
 *
 * WHY `blocked` EXISTS AND IS NOT A PASS. `core-range` can only be judged if
 * the index resolves: production serves no `/e/` today, so there is no declared
 * range to test. Reporting that as green would be a lie, and reporting it as a
 * range failure would be worse — a red that fires for the wrong reason is not
 * evidence. It is reported as blocked, and it counts as failure.
 *
 * The same rule covers the network itself, on EVERY assertion: a host that does
 * not answer is blocked, never a claim about what it serves. `registry-index`
 * was the one that got this wrong, which also made `core-range` print
 * "waiting on a deploy" at a DNS failure it had never observed.
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HOSTED_MCP_URL, REGISTRY_HOMEPAGE } from "../src/agent/guidance";
import { SCHEMA_VERSION, coreRange, rangeAdmits, type EIndex } from "../src/registry/e-format";

export const ASSERTIONS = ["registry-index", "core-range", "npm-packages", "site-routes", "hosted-mcp"] as const;
export type AssertionId = (typeof ASSERTIONS)[number];

export interface SmokeResponse {
  status: number;
  body: string;
}

/** A JSON-RPC call, for the one assertion that has to POST: an MCP server takes nothing else. */
export interface SmokePost {
  method: "POST";
  body: string;
}

/** Injected so fixtures can build a world without a network (point 2). */
export type SmokeFetch = (url: string, post?: SmokePost) => Promise<SmokeResponse>;

export interface SmokeTarget {
  /** The site's origin, no trailing slash — `REGISTRY_HOMEPAGE` in production. */
  site: string;
  /** Origin of the npm registry API: `https://registry.npmjs.org`. */
  npmRegistry: string;
  /** The `/e/` release `main` would deploy right now, and where that came from. */
  expected: { version: string; source: string };
  /**
   * What this repo publishes. `bin: true` means the manifest declares one;
   * `commands` are the commands the docs teach for a CLI (its package.json's
   * `echoUi.commands`), which the published version must have.
   */
  packages: { name: string; bin: boolean; commands?: readonly string[] }[];
  /** Absolute site URLs a published README sends a reader to. */
  routes: string[];
  /** The hosted MCP server: its address, the version this repo's server is at, the tools its README lists. */
  mcp: { url: string; version: string; tools: string[] };
  fetch: SmokeFetch;
}

export interface SmokeProblem {
  assertion: AssertionId;
  detail: string;
  /** True when the assertion could not be judged, rather than judged and failed. */
  blocked?: true;
}

export interface SmokeReport {
  problems: SmokeProblem[];
  /** Assertions with nothing against them. */
  passed: AssertionId[];
}

/** A URL a client appends a path to is proven by the resource the client asks for.
 *
 * `README.md` points at the site's `/e`, because that is what goes in
 * `echo.json`'s `registry` — but nothing is served AT `/e`, and
 * `RegistryClient` asks for `/e/index.json` (`packages/client/src/index.ts`).
 * Probing the base by analogy is how a check invents a failure that is not one:
 * the same trap `/r/` sets. */
function proveRoute(url: string, site: string): string {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed === `${site}/e`) return `${site}/e/index.json`;
  return trimmed === site ? `${site}/` : url;
}

async function get(target: SmokeTarget, url: string, post?: SmokePost): Promise<SmokeResponse | Error> {
  try {
    return await target.fetch(url, post);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * What `checkIndex` leaves behind for `checkCoreRange`: either an index worth
 * reading a range out of, or the sentence saying why there is none.
 *
 * The sentence travels rather than being re-derived, because the REASON changes
 * what the reader should do. "Production serves no `/e/` yet, deploy the site" and
 * "the host did not answer" are different pages at 3am, and core-range used to
 * print the first one for both.
 */
interface IndexOutcome {
  /** Present only when the index is usable as the source of a declared range. */
  index?: EIndex;
  /** Why there is no declared range to resolve, in core-range's own words. */
  why?: string;
}

/** Production has no registry yet, so there is nothing to judge a range against. */
const PENDING_DEPLOY =
  "not judged: production serves no /e/index.json, so there is no declared range to resolve." +
  " Deploy the site so /e/ is served, then re-run";

/** `/e/index.json` — resolves, speaks this schema, and is the current release. */
async function checkIndex(target: SmokeTarget, problems: SmokeProblem[]): Promise<IndexOutcome> {
  const url = `${target.site}/e/index.json`;
  const fail = (detail: string) => problems.push({ assertion: "registry-index", detail });
  const response = await get(target, url);
  if (response instanceof Error) {
    // Blocked, not failed: every other assertion already treats a transport
    // failure this way, and this one claiming `/e/` is gone because DNS blinked
    // is the wrong-reason red this whole file argues against.
    problems.push({ assertion: "registry-index", detail: `${url} could not be fetched: ${response.message}`, blocked: true });
    return { why: `not judged: ${url} could not be fetched (${response.message}), so no range could be read` };
  }
  if (response.status !== 200) {
    fail(`${url} → ${response.status}; every \`echo-ui-cli add\` starts here`);
    return { why: PENDING_DEPLOY };
  }
  let index: EIndex;
  try {
    index = JSON.parse(response.body) as EIndex;
  } catch (error) {
    fail(`${url} is not JSON: ${(error as Error).message}`);
    return { why: `not judged: ${url} is not JSON, so there is no declared range to read` };
  }
  if (index.schemaVersion !== SCHEMA_VERSION) {
    fail(`${url} declares schema ${index.schemaVersion}; this repo writes ${SCHEMA_VERSION}`);
  }
  if (index.version !== target.expected.version) {
    fail(
      `${url} serves ${index.version}; ${target.expected.source} says ${target.expected.version}` +
        " — production is behind `main`",
    );
  }
  // A 200 is not a shape. Reading `core` off whatever came back used to throw
  // out of `coreRange` and end the run before npm-packages and site-routes were
  // judged at all — a stack trace where the per-assertion report belongs.
  // The field is checked here because here is where `add` reads it.
  if (typeof index.core !== "string" || !/^\d+\.\d+\.\d+/.test(index.core)) {
    fail(`${url} declares core ${JSON.stringify(index.core)}, which is not a version; every \`add\` reads this field`);
    return { why: `not judged: ${url} declares no usable \`core\`, so there is no range to resolve` };
  }
  return { index };
}

/**
 * The declared `core` range, against what npm actually holds.
 *
 * This is the one check that HAS to go to the network, and the other half of
 * `published-core.json` is hand-edited on purpose so the offline check runs
 * on a plane — the cost is that it is a number someone typed. Bump it without
 * publishing and every test in the repository goes green while `/e/` declares a
 * core npm does not have. Nothing offline can see that. This can.
 */
async function checkCoreRange(
  target: SmokeTarget,
  outcome: IndexOutcome,
  problems: SmokeProblem[],
): Promise<void> {
  if (!outcome.index) {
    problems.push({ assertion: "core-range", detail: outcome.why ?? PENDING_DEPLOY, blocked: true });
    return;
  }
  const range = coreRange(outcome.index.core);
  const url = `${target.npmRegistry}/echo-ui-core`;
  const fail = (detail: string) => problems.push({ assertion: "core-range", detail });
  const response = await get(target, url);
  if (response instanceof Error) {
    problems.push({ assertion: "core-range", detail: `${url} could not be fetched: ${response.message}`, blocked: true });
    return;
  }
  if (response.status !== 200) {
    fail(`/e/ declares echo-ui-core ${range} and ${url} → ${response.status}`);
    return;
  }
  let manifest: { "dist-tags"?: Record<string, string>; versions?: Record<string, unknown> };
  try {
    manifest = JSON.parse(response.body) as typeof manifest;
  } catch (error) {
    problems.push({ assertion: "core-range", detail: `${url} is not JSON: ${(error as Error).message}`, blocked: true });
    return;
  }
  const versions = Object.keys(manifest.versions ?? {});
  if (!versions.some((version) => rangeAdmits(range, version))) {
    fail(
      `/e/ declares echo-ui-core ${range}; npm holds ${versions.join(", ") || "nothing"}` +
        " — `echo-ui-cli add` fails for everyone, not some",
    );
    return;
  }
  // Membership somewhere in `versions` is not the question the install asks.
  // `init` installs a bare `echo-ui-core`, so the user gets npm's `latest`
  // dist-tag, and `add` then holds THAT version against this range. An in-range
  // version nobody resolves to is a green check over a broken install.
  // A missing `latest` is npm-packages' red, not a second one here.
  const latest = manifest["dist-tags"]?.latest;
  if (latest && !rangeAdmits(range, latest)) {
    fail(
      `/e/ declares echo-ui-core ${range} and npm's \`latest\` is ${latest}` +
        " — `echo-ui-cli init` installs a bare `echo-ui-core`, so every install gets `latest` and `add` then refuses it",
    );
  }
}

/** The packages this repo publishes: they exist, and a declared `bin` survives publication. */
async function checkPackages(target: SmokeTarget, problems: SmokeProblem[]): Promise<void> {
  const fail = (detail: string) => problems.push({ assertion: "npm-packages", detail });
  for (const pkg of target.packages) {
    const url = `${target.npmRegistry}/${pkg.name}`;
    const response = await get(target, url);
    if (response instanceof Error) {
      problems.push({ assertion: "npm-packages", detail: `${url} could not be fetched: ${response.message}`, blocked: true });
      continue;
    }
    if (response.status !== 200) {
      fail(`${pkg.name} is not on npm (${url} → ${response.status})`);
      continue;
    }
    let manifest: { "dist-tags"?: Record<string, string>; versions?: Record<string, { bin?: unknown; echoUi?: { commands?: string[] } }> };
    try {
      manifest = JSON.parse(response.body) as typeof manifest;
    } catch (error) {
      problems.push({ assertion: "npm-packages", detail: `${url} is not JSON: ${(error as Error).message}`, blocked: true });
      continue;
    }
    const latest = manifest["dist-tags"]?.latest;
    if (!latest) {
      fail(`${pkg.name} has no \`latest\` dist-tag`);
      continue;
    }
    if (pkg.commands) {
      const published = new Set(manifest.versions?.[latest]?.echoUi?.commands ?? []);
      const missing = pkg.commands.filter((c) => !published.has(c));
      if (missing.length) {
        fail(`${pkg.name}@${latest} has no ${missing.map((c) => `\`${c}\``).join(", ")}, which the docs teach: publish the CLI the docs describe`);
      }
    }
    if (!pkg.bin) continue;
    const bin = manifest.versions?.[latest]?.bin;
    const empty = !bin || (typeof bin === "object" && Object.keys(bin as object).length === 0);
    if (empty) {
      fail(`${pkg.name}@${latest} has no \`bin\`; \`npx ${pkg.name}\` fails with npm's own error, not a clean "not found"`);
    }
  }
}

/** Every site URL a published README sends someone to. */
async function checkRoutes(target: SmokeTarget, problems: SmokeProblem[]): Promise<void> {
  const fail = (detail: string) => problems.push({ assertion: "site-routes", detail });
  for (const route of target.routes) {
    const url = proveRoute(route, target.site);
    const response = await get(target, url);
    if (response instanceof Error) {
      problems.push({ assertion: "site-routes", detail: `${url} could not be fetched: ${response.message}`, blocked: true });
      continue;
    }
    if (response.status !== 200) {
      fail(`${route} → ${response.status}${url === route ? "" : ` (probed as ${url})`}`);
    }
  }
}

/**
 * The hosted MCP server, through the two calls a client makes first. It keeps
 * no sessions, so each POST stands alone. A host that doesn't answer is
 * blocked, as everywhere else here; one that answers wrong is the finding.
 */
async function checkMcp(target: SmokeTarget, problems: SmokeProblem[]): Promise<void> {
  const { url, version, tools } = target.mcp;
  const fail = (detail: string) => problems.push({ assertion: "hosted-mcp", detail });

  /** One call's result, or nothing once its problem is recorded. */
  async function call(method: string, params: unknown): Promise<Record<string, unknown> | undefined> {
    const response = await get(target, url, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    if (response instanceof Error) {
      problems.push({ assertion: "hosted-mcp", detail: `${url} could not be reached: ${response.message}`, blocked: true });
      return undefined;
    }
    if (response.status !== 200) {
      fail(`${method} → ${response.status}; ChatGPT, Claude and every remote client connect here`);
      return undefined;
    }
    let reply: { result?: Record<string, unknown>; error?: { message?: string } };
    try {
      reply = JSON.parse(response.body) as typeof reply;
    } catch (error) {
      fail(`${method} answered with something that isn't JSON: ${(error as Error).message}`);
      return undefined;
    }
    if (!reply.result) {
      fail(`${method} answered with an error: ${reply.error?.message ?? "no result"}`);
      return undefined;
    }
    return reply.result;
  }

  const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "echo-smoke", version: "0" } });
  if (!init) return;
  const live = (init.serverInfo as { version?: string } | undefined)?.version;
  if (live !== version) {
    fail(`${url} is version ${live ?? "unknown"}; mcp/package.json says ${version}: deploy the Worker (pnpm --filter echo-ui-mcp deploy:worker)`);
  }
  const listed = await call("tools/list", {});
  if (!listed) return;
  const served = ((listed.tools ?? []) as { name: string }[]).map((t) => t.name);
  const missing = tools.filter((name) => !served.includes(name));
  const extra = served.filter((name) => !tools.includes(name));
  if (missing.length) fail(`mcp/README.md lists ${missing.join(", ")}, which ${url} doesn't serve: deploy the Worker`);
  if (extra.length) fail(`${url} serves ${extra.join(", ")}, which mcp/README.md doesn't list`);
}

export async function runSmoke(target: SmokeTarget): Promise<SmokeReport> {
  const problems: SmokeProblem[] = [];
  const outcome = await checkIndex(target, problems);
  await checkCoreRange(target, outcome, problems);
  await checkPackages(target, problems);
  await checkRoutes(target, problems);
  await checkMcp(target, problems);
  const failed = new Set(problems.map((problem) => problem.assertion));
  return { problems, passed: ASSERTIONS.filter((id) => !failed.has(id)) };
}

/* ------------------------------------------------------------------ runner */

const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(registryRoot, "..");

/** Published surfaces a stranger reads. The npm READMEs are surfaces too. */
const README_FILES = ["README.md", "packages/core/README.md", "packages/cli/README.md", "mcp/README.md"];

/** What this repo publishes, read from the manifests rather than listed by hand. */
const PACKAGE_MANIFESTS = ["packages/core/package.json", "packages/cli/package.json", "mcp/package.json"];

/**
 * Site URLs a reader is sent to, derived from the READMEs so the list cannot go
 * stale. The host comes from `REGISTRY_HOMEPAGE`, never spelled out — a rename
 * is already expensive enough (`identity.test.ts`).
 */
export async function routesFromReadmes(files = README_FILES): Promise<string[]> {
  const host = new RegExp(`${REGISTRY_HOMEPAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\s)"'\`<>\\]]*`, "g");
  const found = new Set<string>();
  for (const file of files) {
    const content = await readFile(resolve(repoRoot, file), "utf8");
    for (const match of content.matchAll(host)) found.add(match[0].replace(/[.,]$/, ""));
  }
  return [...found].sort();
}

/** The tools `mcp/README.md` lists in its table, in its order: what the hosted server must serve. */
export async function toolsFromReadme(file = "mcp/README.md"): Promise<string[]> {
  const text = await readFile(resolve(repoRoot, file), "utf8");
  const section = text.slice(text.indexOf("\n## Tools\n"), text.indexOf("\n## ", text.indexOf("\n## Tools\n") + 1));
  return [...section.matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1]!);
}

/** The real fetcher: a status and a body, with a timeout so a hung host is not a hung page. */
export function httpFetch(timeoutMs = 15_000): SmokeFetch {
  return async (url, post) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        ...(post ? { method: post.method, body: post.body, headers: { "content-type": "application/json", accept: "application/json, text/event-stream" } } : {}),
      });
      return { status: response.status, body: await response.text() };
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Production, as `main` would have it.
 *
 * The expected release is the built `/e/index.json`, because that is literally
 * what the deploy uploads — not a number re-derived here, which would be a
 * second opinion on the changelog that could disagree with the build.
 */
export async function productionTarget(): Promise<SmokeTarget> {
  const built = resolve(repoRoot, "apps/www/public/e/index.json");
  let local: EIndex;
  try {
    local = JSON.parse(await readFile(built, "utf8")) as EIndex;
  } catch {
    throw new Error("apps/www/public/e/index.json is missing — run `pnpm build:registry` first");
  }
  const packages = await Promise.all(
    PACKAGE_MANIFESTS.map(async (file) => {
      const manifest = JSON.parse(await readFile(resolve(repoRoot, file), "utf8")) as {
        name: string;
        bin?: Record<string, string> | string;
        echoUi?: { commands?: string[] };
      };
      return { name: manifest.name, bin: Boolean(manifest.bin), ...(manifest.echoUi?.commands ? { commands: manifest.echoUi.commands } : {}) };
    }),
  );
  return {
    site: REGISTRY_HOMEPAGE,
    npmRegistry: "https://registry.npmjs.org",
    expected: { version: local.version, source: "the built apps/www/public/e/index.json" },
    packages,
    routes: await routesFromReadmes(),
    mcp: {
      url: HOSTED_MCP_URL,
      version: (JSON.parse(await readFile(resolve(repoRoot, "mcp/package.json"), "utf8")) as { version: string }).version,
      tools: await toolsFromReadme(),
    },
    fetch: httpFetch(),
  };
}

const LABEL: Record<AssertionId, string> = {
  "registry-index": "registry-index",
  "core-range": "core-range   ",
  "npm-packages": "npm-packages ",
  "site-routes": "site-routes  ",
  "hosted-mcp": "hosted-mcp   ",
};

export function formatReport(target: SmokeTarget, report: SmokeReport): string {
  const lines = [`Production smoke check — ${target.site} (npm: ${target.npmRegistry})`];
  for (const id of ASSERTIONS) {
    const mine = report.problems.filter((problem) => problem.assertion === id);
    if (mine.length === 0) {
      lines.push(`  PASS    ${LABEL[id]}`);
      continue;
    }
    for (const problem of mine) {
      lines.push(`  ${problem.blocked ? "BLOCKED" : "FAIL   "} ${LABEL[id]}  ${problem.detail}`);
    }
  }
  const reds = report.problems.filter((p) => !p.blocked).length;
  const blocked = report.problems.length - reds;
  lines.push(
    report.problems.length === 0
      ? `  ${ASSERTIONS.length}/${ASSERTIONS.length} assertions pass.`
      : `  ${reds} failure(s)${blocked ? `, ${blocked} not judged` : ""}; ${report.passed.length}/${ASSERTIONS.length} assertions pass.`,
  );
  return lines.join("\n");
}

/* Run only as a script, so a test can import the check and drive it. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const target = await productionTarget();
    const report = await runSmoke(target);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ site: target.site, expected: target.expected, ...report }, null, 2));
    } else {
      console.log(formatReport(target, report));
    }
    if (report.problems.length > 0) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
