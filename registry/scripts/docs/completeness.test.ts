/**
 * Docs freshness test C: every item carries the docs fields
 * its page is built from.
 *
 * Two tiers:
 *
 * - **Always required** — what every page already shows today. No exceptions.
 * - **The new sections** (usage, composition, accessibility) — required for
 *   every item NOT in PENDING. PENDING is the docs rewrite's to-do list, and it
 *   can only shrink: an item listed there that has already filled every field
 *   fails too, so finishing an item means crossing it off here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ALL_METAS, type AnyMeta, type MetaName } from "../../src/agent/metas";
import type { MetaDocsFields } from "../../src/agent/meta-types";
import { registryRoot } from "./program";
import { isCoreModule } from "../../src/agent/core-modules";

/**
 * Items whose usage / composition / accessibility sections are not written
 * yet. Remove an item when its page is done.
 */
const PENDING: ReadonlySet<MetaName> = new Set<MetaName>([
]);

const registryTypes = new Map(
  (
    JSON.parse(readFileSync(resolve(registryRoot, "registry.json"), "utf8")) as {
      items: { name: string; type: string }[];
    }
  ).items.map((i) => [i.name, i.type]),
);

/** Components and blocks render UI; libs and hooks do not. */
const rendersUi = (name: string) => /registry:(component|block)/.test(registryTypes.get(name) ?? "");

/** A meta widened from its `as const` literal type, so lengths can be zero. */
interface LooseMeta {
  name: string;
  title: string;
  description: string;
  props?: unknown;
  propsNote?: string;
  examples: readonly { title: string; description: string; code: string }[];
  antiPatterns: readonly string[];
}

function alwaysRequired(literal: AnyMeta): string[] {
  const meta: LooseMeta = literal;
  const missing: string[] = [];
  if (!meta.title.trim()) missing.push("title");
  if (meta.description.trim().length < 40) missing.push("description (at least a sentence)");
  if (meta.examples.length === 0) missing.push("examples (at least one)");
  for (const ex of meta.examples) {
    if (!ex.title.trim() || !ex.description.trim() || !ex.code.trim()) {
      missing.push(`example "${ex.title}" needs a title, a description and code`);
    }
  }
  if (rendersUi(meta.name) && meta.antiPatterns.length === 0) missing.push("antiPatterns (at least one)");
  const hasNote = typeof meta.propsNote === "string";
  if (meta.props == null && !hasNote) missing.push("props, or a propsNote saying why there is no table");
  return missing;
}

function newSections(meta: AnyMeta): string[] {
  const docs = meta as MetaDocsFields;
  const missing: string[] = [];
  // Copied items are imported from the reader's `@/echo/…`; core modules from the package.
  const importsFrom = isCoreModule(meta.name) ? "echo-ui-core/" : "@/echo/";
  if (!docs.usage?.imports.includes(importsFrom) || !docs.usage.code.trim()) {
    missing.push(`usage (imports from ${importsFrom}… and code)`);
  }
  if (rendersUi(meta.name)) {
    if (!docs.composition?.trim()) missing.push("composition");
    if (!docs.a11y?.length) missing.push("a11y (at least one entry)");
  }
  return missing;
}

test("C: every item has the docs fields its page needs", () => {
  const failures: string[] = [];

  for (const meta of ALL_METAS) {
    const base = alwaysRequired(meta);
    if (base.length) failures.push(`${meta.name}: missing ${base.join(", ")}`);

    const sections = newSections(meta);
    if (PENDING.has(meta.name)) {
      if (sections.length === 0) {
        failures.push(`${meta.name}: every section is written — remove it from PENDING in completeness.test.ts`);
      }
    } else if (sections.length) {
      failures.push(`${meta.name}: missing ${sections.join(", ")}`);
    }
  }

  assert.deepEqual(failures, [], `\n${failures.length} item(s) incomplete:\n  ${failures.join("\n  ")}\n`);
});

test("C: PENDING only names real items", () => {
  const names = new Set<string>(ALL_METAS.map((m) => m.name));
  assert.deepEqual([...PENDING].filter((n) => !names.has(n)), []);
});
