import { test } from "node:test";
import assert from "node:assert/strict";
import { policeStyle } from "@registry/agent/slop";
import type { EchoStyle, StyleSeed } from "@registry/agent/style-schema";

import { PROOF_STYLES, ROUNDER } from "./proof-styles";

/**
 * The homepage's proof shows what Echo's styles look like, next to a
 * workflow whose slop police stops the pairings that read as AI-made. A
 * style the police stops, on the page that sells the police, contradicts it.
 */
test("the proof wears only styles the slop police lets through", () => {
  for (const s of PROOF_STYLES) {
    const style = { version: 1, name: s.key, title: s.title, essence: s.what, seed: s.seed as StyleSeed } as EchoStyle;
    const { banned } = policeStyle(style);
    assert.deepEqual(banned.map((b) => b.name), [], `${s.title}: ${banned.map((b) => b.ingredients.join("; ")).join(" | ")}`);
  }
});

test("step 3's rounder line makes the story's style rounder", () => {
  // The line said "Rounder later is one line: style set radius 0.8" while the
  // story wore a style already at radius 1, so it made the corners squarer.
  const worn = PROOF_STYLES.find((s) => s.key === "drafting-index")!.seed.radius ?? 0.5;
  assert.ok(ROUNDER > worn && ROUNDER <= 1, `radius ${ROUNDER} against the style's ${worn}`);
});
