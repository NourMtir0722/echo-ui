import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  changelogFor,
  parseChangelog,
  stripDirectives,
  validateChangelog,
} from "./changelog";
import { ALL_METAS } from "./metas";

const sample = `# Changelog

Intro prose that is not an entry.

## [Unreleased]

### Added

<!-- bump: minor; items: echo-chat -->
- **\`echo-chat\`** — a chat screen wired through one
  \`onSend\` callback.
<!-- bump: minor; items: echo-tabs -->
- Something about \`Tabs\`.

### Fixed

<!-- bump: patch; items: echo-modal, echo-tabs -->
- **Props the docs did not list.** \`Modal\` (\`trigger\`) and \`Tabs\`
  now appear.

## [0.1.0] — 2026-09-11

First public release. Not an entry.

### Added

<!-- bump: minor; items: echo-tabs -->
- The tabs got a lit cap.
`;

const KNOWN = ["echo-chat", "echo-tabs", "echo-modal", "echo-slider"];

test("releases, dates, sections and multi-line entries", () => {
  const releases = parseChangelog(sample);
  assert.deepEqual(
    releases.map((r) => [r.version, r.date]),
    [
      ["Unreleased", undefined],
      ["0.1.0", "2026-09-11"],
    ],
  );
  assert.deepEqual(releases[0]!.sections.map((s) => s.category), ["Added", "Fixed"]);
  assert.equal(
    releases[0]!.sections[0]!.entries[0]!.text,
    "**`echo-chat`** — a chat screen wired through one `onSend` callback.",
  );
  // The release summary paragraph is not swallowed into an entry.
  assert.deepEqual(
    releases[1]!.sections[0]!.entries.map((e) => e.text),
    ["The tabs got a lit cap."],
  );
});

test("each entry carries the bump and the items it declares", () => {
  const [unreleased] = parseChangelog(sample);
  const [added, fixed] = unreleased!.sections;
  assert.deepEqual(added!.entries[0]!.items, ["echo-chat"]);
  assert.equal(added!.entries[0]!.bump, "minor");
  assert.deepEqual(fixed!.entries[0]!.items, ["echo-modal", "echo-tabs"]);
  assert.equal(fixed!.entries[0]!.bump, "patch");
  // The directive is markup, not prose: it never reaches the text.
  for (const section of unreleased!.sections) {
    for (const entry of section.entries) assert.doesNotMatch(entry.text, /bump:/);
  }
});

/**
 * The case that motivated declared attribution. An entry is free to name any item in its
 * prose — including one it explicitly says is UNCHANGED — because attribution
 * is declared, not read off the backticks.
 */
test("an item gets the entries that DECLARE it, not the ones that mention it", () => {
  const releases = parseChangelog(`## [Unreleased]

### Changed

<!-- bump: breaking; items: echo-switch -->
- \`echo-switch\` names its own event type now. \`Menu\` and \`Sheet\` still pass
  Base UI props through and are unchanged here.
`);
  assert.equal(changelogFor(releases, { name: "echo-switch", title: "Switch" }).length, 1);
  assert.equal(changelogFor(releases, { name: "echo-menu", title: "Menu" }).length, 0);
  assert.equal(changelogFor(releases, { name: "echo-sheet", title: "Sheet" }).length, 0);
});

test("an entry declaring `all` lands on every item, and `none` on no item", () => {
  const releases = parseChangelog(`## [Unreleased]

### Changed

<!-- bump: patch; items: all -->
- Every control got a new focus ring.
<!-- bump: minor; items: none -->
- The MCP server is publishable.
`);
  assert.equal(changelogFor(releases, { name: "echo-tabs", title: "Tabs" }).length, 1);
  assert.equal(changelogFor(releases, { name: "echo-slider", title: "Slider" }).length, 1);
  assert.deepEqual(
    changelogFor(releases, { name: "echo-tabs", title: "Tabs" }).map((e) => e.text),
    ["Every control got a new focus ring."],
  );
});

test("a changelog is only data if something refuses a bad one", () => {
  const bad = parseChangelog(`## [Unreleased]

### Changed

- No directive at all.
<!-- bump: enormous; items: echo-tabs -->
- An invented bump.
<!-- bump: patch; items: echo-tabbs -->
- A typo in a name.
`);
  const problems = validateChangelog(bad, KNOWN);
  assert.equal(problems.length, 3, problems.join("\n"));
  assert.match(problems[0]!, /no <!-- bump/);
  assert.match(problems[1]!, /declares no valid bump/);
  assert.match(problems[2]!, /do not exist: echo-tabbs/);
});

test("the rendered changelog carries no directives", () => {
  const rendered = stripDirectives(sample);
  assert.doesNotMatch(rendered, /bump:/);
  assert.ok(rendered.includes("a chat screen wired through one"), "the prose survived");
  assert.ok(!/\n\n\n/.test(rendered), "stripping left a hole in the document");
});

/**
 * The changelog's own header documents the directive inside a fenced block. A
 * stripper that cannot tell an example from an instruction publishes an empty
 * code block where the explanation was, and a parser that cannot tell them
 * apart arms a directive from a code sample.
 */
test("a directive inside a code fence is an example, not markup", () => {
  const doc = `## [Unreleased]

Write one like this:

\`\`\`
<!-- bump: breaking; items: echo-toast -->
- Not an entry.
\`\`\`

### Changed

<!-- bump: patch; items: echo-tabs -->
- A real entry.
`;
  assert.ok(
    stripDirectives(doc).includes("<!-- bump: breaking; items: echo-toast -->"),
    "the documented example was stripped, leaving an empty code block on the page",
  );

  const [unreleased] = parseChangelog(doc);
  const entries = unreleased!.sections[0]!.entries;
  assert.deepEqual(entries.map((e) => e.text), ["A real entry."], "the code sample became an entry");
  assert.equal(entries[0]!.bump, "patch", "the example's directive armed the real entry");
  assert.deepEqual(entries[0]!.items, ["echo-tabs"]);
});

test("the real CHANGELOG.md parses, validates, and its entries land on real items", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../../..");
  const releases = parseChangelog(readFileSync(resolve(root, "CHANGELOG.md"), "utf8"));
  assert.equal(releases[0]?.version, "Unreleased");
  assert.ok(releases.some((r) => r.date), "at least one dated release");
  assert.ok(releases.every((r) => r.sections.every((s) => s.entries.length > 0)), "no empty sections");

  const manifest = JSON.parse(readFileSync(resolve(root, "registry/registry.json"), "utf8")) as {
    items: { name: string }[];
  };
  assert.deepEqual(
    validateChangelog(releases, manifest.items.map((i) => i.name)),
    [],
    "the /e/ build refuses on exactly these",
  );

  const attributed = ALL_METAS.filter((m) => changelogFor(releases, m).length > 0);
  assert.ok(attributed.length >= 5, `only ${attributed.length} items matched`);
});
