/**
 * Docs freshness test G: the docs are written for the people using Echo.
 *
 * Everything this test reads reaches a user — a docs page, what `echo-ui list`
 * prints, llms.txt, the MCP server, the npm page. A ticket number, a
 * milestone, a spec's section, or the story of how the test suite caught a bug
 * means nothing to them, and it is a sign the sentence was written to the
 * maintainer. Say what the reader needs to do or know instead; the history
 * belongs in a commit message.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { ALL_METAS } from "../../src/agent/metas";
import type { MetaDocsFields } from "../../src/agent/meta-types";
import { describeProps } from "../../src/agent/props";
import * as guidance from "../../src/agent/guidance";
import { registryRoot } from "./program";

const repoRoot = resolve(registryRoot, "..");

/** What gives a sentence away as written for the maintainer. */
const INTERNAL: [string, RegExp][] = [
  ["a ticket number", /\bECHO-\d+\b/],
  ["a milestone", /\bM\d{1,2}\b/],
  ["a spec's section", /spec §|§\s?\d/i],
  ["the audit or backlog", /\b(ui )?audit\b|\bbacklog\b/i],
  ["a phase of work", /\bPhase \d\b/],
  ["the roadmap", /\broadmap\b/i],
  ["a repo-only file", /\bmeta\.ts\b|\bKit\.tsx\b|\breference\//],
  ["how a bug was found", /(docs|test) suite caught|exactly how .* caught|caught it\b/i],
];

interface Text {
  where: string;
  text: string;
}

function metaTexts(): Text[] {
  return ALL_METAS.flatMap((meta) => {
    const m = meta as typeof meta & MetaDocsFields & { propsNote?: string };
    const out: Text[] = [{ where: `${m.name} description`, text: m.description }];
    if (m.propsNote) out.push({ where: `${m.name} propsNote`, text: m.propsNote });
    if (m.feel) out.push({ where: `${m.name} feel`, text: m.feel });
    for (const p of describeProps(m.props)) if (p.description) out.push({ where: `${m.name} prop ${p.name}`, text: p.description });
    for (const e of m.examples) out.push({ where: `${m.name} example "${e.title}"`, text: `${e.title} ${e.description}` });
    for (const a of m.antiPatterns) out.push({ where: `${m.name} anti-pattern`, text: a });
    for (const a of m.a11y ?? []) out.push({ where: `${m.name} a11y`, text: a });
    for (const s of m.sound ?? []) out.push({ where: `${m.name} sound`, text: s });
    if (m.motion) out.push({ where: `${m.name} reducedMotion`, text: m.motion.reducedMotion });
    return out;
  });
}

function fileLines(path: string, label: string): Text[] {
  return readFileSync(resolve(repoRoot, path), "utf8")
    .split("\n")
    .map((text, i) => ({ where: `${label}:${i + 1}`, text }));
}

function sources(): Text[] {
  const registry = (JSON.parse(readFileSync(join(registryRoot, "registry.json"), "utf8")) as {
    items: { name: string; description: string }[];
  }).items.map((i) => ({ where: `registry.json ${i.name}`, text: i.description }));

  const guidesDir = resolve(repoRoot, "apps/www/app/docs/(guides)");
  const guides = ["content.mdx", ...readdirSync(guidesDir).filter((d) => existsSync(join(guidesDir, d, "content.mdx"))).map((d) => `${d}/content.mdx`)]
    .flatMap((p) => fileLines(`apps/www/app/docs/(guides)/${p}`, `guide ${p}`));

  const agent = Object.entries(guidance)
    .filter(([, v]) => typeof v === "string")
    .map(([k, v]) => ({ where: `guidance ${k}`, text: v as string }));

  return [
    ...metaTexts(),
    ...registry,
    ...guides,
    ...agent,
    // The changelog is rendered on the site; the MCP README is the npm page.
    ...fileLines("CHANGELOG.md", "CHANGELOG.md").filter((l) => !/^\[[^\]]+\]:/.test(l.text)),
    ...fileLines("mcp/README.md", "mcp/README.md"),
  ];
}

test("G: user-facing docs carry no internal references", () => {
  const hits: string[] = [];
  for (const { where, text } of sources()) {
    for (const [what, re] of INTERNAL) {
      if (re.test(text)) hits.push(`${where} — ${what}: "${text.trim().slice(0, 110)}"`);
    }
  }
  assert.deepEqual(hits, [], `\nWritten for the maintainer, not the reader:\n  ${hits.join("\n  ")}\n`);
});
