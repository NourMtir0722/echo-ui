/**
 * Docs freshness test E: an item whose source changed since
 * its docs were last confirmed fails until someone confirms them again.
 * See lock.ts for why this is deliberately strict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { GUIDE_SOURCES } from "./guide-sources";
import { guideFolders, guideItems, hashItem, readLock, registryItems, repoRoot } from "./lock";

test("E: every item's docs were confirmed against its current source", () => {
  const lock = readLock();
  const items = registryItems();
  const failures: string[] = [];

  for (const item of items) {
    if (!(item.name in lock)) {
      failures.push(`${item.name}: new item — write its docs, then \`pnpm docs:ack ${item.name}\``);
    } else if (lock[item.name] !== hashItem(item)) {
      failures.push(
        `${item.name}: source changed since its docs were confirmed — review its meta.ts and /docs page, then \`pnpm docs:ack ${item.name}\``,
      );
    }
  }
  const names = new Set([...items, ...guideItems()].map((i) => i.name));
  for (const name of Object.keys(lock)) {
    if (!names.has(name)) failures.push(`${name}: no longer in registry.json — remove it with \`pnpm docs:ack --all\` or by hand`);
  }

  assert.deepEqual(failures, [], `\n${failures.length} item(s) need their docs re-confirmed:\n  ${failures.join("\n  ")}\n`);
});

test("every guide was confirmed against the code it describes", () => {
  const lock = readLock();
  const failures: string[] = [];
  for (const guide of guideItems()) {
    const name = guide.name.slice("guide:".length);
    if (!(guide.name in lock)) failures.push(`${name}: never confirmed. Read the guide against its code, then \`pnpm docs:ack ${guide.name}\``);
    else if (lock[guide.name] !== hashItem(guide)) {
      failures.push(`${name}: the code it describes changed since the guide was confirmed. Read it again, then \`pnpm docs:ack ${guide.name}\``);
    }
  }
  assert.deepEqual(failures, [], `\n${failures.length} guide(s) need re-reading:\n  ${failures.join("\n  ")}\n`);
});

test("every guide names the code it describes, or says why it describes none", () => {
  const folders = guideFolders();
  const problems: string[] = [];
  for (const folder of folders) if (!(folder in GUIDE_SOURCES)) problems.push(`${folder}: no entry in guide-sources.ts`);
  for (const [name, sources] of Object.entries(GUIDE_SOURCES)) {
    if (!folders.includes(name)) problems.push(`${name}: in guide-sources.ts, but there's no such guide`);
    if (!Array.isArray(sources)) continue;
    if (sources.length === 0) problems.push(`${name}: an empty list; say \`{ none: "why" }\` instead`);
    for (const path of sources) if (!existsSync(resolve(repoRoot, path))) problems.push(`${name}: ${path} doesn't exist`);
  }
  assert.deepEqual(problems, []);
});
