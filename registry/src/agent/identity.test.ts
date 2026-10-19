import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ECHO_CLI, HOSTED_MCP_URL, REGISTRY_HOMEPAGE, SUPPORT_EMAIL, installCommand, installName } from "./guidance";
import { eName } from "../registry/e-format";

/**
 * The project's identity — the domain the registry is served from.
 *
 * It is printed in the homepage hero, in llms.txt, in catalog.json, on every
 * doc page, in every install line and in the CLI's default `--registry`, so
 * changing it after launch breaks every project's `echo.json`. That makes a
 * rename expensive, and expensive-and-undocumented is how it ends up never
 * happening.
 *
 * So this test does two jobs. It pins the mirrored constant to `registry.json`,
 * and it ENUMERATES every file that carries the identity in prose or in config.
 * Change the canonical value and this fails with the list of files to update —
 * a checklist instead of a search. That is the whole point: the decision stays
 * Nawwara's, but it stops being irreversible.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

const registry = JSON.parse(read("registry/registry.json")) as { homepage: string };

/**
 * Files that legitimately spell the identity out, and what they must contain.
 * A file NOT in this list should derive it from the constants instead.
 */
const IDENTITY_FILES: { path: string; must: () => string[] }[] = [
  // The definition itself, and the canonical declaration it mirrors.
  { path: "registry/src/agent/guidance.ts", must: () => [REGISTRY_HOMEPAGE] },
  { path: "registry/registry.json", must: () => [REGISTRY_HOMEPAGE] },
  { path: "mcp/src/catalog-source.ts", must: () => [`${REGISTRY_HOMEPAGE}/r/catalog.json`] },
  // Published npm metadata: the homepage npm shows on the package page.
  { path: "mcp/package.json", must: () => [REGISTRY_HOMEPAGE] },
  { path: "mcp/src/sample-catalog.ts", must: () => [REGISTRY_HOMEPAGE] },
  { path: "registry/src/agent/catalog.test.ts", must: () => [REGISTRY_HOMEPAGE] },
  { path: "mcp/README.md", must: () => [REGISTRY_HOMEPAGE, HOSTED_MCP_URL] },
  // echo-ui-core's npm page (added to the core package without being listed here).
  { path: "packages/core/package.json", must: () => [REGISTRY_HOMEPAGE] },
  { path: "packages/core/README.md", must: () => [REGISTRY_HOMEPAGE] },
  // Documents the rename procedure, so it names the current value by example.
  { path: "CONTRIBUTING.md", must: () => [REGISTRY_HOMEPAGE] },
  /*
   * Scopes the vulnerability-reporting promise to a registry, which means
   * naming it. A markdown file GitHub renders cannot import a constant.
   *
   * The contact address is on the list for the same reason as everything else
   * here and it is the one people forget: a domain move that leaves the
   * reporting address (SUPPORT_EMAIL, since security reports go there too)
   * pointing at a domain you no longer own is a reporting channel
   * that silently stops reaching anyone, on the one file whose entire purpose
   * is being reachable.
   */
  {
    path: "SECURITY.md",
    must: () => [`${REGISTRY_HOMEPAGE}/e/`, HOSTED_MCP_URL, SUPPORT_EMAIL],
  },
  { path: "CODE_OF_CONDUCT.md", must: () => [SUPPORT_EMAIL] },
  // The registry a reader points their own CLI at.
  { path: "README.md", must: () => [`${REGISTRY_HOMEPAGE}/e`] },
  /*
   * The deploy's custom-domain binding: this is not a mention of the
   * host, it is the thing that MAKES the host serve Echo. It was invisible to
   * this test twice over — `.jsonc` was outside the extension filter, and it
   * writes the bare hostname with no scheme. A rename that updated every
   * document and missed this one would have deployed, cleanly, to the old
   * domain.
   */
  { path: "apps/www/wrangler.jsonc", must: () => [new URL(REGISTRY_HOMEPAGE).host] },
  // The same for the hosted MCP server: its route is what makes HOSTED_MCP_URL's host answer.
  { path: "mcp/wrangler.jsonc", must: () => [new URL(HOSTED_MCP_URL).host] },
  // And for the supporters server: its route, and the one site allowed to call it.
  { path: "apps/supporters-api/wrangler.jsonc", must: () => [`api.${new URL(REGISTRY_HOMEPAGE).host}`, REGISTRY_HOMEPAGE] },
  // The docs link GitHub shows on the "new issue" chooser.
  { path: ".github/ISSUE_TEMPLATE/config.yml", must: () => [`${REGISTRY_HOMEPAGE}/docs`] },
  // The repository's Sponsor button: where donations go.
  { path: ".github/FUNDING.yml", must: () => [`${REGISTRY_HOMEPAGE}/support`] },
];

test("the mirrored homepage matches registry.json", () => {
  assert.equal(
    REGISTRY_HOMEPAGE,
    registry.homepage,
    "REGISTRY_HOMEPAGE and registry.json's homepage have drifted",
  );
});

test("every file that spells out the identity spells the CURRENT one", () => {
  const stale: string[] = [];
  for (const { path, must } of IDENTITY_FILES) {
    const content = read(path);
    for (const needle of must()) {
      if (!content.includes(needle)) stale.push(`${path} is missing: ${needle}`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    "renaming the registry means updating each of these — that is the checklist",
  );
});

/**
 * Nothing ELSE may hardcode the host. Everything that needs it derives it, so a
 * rename cannot leave a stale install command on a page nobody re-read.
 *
 * Scoped to TRACKED files: a brand-new file is invisible here until it is
 * staged, which is fine because CI runs on committed code — but it does mean a
 * green run locally is not proof about a file you have not added yet.
 */
/**
 * Whether a tracked file is source the host check reads. Not the built `/r/`,
 * and not the release archive: a pin in `registry/e-released/` is
 * the exact file that was served, host and all, and is never rewritten, a
 * domain move included. Until the first release the archive was empty, so the
 * check had never met one.
 */
function checkedForHost(path: string): boolean {
  return /\.(ts|tsx|json|jsonc|ya?ml|md|mdx)$/.test(path) && !path.includes("/public/r/") && !path.startsWith("registry/e-released/");
}

test("the release archive is history, not source: its pins keep the host they were served with", () => {
  assert.equal(checkedForHost("registry/e-released/badge@0.2.0.json"), false);
  assert.equal(checkedForHost("registry/src/echo/badge/meta.ts"), true);
  assert.equal(checkedForHost("registry/e-released.ts"), true);
});

// The support page's post wrote the host by hand while its file was still untracked, which
// this test can't see; it failed the moment the file was staged.
test("no other source file hardcodes the host", () => {
  const allowed = new Set(IDENTITY_FILES.map((f) => f.path));
  // CHANGELOG is history: a host rename has to name the new host so a
  // reader can update the @echo mapping in their own components.json.
  allowed.add("CHANGELOG.md");
  /*
   * The CLI is published, and these three are how a stranger reaches the
   * registry at all: npm metadata (homepage), the default `--registry`, and
   * the README npm renders. They are the same case as echo-ui-core's
   * package.json and README, and identity.ts can't reach them — it
   * ships inside the registry package, which the CLI must not depend on.
   */
  for (const f of ["packages/cli/package.json", "packages/cli/src/project.ts", "packages/cli/README.md"]) {
    allowed.add(f);
  }

  /*
   * This used to read `.ts|.tsx|.json|.md|.mdx` and look only for the
   * full `https://` form, and both halves let the same file through —
   * `wrangler.jsonc`, whose `routes[].pattern` is what actually BINDS the
   * deployed Worker to the hostname. A rename that missed it
   * would have renamed every mention of the domain and still deployed to the
   * old one. Config lives in .jsonc and .yml as much as in .json, and a host
   * is a host with or without a scheme.
   */
  const tracked = trackedFiles().filter((f) => checkedForHost(f) && !allowed.has(f));

  const bareHost = new URL(REGISTRY_HOMEPAGE).host;
  const offenders = tracked.filter((f) => {
    try {
      return read(f).includes(bareHost);
    } catch {
      return false;
    }
  });

  assert.deepEqual(offenders, [], "these should derive the host from REGISTRY_HOMEPAGE");
});

/**
 * Echo is reached at one address, SUPPORT_EMAIL, and the domain's
 * mail routing receives that one and no other. The code of conduct named a
 * second one for reports, which the routing would have bounced: a promise on
 * the one page whose job is being reachable, kept by nobody.
 */
test("the only address any file gives is SUPPORT_EMAIL", () => {
  const host = new URL(REGISTRY_HOMEPAGE).host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const address = new RegExp(`[\\w.+-]+@${host}`, "g");
  // CHANGELOG.md is history: it may name an address that was.
  const others = trackedFiles()
    .filter((f) => checkedForHost(f) && f !== "CHANGELOG.md")
    .flatMap((f) => {
      try {
        return [...read(f).matchAll(address)].map((m) => m[0]).filter((a) => a !== SUPPORT_EMAIL).map((a) => `${f}: ${a}`);
      } catch {
        return [];
      }
    });
  assert.deepEqual(others, [], `these give an address other than ${SUPPORT_EMAIL}, which receives nothing`);
});

test("install commands are built from the CLI's name, never spelled out", () => {
  assert.equal(installCommand("echo-modal"), `npx ${ECHO_CLI} add modal`);
  assert.equal(installCommand("echo-modal", `pnpm dlx ${ECHO_CLI}`), `pnpm dlx ${ECHO_CLI} add modal`);
});

/**
 * An install line has to name the item the way `/e/` does, or it is a command
 * that fails. `installName` is the docs' copy of the build's `eName` — the
 * docs cannot import the build's module everywhere (it is Node-only, and the
 * install button is a client component), so the two are checked against each
 * other over every item that actually exists.
 */
test("every install line names an item the /e/ registry serves", () => {
  const items = (JSON.parse(read("registry/registry.json")) as { items: { name: string }[] }).items;
  const wrong = items.filter((item) => installName(item.name) !== eName(item.name));
  assert.deepEqual(
    wrong.map((i) => i.name),
    [],
    "installName and eName disagree — an install line would name an item /e/ does not serve",
  );
  assert.ok(items.length > 40, `expected the whole registry, got ${items.length} items`);
});

/**
 * Echo installs through one CLI, its own. The agent brief names it and no
 * other installer, and never the internal `@echo/` dependency namespace.
 */
test("the agent brief names Echo's own CLI as the installer, and no other", () => {
  const brief = read("registry/src/agent/guidance.ts");
  assert.ok(brief.includes("npx echo-ui-cli"), "guidance.ts should name `npx echo-ui-cli`");
  for (const phrase of ["components.json", "@echo/"]) {
    assert.ok(!brief.includes(phrase), `guidance.ts tells a reader to use ${phrase.trim()}`);
  }
});

/** Tracked files only — build output and node_modules are not ours to police. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
