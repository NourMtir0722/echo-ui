import { test } from "node:test";
import assert from "node:assert/strict";
import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "./index";

/**
 * The slop police from the command line: a banned pairing stops `style check`
 * and `style use` with the question for the builder, a keep in the builder's
 * words lets it through, `style fit` marks it, and `check` leaves alone what
 * the worn style kept, except the floor.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const publicDir = resolve(repoRoot, "apps/www/public");
const built = await access(join(publicDir, "e/styles/index.json")).then(() => true, () => false);

async function registryCopy(): Promise<{ dir: string; url: string }> {
  const dir = await mkdtemp(join(tmpdir(), "echo-police-registry-"));
  await cp(join(publicDir, "e"), join(dir, "e"), { recursive: true });
  await cp(join(publicDir, "r"), join(dir, "r"), { recursive: true });
  return { dir, url: pathToFileURL(join(dir, "e")).href };
}

async function app(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-police-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "19.0.0" } }));
  await writeFile(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }));
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

/** Claude's own cream and terracotta: the pairing, a beige ground with orange. */
const bakery = {
  version: 1,
  name: "bakery-cream",
  title: "Bakery Cream",
  essence: "A warm shopfront.",
  fingerprint: { warmth: 5, volume: 2, density: 2, formality: 2, era: 2, craft: 3, ornament: 3 },
  seed: { accent: "#D97757", chassis: "#F4F1EA", paper: "#1A1714", fontSans: '"Nunito Sans", sans-serif' },
  decisions: { emphasis: "One warm number per screen.", primaryAction: "The terracotta cap, one per screen." },
};

async function libraryWith(styles: object[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "echo-police-styles-"));
  for (const s of styles as { name: string }[]) {
    await mkdir(join(dir, s.name));
    await writeFile(join(dir, s.name, "style.json"), JSON.stringify(s));
  }
  return dir;
}

test("style check: a banned pairing fails, with the question for the builder and what's undecided", async () => {
  const dir = await libraryWith([bakery]);
  try {
    const { code, text } = await cli(dir, ["style", "check", join(dir, "bakery-cream")]);
    assert.equal(code, 1, text);
    assert.match(text, /the slop police stops it until the builder keeps or changes/);
    assert.match(text, /Slop police: cream with terracotta or orange: the chassis #F4F1EA is a warm cream; the accent #D97757 is terracotta or orange\. /);
    assert.match(text, /Don't keep it yourself: ask the builder/);
    assert.match(text, /Ask: The slop police stops cream with terracotta or orange .* Keep it .* or change one of them\?/);
    assert.match(text, /Undecided: a second action; a destructive action;/);
    const { json } = await cli(dir, ["style", "check", join(dir, "bakery-cream"), "--json"]);
    assert.equal(json.ok, false);
    assert.deepEqual(json.police.banned.map((b: { id: string }) => b.id), ["cream-terracotta"]);
    assert.ok(json.undecided.includes("copyVoice"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("style use refuses a banned pairing; the builder's keep lets it through, into echo.json and DESIGN.md", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await libraryWith([bakery]);
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      await cli(root, ["init", "--yes", "--registry", registry.url]);
      const refused = await cli(root, ["style", "use", "bakery-cream", "--registry", registry.url]);
      assert.equal(refused.code, 1, refused.text);
      assert.match(refused.text, /The slop police stops Bakery Cream: cream with terracotta or orange/);
      assert.match(refused.text, /Only the builder can keep it/);
      assert.equal(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).style, undefined, "nothing was worn");

      const kept = { ...bakery, keeps: [{ rule: "cream-terracotta", reason: "It's the bakery's own shopfront, painted in 1962." }] };
      await writeFile(join(dir, "bakery-cream", "style.json"), JSON.stringify(kept));
      const checked = await cli(dir, ["style", "check", join(dir, "bakery-cream")]);
      assert.equal(checked.code, 0, checked.text);
      assert.match(checked.text, /Kept on purpose, by the builder: cream with terracotta or orange \(It's the bakery's own shopfront/);
      const used = await cli(root, ["style", "use", "bakery-cream", "--registry", registry.url]);
      assert.equal(used.code, 0, used.text);
      const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
      assert.deepEqual(config.style.keeps, kept.keeps);
      assert.deepEqual(config.style.decisions, bakery.decisions);
      const design = await readFile(join(root, "DESIGN.md"), "utf8");
      assert.match(design, /Every screen keeps these decisions/);
      assert.match(design, /- \*\*How something is made important:\*\* One warm number per screen\./);
      assert.match(design, /Not decided by the style: .*a second action.* Ask the builder/);
      assert.match(design, /The builder kept these on purpose.*\n\n- cream-terracotta: It's the bakery's own shopfront/);
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("style fit marks what the police stops, without taking it off the list", { skip: !built }, async () => {
  const registry = await registryCopy();
  const dir = await libraryWith([bakery]);
  const root = await app();
  try {
    await withLibrary(dir, async () => {
      const { code, text } = await cli(root, ["style", "fit", "--profile", "W5 V2 D2 F2 E2 C3 O3", "--registry", registry.url]);
      assert.equal(code, 0, text);
      assert.match(text, /bakery-cream .*the slop police stops cream with terracotta or orange/);
      const { json } = await cli(root, ["style", "fit", "--profile", "W5 V2 D2 F2 E2 C3 O3", "--registry", registry.url, "--json"]);
      assert.equal(json.results[0].name, "bakery-cream", "still first on the list");
      assert.deepEqual(json.police, { "bakery-cream": ["cream with terracotta or orange"] });
    });
  } finally {
    await Promise.all([registry.dir, dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});

test("check leaves alone the tells the worn style kept, and never the floor", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const page = `export default function Page() {\n  return (\n    <main>\n      <h1 className="bg-clip-text">Warm bread</h1>\n      <p>Jane Doe ordered two loaves.</p>\n    </main>\n  );\n}\n`;
    await writeFile(join(root, "app/page.tsx"), page);
    const before = await cli(root, ["check", "--json"]);
    const slop = (r: typeof before) => (r.json.findings as { rule: string; message: string }[]).filter((f) => f.rule === "slop").map((f) => /^Slop police, ([^:]+):/.exec(f.message)![1]);
    assert.deepEqual(slop(before).sort(), ["a stand-in where real content belongs", "gradient text"]);

    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    config.style = { name: "bakery-cream", title: "Bakery Cream", essence: "A warm shopfront.", from: "yours", keeps: [{ rule: "gradient-text", reason: "The shop sign." }, { rule: "placeholder", reason: "tried" }] };
    await writeFile(join(root, "echo.json"), JSON.stringify(config));
    const after = await cli(root, ["check", "--json"]);
    assert.deepEqual(slop(after), ["a stand-in where real content belongs"]);
  } finally {
    await Promise.all([registry.dir, root].map((d) => rm(d, { recursive: true, force: true })));
  }
});
