import { test } from "node:test";
import assert from "node:assert/strict";
import { ECHO_ROLES, SHADOW_RECIPES } from "echo-ui-core/theme";

import { designMd, seedFlag } from "./design-md";
import { BLOCK_END, BLOCK_START, readWrittenBy, writtenBy } from "./guidance";
import { appliedStyle, type EchoStyle } from "./style-schema";

const text = designMd({ dir: "src/components/echo", seed: { accent: "#3D8EF0" }, installed: [] });

test("DESIGN.md has Google's sections in order, then Echo's own", () => {
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, [
    "Overview",
    "Colors",
    "Typography",
    "Layout",
    "Elevation & Depth",
    "Shapes",
    "Motion",
    "Sound",
    "Components",
    "Do's and Don'ts",
  ]);
  assert.ok(text.startsWith(BLOCK_START) && text.endsWith(BLOCK_END));
});

test("it points an agent in the codebase back to the components, before anything else", () => {
  const firstParagraph = text.split("\n\n")[1]!;
  assert.match(firstParagraph, /build with those components; don't rebuild them from this file/);
  assert.match(firstParagraph, /npx echo-ui-cli which/);
});

test("every colour role is there with the seed's value, and every shadow recipe with what it's for", () => {
  for (const role of ECHO_ROLES) assert.match(text, new RegExp(`\\| \`--echo-${role}\` \\| #[0-9a-f]{6} \\|`), role);
  assert.match(text, /\| `--echo-accent` \| #3d8ef0 \|/);
  for (const name of Object.keys(SHADOW_RECIPES)) assert.ok(text.includes(`\`--echo-shadow-${name}\``), name);
});

/**
 * It's read when a screen is built, not in every session, but it still
 * costs tokens each time. Atlassian measured an always-on design file at
 * ~92% more; this one stays small by being generated, not written.
 */
test("it stays under 8,000 characters", () => {
  assert.ok(text.length < 8000, `DESIGN.md is ${text.length} characters`);
});

test("a stamp says which CLI wrote a file, and from which seed", () => {
  assert.deepEqual(readWrittenBy(writtenBy("0.3.0", { accent: "#3D8EF0" })), { version: "0.3.0", seed: { accent: "#3D8EF0" } });
  assert.deepEqual(readWrittenBy(`x\n${writtenBy("0.3.0")}\ny`), { version: "0.3.0" });
  assert.equal(readWrittenBy("no stamp here"), undefined);
});

test("the generator's download sends an agent with a terminal to init, with the whole seed", () => {
  const seed = { accent: "#3D8EF0", chassis: "#1B2230" };
  const download = designMd({ dir: "src/components/echo", seed, standalone: true });
  const opening = download.split("\n\n")[1]!;
  assert.match(opening, /In a project with a terminal, don't build from this file/);
  assert.ok(opening.includes("`npx echo-ui-cli init --seed #3D8EF0,#1B2230`"), opening);
  assert.ok(!download.includes("src/components/echo"), "no project folder it doesn't have");
  assert.ok(download.length < 8000, `${download.length} characters`);
  // Only as much of the seed as differs from Echo's.
  assert.equal(seedFlag({}), "#8B6FE8");
  assert.equal(seedFlag({ accent: "#3D8EF0" }), "#3D8EF0");
  assert.equal(seedFlag({ paper: "#FFFFFF" }), "#8B6FE8,#232130,#FFFFFF");
});

test("a standalone DESIGN.md worn from a style sends the agent to init with the style, so its rules come too", () => {
  const style: EchoStyle = {
    version: 1,
    name: "paperlab",
    title: "Paperlab",
    essence: "Ink on paper.",
    fingerprint: { warmth: 3, volume: 2, density: 3, formality: 3, era: 2, craft: 4, ornament: 2 },
    seed: { accent: "#3D8EF0", chassis: "#F2EEE6", paper: "#1A1A1A" },
    rules: ["Every part is drawn in the ink."],
  };
  const yours = designMd({ dir: "", seed: style.seed, standalone: true, style: appliedStyle(style, "yours") });
  const opening = yours.split("\n\n")[1]!;
  assert.match(opening, /from the Paperlab style/);
  assert.ok(opening.includes("`npx echo-ui-cli init --style paperlab`"), opening);
  // The builder's own style has to be in their library for `init --style` to find it by name.
  assert.ok(opening.includes("`~/Documents/styles/paperlab/`"), opening);
  assert.ok(!opening.includes("--seed"), opening);
  assert.match(yours, /Every part is drawn in the ink\./);

  // Echo's own is found by name anywhere: no folder to keep.
  const echos = designMd({ dir: "", seed: style.seed, standalone: true, style: appliedStyle({ ...style, name: "echo", title: "Echo" }, "echo") });
  assert.ok(echos.split("\n\n")[1]!.includes("`npx echo-ui-cli init --style echo`"));
  assert.ok(!echos.split("\n\n")[1]!.includes("~/Documents/styles"));
});
