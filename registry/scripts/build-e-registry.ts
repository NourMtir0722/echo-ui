/**
 * Writes the `/e/` registry: Echo's own format, the one
 * `npx echo-ui-cli` installs from.
 *
 *   /e/index.json              every item and its latest version
 *   /e/{name}.json             the latest version of one item
 *   /e/{name}@{version}.json   one exact version, never rewritten
 *
 * Versions come from the changelog. An item whose files changed since its last
 * release moves to the pending version, and the build FAILS if the changelog's
 * [Unreleased] says nothing about it: you can't publish a change without
 * saying what kind of change it is. `item-versions.json` records what shipped
 * as what, and is checked in.
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_METAS } from "../src/agent/metas";
import { CLI_RELEASED } from "../src/agent/guidance";
import { motionNames, soundNames } from "../src/agent/token-usage";
import { conformanceRecord } from "../src/agent/conformance";
import { CONFIG_SCHEMA_PATH, configSchema } from "../src/agent/config-schema";
import { STYLE_SCHEMA_PATH, parseStyle, styleSchema, type EchoStyle } from "../src/agent/style-schema";
import {
  parseChangelog,
  changelogFor,
  mentions,
  validateChangelog,
  type ChangelogRelease,
} from "../src/agent/changelog";
import {
  SCHEMA_VERSION,
  coreRange,
  eName,
  hashContent,
  hashItemRelease,
  isSafeItemPath,
  pendingVersion,
  rangeAdmits,
  resolveItemVersion,
  type EIndex,
  type EItem,
  type VersionRecord,
} from "../src/registry/e-format";
import { coreGateProblem } from "../src/registry/core-gate";

export const registryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Where the build reads and writes. Defaulted here and injectable so the
 * immutability promise can be EXERCISED rather than described: `e-released`
 * had a README, a code path and an empty directory, and nothing had ever run
 * through it. `e-released.test.ts` drives this with temp directories.
 */
export interface BuildPaths {
  /** Where the served `/e/` files are written. */
  outDir: string;
  /** The archive of released pins, copied forward verbatim on every build. */
  releasedDir: string;
  /** The checked-in record of what shipped as what. */
  versionsFile: string;
  /** The changelog versions are derived from. */
  changelogFile: string;
  /** echo-ui-core's package.json: the core every item is built against. */
  coreManifest: string;
  /** What npm holds of echo-ui-core (`published-core.json`). */
  publishedCore: string;
}

export const defaultPaths = (): BuildPaths => ({
  outDir: resolve(registryRoot, "../apps/www/public/e"),
  releasedDir: resolve(registryRoot, "e-released"),
  versionsFile: resolve(registryRoot, "item-versions.json"),
  changelogFile: resolve(registryRoot, "../CHANGELOG.md"),
  coreManifest: resolve(registryRoot, "../packages/core/package.json"),
  publishedCore: resolve(registryRoot, "../packages/core/published-core.json"),
});

type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: { path: string; target?: string }[];
};

/**
 * npm ranges for what items import, from the registry's own devDependencies.
 *
 * `echo-ui-core` is the exception and the one that matters: its range comes
 * from the WORKSPACE version, because that is the core these item sources were
 * written against. Whether that version exists on npm yet is a separate fact,
 * checked in `assertCoreIsPublishable` below.
 */
async function npmRanges(coreManifest: string): Promise<Record<string, string>> {
  const pkg = JSON.parse(await readFile(resolve(registryRoot, "package.json"), "utf8"));
  const core = JSON.parse(await readFile(coreManifest, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  return { ...deps, "echo-ui-core": coreRange(core.version) };
}

/**
 * The range every item declares has to be one npm can satisfy, or `add` fails
 * for everyone the moment `/e/` is deployed. `published-core.json` is
 * the record of what npm holds; `packages/core/published-core.md` is the
 * ritual that keeps it true.
 *
 * Before release this is a warning, because the gap is deliberate and `/e/` is
 * not public. After release it refuses, because then it is an outage.
 */
async function assertCoreIsPublishable(workspace: string, publishedCore: string, problems: string[], quiet: boolean) {
  const published = (JSON.parse(await readFile(publishedCore, "utf8")) as { version: string }).version;
  // The same gate the tests ask, so the Release workflow's own run, publishing
  // this core, gets through here too.
  const problem = coreGateProblem({ workspace, published, released: CLI_RELEASED, releasing: process.env.ECHO_RELEASING });
  if (problem) problems.push(problem);
  else if (!CLI_RELEASED && !rangeAdmits(coreRange(workspace), published) && !quiet) {
    console.warn(`  warning: every item declares echo-ui-core ${coreRange(workspace)}, and npm's published version is ${published}. Fine until launch, when core is published.`);
  }
}

/**
 * The item's files, as the user will receive them: the path is relative to
 * their Echo folder (`target` minus its `echo/` prefix).
 */
async function itemFiles(item: RegistryItem) {
  const files = [];
  for (const file of item.files) {
    const content = await readFile(resolve(registryRoot, file.path), "utf8");
    const path = (file.target ?? file.path).replace(/^echo\//, "");
    if (!isSafeItemPath(path)) throw new Error(`${item.name}: unsafe file path ${path}`);
    files.push({ path, sha256: hashContent(content), content });
  }
  return files;
}

/** Setup an item needs, as ids into the shared guidance. */
function setupIds(meta: { sound?: unknown } | undefined, kind: EItem["kind"]): string[] {
  const ids = ["theme-css"];
  if (kind !== "module") ids.push("client-boundary");
  if (meta && "sound" in meta && meta.sound) ids.push("sound-provider");
  return ids;
}

/**
 * Change flags an `update` can show before it touches anything.
 *
 * `breaking` comes from the entry's DECLARED bump, because it is the one flag
 * that changes what a user must do. `a11y` stays a reading of the prose:
 * it is advisory colour on a list, no version depends on it, and a heuristic
 * that over-reports "this mentions focus" costs a reader nothing.
 */
function flagsFor(category: string, entry: { text: string; bump?: string }): string[] {
  const flags = [category.toLowerCase()];
  if (entry.bump === "breaking") flags.push("breaking");
  if (/accessib|aria|screen reader|WCAG|contrast|keyboard|focus/i.test(entry.text)) flags.push("a11y");
  return [...new Set(flags)];
}

export async function buildERegistry(
  paths: Partial<BuildPaths> = {},
  { quiet = false }: { quiet?: boolean } = {},
) {
  const { outDir, releasedDir, versionsFile, changelogFile, coreManifest, publishedCore } = { ...defaultPaths(), ...paths };
  const manifest = JSON.parse(await readFile(resolve(registryRoot, "registry.json"), "utf8")) as {
    items: RegistryItem[];
  };
  const changelog: ChangelogRelease[] = parseChangelog(
    await readFile(changelogFile, "utf8"),
  );
  const unreleased = changelog.find((r) => r.version.toLowerCase() === "unreleased");
  const lastReleased = changelog.find((r) => r.version.toLowerCase() !== "unreleased")?.version ?? "0.0.0";
  /*
   * The changelog is only data if something checks that it is. This runs
   * BEFORE any version is resolved: an entry with no directive has no bump and
   * no attribution, so every number after this point would be a guess.
   */
  const changelogProblems = validateChangelog(
    changelog,
    manifest.items.map((i) => i.name),
  );
  if (changelogProblems.length) {
    throw new Error(
      `/e/ build refused — CHANGELOG.md is not readable as data:\n  ${changelogProblems.join("\n  ")}`,
    );
  }
  const pending = pendingVersion(lastReleased, unreleased?.sections ?? []);
  const ranges = await npmRanges(coreManifest);
  const coreVersion = JSON.parse(await readFile(coreManifest, "utf8")).version as string;

  const recorded: Record<string, VersionRecord> = JSON.parse(
    await readFile(versionsFile, "utf8").catch(() => '{"items":{}}'),
  ).items;

  const metaByName = new Map<string, (typeof ALL_METAS)[number]>(ALL_METAS.map((m) => [m.name, m]));
  const items: EItem[] = [];
  const problems: string[] = [];
  const nextVersions: Record<string, VersionRecord> = {};

  for (const entry of manifest.items) {
    const meta = metaByName.get(entry.name);
    const files = await itemFiles(entry);
    const core = ranges["echo-ui-core"]!;
    const dependencies = Object.fromEntries((entry.dependencies ?? []).map((dep) => [dep, ranges[dep] ?? "*"]));
    // Files and declared ranges: a new core is a new version.
    const releaseHash = hashItemRelease(files, { core, dependencies });
    const changes = changelogFor(changelog, { name: entry.name, title: meta?.title ?? entry.title ?? entry.name });
    /*
     * Whether the changelog says anything about THIS item this cycle. An
     * entry declaring `items: all` — a token migration, a lint rule, the
     * reflow pass — counts for every item, so a library-wide change does not
     * have to list forty-nine names to get past the gate.
     */
    const hasUnreleasedEntry = (unreleased?.sections ?? []).some((section) =>
      section.entries.some((e) => mentions(e, entry.name)),
    );
    const { version, error } = resolveItemVersion(
      eName(entry.name),
      releaseHash,
      recorded[entry.name],
      pending,
      hasUnreleasedEntry,
    );
    if (error) problems.push(error);
    nextVersions[entry.name] = { version, hash: releaseHash };

    const kind: EItem["kind"] = entry.type === "registry:block" ? "block" : "component";
    items.push({
      schemaVersion: SCHEMA_VERSION,
      name: eName(entry.name),
      version,
      kind,
      title: meta?.title ?? entry.title ?? entry.name,
      description: meta?.description ?? entry.description ?? "",
      core,
      dependencies,
      items: (entry.registryDependencies ?? []).map((d) => eName(d.replace(/^@echo\//, ""))),
      files,
      setup: setupIds(meta as { sound?: unknown } | undefined, kind),
      motion: motionNames(meta),
      sound: soundNames(meta),
      // One record, shared with the docs pages and the MCP (conformance.ts).
      a11y: conformanceRecord(),
      changes: changes.map((c) => ({
        version: c.version === "Unreleased" ? version : c.version,
        flags: flagsFor(c.category, c),
        summary: c.text,
      })),
    });
  }

  await assertCoreIsPublishable(coreVersion, publishedCore, problems, quiet);

  if (problems.length) throw new Error(`/e/ build refused:\n  ${problems.join("\n  ")}`);

  const index: EIndex = {
    schemaVersion: SCHEMA_VERSION,
    version: pending,
    core: coreVersion,
    items: items.map(({ name, version, kind, title, description, items: deps }) => ({
      name,
      version,
      kind,
      title,
      description,
      items: deps,
    })),
  };

  /*
   * Cleared first. Everything `/e/` serves is either rebuilt below or
   * copied from the archive, so anything ELSE in here is a file only this
   * machine has — a renamed or deleted item that resolves from the laptop that
   * deployed and 404s from a clean checkout. `/e/` promises the opposite, and
   * `/r/`'s build already clears its output for the same reason.
   */
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  /*
   * Released pins live in the repo (`registry/e-released/`) and are copied out
   * on every build. `public/e` is build output, so a fresh clone still serves
   * every version anyone ever installed — which is what makes the "a published
   * URL stays" promise true rather than a hope about deploy history.
   */
  await mkdir(releasedDir, { recursive: true });
  const released = (await readdir(releasedDir).catch(() => [])).filter((f) => f.endsWith(".json"));
  for (const file of released) {
    await writeFile(join(outDir, file), await readFile(join(releasedDir, file), "utf8"));
  }

  /*
   * A RELEASED version is permanent: its {name}@{version}.json is never
   * rewritten, so what a user installed stays available for a later three-way
   * merge. The pending version isn't public yet, so it is rewritten freely
   * until the release that freezes it; an archived pin is served as archived
   * even when its version is the one `main` deploys, as it is right after a
   * release.
   */
  const existing = new Set(released);
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  let frozen = 0;
  for (const item of items) {
    const pinned = `${item.name}@${item.version}.json`;
    if (existing.has(pinned)) {
      frozen++;
      // The latest is a released version: its pointer is that pin, byte for byte.
      await writeFile(join(outDir, `${item.name}.json`), await readFile(join(releasedDir, pinned), "utf8"));
      continue;
    }
    await writeFile(join(outDir, pinned), json(item));
    await writeFile(join(outDir, `${item.name}.json`), json(item));
  }
  await writeFile(join(outDir, "index.json"), json(index));
  // What every project's echo.json points its editor at (`$schema`).
  await mkdir(dirname(join(outDir, CONFIG_SCHEMA_PATH)), { recursive: true });
  await writeFile(join(outDir, CONFIG_SCHEMA_PATH), json(configSchema()));
  // What a style file's `$schema` points at, and Echo's own styles: what `style list` and `style use` read.
  await writeFile(join(outDir, STYLE_SCHEMA_PATH), json(styleSchema()));
  await publishStyles(outDir);
  await writeFile(versionsFile, json({ schemaVersion: SCHEMA_VERSION, items: nextVersions }));

  if (!quiet) {
    console.log(
      `/e/ written: ${items.length} items at ${pending} (core ${coreVersion})` +
        (frozen ? `, ${frozen} released version(s) served from the archive` : ""),
    );
  }
  return { items, index, pending, frozen, released };
}

/* Run only as a script, so a test can import the build and drive it. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await buildERegistry();
  } catch (error) {
    // The refusals are messages for a person, not stack traces.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Echo's own styles, from `registry/styles/`: each file checked (a style that
 * fails its check stops the build, as an item that fails would), then
 * published whole, with an index of what `style list` shows.
 */
async function publishStyles(outDir: string): Promise<EchoStyle[]> {
  const source = join(registryRoot, "styles");
  const styles: EchoStyle[] = [];
  for (const file of (await readdir(source)).filter((f) => f.endsWith(".json")).sort()) {
    const read = parseStyle(JSON.parse(await readFile(join(source, file), "utf8")));
    if (!read.style) throw new Error(`registry/styles/${file} isn't a style:\n  ${read.problems.join("\n  ")}`);
    if (`${read.style.name}.json` !== file) throw new Error(`registry/styles/${file} is named "${read.style.name}": a style's file is named after it.`);
    styles.push(read.style);
  }
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(join(outDir, "styles"), { recursive: true });
  for (const style of styles) await writeFile(join(outDir, "styles", `${style.name}.json`), json(style));
  await writeFile(
    join(outDir, "styles", "index.json"),
    json({ styles: styles.map(({ name, title, essence, fingerprint }) => ({ name, title, essence, fingerprint })) }),
  );
  return styles;
}

