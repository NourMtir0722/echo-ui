import { test } from "node:test";
import assert from "node:assert/strict";
import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "./index";

/**
 * `style list | use | check`: Echo's styles and the builder's own, applied to
 * a project. The builder's library is a temporary folder (ECHO_STYLES_DIR)
 * standing in for their Documents.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const publicDir = resolve(repoRoot, "apps/www/public");
const built = await access(join(publicDir, "e/styles/index.json")).then(() => true, () => false);

async function registryCopy(): Promise<{ dir: string; url: string }> {
  const dir = await mkdtemp(join(tmpdir(), "echo-style-registry-"));
  await cp(join(publicDir, "e"), join(dir, "e"), { recursive: true });
  await cp(join(publicDir, "r"), join(dir, "r"), { recursive: true });
  return { dir, url: pathToFileURL(join(dir, "e")).href };
}

async function app(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-style-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "19.0.0" } }));
  await writeFile(join(root, "tsconfig.json"), "{}");
  await mkdir(join(root, "app"), { recursive: true });
  return root;
}

async function cli(root: string, args: string[]) {
  const lines: string[] = [];
  const saved = { log: console.log, warn: console.warn, error: console.error };
  for (const method of ["log", "warn", "error"] as const) console[method] = (...parts: unknown[]) => void lines.push(parts.join(" "));
  try {
    const code = await run([...args, "--cwd", root, "--skip-install"]);
    const text = lines.join("\n");
    const start = text.indexOf("{\n");
    return { code, text, json: args.includes("--json") && start >= 0 ? JSON.parse(text.slice(start)) : undefined };
  } finally {
    Object.assign(console, saved);
  }
}

const porcelain = {
  version: 1,
  name: "porcelain-window",
  title: "Porcelain Window",
  essence: "Soft ceramic surfaces framing user photography.",
  fingerprint: { warmth: 3, volume: 2, density: 3, formality: 2, era: 4, craft: 4, ornament: 2 },
  seed: { accent: "#6E7FD6", chassis: "#2E2A33", paper: "#F0E7E3", finish: 0.8, radius: 0.9, fontSans: '"Nunito Sans", system-ui, sans-serif' },
  fonts: [{ role: "sans", family: "Nunito Sans", source: "Google Fonts" }],
  rules: ["Colour only for state.", "No borders on a container."],
  refusals: [{ wants: "Separation by value alone, no shadow", instead: "a soft, glossy finish: Echo's parts are molded and lit." }],
};

/** A styles folder: one ready style, one only a document, the library's own index, and one broken. */
async function library(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-"));
  await mkdir(join(dir, "porcelain-window"));
  await writeFile(join(dir, "porcelain-window", "style.json"), JSON.stringify(porcelain));
  await writeFile(join(dir, "porcelain-window", "porcelain-window.md"), "# Porcelain Window\n");
  await mkdir(join(dir, "plate-room"));
  await writeFile(join(dir, "plate-room", "plate-room.md"), "# Plate Room\n");
  await writeFile(join(dir, "INDEX.md"), "# Style Library\n");
  await mkdir(join(dir, "broken"));
  await writeFile(join(dir, "broken", "style.json"), JSON.stringify({ version: 1, name: "broken" }));
  return dir;
}

async function withLibrary<T>(dir: string, work: () => Promise<T>): Promise<T> {
  const saved = process.env.ECHO_STYLES_DIR;
  process.env.ECHO_STYLES_DIR = dir;
  try {
    return await work();
  } finally {
    if (saved === undefined) delete process.env.ECHO_STYLES_DIR;
    else process.env.ECHO_STYLES_DIR = saved;
  }
}

test("style check: a style Echo can apply, and one that lists every problem", async () => {
  const dir = await library();
  try {
    const good = await cli(dir, ["style", "check", join(dir, "porcelain-window"), "--json"]);
    assert.equal(good.code, 0, good.text);
    assert.equal(good.json.ok, true);
    const bad = await cli(dir, ["style", "check", join(dir, "broken", "style.json")]);
    assert.equal(bad.code, 1);
    assert.match(bad.text, /`title`/);
    assert.match(bad.text, /`fingerprint` places the style/);
    assert.match(bad.text, /`seed` is what the theme applies/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("style check says when the accent comes out as another colour", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-acid-"));
  try {
    const acid = { version: 1, name: "acid", title: "Acid", essence: "An acid yellow.", fingerprint: { warmth: 4, volume: 5, density: 3, formality: 2, era: 3, craft: 3, ornament: 3 }, seed: { accent: "#F1FF01" } };
    await writeFile(join(dir, "style.json"), JSON.stringify(acid));
    const { code, text } = await cli(dir, ["style", "check", dir]);
    assert.equal(code, 0, text);
    assert.match(text, /The accent #F1FF01 comes out as #[0-9A-F]{6}: Echo holds every accent to one lightness/);
    const { json } = await cli(dir, ["style", "check", dir, "--json"]);
    assert.match(json.report.accent.from, /^#F1FF01$/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("style list: Echo's styles, and yours, with the ones that are only a document", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      const { code, json, text } = await cli(root, ["style", "list", "--json", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.ok(json.echo.some((s: { name: string }) => s.name === "echo"));
      const yours = Object.fromEntries(json.yours.map((s: { name: string }) => [s.name, s]));
      assert.equal(yours["porcelain-window"].ready, true);
      assert.equal(yours["plate-room"].needsRead, true);
      assert.ok(yours.broken.problems.length > 0);
      assert.equal(yours.INDEX, undefined);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style use: your style's seed to echo.json and the theme, its rules to DESIGN.md, its documents left behind", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      assert.equal((await cli(root, ["init", "--yes", "--registry", registry.url])).code, 0);
      const { code, json, text } = await cli(root, ["style", "use", "porcelain-window", "--json", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.equal(json.style.from, "yours");

      const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
      assert.equal(config.style.name, "porcelain-window");
      assert.deepEqual(config.style.rules, porcelain.rules);
      assert.equal(config.seed.accent, "#6E7FD6");
      assert.equal(config.seed.radius, 0.9);
      // Only what the project needs: no fingerprint, no document.
      assert.equal(config.style.fingerprint, undefined);

      const theme = await readFile(join(root, config.dir, "echo-theme.css"), "utf8");
      assert.match(theme, /in the porcelain-window style/);
      assert.match(theme, /--echo-font-sans: "Nunito Sans", system-ui, sans-serif;/);

      const design = await readFile(join(root, "DESIGN.md"), "utf8");
      assert.match(design, /## Style/);
      assert.match(design, /\*\*Porcelain Window\*\*, from this builder's own library/);
      assert.match(design, /- Colour only for state\./);
      assert.match(design, /Separation by value alone, no shadow: instead, a soft, glossy finish/);

      // init again keeps the style; a new seed is a new look, and the style goes.
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).style.name, "porcelain-window");
      await cli(root, ["init", "--yes", "--seed", "#E8566F", "--registry", registry.url]);
      assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).style, undefined);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

/**
 * `add` and `update` rewrite DESIGN.md for what's installed, and
 * wrote it without the style: the first component added after `style use`
 * took the style's section, and its rules, away from the agent.
 */
test("adding a component after style use keeps the style's section in DESIGN.md", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      await cli(root, ["style", "use", "porcelain-window", "--registry", registry.url]);
      const added = await cli(root, ["add", "kbd", "--yes", "--registry", registry.url]);
      assert.equal(added.code, 0, added.text);
      const design = await readFile(join(root, "DESIGN.md"), "utf8");
      assert.match(design, /Installed here: kbd/);
      assert.match(design, /## Style/);
      assert.match(design, /- Colour only for state\./);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

/**
 * `agent on` wrote DESIGN.md from the seed alone: after `agent off`
 * and `agent on`, the project still wore its style (echo.json and the theme
 * said so) but the agent no longer read its rules.
 */
test("agent on keeps the style's section in DESIGN.md", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      await cli(root, ["style", "use", "porcelain-window", "--registry", registry.url]);
      await cli(root, ["agent", "off"]);
      const on = await cli(root, ["agent", "on"]);
      assert.equal(on.code, 0, on.text);
      const design = await readFile(join(root, "DESIGN.md"), "utf8");
      assert.match(design, /## Style/);
      assert.match(design, /- Colour only for state\./);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style use: Echo's own style comes from the registry", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-empty-"));
  try {
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const { code, json, text } = await cli(root, ["style", "use", "echo", "--json", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.equal(json.style.from, "echo");
      assert.match(await readFile(join(root, "DESIGN.md"), "utf8"), /\*\*Echo\*\*, from Echo's library/);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style use: a palette the theme has to correct is applied, and the correction said", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-hostile-"));
  const root = await app();
  try {
    await mkdir(join(dir, "murk"));
    await writeFile(join(dir, "murk", "style.json"), JSON.stringify({ ...porcelain, name: "murk", title: "Murk", seed: { paper: "#2A2A2A", chassis: "#26222B" } }));
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const { code, json } = await cli(root, ["style", "use", "murk", "--json", "--registry", registry.url]);
      assert.equal(code, 0);
      assert.ok(json.report.corrected.some((line: string) => /^text \(→/.test(line)), JSON.stringify(json.report));
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("a light style is worn on the light device: checked with its report, listed as light, applied", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-light-"));
  const root = await app();
  try {
    await mkdir(join(dir, "porcelain-light"));
    const light = { ...porcelain, name: "porcelain-light", title: "Porcelain Light", seed: { accent: "#6E7FD6", chassis: "#F0E7E3", paper: "#2B2A33", fontSans: porcelain.seed.fontSans } };
    await writeFile(join(dir, "porcelain-light", "style.json"), JSON.stringify(light));
    await withLibrary(dir, async () => {
      const checked = await cli(dir, ["style", "check", join(dir, "porcelain-light"), "--json"]);
      assert.equal(checked.code, 0);
      assert.equal(checked.json.device, "light");
      assert.deepEqual(checked.json.report.unsatisfiable, []);
      const listed = await cli(root, ["style", "list", "--json", "--registry", registry.url]);
      assert.equal(listed.json.yours[0].device, "light");
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const used = await cli(root, ["style", "use", "porcelain-light", "--registry", registry.url]);
      assert.equal(used.code, 0, used.text);
      assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).style.name, "porcelain-light");
      // The theme it wrote is a light device's: screens of paper glass, printed in the ink.
      const theme = await readFile(join(root, "components/echo/echo-theme.css"), "utf8");
      assert.match(theme, /--echo-screen-ink: #2B2A33;/i);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style use refuses what it can't apply, and says why", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      const bare = await cli(root, ["style", "use", "porcelain-window", "--registry", registry.url]);
      assert.equal(bare.code, 1);
      assert.match(bare.text, /There's no echo\.json here/);

      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const doc = await cli(root, ["style", "use", "plate-room", "--registry", registry.url]);
      assert.equal(doc.code, 1);
      assert.match(doc.text, /only its document/);
      assert.match(doc.text, /Design Eye/);

      const unknown = await cli(root, ["style", "use", "flux-capacitor", "--registry", registry.url]);
      assert.equal(unknown.code, 1);
      assert.match(unknown.text, /There's no style called flux-capacitor\. There's: echo, ink-instrument, porcelain-window\./);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style fit measures both libraries against a product's profile, and a profile that isn't one says how to write it", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      // Porcelain Window is W3 V2 D3 F2 E4 C4 O2; Echo's own style is W4 V3 D3 F2 E3 C5 O3; Ink Instrument is W2 V2 D3 F4 E2 C4 O2.
      const { code, json, text } = await cli(root, ["style", "fit", "--profile", "W3 V2 D3 F2 E4 C4 O2", "--json", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.deepEqual(json.results.map((r: { name: string; from: string }) => `${r.name}:${r.from}`), ["porcelain-window:yours", "echo:echo", "ink-instrument:echo"]);
      assert.equal(json.results[0].total, 0);
      // Locking an axis Echo's own style misses puts it out, below everything that's in.
      const locked = await cli(root, ["style", "fit", "--profile", "W3 V2 D3 F2 E4 C4 O2", "--tolerance", "W1 V1 D1 F1 E1 C0 O1", "--json", "--registry", registry.url]);
      assert.deepEqual(locked.json.results.at(-1).locked, ["craft"]);
      const bad = await cli(root, ["style", "fit", "--profile", "W3 V2", "--registry", registry.url]);
      assert.equal(bad.code, 2);
      assert.match(bad.text, /leaves out density, formality, era, craft, ornament/);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style show prints a style in full, which device it makes, and where its foundation is", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      const yours = await cli(root, ["style", "show", "porcelain-window", "--json", "--registry", registry.url]);
      assert.equal(yours.code, 0, yours.text);
      assert.equal(yours.json.from, "yours");
      assert.match(yours.json.foundation, /porcelain-window[\\/]porcelain-window\.md$/);
      const echo = await cli(root, ["style", "show", "echo", "--json", "--registry", registry.url]);
      assert.equal(echo.json.from, "echo");
      assert.equal(echo.json.device, "dark");
      const none = await cli(root, ["style", "show", "nowhere", "--registry", registry.url]);
      assert.equal(none.code, 1);
      assert.match(none.text, /There's no style called nowhere/);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("init --style sets the project up wearing a style, and won't take --seed with it", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      const both = await cli(root, ["init", "--yes", "--seed", "#8B6FE8", "--style", "porcelain-window", "--registry", registry.url]);
      assert.equal(both.code, 2);
      assert.match(both.text, /Give `--seed` or `--style`, not both/);
      const { code, text } = await cli(root, ["init", "--yes", "--style", "porcelain-window", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.match(text, /This project now wears Porcelain Window/);
      assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).style.name, "porcelain-window");
      assert.match(await readFile(join(root, "DESIGN.md"), "utf8"), /## Style/);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

/**
 * `style set`: one setting of this project's seed, or several, checked before
 * anything is written, with the theme and DESIGN.md written again and the
 * line that puts it back.
 */
test("style set: one setting moves the seed, the theme and DESIGN.md, and says how to put it back", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    assert.equal((await cli(root, ["init", "--yes", "--registry", registry.url])).code, 0);
    const dir = JSON.parse(await readFile(join(root, "echo.json"), "utf8")).dir as string;
    const themeBefore = await readFile(join(root, dir, "echo-theme.css"), "utf8");

    const { code, json, text } = await cli(root, ["style", "set", "radius", "0.8", "--json"]);
    assert.equal(code, 0, text);
    assert.deepEqual(json.changes, { radius: { from: "0.5", to: "0.8" } });
    assert.equal(json.undo, "npx echo-ui-cli style set radius default");
    assert.equal(json.device, "dark");

    assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed.radius, 0.8);
    const theme = await readFile(join(root, dir, "echo-theme.css"), "utf8");
    assert.notEqual(theme, themeBefore);
    assert.match(theme, /Change one setting with `npx echo-ui-cli style set <setting> <value>`/);
    assert.match(await readFile(join(root, "DESIGN.md"), "utf8"), /at this seed's radius 0\.8 \(0 crisp, 1 soft\)\. Buttons and segments follow the radius \(`pills`\)/);

    // `default` gives it back to Echo: the key leaves the seed.
    assert.equal((await cli(root, ["style", "set", "radius", "default"])).code, 0);
    assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed.radius, undefined);
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style set: every bad value is said at once, and nothing is written", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const configBefore = await readFile(join(root, "echo.json"), "utf8");
    const bad = await cli(root, ["style", "set", "radius", "1.4", "density", "tight", "accent", "red", "sparkle", "1"]);
    assert.equal(bad.code, 1);
    assert.match(bad.text, /Nothing changed/);
    assert.match(bad.text, /`radius` is a number from 0 to 1/);
    assert.match(bad.text, /`density` is "compact", "default", "comfortable"/);
    assert.match(bad.text, /`accent` is a six-digit hex/);
    assert.match(bad.text, /`sparkle` isn't something a style can set yet\. It can set: accent, chassis/);
    assert.equal(await readFile(join(root, "echo.json"), "utf8"), configBefore);
    // A setting without its value is a usage mistake.
    assert.equal((await cli(root, ["style", "set", "radius"])).code, 2);
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style set: render drawn draws the parts in the ink, and DESIGN.md says so", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const set = await cli(root, ["style", "set", "chassis", "#FBFBFB", "paper", "#050505", "accent", "#D3F44F", "render", "drawn"]);
    assert.equal(set.code, 0, set.text);
    assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed.render, "drawn");
    const theme = await readFile(join(root, "components/echo/echo-theme.css"), "utf8");
    assert.match(theme, /--echo-drawn: 1;/);
    assert.match(theme, /--echo-line-width: 1\.5px;/);
    // The acid stays itself, as the fill under the ink.
    assert.match(theme, /--echo-primary-cap-top: #d3f44f;/);
    const design = await readFile(join(root, "DESIGN.md"), "utf8");
    assert.match(design, /drawn in the ink: every part outlined at one weight and hollow/);
    assert.match(design, /Render `drawn`/);
    // Pill keys on crisp boxes: pills is a boolean in the seed, whatever the radius.
    assert.equal((await cli(root, ["style", "set", "radius", "0.3", "pills", "true"])).code, 0);
    assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed.pills, true);
    assert.match(await readFile(join(root, "components/echo/echo-theme.css"), "utf8"), /--echo-cap-round: 1;/);
    assert.match(await readFile(join(root, "DESIGN.md"), "utf8"), /Buttons and segments are pills \(`pills`\)/);
    // Anything else is said, and nothing is written.
    const bad = await cli(root, ["style", "set", "render", "sketched"]);
    assert.equal(bad.code, 1);
    assert.match(bad.text, /`render` is "molded" or "drawn"/);
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style set: a worn style stays, marked with what moved, and style use puts it back whole", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await library();
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      await cli(root, ["style", "use", "porcelain-window", "--registry", registry.url]);
      const { code, json, text } = await cli(root, ["style", "set", "radius", "0.6", "finish", "0.2", "--json"]);
      assert.equal(code, 0, text);
      assert.equal(json.undo, "npx echo-ui-cli style set finish 0.8 radius 0.9");

      let config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
      assert.equal(config.style.name, "porcelain-window");
      assert.deepEqual(config.style.changed, ["finish", "radius"]);
      assert.deepEqual(config.style.rules, porcelain.rules);
      assert.match(await readFile(join(root, config.dir, "echo-theme.css"), "utf8"), /in the porcelain-window style[\s\S]*Changed since with `npx echo-ui-cli style set`: finish, radius\./);
      const design = await readFile(join(root, "DESIGN.md"), "utf8");
      assert.match(design, /Changed for this product with `npx echo-ui-cli style set`: finish, radius/);
      assert.match(design, /- Colour only for state\./);

      // A later change adds to the list, in the seed's own order.
      await cli(root, ["style", "set", "density", "compact"]);
      config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
      assert.deepEqual(config.style.changed, ["finish", "radius", "density"]);

      await cli(root, ["style", "use", "porcelain-window", "--registry", registry.url]);
      config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
      assert.equal(config.style.changed, undefined);
      assert.equal(config.seed.radius, 0.9);
      assert.equal(config.seed.density, undefined);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style set: a pale chassis makes a light device, and a font stack comes back quoted", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const light = await cli(root, ["style", "set", "chassis", "#F2EEE6", "paper", "#2B2A33"]);
    assert.equal(light.code, 0, light.text);
    assert.match(light.text, /this is a light device/);
    assert.equal((await cli(root, ["style", "set", "chassis", "default", "paper", "default", "--json"])).json.device, "dark");

    const stack = '"Inter", system-ui, sans-serif';
    await cli(root, ["style", "set", "fontSans", stack]);
    assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed.fontSans, stack);
    const again = await cli(root, ["style", "set", "fontSans", "system-ui, sans-serif", "--json"]);
    assert.equal(again.json.undo, `npx echo-ui-cli style set fontSans '"Inter", system-ui, sans-serif'`);
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style set: alone, it lists the settings; with no echo.json, it says to run init", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    assert.equal((await cli(root, ["style", "set"])).code, 1);
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const { code, json } = await cli(root, ["style", "set", "--json"]);
    assert.equal(code, 0);
    assert.deepEqual(Object.keys(json.settings), ["accent", "chassis", "paper", "lcdTint", "finish", "radius", "density", "render", "pills", "fontMachine", "fontSans", "fontMono", "fontLcd"]);
    assert.equal(json.settings.radius, "0.5");
    assert.equal(json.settings.lcdTint, "from the chassis");
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

/**
 * The Workflow guide walked a builder through wearing a style with
 * `style use` and printed what it says. Once the slop police came in, the
 * guide's style was one the police stopped, and the guide still showed it
 * applying on the first try, without the readability line either. The guide
 * now wears Ink Instrument, the style Echo publishes beside its own, which the
 * police lets through. Its transcripts are run here as the guide tells them,
 * and must be what the CLI prints.
 */
test("the Workflow guide's style fit, style use and style set print what the guide shows", { skip: !built }, async () => {
  const guide = await readFile(resolve(repoRoot, "apps/www/app/docs/(guides)/workflow/content.mdx"), "utf8");
  const transcript = (command: string) => {
    const at = guide.indexOf(`\`\`\`sh\nnpx echo-ui-cli ${command}\n\`\`\``);
    assert.ok(at >= 0, `the guide runs \`${command}\``);
    const start = guide.indexOf("```text\n", at) + "```text\n".length;
    return guide.slice(start, guide.indexOf("\n```", start)).split("\n");
  };

  const registry = await registryCopy();
  const dir = await mkdtemp(join(tmpdir(), "echo-styles-"));
  const root = await app();
  try {
    // In the guide, the builder's boards became Ink Instrument, so it's in their own library.
    await mkdir(join(dir, "ink-instrument"));
    await writeFile(join(dir, "ink-instrument", "style.json"), await readFile(resolve(repoRoot, "registry/styles/ink-instrument.json"), "utf8"));
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const said = async (args: string[]) => (await cli(root, [...args, "--registry", registry.url])).text.replaceAll(dir, "~/Documents/styles").split("\n");
      assert.deepEqual(await said(["style", "fit", "--profile", "W2 V2 D3 F4 E3 C5 O2"]), transcript('style fit --profile "W2 V2 D3 F4 E3 C5 O2"'));
      assert.deepEqual(await said(["style", "use", "ink-instrument"]), transcript("style use ink-instrument"));
      assert.deepEqual(await said(["style", "set", "radius", "0.6", "density", "comfortable"]), transcript("style set radius 0.6 density comfortable"));
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});
