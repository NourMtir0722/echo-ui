import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AGENT_INSTRUCTIONS,
  CLI_RELEASED,
  ECHO_CLI,
  ECHO_CORE,
  PRERELEASE_AGENT_NOTICE,
  PRERELEASE_HEADLINE,
} from "./guidance";

/**
 * Whether Echo says out loud that it has not shipped.
 *
 * `npx echo-ui-cli` is printed on the README, on 53 component pages, on three
 * template pages, on the homepage hero, in two guides and in the agent brief.
 * The name resolves on npm to a reservation stub with no `bin`, so following
 * any of it gets you npx's error about a missing executable — which reads like
 * something you did wrong. The docs drifted from what is published and nothing
 * anywhere noticed.
 *
 * So this test does the same two jobs `identity.test.ts` does for the domain.
 * It pins the notice to every surface that shows a command, and it ENUMERATES
 * them — so flipping `CLI_RELEASED` at launch fails with the list of places the
 * banner has to come off, instead of leaving "not released yet" on a site that
 * released. A checklist in both directions, because both directions are wrong.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

/**
 * Every surface that shows an install command, and the token that proves it
 * carries the notice.
 *
 * **Two kinds, and they have to be told apart.** A `prose` surface
 * hardcodes the words, so at launch the words come out. A `mechanism` surface
 * references the switch — `<PreRelease />`, which returns null once
 * `CLI_RELEASED` is true, or an explicit `CLI_RELEASED ? … : …` — so at launch
 * it is already correct and must be LEFT ALONE. Taking the notice "off" one of
 * those means deleting the conditional that makes it work, which silently
 * removes the project's ability to say it has not shipped ever again.
 *
 * So the launch half now asserts both directions: prose is gone, mechanism
 * survives.
 */
const SURFACES: { path: string; must: string; note: string; kind: "prose" | "mechanism" }[] = [
  {
    path: "README.md",
    kind: "prose",
    must: PRERELEASE_HEADLINE,
    note: "the first thing a reader of the repository meets",
  },
  {
    path: "apps/www/components/InstallCommand.tsx",
    kind: "mechanism",
    must: "<PreRelease />",
    note: "carries the banner to all 53 component pages, the templates and the homepage hero",
  },
  {
    path: "registry/scripts/build-agent-artifacts.ts",
    kind: "mechanism",
    must: "PRERELEASE_AGENT_NOTICE",
    note: "llms.txt composes its own list instead of printing AGENT_INSTRUCTIONS, so it has to be told separately",
  },
  {
    path: "apps/www/app/docs/(guides)/installation/content.mdx",
    kind: "mechanism",
    must: "<PreRelease />",
    note: "shows the commands as plain code blocks, so it needs its own banner",
  },
  {
    path: "apps/www/app/docs/(guides)/cli/content.mdx",
    kind: "mechanism",
    must: "<PreRelease />",
    note: "same — InitLine and InstallLine are CodeBlocks, not InstallCommand",
  },
  {
    path: "packages/cli/README.md",
    kind: "prose",
    must: PRERELEASE_HEADLINE,
    note: "this BECOMES the echo-ui-cli page on npm when published, and it shows three commands",
  },
  {
    path: "packages/core/README.md",
    kind: "prose",
    must: PRERELEASE_HEADLINE,
    note: "the echo-ui-core page on npm; the published version is older than every item requires",
  },
];

test("while the CLI is unreleased, every surface that shows a command says so", () => {
  if (CLI_RELEASED) return;
  const silent: string[] = [];
  for (const { path, must, note } of SURFACES) {
    if (!read(path).includes(must)) silent.push(`${path} is missing ${must} — ${note}`);
  }
  assert.deepEqual(silent, [], "these advertise a command that cannot work, without saying so");
});

test("the agent brief leads with the caveat, not with the setup line", () => {
  if (CLI_RELEASED) {
    assert.ok(
      !AGENT_INSTRUCTIONS.includes(PRERELEASE_AGENT_NOTICE),
      "Echo has shipped; the brief still tells models it has not",
    );
    return;
  }
  assert.ok(
    AGENT_INSTRUCTIONS.includes(PRERELEASE_AGENT_NOTICE),
    "llms.txt and the MCP server still tell models to run a command with no executable behind it",
  );
  assert.ok(
    AGENT_INSTRUCTIONS.indexOf(PRERELEASE_AGENT_NOTICE) < AGENT_INSTRUCTIONS.indexOf("Set the project up"),
    "a model that reads the setup line first has already written the install step",
  );
});

/**
 * Indexing rides on the same switch.
 *
 * The site was publicly reachable with no `robots.txt` and no `noindex`,
 * serving install lines that cannot work, for as long as it has been up. The
 * fix is two files and neither is worth a flag of its own: "the packages
 * resolve" and "this is worth finding in a search engine" are the same fact,
 * and giving them separate switches is how one of them gets left behind.
 *
 * Checked in both directions for the same reason as everything else here — a
 * site that shipped and is still telling crawlers to go away is the identical
 * failure pointing the other way, and it is invisible from the inside.
 */
test("while the CLI is unreleased, the site asks not to be indexed", () => {
  const robots = read("apps/www/app/robots.ts");
  const layout = read("apps/www/app/layout.tsx");

  /*
   * The site deploys as a static export, and a metadata route in an
   * `output: export` build must declare itself static or the build refuses to
   * collect it. Without this line `robots.ts` compiles under `next build`,
   * passes every test here, and then fails the only build that ships — which
   * is exactly what happened, caught by running the deploy rather than by
   * anything in this suite.
   */
  assert.match(
    robots,
    /export const dynamic = "force-static"/,
    "robots.ts must declare itself static or ECHO_STATIC_EXPORT=1 next build refuses it",
  );
  assert.match(robots, /CLI_RELEASED/, "robots.ts decides from the release flag, not from a hardcoded answer");
  assert.match(layout, /CLI_RELEASED \? \{\} : \{ robots: \{ index: false, follow: false \} \}/);

  if (CLI_RELEASED) {
    assert.match(robots, /allow: "\/"/, "Echo has shipped — the site should be findable");
  } else {
    assert.match(robots, /disallow: "\/"/, "the whole site, not a path list: none of it is followable yet");
  }
});

/**
 * The launch half. On the day `CLI_RELEASED` flips, this hands back the same
 * list to undo — because a shipped library still saying "not released yet" is
 * the identical failure, pointing the other way.
 */
test("once the CLI is released, no surface still says it is not", () => {
  if (!CLI_RELEASED) return;

  const stale = SURFACES.filter((s) => s.kind === "prose" && read(s.path).includes(s.must)).map(
    (s) => s.path,
  );
  assert.deepEqual(stale, [], "Echo has shipped — take the notice out of each of these");

  // The other direction, and the easier one to get wrong. These carry the switch
  // rather than the sentence; they are already correct, and deleting them is
  // how a project loses the ability to say "not released" the next time it
  // needs to — a prerelease of 1.0, a registry outage, a yanked version.
  const gutted = SURFACES.filter((s) => s.kind === "mechanism" && !read(s.path).includes(s.must)).map(
    (s) => s.path,
  );
  assert.deepEqual(
    gutted,
    [],
    "these render the notice FROM the flag and must keep doing so — nothing to remove",
  );
});

/**
 * Nothing may quietly become a fifth surface. A guide that renders a runnable
 * command — through the live components, or as a fenced line someone can copy
 * — is an instruction, and an instruction that cannot work is a bug.
 * Prose that merely names the CLI is not caught here, and should not be.
 */
test("no other page shows a runnable command without the banner", () => {
  if (CLI_RELEASED) return;
  const listed = new Set(SURFACES.map((s) => s.path));

  /*
   * Docs pages AND markdown that is published rather than merely written.
   *
   * The first version of this swept `apps/www/app/**.mdx` only, which is the
   * blind spot that let `packages/cli/README.md` advertise three commands with
   * no caveat: a file nobody edits again until a publish turns it into an npm page.
   * The internal planning documents are deliberately out of scope — they
   * describe the CLI to us, they do not instruct a stranger.
   */
  const candidates = trackedFiles().filter(
    (f) =>
      (f.startsWith("apps/www/app/") && f.endsWith(".mdx")) ||
      f === "README.md" ||
      /^(packages|mcp)\/[^/]+\/README\.md$/.test(f) ||
      /^mcp\/README\.md$/.test(f),
  );
  assert.ok(candidates.length > 5, `expected the docs and the package READMEs, found ${candidates.length}`);

  const offenders = candidates.filter((f) => {
    if (listed.has(f)) return false;
    const content = read(f);
    const runnable =
      /<(InitLine|InstallLine|Install)\b/.test(content) ||
      new RegExp(`^\\s*(npx|pnpm dlx|yarn dlx|bunx) ${ECHO_CLI}\\b`, "m").test(content) ||
      new RegExp(`^\\s*(npm|pnpm|yarn|bun) (install|add) ${ECHO_CORE}\\b`, "m").test(content);
    return runnable && !content.includes("<PreRelease />") && !content.includes(PRERELEASE_HEADLINE);
  });

  assert.deepEqual(
    offenders,
    [],
    "these show a command that cannot work — add the banner, or the headline in prose",
  );
});

/** Tracked files only: a new guide is invisible here until it is staged. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
