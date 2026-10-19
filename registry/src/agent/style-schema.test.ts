import { test } from "node:test";
import assert from "node:assert/strict";

import { AXES, DENSITIES, FONT_ROLES, SEED_SETTINGS, STYLE_VERSION, parseStyle, seedProblems, styleProblems, styleSchema, type EchoStyle } from "./style-schema";

const good: EchoStyle = {
  version: 1,
  name: "porcelain-window",
  title: "Porcelain Window",
  essence: "Soft ceramic surfaces framing user photography.",
  fingerprint: { warmth: 3, volume: 2, density: 3, formality: 2, era: 4, craft: 4, ornament: 2 },
  seed: { accent: "#6E7FD6", chassis: "#F0E7E3", paper: "#2B2A33", finish: 0.8, radius: 0.9, density: "default", fontSans: '"Nunito Sans", system-ui, sans-serif' },
  fonts: [{ role: "sans", family: "Nunito Sans", source: "Google Fonts" }],
  rules: ["Colour only for state.", "No borders on a container."],
  refusals: [{ wants: "Separation by value alone, no shadow", instead: "A soft, glossy finish: Echo's parts are molded and lit." }],
  motion: { character: "soft, short travel", inferred: true },
  sound: { voice: "a low, soft click", inferred: true },
};

test("a whole style file is read as it is", () => {
  const read = parseStyle(good);
  assert.deepEqual(read.problems, []);
  assert.equal(read.style?.name, "porcelain-window");
});

test("every problem is said at once, each in words", () => {
  const bad = {
    version: 2,
    name: "Porcelain Window",
    title: "",
    fingerprint: { warmth: 0, volume: 2, density: 3, formality: 2, era: 4, craft: 4, sparkle: 3 },
    seed: { accent: "blue", finish: 2, density: "roomy", depth: 0.4 },
    fonts: [{ role: "display", family: "Didot" }],
    rules: "Colour only for state.",
    refusals: [{ wants: "glass" }],
  };
  const problems = styleProblems(bad);
  const said = problems.join("\n");
  assert.match(said, /`version` 2 is newer than this Echo reads/);
  assert.match(said, /`name` is lower case/);
  assert.match(said, /`title`/);
  assert.match(said, /`essence`/);
  assert.match(said, /`fingerprint\.warmth` is a whole number from 1 \(clinical\) to 5 \(human\)/);
  assert.match(said, /`fingerprint\.ornament`/);
  assert.match(said, /`fingerprint\.sparkle` isn't an axis/);
  assert.match(said, /`seed\.accent` is a six-digit hex/);
  assert.match(said, /`seed\.finish` is a number from 0 to 1/);
  assert.match(said, /`seed\.density` is "compact", "default", "comfortable"/);
  assert.match(said, /`seed\.depth` isn't something a style can set yet/);
  assert.match(said, /`fonts\[0\]` needs `role`/);
  assert.match(said, /`rules` is a list/);
  assert.match(said, /`refusals\[0\]` needs `wants` and `instead`/);
  assert.equal(parseStyle(bad).style, undefined);
  assert.deepEqual(styleProblems("not a style"), ["A style is a JSON object."]);
});

test("the published JSON Schema says what the check says", () => {
  const schema = styleSchema() as {
    required: string[];
    properties: {
      version: { maximum: number };
      fingerprint: { required: string[] };
      seed: { properties: Record<string, { enum?: string[] }> };
      fonts: { items: { properties: { role: { enum: string[] } } } };
    };
  };
  assert.deepEqual(schema.required, ["version", "name", "title", "essence", "fingerprint", "seed"]);
  assert.equal(schema.properties.version.maximum, STYLE_VERSION);
  assert.deepEqual(schema.properties.fingerprint.required, Object.keys(AXES));
  assert.deepEqual(schema.properties.seed.properties.density!.enum, [...DENSITIES]);
  assert.deepEqual(schema.properties.fonts.items.properties.role.enum, [...FONT_ROLES]);
  // What the schema lets through, the check lets through: every seed key it names.
  for (const key of Object.keys(schema.properties.seed.properties)) {
    assert.doesNotMatch(styleProblems({ ...good, seed: { [key]: key === "density" ? "compact" : /font/.test(key) ? "Inter" : /^(finish|radius)$/.test(key) ? 0.5 : "#123456" } }).join(" "), /isn't something a style can set/, key);
  }
});

/** `style set` and a style file accept the same seed: one check, with or without the `seed.` prefix. */
test("a seed's problems are the same wherever the seed sits", () => {
  assert.deepEqual(seedProblems(good.seed as Record<string, unknown>), []);
  const bad = { radius: 1.4, density: "tight", accent: "red", fontSans: " ", sparkle: 1 };
  const bare = seedProblems(bad).join("\n");
  assert.match(bare, /^`accent` is a six-digit hex/m);
  assert.match(bare, /`radius` is a number from 0 to 1/);
  assert.match(bare, /`density` is "compact", "default", "comfortable"/);
  assert.match(bare, /`fontSans` is a font stack/);
  assert.match(bare, new RegExp(`\`sparkle\` isn't something a style can set yet\\. It can set: ${SEED_SETTINGS.join(", ")}\\.`));
  assert.deepEqual(
    seedProblems(bad, "seed."),
    seedProblems(bad).map((p) => p.replace(/^`/, "`seed.")),
  );
});
