import { test } from "node:test";
import assert from "node:assert/strict";

import { createEchoTheme, type EchoSeedInput } from "echo-ui-core/theme";
import { generatorLink } from "@registry/agent/generator-link";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";
import { fitStyles, parseProfile, parseTolerance } from "@registry/agent/style-fit";
import { policeNotes, themeNotes } from "@registry/agent/style-notes";
import { parseStyle } from "@registry/agent/style-schema";

import { createRegistrySource } from "./registry-source";
import { createStyleHandlers } from "./style-tools";
import { sampleRegistry } from "./sample-catalog";

/**
 * The style tools against the fixture library: Echo's own style, and one the
 * slop police stops. What they decide is checked against the functions the CLI
 * calls, so a chat and a terminal can't disagree.
 */
const tools = (fetcher = sampleRegistry.fetcher) => createStyleHandlers(createRegistrySource({ registry: "https://example.test/e", registryFetcher: fetcher }));
const down = () => tools(async () => Promise.reject(new Error("ENOTFOUND example.test")));

const body = (result: { content: { type: string; text?: string }[] }) => result.content.map((c) => c.text ?? "").join("\n");
const echo = sampleRegistry.styles.echo!;

/** A builder's own style, as Design Eye writes it: no police trouble, two decisions made. */
const paperlab = {
  version: 1,
  name: "paperlab",
  title: "Paperlab",
  essence: "Ink on paper, drawn not lit.",
  fingerprint: { warmth: 3, volume: 2, density: 3, formality: 3, era: 2, craft: 4, ornament: 2 },
  seed: { accent: "#3D8EF0", chassis: "#F2EEE6", paper: "#1A1A1A", render: "drawn", fontSans: '"IBM Plex Sans", system-ui, sans-serif' },
  rules: ["Every part is drawn in the ink."],
  decisions: { primaryAction: "The primary key is the paper one that stands highest.", emptyStates: "An empty list says what to add, in one line." },
};

test("list_styles lists Echo's styles with their fingerprints, and says where the builder's own are", async () => {
  const text = body(await tools().list_styles());
  assert.match(text, /Echo's styles \(2\):/);
  assert.match(text, /`echo` \(Echo\): A device molded.* Fingerprint W4 V3 D3 F2 E3 C5 O3\./);
  assert.match(text, /`nightclub` \(Nightclub\)/);
  assert.match(text, /~\/Documents\/styles/);
});

test("list_styles with a name gives that style in full, police included", async () => {
  const text = body(await tools().list_styles({ name: "echo" }));
  assert.match(text, /^# Echo \(Echo's library, a dark device\)/);
  assert.match(text, /- Settings: accent #8B6FE8, chassis #232130/);
  assert.match(text, /- Rule: The primary action is the one lit cap/);
  assert.match(text, /- Motion: Springs with weight\./);
  assert.doesNotMatch(text, /Slop police/);
  assert.match(body(await tools().list_styles({ name: "nightclub" })), /- Slop police: stops /);
});

test("a style Echo doesn't publish is named as missing, with what there is", async () => {
  const result = await tools().list_styles({ name: "brutalist" });
  assert.match(body(result), /no style called "brutalist" in Echo's library\. Echo's library has: `echo`, `nightclub`\./);
  assert.match(body(result), /passed as `style`/);
});

test("fit_styles orders exactly as the CLI's arithmetic does, the builder's own with Echo's", async () => {
  const profile = "W3 V2 D3 F3 E2 C4 O2";
  const tolerance = "W1 V1 D1 F1 E1 C1 O1";
  const text = body(
    await tools().fit_styles({ profile, tolerance, yours: [{ name: "paperlab", fingerprint: "W3 V2 D3 F3 E2 C4 O2", essence: paperlab.essence }] }),
  );
  const expected = fitStyles(parseProfile(profile), parseTolerance(tolerance), [
    { name: "paperlab", title: "paperlab", essence: paperlab.essence, fingerprint: parseProfile("W3 V2 D3 F3 E2 C4 O2"), from: "yours", ready: true },
    ...Object.values(sampleRegistry.styles).map((s) => ({ name: s.name as string, title: s.title as string, essence: s.essence as string, fingerprint: s.fingerprint as never, from: "echo" as const, ready: true })),
  ]).map((r) => r.name);
  const listed = [...text.matchAll(/^\d+\. `([^`]+)`/gm)].map((m) => m[1]);
  assert.deepEqual(listed, expected);
  assert.match(text, /^1\. `paperlab` \(yours\): W3 V2 D3 F3 E2 C4 O2, inside every tolerance$/m);
  assert.match(text, /It orders; it doesn't decide/);
});

test("fit_styles: the builder's style of the same name stands in for Echo's, as in the CLI", async () => {
  const text = body(await tools().fit_styles({ profile: "W4 V3 D3 F2 E3 C5 O3", yours: [{ name: "echo", fingerprint: "W1 V1 D1 F1 E1 C1 O1" }] }));
  assert.equal([...text.matchAll(/`echo`/g)].length, 1);
  assert.match(text, /`echo` \(yours\)/);
});

test("fit_styles says what's wrong with a profile or a fingerprint, in words", async () => {
  const bad = await tools().fit_styles({ profile: "W9" });
  assert.equal(bad.isError, true);
  assert.match(body(bad), /W9: a profile on warmth is 1 to 5/);
  const badYours = await tools().fit_styles({ profile: "W4 V3 D3 F2 E3 C5 O3", yours: [{ name: "mine", fingerprint: "W4 V3" }] });
  assert.equal(badYours.isError, true);
  assert.match(body(badYours), /^mine's fingerprint: The fingerprint leaves out|^mine's fingerprint: The profile leaves out/);
});

test("fit_styles with Echo's library down still ranks the builder's own, and says why it's only theirs", async () => {
  const text = body(await down().fit_styles({ profile: "W4 V3 D3 F2 E3 C5 O3", yours: [{ name: "paperlab", fingerprint: "W3 V2 D3 F3 E2 C4 O2" }] }));
  assert.match(text, /Echo's library couldn't be read \(.*ENOTFOUND.*\), so only the builder's own are ranked\./);
  assert.match(text, /^1\. `paperlab`/m);
});

test("check_style says what the CLI's style check says: the device, the theme and the police, word for word", async () => {
  const text = body(await tools().check_style({ style: paperlab }));
  assert.match(text, /^\*\*Paperlab\*\* is a style Echo can apply, on its light device\./);
  const style = parseStyle(paperlab).style!;
  const { report } = createEchoTheme(style.seed as EchoSeedInput, { quiet: true });
  for (const note of [...themeNotes(report, style.fonts), ...policeNotes(style).notes]) assert.ok(text.includes(note.text), `missing: ${note.text}`);
});

test("check_style on a style the police stops: it says so, and gives the question for the builder", async () => {
  const text = body(await tools().check_style({ style: sampleRegistry.styles.nightclub! }));
  assert.match(text, /but the slop police stops it until the builder keeps or changes what it names/);
  assert.match(text, /\*\*Warning:\*\* Slop police: /);
  assert.match(text, /Ask: The slop police stops .*Keep it \(you give the reason/);
});

test("check_style on something that isn't a style lists every problem", async () => {
  const text = body(await tools().check_style({ style: { name: "Not A Name", seed: { accent: "purple" } } }));
  assert.match(text, /^This isn't a style Echo can apply:/);
  assert.match(text, /`seed\.accent` is a six-digit hex/);
});

test("wear_style on one of Echo's: the link, the command, the theme and DESIGN.md, all from the same seed", async () => {
  const text = body(await tools().wear_style({ name: "echo" }));
  assert.match(text, /^# Echo, worn \(Echo's library, a dark device\)/);
  assert.ok(text.includes(generatorLink(echo.seed as Record<string, string>)), "the generator link for this seed");
  assert.match(text, /A new project: `npx echo-ui-cli init --style echo`\. A project that already has Echo: `npx echo-ui-cli style use echo`\./);
  // Echo's own needs no folder kept in the builder's library.
  assert.doesNotMatch(text, /Keep the style in their library/);
  // The CSS is the theme the CLI would write from this seed, whole.
  assert.ok(text.includes(createEchoTheme(echo.seed as EchoSeedInput, { quiet: true }).css.trimEnd()));
  assert.match(text, /### DESIGN\.md[\s\S]*from the Echo style[\s\S]*`npx echo-ui-cli init --style echo`/);
});

test("wear_style on a style Echo publishes opens the site on the style, whole; on the builder's own, on its colours", async () => {
  const drafting = PUBLISHED_STYLES.find((s) => s.name === "drafting-index")!;
  const fetcher: typeof sampleRegistry.fetcher = async (url) =>
    url.endsWith("/styles/drafting-index.json") ? JSON.stringify(drafting) : sampleRegistry.fetcher(url);
  const text = body(await tools(fetcher).wear_style({ name: "drafting-index", files: false }));
  assert.ok(text.includes(generatorLink(drafting.seed as Record<string, string>, "drafting-index")), "the link names the style");
  assert.match(text, /[?&]style=drafting-index/);
  assert.doesNotMatch(text, /Only the colours travel/);

  // Echo's own is the site's default, and the builder's own isn't on the site: neither has a style to name.
  assert.doesNotMatch(body(await tools().wear_style({ name: "echo", files: false })), /[?&]style=/);
  const own = body(await tools().wear_style({ style: paperlab, files: false }));
  assert.doesNotMatch(own, /[?&]style=/);
  assert.match(own, /Only the colours travel/);
});

test("wear_style on the builder's own: keep it in the library first, so init --style can find it", async () => {
  const text = body(await tools().wear_style({ style: paperlab, files: false }));
  assert.match(text, /^# Paperlab, worn \(the builder's own, a light device\)/);
  assert.match(text, /1\. Keep the style in their library, so every project can wear it again: `~\/Documents\/styles\/paperlab\/style\.json`/);
  assert.match(text, /2\. A new project: `npx echo-ui-cli init --style paperlab`/);
  // Without the files, none of the CSS or DESIGN.md.
  assert.doesNotMatch(text, /echo-theme\.css|### DESIGN\.md/);
});

test("wear_style won't wear what the police stops, and says what to ask instead", async () => {
  const text = body(await tools().wear_style({ name: "nightclub" }));
  assert.match(text, /^Not worn\./);
  assert.match(text, /\*\*Warning:\*\* The slop police stops Nightclub: /);
  assert.match(text, /- Ask the builder: The slop police stops /);
  assert.match(text, /check_style says the same, with what to change/);
  assert.doesNotMatch(text, /--echo-accent/);
});

test("wear_style takes one of name or style, and says so given neither or both", async () => {
  for (const args of [{}, { name: "echo", style: paperlab }]) {
    const result = await tools().wear_style(args);
    assert.equal(result.isError, true);
    assert.match(body(result), /Give one: `name` for one of Echo's styles, or `style`/);
  }
});
