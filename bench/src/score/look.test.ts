import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RunRecord } from "../record";
import { lookTable, renderReport } from "../report";
import { parseSetup } from "../setups";
import { familyKey, judgeLook, wornLook, type LookScore, type WornLook } from "./look";

const DRAFTING = {
  accent: "#050505",
  chassis: "#FDFDFD",
  paper: "#050505",
  render: "drawn",
  fontSans: '"Inter Tight", system-ui, sans-serif',
  fontMachine: '"IBM Plex Mono", ui-monospace, monospace',
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  fontLcd: '"IBM Plex Mono", ui-monospace, monospace',
};

test("a family is compared by its own name: unquoted, a system stack as one, and next/font's renames undone", () => {
  assert.equal(familyKey('"Inter Tight"'), "Inter Tight");
  assert.equal(familyKey("__Inter_Tight_5a0f1f"), "Inter Tight");
  assert.equal(familyKey("__Inter_Tight_Fallback_5a0f1f"), "Inter Tight");
  assert.equal(familyKey("'Inter Tight Fallback'"), "Inter Tight");
  for (const f of ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"]) assert.equal(familyKey(f), "system", f);
  assert.equal(familyKey("Menlo"), "system mono");
  // What text gets when nothing sets a family: not any look's type.
  assert.equal(familyKey('"Times New Roman"'), "system serif");
});

test("the look a project wears is read from its echo.json: the device from the chassis, the type from the seed", async () => {
  const app = await mkdtemp(join(tmpdir(), "bench-look-"));
  try {
    assert.equal(await wornLook(app), null, "no echo.json: not an Echo app");

    await writeFile(join(app, "echo.json"), JSON.stringify({ dir: "components/echo", seed: DRAFTING, style: { name: "drafting-index" } }));
    assert.deepEqual(await wornLook(app), {
      style: "drafting-index",
      device: "light",
      families: ["Inter Tight", "IBM Plex Mono"],
      webFonts: ["Inter Tight", "IBM Plex Mono"],
    });

    // Echo's default: the dark device, set in the system's own faces, nothing to load.
    await writeFile(join(app, "echo.json"), JSON.stringify({ dir: "components/echo" }));
    assert.deepEqual(await wornLook(app), { style: null, device: "dark", families: ["system", "system mono"], webFonts: [] });
  } finally {
    await rm(app, { recursive: true, force: true });
  }
});

const drafting: WornLook = { style: "drafting-index", device: "light", families: ["Inter Tight", "IBM Plex Mono"], webFonts: ["Inter Tight", "IBM Plex Mono"] };
const pale = "rgb(235, 235, 235)";
const ink = "rgb(29, 29, 29)";

test("a page is judged on the device most of its first screen stands on, and the share of its text in the look's type", () => {
  const score = judgeLook(drafting, {
    ground: [...Array(14).fill(pale), ...Array(6).fill(ink)],
    text: { '"Inter Tight"': 300, __IBM_Plex_Mono_ab12cd: 100, '"Times New Roman"': 100 },
    loaded: ["__Inter_Tight_5a0f1f"],
  });
  assert.deepEqual(score, {
    device: { wanted: "light", ground: "#ebebeb", got: "light", held: true },
    typeShare: 0.8,
    fontsMissing: ["IBM Plex Mono"],
  });
});

test("a light look on a dark page doesn't hold, and a page with no text has no type share", () => {
  const score = judgeLook(drafting, { ground: Array(20).fill(ink), text: {}, loaded: ["Inter Tight", "IBM Plex Mono"] });
  assert.equal(score.device.held, false);
  assert.equal(score.device.got, "dark");
  assert.equal(score.typeShare, null);
  assert.deepEqual(score.fontsMissing, []);
});

test("a setup can wear a style, named after a +", () => {
  assert.deepEqual(parseSetup("echo-local+drafting-index"), { base: "echo-local", style: "drafting-index" });
  assert.deepEqual(parseSetup("echo"), { base: "echo" });
  assert.throws(() => parseSetup("echo+"), /isn't a setup/);
  assert.throws(() => parseSetup("echo+a+b"), /isn't a setup/);
});

const look = (held: boolean, typeShare: number | null, fontsMissing: string[] = []): LookScore => ({
  device: { wanted: "light", ground: held ? "#ebebeb" : "#1d1d1d", got: held ? "light" : "dark", held },
  typeShare,
  fontsMissing,
});

const styled = (run: number, looks: LookScore[]): RunRecord => ({
  label: "t",
  setup: "echo-local+drafting-index",
  task: "pricing",
  run,
  model: "claude-sonnet-5",
  startedAt: "",
  app: {
    setup: "echo-local+drafting-index",
    preparedAt: "",
    echo: { source: "local", dir: "components/echo", registry: "", catalog: "" },
    style: { name: "drafting-index", title: "Drafting Index", from: "yours", device: "light", sha256: "" },
  },
  agent: { wallMs: 60000, tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 } },
  mistakes: { colour: 0, lookalike: 0, "echo-class": 0, prop: 0, name: 0 },
  findings: [],
  typeErrors: 0,
  built: true,
  pages: looks.map((l, i) => ({ route: `/p${i}`, status: 200, consoleErrors: [], axe: {}, look: l })),
});

test("the report says, per setup and task, how many pages kept the device, how much text kept the type, and which fonts never loaded", () => {
  const records = [styled(1, [look(true, 0.9), look(false, 0.5, ["IBM Plex Mono"])]), styled(2, [look(true, null, ["IBM Plex Mono"])])];
  const [, , row] = lookTable(records).split("\n");
  assert.equal(row, "| echo-local+drafting-index | pricing | Drafting Index (light) | 2/3 | 70% | IBM Plex Mono (2) |");
  assert.match(renderReport("t", records), /## The look/);
  // Runs never scored for a look (every run before this) get no section.
  assert.doesNotMatch(renderReport("t", [styled(1, [])]), /## The look/);
});
