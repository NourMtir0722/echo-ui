import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLI_RELEASED } from "../agent/guidance";
import { coreRange, rangeAdmits } from "./e-format";
import { coreGateProblem } from "./core-gate";

/**
 * The `echo-ui-core` version `/e/` declares, against the one npm holds.
 *
 * Every item in `/e/` carries a `core` range, and `build-e-registry.ts`
 * computes it from `packages/core/package.json` — the WORKSPACE version, which
 * is a claim about the next publish, not about what exists. The CLI checks that
 * range at install time and refuses outright when it is not satisfiable
 * (`packages/cli/src/commands/add.ts`), so the two drifting apart is not a
 * degraded install for some users: it is **no install for anyone**, starting
 * the moment the registry deploys.
 *
 * Today they DO differ — the workspace is 0.1.0, npm's highest is 0.0.1 — and
 * that is fine, because `/e/` is not public and `CLI_RELEASED` says so out
 * loud. What must never happen is the two things going live in that state.
 *
 * So this is armed rather than red, in the shape `release-state.test.ts`
 * already uses for this project: while `CLI_RELEASED` is false it checks that
 * the gap is honestly recorded, and the moment the flag flips it becomes the
 * hard equality check. A test that fails for eight weeks before it is allowed
 * to pass teaches people to ignore it.
 *
 * WHAT THIS FILE CANNOT CHECK. The pin is offline by design, so it can only
 * compare two numbers in the repository. Bumping it without publishing passes
 * everything here. That is caught in production instead, by the production smoke check
 * resolving the deployed `core` range against npm — see
 * `packages/core/published-core.md`.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");
const json = (p: string) => JSON.parse(read(p));

/** What the next publish will be called. The build reads this. */
const workspaceVersion: string = json("packages/core/package.json").version;

/** What npm holds today, bumped by the publish ritual (`published-core.md`). */
const published = json("packages/core/published-core.json") as {
  version: string;
  verified: string;
  how: string;
};

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

test("the published-core pin is a well-formed record", () => {
  assert.match(published.version, SEMVER, "published-core.json's version is not a semver");
  assert.match(published.verified, /^\d{4}-\d{2}-\d{2}$/, "verified should be the ISO day it was checked");
  assert.ok(published.how.includes("echo-ui-core"), "how should record the command that produced version");
});

/**
 * The pin describes the past, so it can equal the workspace or trail it. Ahead
 * means someone published a version this repository has never built, which is
 * a worse problem than the one this file is about and should not be silent.
 */
test("npm cannot hold a version the workspace has not reached", () => {
  const range = coreRange(published.version);
  assert.ok(
    rangeAdmits(coreRange(workspaceVersion), workspaceVersion),
    "coreRange does not admit its own input; the range shape changed",
  );
  const [pubMajor = 0, pubMinor = 0, pubPatch = 0] = published.version.split(".").map(Number);
  const [wsMajor = 0, wsMinor = 0, wsPatch = 0] = workspaceVersion.split(".").map(Number);
  const ahead =
    pubMajor > wsMajor ||
    (pubMajor === wsMajor && pubMinor > wsMinor) ||
    (pubMajor === wsMajor && pubMinor === wsMinor && pubPatch > wsPatch);
  assert.ok(
    !ahead,
    `published-core.json says ${published.version} is on npm, but packages/core is ${workspaceVersion} — ` +
      `the repository cannot build what is published (range would be ${range})`,
  );
});

/**
 * THE GATE. The one assertion the launch checklist is asking for: a user who
 * runs `add` gets a `core` range that npm can satisfy.
 *
 * It is scoped to the released state because the unreleased state is a
 * deliberate, documented gap — not because the check is optional.
 */
test("once Echo is released, /e/ declares a core version npm actually has", () => {
  const problem = coreGateProblem({
    workspace: workspaceVersion,
    published: published.version,
    released: CLI_RELEASED,
    // Set by the Release workflow for its own run, which publishes this version next.
    releasing: process.env.ECHO_RELEASING,
  });
  if (problem) assert.fail(problem);
});

/**
 * The other half of the same gate, in the shape `release-state.test.ts` uses:
 * while the gap exists, it has to be stated where a reader meets it. These are
 * the files that spell the published version out in prose, so they go stale in
 * exactly the way `_headers` did.
 */
const SURFACES: { path: string; note: string }[] = [
  {
    path: "README.md",
    note: "tells a reader of the repository why the install line does not work yet",
  },
  {
    path: "registry/src/agent/guidance.ts",
    note: "the comment above CLI_RELEASED, which is where the decision is argued",
  },
];

test("while the gap exists, the prose that names the published version names the current one", () => {
  if (CLI_RELEASED) return;
  const range = coreRange(workspaceVersion);
  assert.ok(
    !rangeAdmits(range, published.version),
    "the versions now agree — flip CLI_RELEASED, or this file is describing a gap that closed",
  );
  const stale = SURFACES.filter(({ path }) => !read(path).includes(published.version)).map(
    ({ path, note }) => `${path} does not name ${published.version} — ${note}`,
  );
  assert.deepEqual(stale, [], "these describe a published version that is no longer the published one");
});

/**
 * The list above is hand-written, so it can go stale the way the prose can.
 * Anything tracked that states a DIFFERENT published core version is either a
 * surface to add here or a sentence that is now wrong.
 *
 * Only the shipping surfaces are swept: the planning documents record what was
 * true when they were written, and rewriting history is not the job.
 */
test("no shipping surface names a stale published core version", () => {
  const listed = new Set(SURFACES.map((s) => s.path));
  const shipping = trackedFiles().filter(
    (f) =>
      !listed.has(f) &&
      (f === "README.md" ||
        /^(packages|mcp)\/[^/]+\/README\.md$/.test(f) ||
        (f.startsWith("apps/www/app/") && f.endsWith(".mdx"))),
  );
  const pattern = /`?echo-ui-core@?`? (?:is )?published at `?(\d+\.\d+\.\d+)`?|`echo-ui-core@(\d+\.\d+\.\d+)`/g;
  const wrong: string[] = [];
  for (const file of shipping) {
    for (const match of read(file).matchAll(pattern)) {
      const named = match[1] ?? match[2]!;
      if (named !== published.version) wrong.push(`${file} names echo-ui-core ${named}`);
    }
  }
  assert.deepEqual(wrong, [], `npm holds ${published.version}; these say otherwise`);
});

/** Tracked files only: a new surface is invisible here until it is staged. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * A satisfiable range is not enough: the version npm holds must also EXPORT
 * what the components import. A range of ^0.1.0 is satisfied by a 0.1.0
 * published before the motion engine existed, which would leave `useCapPhysics`,
 * `usePressable`, `useWellMotion` and the rest imported by shipped components
 * and absent from every install.
 *
 * `published-core.json` records the published export names per subpath; this
 * checks every `import { … } from "echo-ui-core/…"` in the registry against
 * them.
 */
function importedFromCore(): Map<string, Set<string>> {
  const echoDir = resolve(repoRoot, "registry/src/echo");
  const out = new Map<string, Set<string>>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        const text = readFileSync(path, "utf8");
        for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"echo-ui-core(\/[\w./-]+)"/g)) {
          const sub = `.${m[2]!}`;
          const names = out.get(sub) ?? new Set<string>();
          for (const raw of m[1]!.split(",")) {
            const name = raw.replace(/^\s*type\s+/, "").split(/\s+as\s+/)[0]!.trim();
            if (name) names.add(name);
          }
          out.set(sub, names);
        }
      }
    }
  };
  walk(echoDir);
  return out;
}

const missingFromPublished = () => {
  const exports = (published as unknown as { exports?: Record<string, string[]> }).exports ?? {};
  const missing: string[] = [];
  for (const [sub, names] of importedFromCore()) {
    if (sub.endsWith(".css")) continue;
    const have = new Set(exports[sub] ?? []);
    for (const name of names) if (!have.has(name)) missing.push(`${sub}: ${name}`);
  }
  return missing.sort();
};

test("the published-core pin records what each subpath exports", () => {
  const exports = (published as unknown as { exports?: Record<string, unknown> }).exports;
  assert.ok(exports && typeof exports === "object", "published-core.json has no `exports` (see published-core.md)");
  for (const [sub, names] of Object.entries(exports)) {
    assert.ok(sub.startsWith("./"), `${sub} is not a subpath`);
    assert.ok(Array.isArray(names) && names.every((n) => typeof n === "string"), `${sub} is not a list of names`);
  }
});

test(
  "every name a component imports from echo-ui-core is exported by the published core",
  () => {
    assert.deepEqual(missingFromPublished(), [], "components import names the published core does not export");
  },
);
