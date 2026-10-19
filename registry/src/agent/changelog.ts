/**
 * CHANGELOG.md, read as data.
 *
 * The changelog is written once, by hand, in Keep a Changelog form. The docs
 * read it rather than restating it: each component page lists the entries that
 * name the item, and the changelog page renders the whole file. There is no
 * second copy to fall behind.
 *
 * ## Why entries carry a directive
 *
 * `/e/` versions are immutable — `{name}@{version}.json` is published once and
 * never rewritten — so the number an item ships under is a decision that cannot
 * be taken back. That number used to be inferred from how the prose was
 * FORMATTED: `/\*\*breaking/i` run over the whole `[Unreleased]` section, and
 * attribution by "does a bullet mention this name in backticks". One entry
 * marked breaking therefore bumped the minor for every item that changed that
 * cycle, a bullet naming two items bumped both whether or not both changed,
 * and a missing pair of asterisks was a permanent mistake.
 *
 * So each entry declares what it is, on a line of its own inside the bullet:
 *
 *     <!-- bump: breaking; items: echo-toast, echo-count-badge, echo-banner -->
 *     - **`tone` means one thing now.** It meant three…
 *
 * `bump` is `patch`, `minor` or `breaking` — what KIND of change this is, not
 * what version it produces; turning that into a number is `pendingVersion`'s
 * job and depends on whether Echo is 0.x. `items` is the registry names it
 * changes, `all` for a change that genuinely sweeps the library, or `none` for
 * one that touches no installable item — the CLI, the MCP server, the docs.
 *
 * It sits ABOVE the bullet, not inside it. An entry is often several
 * paragraphs and the declaration belongs to all of them; putting it inside
 * would also hide it behind the blank line that ends the first paragraph,
 * which is precisely the truncation that left two `**Breaking**` entries
 * attributed to no item at all.
 *
 * An HTML comment because it is markup, not prose: markdown hides it, the docs
 * strip it, and the build refuses an entry that leaves it out. It is the one
 * thing in the file a human is not free to phrase.
 */

/** What kind of change an entry is. The version it produces is derived. */
export type ChangelogBump = "patch" | "minor" | "breaking";

const BUMPS: readonly ChangelogBump[] = ["patch", "minor", "breaking"];

export interface ChangelogEntry {
  /** The entry as written, directive removed. */
  text: string;
  /** Declared, never inferred. `undefined` only in a file the build refuses. */
  bump?: ChangelogBump;
  /** Registry names this entry changes, or "all" for a library-wide change. */
  items?: readonly string[] | "all";
  /** What the directive said, for an error message that can quote it. */
  directive?: string;
}

export interface ChangelogSection {
  /** "Added", "Changed", "Fixed", … */
  category: string;
  entries: ChangelogEntry[];
}

export interface ChangelogRelease {
  /** "Unreleased" or a semver string. */
  version: string;
  /** ISO date, when the heading carries one. */
  date?: string;
  sections: ChangelogSection[];
}

export interface ItemChangelogEntry {
  version: string;
  date?: string;
  category: string;
  text: string;
  bump?: ChangelogBump;
}

const RELEASE = /^## \[([^\]]+)\](?:\s*[—–-]\s*(\d{4}-\d{2}-\d{2}))?/;
const SECTION = /^### (.+)$/;
const BULLET = /^- (.*)$/;
const CONTINUATION = /^\s+(\S.*)$/;

/** The machine half of an entry. Invisible in rendered markdown. */
export const DIRECTIVE = /<!--\s*(bump:[^>]*?)\s*-->/;

/** A directive on a line of its own. */
const DIRECTIVE_LINE = /^[ \t]*<!--\s*bump:[^>]*?-->[ \t]*$/;

/** ``` or ~~~, opening or closing a fenced code block. */
const FENCE = /^\s*(```|~~~)/;

/**
 * What the page shows: the file as written, minus the markup that exists for
 * the build. Not a second copy of the changelog — the same document with its
 * machine-readable half hidden, which is what an HTML comment is for.
 *
 * Fenced code blocks are left alone. The changelog's own header documents the
 * directive format inside one, and a stripper that cannot tell an example from
 * an instruction publishes an empty code block where the explanation was.
 */
export function stripDirectives(markdown: string): string {
  const out: string[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    else if (!fenced && DIRECTIVE_LINE.test(line)) continue;
    out.push(line);
  }
  return out.join("\n");
}

function parseDirective(raw: string): Pick<ChangelogEntry, "bump" | "items" | "directive"> {
  const fields = new Map<string, string>();
  for (const part of raw.split(";")) {
    const at = part.indexOf(":");
    if (at === -1) continue;
    fields.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim());
  }
  const bump = fields.get("bump");
  const items = fields.get("items");
  return {
    directive: raw,
    ...(bump && BUMPS.includes(bump as ChangelogBump) ? { bump: bump as ChangelogBump } : {}),
    ...(items === undefined
      ? {}
      : items.toLowerCase() === "all"
        ? { items: "all" as const }
        : items.toLowerCase() === "none"
          ? { items: [] }
          : { items: items.split(",").map((n) => n.trim()).filter(Boolean) }),
  };
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | undefined;
  let section: ChangelogSection | undefined;
  let inEntry = false;
  /** The directive read on a line of its own, waiting for its bullet. */
  let pending: Pick<ChangelogEntry, "bump" | "items" | "directive"> | undefined;

  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    /*
     * A fenced block is opaque. The header documents the directive format
     * inside one, and a `- ` in a code sample is a code sample.
     */
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const directive = DIRECTIVE.exec(line);
    if (directive && DIRECTIVE_LINE.test(line)) {
      pending = parseDirective(directive[1]!);
      continue; // a directive line does not end the entry above it
    }
    const r = RELEASE.exec(line);
    if (r) {
      release = { version: r[1]!, ...(r[2] ? { date: r[2] } : {}), sections: [] };
      releases.push(release);
      section = undefined;
      inEntry = false;
      continue;
    }
    const s = SECTION.exec(line);
    if (s && release) {
      section = { category: s[1]!.trim(), entries: [] };
      release.sections.push(section);
      inEntry = false;
      continue;
    }
    const b = BULLET.exec(line);
    if (b && section) {
      section.entries.push({ text: b[1]!.trim(), ...(pending ?? {}) });
      pending = undefined;
      inEntry = true;
      continue;
    }
    const c = CONTINUATION.exec(line);
    if (c && inEntry && section) {
      const entry = section.entries[section.entries.length - 1]!;
      entry.text = `${entry.text} ${c[1]!.trim()}`;
      continue;
    }
    // A blank line or a paragraph (a release's summary line) ends the entry.
    inEntry = false;
  }

  return releases;
}

/**
 * Every entry that DECLARES the item, newest release first.
 *
 * Attribution used to be "the prose mentions this name in backticks", which
 * meant an entry explaining that `echo-toast` replaced `echo-banner`'s
 * behaviour was filed as a change to both. Now an entry says which items it
 * changes, and the prose is free to name whatever it needs to name.
 */
export function changelogFor(
  releases: readonly ChangelogRelease[],
  item: { name: string; title: string },
): ItemChangelogEntry[] {
  const out: ItemChangelogEntry[] = [];
  for (const release of releases) {
    for (const section of release.sections) {
      for (const entry of section.entries) {
        if (!mentions(entry, item.name)) continue;
        out.push({
          version: release.version,
          ...(release.date ? { date: release.date } : {}),
          category: section.category,
          text: entry.text,
          ...(entry.bump ? { bump: entry.bump } : {}),
        });
      }
    }
  }
  return out;
}

/** Whether an entry declares this registry name (`echo-tabs`). */
export function mentions(entry: ChangelogEntry, registryName: string): boolean {
  if (entry.items === "all") return true;
  return Array.isArray(entry.items) && entry.items.includes(registryName);
}

/**
 * What is wrong with the file, as a list a build can refuse on and a test can
 * assert is empty. A changelog is only data if something checks that it is.
 *
 * `known` is every registry name that exists, so a directive cannot attribute
 * a change to an item that was renamed or never existed — the failure the old
 * backtick matching could not have, because a typo simply matched nothing and
 * the entry silently applied to no one.
 */
export function validateChangelog(
  releases: readonly ChangelogRelease[],
  known: readonly string[],
): string[] {
  const exists = new Set(known);
  const problems: string[] = [];
  for (const release of releases) {
    for (const section of release.sections) {
      for (const entry of section.entries) {
        const where = `[${release.version}] ${section.category}: "${entry.text.slice(0, 60)}…"`;
        if (!entry.directive) {
          problems.push(`${where} has no <!-- bump: …; items: … --> directive`);
          continue;
        }
        if (!entry.bump) {
          problems.push(`${where} declares no valid bump (one of ${BUMPS.join(", ")}) — got "${entry.directive}"`);
        }
        if (entry.items === undefined) {
          problems.push(`${where} declares no items (names, or "all")`);
          continue;
        }
        if (entry.items === "all") continue;
        const unknown = entry.items.filter((n) => !exists.has(n));
        if (unknown.length) problems.push(`${where} names items that do not exist: ${unknown.join(", ")}`);
      }
    }
  }
  return problems;
}
