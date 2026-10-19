import { test } from "node:test";
import assert from "node:assert/strict";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";

import { DEFAULT_SEED, SEED_PRESETS, STYLE_PRESETS, isStyleName, lookOf, sameSeed } from "./seeds";

test("the site offers every style Echo publishes besides its own, each under its own name", () => {
  assert.deepEqual(
    STYLE_PRESETS.map((p) => p.seed.style),
    PUBLISHED_STYLES.filter((s) => s.name !== "echo").map((s) => s.name),
  );
  assert.ok(STYLE_PRESETS.some((p) => p.name === "Drafting Index"));
  assert.ok(isStyleName("drafting-index"));
  assert.equal(isStyleName("echo"), false, "Echo's own is no style name: it's the colours alone");
  assert.equal(isStyleName("cobalt-ticket"), false);
});

test("a style's look is its whole seed under its colours; Echo's own is the colours alone", () => {
  const drafting = STYLE_PRESETS.find((p) => p.seed.style === "drafting-index")!.seed;
  const look = lookOf(drafting) as Record<string, unknown>;
  assert.equal(look.render, "drawn");
  assert.equal(look.pills, true);
  assert.match(String(look.fontSans), /Inter Tight/);
  assert.equal("style" in look, false, "the name isn't a seed setting");
  assert.deepEqual(lookOf(DEFAULT_SEED), { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA" });
});

test("two seeds are the same only in the same style", () => {
  const drafting = STYLE_PRESETS[0]!.seed;
  const sameColours = { accent: drafting.accent, chassis: drafting.chassis, paper: drafting.paper };
  assert.equal(sameSeed(drafting, sameColours), false);
  assert.equal(sameSeed(drafting, { ...drafting }), true);
  assert.equal(sameSeed(SEED_PRESETS[1]!.seed, { ...SEED_PRESETS[1]!.seed, accent: SEED_PRESETS[1]!.seed.accent.toLowerCase() }), true);
});
