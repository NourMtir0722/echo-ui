import { test } from "node:test";
import assert from "node:assert/strict";
import { access, cp, mkdtemp, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { run } from "./index";
import { aliasFor, parseJsonc } from "./import-path";
import { installArgs } from "./packages";

/**
 * `which` and `docs`, run the way an agent runs them, against the catalog this
 * repo builds, read over file: the way a local registry is.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const publicDir = resolve(repoRoot, "apps/www/public");
const built = await access(join(publicDir, "r/catalog.json")).then(() => true, () => false);

/** A copy of the built /e/ and /r/, so a test can take the registry away. */
async function registryCopy(): Promise<{ dir: string; url: string }> {
  const dir = await mkdtemp(join(tmpdir(), "echo-answers-registry-"));
  await cp(join(publicDir, "e"), join(dir, "e"), { recursive: true });
  await cp(join(publicDir, "r"), join(dir, "r"), { recursive: true });
  return { dir, url: pathToFileURL(join(dir, "e")).href };
}

async function app(tsconfig: object = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-answers-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "19.0.0" } }));
  await writeFile(join(root, "tsconfig.json"), JSON.stringify(tsconfig));
  await mkdir(join(root, "app"), { recursive: true });
  return root;
}

/** The CLI with everything it printed, and its --json result when asked for one. */
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

test("each package manager spells a dev dependency its own way", () => {
  assert.deepEqual(installArgs("npm", ["x"], true), ["install", "--save-dev", "x"]);
  assert.deepEqual(installArgs("pnpm", ["x"], true), ["add", "-D", "x"]);
  assert.deepEqual(installArgs("bun", ["x"], true), ["add", "--dev", "x"]);
  assert.deepEqual(installArgs("yarn", ["x"], true), ["add", "--dev", "x"]);
  assert.deepEqual(installArgs("npm", ["x"]), ["install", "x"]);
});

test("the Echo folder's import path comes from the project's own alias", () => {
  assert.equal(aliasFor("components/echo", { paths: { "@/*": ["./*"] } }), "@/components/echo");
  assert.equal(aliasFor("src/components/echo", { paths: { "@/*": ["./src/*"] } }), "@/components/echo");
  assert.equal(aliasFor("src/components/echo", { baseUrl: "src", paths: { "~/*": ["*"] } }), "~/components/echo");
  // The alias that reaches furthest in wins.
  assert.equal(aliasFor("src/ui/echo", { paths: { "@/*": ["./src/*"], "@ui/*": ["./src/ui/*"] } }), "@ui/echo");
  assert.equal(aliasFor("components/echo", { paths: { "@/*": ["./src/*"] } }), undefined);
  assert.deepEqual(parseJsonc('{ // a comment\n "a": "http://x", /* b */ "c": [1,], }'), { a: "http://x", c: [1] });
});

test("which answers several needs in one call, and says when nothing fits", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    const { code, json, text } = await cli(root, ["which", "a settings toggle", "an image slider", "--json", "--registry", registry.url]);
    assert.equal(code, 0, text);
    const [toggle, carousel] = json.answers;
    assert.equal(toggle.fits[0].name, "switch");
    assert.match(toggle.fits[0].install, /^npx echo-ui-cli add switch$/);
    assert.ok(toggle.fits[0].reason.length > 10);
    assert.deepEqual(carousel.fits, []);
    assert.match(carousel.gap, /carousel is coming soon/);

    const human = await cli(root, ["which", "an image slider", "--registry", registry.url]);
    assert.match(human.text, /Nothing in Echo does this yet/);
    assert.doesNotMatch(human.text, /add slider/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("docs answers several items in one call, with imports this project resolves", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app({ compilerOptions: { paths: { "@/*": ["./*"] } } });
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url, "--dir", "components/echo"]);
    const { code, text, json } = await cli(root, ["docs", "switch", "field", "--json", "--registry", registry.url]);
    assert.equal(code, 0, text);
    assert.deepEqual(json.items.map((i: { name: string }) => i.name), ["switch", "field"]);
    assert.equal(json.importFrom, "@/components/echo");

    const human = await cli(root, ["docs", "switch", "--registry", registry.url]);
    assert.match(human.text, /import \{ Switch \} from "@\/components\/echo\/switch";/);
    assert.match(human.text, /aria-label/);
    assert.match(human.text, /Don't:/);

    const unknown = await cli(root, ["docs", "carousel", "--registry", registry.url]);
    assert.equal(unknown.code, 1);
    assert.match(unknown.text, /No component named "carousel"/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

/**
 * A project with no alias reaching its Echo folder, as Vite's starter
 * is, got the docs' placeholder import, `@/echo/switch`, which resolves
 * nowhere: an agent copying it broke the build. With no alias, the imports are
 * written from the folder the app's own files are in, and the docs say which.
 */
test("with no alias, docs writes imports that resolve from the app's own folder", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await mkdtemp(join(tmpdir(), "echo-answers-vite-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "19.0.0" }, devDependencies: { vite: "7.0.0" } }));
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({ files: [] }));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.tsx"), "");
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    const { code, text, json } = await cli(root, ["docs", "switch", "--json", "--registry", registry.url]);
    assert.equal(code, 0, text);
    assert.equal(json.importFrom, "./components/echo");

    const human = await cli(root, ["docs", "switch", "--registry", registry.url]);
    assert.match(human.text, /import \{ Switch \} from "\.\/components\/echo\/switch";/);
    assert.doesNotMatch(human.text, /"@\/echo\//);
    assert.match(human.text, /written from a file in src\//);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("after init, which and docs answer offline from the kept catalog", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await app();
  try {
    await cli(root, ["init", "--yes", "--registry", registry.url]);
    // The registry goes away: the network is down.
    await rename(registry.dir, `${registry.dir}-gone`);
    const answer = await cli(root, ["which", "confirm a delete", "--json", "--registry", registry.url]);
    assert.equal(answer.code, 0, answer.text);
    assert.equal(answer.json.answers[0].fits[0].name, "alert-dialog");
    assert.equal((await cli(root, ["docs", "alert-dialog", "--registry", registry.url])).code, 0);
    await rename(`${registry.dir}-gone`, registry.dir);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

/**
 * The CLI and the MCP server answer from the same functions. Asked the same
 * thing, they name the same items in the same order.
 */
test("the MCP server's search leads with the answer which gives", { skip: !built }, async () => {
  const { createHandlers } = await import("../../../mcp/src/tools");
  const { createCatalogSource } = await import("../../../mcp/src/catalog-source");
  const handlers = createHandlers(createCatalogSource({ source: join(publicDir, "r/catalog.json") }));
  const registry = await registryCopy();
  const root = await app();
  try {
    for (const need of ["a settings toggle", "confirm a delete", "stat cards", "an email field"]) {
      const cliAnswer = (await cli(root, ["which", need, "--json", "--registry", registry.url])).json.answers[0];
      const mcp = (await handlers.search_components({ query: need })).content.map((c) => ("text" in c ? c.text : "")).join("\n");
      const lead = /^Best fit for "[^"]*": (.*)\.$/m.exec(mcp)?.[1] ?? "";
      assert.deepEqual(
        [...lead.matchAll(/`echo-([^`]+)`/g)].map((m) => m[1]),
        cliAnswer.fits.map((f: { name: string }) => f.name),
        need,
      );
    }
    const gap = (await handlers.search_components({ query: "an image slider" })).content.map((c) => ("text" in c ? c.text : "")).join("\n");
    assert.match(gap, /^Nothing in Echo does "an image slider" yet\. A carousel is coming soon\./);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

/**
 * `which` and `docs` kept their copy of the catalog in whatever
 * folder they ran in, so asking a question from a folder that isn't a project
 * left a node_modules/ behind in it. Only an Echo project keeps a copy now.
 */
test("outside an Echo project, which answers without writing anything", { skip: !built }, async () => {
  const registry = await registryCopy();
  const root = await mkdtemp(join(tmpdir(), "echo-answers-bare-"));
  try {
    const { code } = await cli(root, ["which", "a settings toggle", "--registry", registry.url]);
    assert.equal(code, 0);
    assert.deepEqual(await readdir(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});
