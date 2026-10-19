/**
 * The immutability promise, exercised.
 *
 * `registry/e-released/` is what makes the registry's "once a URL is public, it
 * stays" true rather than hopeful: the released pins live in the repository and
 * the build copies them forward, so a fresh clone still serves every version
 * anyone ever installed. Until this file existed that guarantee had a README, a
 * code path and an empty directory — the first real test of a forever-promise
 * would have been the first real release.
 *
 * So each test here performs a throwaway release into a temp archive and runs
 * the real build over it. Nothing is written into the repository's own
 * `e-released/`: a pin committed here is served forever, and a pin for a
 * version that was never published is exactly the lie the directory exists to
 * prevent. The rehearsal happens on every run instead of once by hand.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildERegistry, registryRoot } from "./build-e-registry";
import { SCHEMA_VERSION } from "../src/registry/e-format";

/**
 * A sandbox holding everything the build reads and writes, INCLUDING the
 * changelog. The versions are derived from it, so a release is not a file copy
 * — it is "[Unreleased] becomes a dated heading and a new [Unreleased] opens".
 * Driving the real `CHANGELOG.md` would also make these tests fail whenever
 * someone edits it, which is a test that teaches people to ignore it.
 */
async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), "echo-e-released-"));
  const paths = {
    outDir: join(root, "e"),
    releasedDir: join(root, "e-released"),
    versionsFile: join(root, "item-versions.json"),
    changelogFile: join(root, "CHANGELOG.md"),
  };
  await mkdir(paths.releasedDir, { recursive: true });
  await writeFile(paths.changelogFile, changelog([]));
  return paths;
}

type Paths = Awaited<ReturnType<typeof sandbox>>;

/**
 * A changelog with one sweeping entry under `[Unreleased]` — `all components`
 * is how the build lets a library-wide change past the "say what changed"
 * gate without naming forty-nine items — plus whatever has been released.
 */
function changelog(released: string[]): string {
  return [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    "### Changed",
    "",
    "<!-- bump: patch; items: all -->",
    "- A rehearsal of the release ritual.",
    "",
    ...released.flatMap((version) => [
      `## [${version}] — 2026-09-20`,
      "",
      "### Changed",
      "",
      "<!-- bump: patch; items: all -->",
      "- Released.",
      "",
    ]),
    "## [0.1.0] — 2026-09-11",
    "",
    "### Added",
    "",
    "<!-- bump: minor; items: all -->",
    "- The first release.",
    "",
  ].join("\n");
}

const build = (paths: Paths) => buildERegistry(paths, { quiet: true });

const readVersions = async (paths: Paths) =>
  JSON.parse(await readFile(paths.versionsFile, "utf8")).items as Record<
    string,
    { version: string; hash: string }
  >;

const writeVersions = (paths: Paths, items: Record<string, { version: string; hash: string }>) =>
  writeFile(paths.versionsFile, `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, items }, null, 2)}\n`);

/**
 * A release, done the way the ritual does it: freeze the current file for one
 * item under its pinned name, and close `[Unreleased]` at that version so the
 * next build is building something new.
 */
async function release(paths: Paths, item: { name: string; version: string }) {
  const pinned = `${item.name}@${item.version}.json`;
  await writeFile(
    join(paths.releasedDir, pinned),
    await readFile(join(paths.outDir, pinned), "utf8"),
  );
  await writeFile(paths.changelogFile, changelog([item.version]));
  return pinned;
}

/** The item every one of these follows through a release. */
const subjectOf = <T extends { name: string }>(items: T[]): T =>
  items.find((i) => i.name === "hardware-button") ?? items[0]!;

test("a released version survives a later release byte-for-byte", async () => {
  const paths = await sandbox();

  // Release 1. Every item ships at the pending version; freeze one of them.
  const first = await build(paths);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);
  const asReleased = await readFile(join(paths.releasedDir, pinned), "utf8");

  // Release 2, with the archive in place and nothing about the item changed.
  const second = await build(paths);
  assert.notEqual(second.pending, subject.version, "the second build is not a later release");
  assert.equal(
    second.items.find((i) => i.name === subject.name)!.version,
    subject.version,
    "an unchanged item was renumbered by a release that did not touch it",
  );
  assert.ok(second.frozen > 0, "the build rewrote the released pin instead of copying it forward");

  assert.equal(
    await readFile(join(paths.outDir, pinned), "utf8"),
    asReleased,
    `${pinned} is a URL promised never to change, and this build changed it`,
  );
});

/**
 * The stronger form, and the one a three-way merge actually depends on: the
 * archive WINS. `echo-ui-cli update` bases its merge on the exact bytes the
 * user installed, so a rebuild that regenerates a released file from today's
 * sources — same version number, different content — silently rewrites the
 * merge base and the user's edits are resolved against a file they never had.
 *
 * Tampering is how that is observable at all: if the build regenerates the
 * file, the sentinel disappears.
 */
test("the build serves the archived bytes, not freshly generated ones", async () => {
  const paths = await sandbox();
  const first = await build(paths);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);

  const tampered = JSON.parse(await readFile(join(paths.releasedDir, pinned), "utf8"));
  tampered.description = "THE ARCHIVED BYTES";
  const sentinel = `${JSON.stringify(tampered, null, 2)}\n`;
  await writeFile(join(paths.releasedDir, pinned), sentinel);

  await build(paths);
  assert.equal(
    await readFile(join(paths.outDir, pinned), "utf8"),
    sentinel,
    "the pinned URL was regenerated from source — an `update` would merge against the wrong base",
  );
});

/**
 * A version that was released and has since MOVED ON. This is the ordinary
 * case after the first release and the one the copy-forward exists for: the
 * item now ships at a newer version, and the old URL still has to resolve.
 */
test("an old version stays resolvable after the item moves on", async () => {
  let paths = await sandbox();
  const first = await build(paths);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);
  const asReleased = await readFile(join(paths.releasedDir, pinned), "utf8");

  // The item changed: a hash that no longer matches moves it to pending.
  const recorded = await readVersions(paths);
  recorded[`echo-${subject.name}`] = { version: subject.version, hash: "0".repeat(64) };
  await writeVersions(paths, recorded);

  /*
   * Into a FRESH output directory, because "a fresh clone serves every version
   * anyone ever installed" is the claim. Rebuilding over the previous output
   * would pass on leftovers and prove nothing about the archive.
   */
  const fresh = { ...paths, outDir: join(paths.outDir, "..", "e-fresh") };
  const second = await build(fresh);
  paths = fresh;
  const now = second.items.find((i) => i.name === subject.name)!;
  assert.notEqual(now.version, subject.version, "the changed item did not move to a new version");

  assert.equal(
    await readFile(join(paths.outDir, pinned), "utf8"),
    asReleased,
    "the version a user installed stopped resolving when the item moved on",
  );
  const served = await readdir(paths.outDir);
  assert.ok(
    served.includes(`${subject.name}@${now.version}.json`),
    "the new version was not published alongside the old one",
  );
  const pointer = JSON.parse(await readFile(join(paths.outDir, `${subject.name}.json`), "utf8"));
  assert.equal(pointer.version, now.version, "the moving pointer did not move");
  const index = JSON.parse(await readFile(join(paths.outDir, "index.json"), "utf8"));
  assert.equal(
    index.items.find((i: { name: string }) => i.name === subject.name).version,
    now.version,
    "the index still advertises the old version",
  );
});

/**
 * The repository's own archive. It is empty today and stays empty until the
 * first release in this format — but once it fills, a hand-edited or misnamed
 * pin is unrecoverable, so the shape is checked here rather than discovered
 * later.
 */
test("every pin in the repository's archive is named after the version it contains", async () => {
  const dir = resolve(registryRoot, "e-released");
  const pins = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const wrong: string[] = [];
  for (const file of pins) {
    const named = /^(.+)@(\d+\.\d+\.\d+)\.json$/.exec(file);
    if (!named) {
      wrong.push(`${file} is not a {name}@{version}.json pin`);
      continue;
    }
    const item = JSON.parse(await readFile(join(dir, file), "utf8"));
    if (item.name !== named[1] || item.version !== named[2]) {
      wrong.push(`${file} contains ${item.name}@${item.version}`);
    }
  }
  assert.deepEqual(wrong, [], "a pin whose URL disagrees with its contents cannot be corrected later");
});

/**
 * What `/e/` serves has to be what the repository can rebuild.
 *
 * The build wrote its files over whatever was already in the output directory
 * and never removed anything, so an item that was renamed or deleted kept
 * being served from the machine that built it — and the deploy happens on a
 * laptop, so that machine's leftovers are what the world gets. The
 * failure is not the stale item itself. It is that the URL resolves today and
 * 404s the day anyone builds from a clean checkout, which is the exact
 * opposite of the promise `/e/` makes.
 *
 * `/r/`'s build already clears its output for this reason ("so removed items
 * can't linger"); `/e/` did not, and `/e/` is the one with the promise
 * attached.
 */
test("a stale file is not served from a stale output directory", async () => {
  const paths = await sandbox();
  const first = await build(paths);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);

  await writeFile(join(paths.outDir, "ghost.json"), '{"name":"ghost"}\n');
  await writeFile(join(paths.outDir, "ghost@9.9.9.json"), '{"name":"ghost"}\n');

  await build(paths);
  const served = await readdir(paths.outDir);
  assert.deepEqual(
    served.filter((f) => f.startsWith("ghost")),
    [],
    "an item no longer in the registry is still served, and only from this machine",
  );

  assert.ok(served.includes(pinned), "clearing the output took the archived pin with it");
  assert.ok(served.includes("index.json"), "clearing the output took the index with it");
});

/**
 * The moment right after a release: `[Unreleased]` is empty, and the
 * version just released is the one `main` deploys. The build named the next
 * patch instead (an index reading 0.1.2 for a 0.1.1 release), and had it named
 * the release, it would have rewritten the released pins from today's sources,
 * since it froze a pin only when its version wasn't the pending one. Every
 * rehearsal above keeps an entry in `[Unreleased]`, so no build ever met this.
 */
test("right after a release, the index names it and its pins are served as archived", async () => {
  const paths = await sandbox();
  const first = await build(paths);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);
  // The cut as it's really made: the released heading, and nothing unreleased yet.
  await writeFile(paths.changelogFile, changelog([subject.version]).replace(/## \[Unreleased\][\s\S]*?(?=## \[)/, "## [Unreleased]\n\n"));
  const tampered = JSON.parse(await readFile(join(paths.releasedDir, pinned), "utf8"));
  tampered.description = "THE ARCHIVED BYTES";
  const sentinel = `${JSON.stringify(tampered, null, 2)}\n`;
  await writeFile(join(paths.releasedDir, pinned), sentinel);

  const after = await build(paths);
  assert.equal(after.pending, subject.version, "with nothing unreleased, the release main deploys is the last one");
  assert.equal(JSON.parse(await readFile(join(paths.outDir, "index.json"), "utf8")).version, subject.version);
  assert.equal(await readFile(join(paths.outDir, pinned), "utf8"), sentinel, `${pinned} was regenerated from source after its release`);
});

/**
 * A release bumps core in the workspace and publishes it in the same
 * run, while `published-core.json` keeps saying what npm held before. The test
 * gate lets the run's own version through (`ECHO_RELEASING`);
 * the registry build kept its own copy of the check, which refused, so the
 * Release workflow's "Build the registry" step (and its deploy) could never
 * pass for a new core.
 */
test("the build lets through the core the release is publishing, and nothing else", async () => {
  const paths = await sandbox();
  const coreManifest = join(paths.outDir, "..", "core-package.json");
  const publishedCore = join(paths.outDir, "..", "published-core.json");
  await writeFile(coreManifest, JSON.stringify({ name: "echo-ui-core", version: "9.1.0" }));
  await writeFile(publishedCore, JSON.stringify({ version: "9.0.0" }));
  const withCore = { ...paths, coreManifest, publishedCore };

  const saved = process.env.ECHO_RELEASING;
  try {
    delete process.env.ECHO_RELEASING;
    await assert.rejects(build(withCore), /echo-ui-core >=9\.1\.0 <10\.0\.0 and npm's published version is 9\.0\.0/);
    process.env.ECHO_RELEASING = "9.2.0";
    await assert.rejects(build(withCore), /npm's published version is 9\.0\.0/, "another version isn't this run's");
    process.env.ECHO_RELEASING = "9.1.0";
    const built = await build(withCore);
    assert.equal(built.index.core, "9.1.0");
  } finally {
    if (saved === undefined) delete process.env.ECHO_RELEASING;
    else process.env.ECHO_RELEASING = saved;
  }
});

/**
 * What an item ships as includes the core it declares. A release that
 * bumps core changes every item's range, files or not, and an item whose files
 * didn't change kept its released version: its frozen pin declared the old
 * core and its latest pointer, rebuilt, the new one. One version saying two
 * things, and a pointer that matched its pin would have had `add` refuse
 * every project on the new core.
 */
test("a new core is a new version for every item, and an item's pointer is its pin", async () => {
  const paths = await sandbox();
  const coreManifest = join(paths.outDir, "..", "core-package.json");
  const publishedCore = join(paths.outDir, "..", "published-core.json");
  const setCore = async (version: string) => {
    await writeFile(coreManifest, JSON.stringify({ name: "echo-ui-core", version }));
    await writeFile(publishedCore, JSON.stringify({ version }));
  };
  const withCore = { ...paths, coreManifest, publishedCore };
  await setCore("9.1.0");
  const first = await build(withCore);
  const subject = subjectOf(first.items);
  const pinned = await release(paths, subject);
  const pointerOf = async () => JSON.parse(await readFile(join(paths.outDir, `${subject.name}.json`), "utf8"));

  // Nothing changed: the released version, and the pointer is the pin byte for byte.
  await build(withCore);
  assert.equal((await pointerOf()).version, subject.version);
  assert.equal(await readFile(join(paths.outDir, `${subject.name}.json`), "utf8"), await readFile(join(paths.releasedDir, pinned), "utf8"));

  // A new core: the item declares a new range, so it ships as a new version, and the old pin stays as it was.
  await setCore("9.2.0");
  const after = await build(withCore);
  const now = after.items.find((i) => i.name === subject.name)!;
  assert.notEqual(now.version, subject.version, "the item kept a released version while declaring a new core");
  assert.equal(now.core, ">=9.2.0 <10.0.0");
  assert.deepEqual(await pointerOf(), JSON.parse(await readFile(join(paths.outDir, `${subject.name}@${now.version}.json`), "utf8")));
  assert.equal(JSON.parse(await readFile(join(paths.outDir, pinned), "utf8")).core, ">=9.1.0 <10.0.0", "the released pin was rewritten");
});
