/**
 * The `/e/` registry format — Echo's own public contract, and
 * the thing `npx echo-ui-cli` reads.
 *
 * **Rule: add fields, never change or remove them. Once a URL is public, it
 * stays.** A published `{name}@{version}.json` is never rewritten, which is
 * what makes a future `update` able to three-way merge a user's edits against
 * the exact version they installed.
 *
 * This module is the pure half: hashing, path safety, version rules. The build
 * script does the reading and writing.
 */
import { createHash } from "node:crypto";

import type { ChangelogBump } from "../agent/changelog";

export const SCHEMA_VERSION = 1;

export interface EFile {
  /** Relative to the user's Echo folder. Never absolute, never `..`. */
  path: string;
  sha256: string;
  content: string;
}

export interface EItem {
  schemaVersion: number;
  name: string;
  version: string;
  kind: "component" | "block" | "module";
  title: string;
  description: string;
  /** The `echo-ui-core` range this version of the item works with. */
  core: string;
  /** npm dependencies, with ranges. */
  dependencies: Record<string, string>;
  /** Other Echo items this one needs, by `/e/` name. */
  items: string[];
  files: EFile[];
  /** Ids into the shared setup guidance, never free text. */
  setup: string[];
  motion: string[];
  sound: string[];
  a11y: { standard: string; tested: string[]; limits: string[] };
  changes: { version: string; flags: string[]; summary: string }[];
}

export interface EIndex {
  schemaVersion: number;
  /** The library release these items were built from. */
  version: string;
  core: string;
  items: { name: string; version: string; kind: EItem["kind"]; title: string; description: string; items: string[] }[];
}

/**
 * Hashes over LF-normalized content, so a checkout with CRLF line endings
 * produces the same hash as one without. The lock file in a
 * user's project hashes the same way, so "unmodified" means the same thing on
 * every operating system.
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/** `echo-tabs` → `tabs`. The CLI's namespace is Echo already. */
export function eName(registryName: string): string {
  return registryName.replace(/^echo-/, "");
}

/**
 * A file path the CLI may write, checked here so a bad one can't be published
 * in the first place. The CLI checks again before writing:
 * whoever serves the registry is not automatically trusted with the disk.
 */
export function isSafeItemPath(path: string): boolean {
  if (path.length === 0 || path.startsWith("/") || path.startsWith("\\")) return false;
  if (/^[a-zA-Z]:/.test(path)) return false; // C:\…
  if (path.includes("\0")) return false;
  return !path.split(/[/\\]/).some((segment) => segment === ".." || segment === "." || segment === "");
}

/**
 * What the next release will be called, from the changelog's DECLARED bumps
 * (Keep a Changelog + semver).
 *
 * The release takes the strongest bump any entry declares. Echo is 0.x, where
 * a breaking change bumps the minor rather than the major — the 0.x convention
 * semver names explicitly — so:
 *
 * - any entry declaring `breaking`, or any entry under Added → next minor
 * - otherwise → next patch
 *
 * The build needs this because an item that changed since its last release has
 * to be published under the version it will ship as, not the one it shipped as.
 *
 * This used to run `/\*\*breaking/i` over the whole section, which made the
 * version of a permanent artifact a function of markdown formatting. The
 * classification is now declared per entry; what this function owns is the
 * mapping from classification to number, which is code because it depends on
 * the major version and nothing else.
 */
export function pendingVersion(
  lastReleased: string,
  unreleased: { category: string; entries: readonly { bump?: ChangelogBump }[] }[],
): string {
  // Nothing unreleased: what `main` deploys is the release just made, not the next one.
  if (!unreleased.some((s) => s.entries.length > 0)) return lastReleased;
  const [major = 0, minor = 0, patch = 0] = lastReleased.split(".").map(Number);
  const breaking = unreleased.some((s) => s.entries.some((e) => e.bump === "breaking"));
  const added = unreleased.some((s) => s.category.toLowerCase() === "added" && s.entries.length > 0);
  const minorBump = unreleased.some((s) => s.entries.some((e) => e.bump === "minor"));
  if (major === 0) return breaking || added || minorBump ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
  if (breaking) return `${major + 1}.0.0`;
  return added || minorBump ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}

/** The core range an item declares: `^0.1.0` means `>=0.1.0 <0.2.0` for 0.x. */
export function coreRange(coreVersion: string): string {
  const [major = 0, minor = 0] = coreVersion.split(".").map(Number);
  return major === 0 ? `>=${coreVersion} <0.${minor + 1}.0` : `>=${coreVersion} <${major + 1}.0.0`;
}

/**
 * Whether a version falls inside a range `coreRange` produced. Deliberately
 * understands only that one shape: this is the check the CLI's resolver makes
 * at install time, and a general semver implementation here would be a second,
 * differently-buggy answer to a question the CLI already answers.
 *
 * That includes prereleases, which look like a bug and are not. `0.1.0-rc.1`
 * is admitted by `>=0.1.0 <0.2.0` here because `satisfies` in
 * `packages/client/src/index.ts` admits it too — its `parseVersion` reads the
 * first three numbers and ignores the suffix — so `echo-ui-cli add` installs
 * against it happily. Making this stricter than the resolver it mirrors would
 * turn the smoke check red over an install that works. Pinned by
 * `e-format.test.ts`, "the core range answers what the CLI would accept".
 */
export function rangeAdmits(range: string, version: string): boolean {
  const bounds = /^>=(\S+) <(\S+)$/.exec(range);
  if (!bounds) return false;
  const parts = (v: string) => v.split("-")[0]!.split(".").map(Number);
  const compare = (a: string, b: string) => {
    const [x, y] = [parts(a), parts(b)];
    for (let i = 0; i < 3; i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  };
  return compare(version, bounds[1]!) >= 0 && compare(version, bounds[2]!) < 0;
}

export interface VersionRecord {
  version: string;
  /** Hash over all of the item's files, so "changed" is a fact, not a guess. */
  hash: string;
}

/** One hash per item, over every file it ships, path included. */
export function hashItemFiles(files: readonly { path: string; content: string }[]): string {
  const h = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    h.update(file.path).update("\0").update(file.content.replace(/\r\n/g, "\n")).update("\0");
  }
  return h.digest("hex");
}

/**
 * What an item ships as, as one hash: its files and the ranges it declares.
 * The core range is part of it: a release that needs a new core is a new
 * version of every item, files changed or not, or a released pin and the
 * latest pointer would declare two cores for one version.
 */
export function hashItemRelease(
  files: readonly { path: string; content: string }[],
  declared: { core: string; dependencies: Record<string, string> },
): string {
  const deps = Object.entries(declared.dependencies).sort(([a], [b]) => a.localeCompare(b));
  return createHash("sha256")
    .update(hashItemFiles(files))
    .update("\0")
    .update(declared.core)
    .update("\0")
    .update(deps.map(([name, range]) => `${name}@${range}`).join("\0"))
    .digest("hex");
}

/**
 * The version an item ships as, and whether the changelog has to mention it.
 *
 * An item that hasn't changed keeps the version it was published under —
 * a release doesn't renumber files nobody touched. One that has changed moves
 * to the pending version, and the build refuses to publish it unless the
 * changelog says what changed.
 */
export function resolveItemVersion(
  name: string,
  filesHash: string,
  recorded: VersionRecord | undefined,
  pending: string,
  hasUnreleasedEntry: boolean,
): { version: string; changed: boolean; error?: string } {
  if (recorded && recorded.hash === filesHash) return { version: recorded.version, changed: false };
  if (!hasUnreleasedEntry) {
    return {
      version: pending,
      changed: true,
      error:
        `${name} changed but CHANGELOG.md's [Unreleased] says nothing about it. ` +
        "Add an entry naming it in backticks (`echo-" + name + "` or its title), or revert the change.",
    };
  }
  return { version: pending, changed: true };
}
