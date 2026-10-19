import { test } from "node:test";
import assert from "node:assert/strict";

import { EchoSeed, SEED_DEFAULTS, defaultSeed, type EchoSeedInput } from "echo-ui-core/theme";
import { EchoSeedSchema } from "./seed-schema";

/**
 * The docs render the zod schema; the package validates by hand. If they
 * disagree, the Theme page documents a seed the engine doesn't accept (or the
 * reverse). These cases are the ones that differ between a sloppy hand-written
 * check and zod.
 */

test("the schema and the package name the same seed fields", () => {
  const schemaKeys = Object.keys(EchoSeedSchema.shape).sort();
  // lcdTint and pills have no default: unset, they're worked out (from the chassis, from the radius).
  const packageKeys = [...Object.keys(SEED_DEFAULTS), "lcdTint", "pills"].sort();
  assert.deepEqual(packageKeys, schemaKeys);
});

test("the schema and the package fill the same defaults", () => {
  assert.deepEqual(defaultSeed, EchoSeedSchema.parse({}));
});

// Loosely typed on purpose: it includes a removed field (keyAngle).
const ACCEPTED: Record<string, unknown>[] = [
  {},
  { accent: "#1FA8A0" },
  { accent: "#abc", chassis: "#abcd", paper: "#AABBCCDD", lcdTint: "#102030" },
  { finish: 0 },
  { finish: 1, radius: 0 },
  { radius: 0.25, density: "compact" },
  { density: "comfortable" },
  { keyAngle: 30 },
  { fontSans: "Inter, sans-serif" },
];

const REJECTED: Record<string, unknown>[] = [
  { accent: "DE3B74" },
  { accent: "#12" },
  { accent: "#12345" },
  { chassis: "#gggggg" },
  { lcdTint: "red" },
  { finish: 1.5 },
  { finish: -0.1 },
  { radius: "0.5" },
  { radius: Number.NaN },
  { density: "tight" },
  { density: 1 },
  { fontMono: 12 },
];

test("both accept the same seeds, with the same result", () => {
  for (const seed of ACCEPTED) {
    assert.deepEqual(EchoSeed.parse(seed as EchoSeedInput), EchoSeedSchema.parse(seed), JSON.stringify(seed));
  }
});

test("both reject the same seeds", () => {
  for (const seed of REJECTED) {
    assert.throws(() => EchoSeedSchema.parse(seed), `zod accepted ${JSON.stringify(seed)}`);
    assert.throws(() => EchoSeed.parse(seed), `echo-ui-core accepted ${JSON.stringify(seed)}`);
  }
});

test("unknown keys are dropped by both", () => {
  const seed = { accent: "#1FA8A0", nonsense: true } as Record<string, unknown>;
  assert.deepEqual(EchoSeed.parse(seed), EchoSeedSchema.parse(seed));
});
