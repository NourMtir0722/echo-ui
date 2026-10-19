import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { ALL_METAS } from "./metas";
import { GROUP_OF } from "./groups";
import { searchComponents, type RegistryCatalog } from "./catalog";
import { isMotionVocabulary, MOTION_VOCABULARY } from "./token-usage";

/**
 * Motion, as an agent sees it. get_component lists the motion names a
 * component uses and get_tokens is where an agent looks them up, so every
 * name one shows has to be one the other has. Before this, thirteen names
 * weren't: `morphFeels.cell`, `springs`, the CSS durations, and three that
 * weren't tokens at all (`waves`, `flap`, `useBudOff`), just words from the code.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

test("every motion name a component's record uses is one get_tokens lists", () => {
  const unknown = ALL_METAS.flatMap((meta) =>
    ((meta as { motion?: { tokens: readonly string[] } }).motion?.tokens ?? [])
      .filter((t) => !isMotionVocabulary(t))
      .map((t) => `${meta.name}: ${t}`),
  );
  assert.deepEqual(unknown, []);
});

test("the vocabulary knows a family from a member, and a real name from a near one", () => {
  assert.ok(isMotionVocabulary("springs"));
  assert.ok(isMotionVocabulary("springs.bouncy"));
  assert.ok(isMotionVocabulary("morphFeels.mercury"));
  assert.ok(isMotionVocabulary("--echo-duration-swap"));
  assert.ok(isMotionVocabulary("--echo-ease-glide"));
  assert.ok(isMotionVocabulary("summon"));
  assert.ok(!isMotionVocabulary("springs.wobbly"));
  assert.ok(!isMotionVocabulary("morphFeels"));
  assert.ok(!isMotionVocabulary("--echo-duration-slow"));
  assert.ok(!isMotionVocabulary("waves"));
});

async function builtCatalog(t: { skip: (m: string) => void }): Promise<RegistryCatalog | null> {
  // Read in one step, not looked for and then read: absent, it's not built.
  const text = await readFile(resolve(__dirname, "../../../apps/www/public/r/catalog.json"), "utf8").catch(() => undefined);
  if (text === undefined) {
    t.skip("catalog not built — run `pnpm build:registry`");
    return null;
  }
  return JSON.parse(text) as RegistryCatalog;
}

test("the built catalog lists the whole motion vocabulary (skips if not built)", async (t) => {
  const catalog = await builtCatalog(t);
  if (!catalog) return;
  const { motion, springs, morphFeels, durations, eases } = catalog.tokens;
  assert.deepEqual({ motion, springs, morphFeels, durations, eases }, MOTION_VOCABULARY);
});

test("searching for motion finds every motion component (skips if not built)", async (t) => {
  const catalog = await builtCatalog(t);
  if (!catalog) return;
  const motionItems = Object.entries(GROUP_OF)
    .filter(([, group]) => group === "Motion")
    .map(([name]) => name);
  assert.ok(motionItems.length > 10);
  const found = new Set(searchComponents(catalog, "motion").map((c) => c.name));
  assert.deepEqual(motionItems.filter((name) => !found.has(name)), []);
  for (const name of motionItems) assert.equal(catalog.components.find((c) => c.name === name)?.group, "Motion");
});

test("the physics is findable: a search for springs reaches the entry that exports them (skips if not built)", async (t) => {
  const catalog = await builtCatalog(t);
  if (!catalog) return;
  assert.ok(searchComponents(catalog, "spring").some((c) => c.name === "use-tactile"));
});
