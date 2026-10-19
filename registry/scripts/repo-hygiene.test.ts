import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The repository reads as a repository: every link lands, and every document
 * in it is one a reader is meant to find.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * A link to a sibling file is correct right up to the moment that file is
 * moved or gone, and nothing else in the working tree can tell the
 * difference — so every relative link in every tracked markdown file has to
 * resolve.
 */
test("every relative link in a markdown file resolves", () => {
  const broken: string[] = [];
  for (const file of trackedFiles().filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(resolve(repoRoot, file), "utf8");
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^([a-z]+:|#|\/)/i.test(target!)) continue; // absolute, a scheme, or an anchor
      const path = target!.split("#")[0]!;
      if (!existsSync(resolve(repoRoot, dirname(file), path))) broken.push(`${file} → ${target}`);
    }
  }
  assert.deepEqual(broken, [], "these links point at files that do not exist");
});

/**
 * The files a public repository is judged on before anyone reads a line of
 * code. Named one by one, because a missing LICENSE or SECURITY.md is only
 * noticed by the stranger who needed it.
 */
test("the files that make a repository legible all exist", () => {
  for (const path of [
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    "PRINCIPLES.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
  ]) {
    assert.ok(existsSync(resolve(repoRoot, path)), `${path} is missing`);
  }
});

/**
 * The Markdown the repository carries is a closed list: the documents a
 * reader of the project is meant to find. A new one is added here on purpose,
 * never by habit. (The guides are MDX under `apps/www/app/docs`, and are the
 * site's pages, not documents.)
 */
const PUBLIC_DOCUMENTS = new Set([
  ".github/PULL_REQUEST_TEMPLATE.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "PRINCIPLES.md",
  "README.md",
  "SECURITY.md",
  "apps/www/app/checks/README.md",
  "apps/www/vendor/README.md",
  "mcp/README.md",
  "packages/cli/README.md",
  "packages/core/README.md",
  "packages/core/published-core.md",
  "registry/e-released/README.md",
]);

test("every Markdown document is one the repository means to carry", () => {
  const unlisted = trackedFiles().filter((f) => /\.md$/i.test(f) && !PUBLIC_DOCUMENTS.has(f));
  assert.deepEqual(unlisted, [], "add a real public document to PUBLIC_DOCUMENTS, or leave it out of the repository");
});

/**
 * A dependency taken from a folder on one machine (`file:/Users/…`) makes
 * `pnpm install` fail for anyone else who clones the repository, and in CI. A
 * dependency that isn't on a registry lives inside the
 * repository, at a relative path.
 */
export function outsideTheRepo(manifestPath: string, manifest: { [k: string]: unknown }): string[] {
  const found: string[] = [];
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries((manifest[field] ?? {}) as Record<string, string>)) {
      const path = /^(?:file|link):(.*)$/.exec(spec)?.[1];
      if (path === undefined) continue;
      const target = resolve(repoRoot, dirname(manifestPath), path);
      if (path.startsWith("/") || path.startsWith("~") || !target.startsWith(repoRoot + "/")) found.push(`${manifestPath}: ${name} → ${spec}`);
    }
  }
  return found;
}

test("no dependency is installed from a path outside the repository", () => {
  const manifests = trackedFiles().filter((f) => f.endsWith("package.json") && !f.includes("node_modules"));
  const found = manifests.flatMap((f) => outsideTheRepo(f, JSON.parse(readFileSync(resolve(repoRoot, f), "utf8"))));
  assert.deepEqual(found, []);
  // A path on someone's machine: refused.
  assert.equal(outsideTheRepo("apps/www/package.json", { dependencies: { paperlab: "file:/Users/someone/paperlab.tgz" } }).length, 1);
});
