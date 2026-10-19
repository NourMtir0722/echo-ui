import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTRY_HOMEPAGE } from "../src/agent/guidance";

/**
 * What npm sees, for each of the three packages `release.yml` publishes.
 *
 * core and cli publish a manifest their build GENERATES into dist/, so the
 * source package.json proves nothing: a field the generator does not copy is
 * a field npm never receives — and `npm publish --provenance` refuses a
 * package without `repository`.
 *
 * mcp publishes its source manifest as-is (`files: ["dist", "README.md"]`).
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

/** The public repository. Moving it means updating every file this test reads. */
const REPOSITORY = "https://github.com/NourMtir0722/echo-ui";

type Manifest = {
  name: string;
  author?: string;
  funding?: string;
  repository?: { type: string; url: string; directory: string };
  bugs?: { url: string };
};

const PUBLISHED: { dir: string; manifest: () => Manifest }[] = [
  {
    dir: "packages/core",
    manifest: () => {
      execFileSync("node", ["scripts/build.mjs"], { cwd: resolve(repoRoot, "packages/core"), stdio: "ignore" });
      return JSON.parse(read("packages/core/dist/package.json"));
    },
  },
  {
    dir: "packages/cli",
    manifest: () => {
      execFileSync("node", ["build.mjs"], { cwd: resolve(repoRoot, "packages/cli"), stdio: "ignore" });
      return JSON.parse(read("packages/cli/dist/package.json"));
    },
  },
  { dir: "mcp", manifest: () => JSON.parse(read("mcp/package.json")) },
];

test("every published manifest names its repository, so --provenance can sign it", () => {
  for (const { dir, manifest } of PUBLISHED) {
    const pkg = manifest();
    assert.deepEqual(
      pkg.repository,
      { type: "git", url: `git+${REPOSITORY}.git`, directory: dir },
      `${pkg.name}: npm refuses provenance without a repository that matches the workflow's`,
    );
    assert.deepEqual(pkg.bugs, { url: `${REPOSITORY}/issues` }, `${pkg.name}: the "Report an issue" link`);
  }
});

test("every published package credits the LICENSE's copyright holder", () => {
  const holder = /^Copyright \(c\) \d{4} (.+)$/m.exec(read("LICENSE"))?.[1];
  assert.ok(holder, "LICENSE has a copyright line");
  for (const { manifest } of PUBLISHED) {
    const pkg = manifest();
    assert.equal(pkg.author, holder, `${pkg.name}: the author npm shows disagrees with LICENSE`);
  }
});

test("the new-issue chooser sends people to the same repository", () => {
  const config = read(".github/ISSUE_TEMPLATE/config.yml");
  assert.ok(config.includes(`${REPOSITORY}/security/advisories/new`), "the private vulnerability report");
  assert.ok(config.includes(`${REPOSITORY}/discussions`), "the discussions link");
});

test("every published package and the repository point donations at the support page", () => {
  const support = `${REGISTRY_HOMEPAGE}/support`;
  for (const { manifest } of PUBLISHED) {
    const pkg = manifest();
    assert.equal(pkg.funding, support, `${pkg.name}: \`npm fund\` should lead to ${support}`);
  }
  assert.ok(read(".github/FUNDING.yml").includes(support), "GitHub's Sponsor button");
});

/**
 * The production smoke check asks npm's manifest for the CLI's
 * `echoUi.commands` to see whether the published CLI has every command the
 * docs teach. The source package.json had them; the manifest the
 * build writes into dist/, which is what npm receives, didn't, so after any
 * publish the smoke check would have read no commands at all and stayed red.
 */
test("the CLI npm receives lists its commands, as the smoke check reads them", () => {
  const source = JSON.parse(read("packages/cli/package.json")) as { echoUi?: { commands?: string[] } };
  const cli = PUBLISHED.find((p) => p.dir === "packages/cli")!.manifest() as Manifest & { echoUi?: { commands?: string[] } };
  assert.ok(source.echoUi?.commands?.length, "packages/cli/package.json declares its commands");
  assert.deepEqual(cli.echoUi?.commands, source.echoUi!.commands);
});

/**
 * echo-ui-cli and echo-ui-mcp are bundles: their builds inline
 * @babel/parser, postcss and what postcss needs, pngjs and jpeg-js (the CLI)
 * and the same parsers (the MCP server), all MIT, ISC or BSD, which ask that
 * their notice travel with every copy. The tarballs carried neither those nor
 * Echo's own LICENSE: npm adds a LICENSE only from the folder it publishes,
 * and only core's build put one there.
 */
test("the CLI and the MCP server ship Echo's license and the notices of what they bundle", () => {
  const license = read("LICENSE");
  for (const [dir, folder, build] of [
    ["packages/cli", "packages/cli/dist", "build.mjs"],
    ["mcp", "mcp/dist", "build.mjs"],
  ] as const) {
    execFileSync("node", [build], { cwd: resolve(repoRoot, dir), stdio: "ignore" });
    assert.equal(read(`${folder}/LICENSE`), license, `${dir}: Echo's LICENSE in what npm publishes`);
    const notices = read(`${folder}/THIRD-PARTY-NOTICES.md`);
    for (const name of ["@babel/parser", "postcss"]) {
      assert.match(notices, new RegExp(`^## ${name.replace("/", "\\/")} \\d+\\.\\d+\\.\\d+ · \\S+`, "m"), `${dir}: ${name} named, with its version and license`);
    }
    // Each section carries the package's own text, not just a name.
    for (const section of notices.split(/^## /m).slice(1)) assert.ok(section.split("\n").filter(Boolean).length > 3, `${dir}: ${section.split("\n")[0]} has no license text`);
  }
});
