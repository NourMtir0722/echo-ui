import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CODE_TELLS, FLOOR, KEEPABLE, PAIRINGS, fontKind, policeQuestion, policeStyle } from "./slop";
import { parseStyle, styleProblems, type EchoStyle } from "./style-schema";

/** A style with only what the chart reads. */
function style(seed: EchoStyle["seed"], extra: Partial<EchoStyle> = {}): EchoStyle {
  return {
    version: 1,
    name: "probe",
    title: "Probe",
    essence: "A probe.",
    fingerprint: { warmth: 3, volume: 3, density: 3, formality: 3, era: 3, craft: 3, ornament: 3 },
    seed,
    ...extra,
  };
}
const banned = (s: EchoStyle) => policeStyle(s).banned.map((b) => b.id);

test("each pairing is caught on its sources' own examples", () => {
  // Anthropic's cluster 1: Claude's cream, Claude's terracotta, a serif.
  assert.deepEqual(banned(style({ chassis: "#F4F1EA", accent: "#D97757", paper: "#1A1714", fontSans: '"Instrument Serif", serif' })), ["cream-terracotta", "premium-heritage", "stock-face-alone"]);
  // The same pairing in plainer words: a beige background with orange.
  assert.ok(banned(style({ chassis: "#EFEAE0", accent: "#F97316", paper: "#1B1814" })).includes("cream-terracotta"));
  // Anthropic's cluster 2.
  assert.deepEqual(banned(style({ chassis: "#0B0B0B", accent: "#C6FF3D", paper: "#F2F2F2" })), ["night-acid"]);
  // taste-skill's premium families.
  assert.deepEqual(banned(style({ chassis: "#F5F1EA", accent: "#B08947", paper: "#1A1714", fontSans: '"Playfair Display", Georgia, serif' })), ["premium-heritage"]);
  // Tailwind's indigo-500 on white, in Inter.
  assert.deepEqual(banned(style({ chassis: "#FFFFFF", accent: "#6366F1", paper: "#111827", fontSans: '"Inter", system-ui, sans-serif' })), ["indigo-on-white", "stock-face-alone"]);
  // ...and with no typeface named, the system font is what it gets.
  assert.deepEqual(banned(style({ chassis: "#F8FAFC", accent: "#2563EB", paper: "#111827" })), ["indigo-on-white"]);
  // Echo's own tell: a ground in the middle.
  assert.deepEqual(banned(style({ chassis: "#8A8A8A", accent: "#3D8EF0", paper: "#111111" })), ["mid-grey-ground"]);
});

test("Echo's own style passes, and so do styles that only share one ingredient", () => {
  const echo = parseStyle(JSON.parse(readFileSync(new URL("../../styles/echo.json", import.meta.url), "utf8")));
  assert.ok(echo.style);
  assert.deepEqual(banned(echo.style), [], "Echo's purple on its dark device isn't the white-ground pairing");
  // Cream alone, terracotta on a dark ground, indigo on a dark ground, Inter beside a mono: each one ingredient, not the pairing.
  assert.deepEqual(banned(style({ chassis: "#F4F1EA", accent: "#3D8EF0", paper: "#1A1714", fontSans: '"Nunito Sans", sans-serif' })), []);
  assert.deepEqual(banned(style({ chassis: "#232130", accent: "#D97757", paper: "#EFEBFA" })), []);
  assert.deepEqual(banned(style({ chassis: "#232130", accent: "#6366F1", paper: "#EFEBFA", fontSans: "Inter", fontMachine: '"IBM Plex Mono", monospace' })), []);
});

test("Echo's own tells are ranked first", () => {
  const first = PAIRINGS.findIndex((p) => p.from !== "echo");
  assert.ok(first > 0, "at least one of Echo's");
  assert.ok(PAIRINGS.slice(first).every((p) => p.from !== "echo"), "Echo's come before the sources'");
  const report = policeStyle(style({ chassis: "#9A9A9A", accent: "#6366F1", paper: "#111111" }));
  assert.equal(report.banned[0]!.from, "echo");
});

test("a pairing the builder kept moves to kept, with their reason, and nothing else moves", () => {
  const cream = style({ chassis: "#F4F1EA", accent: "#D97757", paper: "#1A1714", fontSans: '"Nunito Sans", sans-serif' }, { keeps: [{ rule: "cream-terracotta", reason: "It's the bakery's own shopfront." }] });
  const report = policeStyle(cream);
  assert.deepEqual(report.banned, []);
  assert.deepEqual(report.kept.map((k) => [k.id, k.reason]), [["cream-terracotta", "It's the bakery's own shopfront."]]);
});

test("the question for the builder names the pairing and its ingredients, and offers both ways", () => {
  const [finding] = policeStyle(style({ chassis: "#0B0B0B", accent: "#C6FF3D", paper: "#F2F2F2" })).banned;
  const question = policeQuestion(finding!);
  assert.match(question, /near-black with one acid colour/);
  assert.match(question, /#0B0B0B/);
  assert.match(question, /Keep it .*keeps.*or change one of them\?/);
});

test("a style's keeps and decisions are checked like the rest of it", () => {
  const base = style({ accent: "#3D8EF0" });
  assert.deepEqual(styleProblems({ ...base, keeps: [{ rule: "night-acid", reason: "Our terminal brand." }], decisions: { emphasis: "One large number." } }), []);
  assert.match(styleProblems({ ...base, keeps: [{ rule: "placeholder", reason: "Easier." }] }).join(" "), /placeholder can't be kept/);
  assert.match(styleProblems({ ...base, keeps: [{ rule: "purple", reason: "x" }] }).join(" "), /doesn't ban/);
  assert.match(styleProblems({ ...base, keeps: [{ rule: "night-acid" }] }).join(" "), /needs `rule` and `reason`/);
  assert.match(styleProblems({ ...base, decisions: { vibe: "clean" } }).join(" "), /`decisions.vibe` isn't a decision/);
});

test("the floor can't be kept, and everything else in the chart can", () => {
  assert.deepEqual(FLOOR, ["placeholder"]);
  for (const id of [...PAIRINGS.map((p) => p.id), ...CODE_TELLS.map((t) => t.id)]) {
    assert.equal(KEEPABLE.includes(id), !FLOOR.includes(id), id);
  }
  assert.equal(new Set(KEEPABLE).size, KEEPABLE.length, "no two rules share a name");
});

test("font kinds: stock, the tasteful set, serifs, monos", () => {
  assert.equal(fontKind('"Inter", system-ui, sans-serif'), "plain");
  assert.equal(fontKind("system-ui, sans-serif"), "plain");
  assert.equal(fontKind('"Space Grotesk", sans-serif'), "tasteful");
  assert.equal(fontKind('"Source Serif 4", Georgia, serif'), "serif");
  assert.equal(fontKind('"EB Garamond", serif'), "serif");
  assert.equal(fontKind('"IBM Plex Mono", monospace'), "mono");
  assert.equal(fontKind('"Host Grotesk", sans-serif'), "other");
  assert.equal(fontKind('"Noto Sans", sans-serif'), "other");
  assert.equal(fontKind(undefined), undefined);
});
