import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter, join, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { run } from "./index";
import { installArgs, installDependencies, spawnPlan, unreadableSpecs } from "./packages";
import { planInstall, nextLock, filesToWrite } from "./plan";
import {
  checkBaseline,
  declaredVersion,
  defaultDir,
  detectFramework,
  detectPackageManager,
  resolveInside,
} from "./project";
import { hashContent, type EItem } from "@echo-ui/client";
import { FOOTPRINT, addedLine, footprintPaths } from "@registry/agent/footprint";
import { CONFIG_SCHEMA_PATH, configSchema } from "@registry/agent/config-schema";
import { THEME_SETUP, projectBlock } from "@registry/agent/guidance";
import { themeStep } from "./setup";

/**
 * The CLI, run the way a user runs it, against the registry this repo builds.
 *
 * The fixture is a throwaway app in a temp folder; the registry is the real
 * `/e/` output read over `file:`. Nothing here is mocked except the network
 * hop, so what's tested is what ships: detection, resolution, the lock file,
 * refusing to clobber edits, and the exit codes.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const registryDir = resolve(repoRoot, "apps/www/public/e");
const registry = pathToFileURL(registryDir + "/").href.replace(/\/$/, "");
/** The core this workspace builds, which every built item declares (never a literal). */
const coreVersion: string = JSON.parse(await readFile(resolve(repoRoot, "packages/core/package.json"), "utf8")).version;

const built = await access(join(registryDir, "index.json")).then(() => true, () => false);
const exists = (path: string) => access(path).then(() => true, () => false);

/** A Next.js app with nothing in it, which is what `init` expects to meet. */
async function fixtureApp(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-cli-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "18.3.1" } }, null, 2),
  );
  await writeFile(join(root, "tsconfig.json"), "{}\n");
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await mkdir(join(root, "src"), { recursive: true });
  return root;
}

/** The CLI, with the network pointed at the built registry and installs skipped. */
async function cli(root: string, args: string[]): Promise<number> {
  return run([...args, "--cwd", root, "--registry", registry, "--skip-install"]);
}

test("detection reads the project, not a guess", async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await detectFramework(root), "next");
    assert.equal(await detectPackageManager(root), "pnpm");
    assert.equal(await defaultDir(root), join("src", "components", "echo"));
    assert.deepEqual(await checkBaseline(root, "next"), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a project outside the baseline is refused, with what to do about it", async () => {
  const root = await mkdtemp(join(tmpdir(), "echo-cli-bare-"));
  try {
    const problems = await checkBaseline(root, "unknown");
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.fix, /app's folder/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * The CLI's README says `init` stops outside Next.js's App Router or
 * Vite, React 18 and later, and Node 20 and later. It checked none of the
 * three: a Pages Router app was set up, and its build then refused every
 * component (each imports its own CSS, which the Pages Router takes only from
 * `pages/_app`); React 17 got as far as npm's own refusal of echo-ui-core's
 * peer range; and Node 18 ran a CLI built for 20.
 */
test("the Pages Router, React before 18 and Node before 20 are refused, each with what to do", async () => {
  const root = await fixtureApp();
  const said = async (node = "22.12.0") => (await checkBaseline(root, "next", node)).map((p) => `${p.what} ${p.fix}`).join("\n");
  try {
    await mkdir(join(root, "src", "pages"), { recursive: true });
    assert.match(await said(), /Pages Router[\s\S]*pages\/_app/);
    // Both routers at once is Next's own way to move over: the App Router's pages can use Echo.
    await mkdir(join(root, "src", "app"), { recursive: true });
    assert.equal(await said(), "");

    assert.match(await said("18.20.4"), /Node 18\.20\.4[\s\S]*Node 20/);

    await writeFile(join(root, "package.json"), JSON.stringify({ dependencies: { next: "16.3.5", react: "^17.0.2" } }));
    assert.match(await said(), /React 17\.0\.2[\s\S]*React 18/);
    // A range with no version in it is read from what's installed.
    await writeFile(join(root, "package.json"), JSON.stringify({ dependencies: { next: "16.3.5", react: "latest" } }));
    assert.equal(await said(), "", "nothing installed: nothing to go on, so nothing refused");
    await mkdir(join(root, "node_modules", "react"), { recursive: true });
    await writeFile(join(root, "node_modules", "react", "package.json"), JSON.stringify({ name: "react", version: "17.0.2" }));
    assert.match(await said(), /React 17\.0\.2/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a file path that leaves the Echo folder is refused at the last moment", () => {
  assert.throws(() => resolveInside("/tmp/app/src/echo", "../../../etc/passwd"), /outside/);
  assert.equal(resolveInside("/tmp/app/src/echo", "tabs/tabs.tsx"), resolve("/tmp/app/src/echo/tabs/tabs.tsx"));
});

test("every package manager gets its own install verb", () => {
  assert.deepEqual(installArgs("npm", ["a"]), ["install", "a"]);
  assert.deepEqual(installArgs("pnpm", ["a"]), ["add", "a"]);
  assert.deepEqual(installArgs("bun", ["a"]), ["add", "a"]);
  assert.deepEqual(installArgs("yarn", ["a"]), ["add", "a"]);
});

/* ------------------------------------------------------------- planning */

const item = (name: string, files: { path: string; content: string }[]): EItem => ({
  schemaVersion: 1,
  name,
  version: "1.0.0",
  kind: "component",
  title: name,
  description: "",
  core: ">=0.1.0 <0.2.0",
  dependencies: {},
  items: [],
  files: files.map((f) => ({ ...f, sha256: hashContent(f.content) })),
  setup: [],
  motion: [],
  sound: [],
  a11y: { standard: "WCAG 2.2 AA", tested: [], limits: [] },
  changes: [],
});

test("a file the user edited is a conflict; one Echo wrote is an upgrade", () => {
  const next = item("tabs", [{ path: "tabs/tabs.tsx", content: "// v2\n" }]);
  const lock = {
    lockVersion: 1 as const,
    core: "0.1.0",
    items: { tabs: { version: "0.9.0", files: { "tabs/tabs.tsx": hashContent("// v1\n") } } },
  };
  // Untouched since Echo wrote it → replaced.
  const clean = planInstall([next], lock, new Map([["tabs/tabs.tsx", "// v1\n"]]));
  assert.equal(clean.items[0]!.files[0]!.state, "upgrade");
  assert.deepEqual(clean.conflicts, []);
  assert.deepEqual(filesToWrite(clean).map((f) => f.path), ["tabs/tabs.tsx"]);

  // Edited by the user → conflict, and nothing to write.
  const edited = planInstall([next], lock, new Map([["tabs/tabs.tsx", "// mine\n"]]));
  assert.equal(edited.items[0]!.files[0]!.state, "modified");
  assert.deepEqual(edited.conflicts, [{ item: "tabs", path: "tabs/tabs.tsx" }]);
  assert.deepEqual(filesToWrite(edited), []);

  // Already exactly this version → nothing to do.
  const same = planInstall([next], lock, new Map([["tabs/tabs.tsx", "// v2\n"]]));
  assert.equal(same.items[0]!.files[0]!.state, "unchanged");
  assert.deepEqual(filesToWrite(same), []);
});

test("the lock records what is installed, in a stable order", () => {
  const plan = planInstall([item("tabs", [{ path: "tabs/tabs.tsx", content: "x" }])], undefined, new Map());
  const lock = nextLock({ lockVersion: 1, core: "0.1.0", items: { zzz: { version: "1", files: {} } } }, "0.1.0", plan);
  assert.deepEqual(Object.keys(lock.items), ["tabs", "zzz"]);
  assert.equal(lock.items.tabs!.files["tabs/tabs.tsx"], hashContent("x"));
});

/* --------------------------------------------------- the commands, for real */

test("init --ci writes the design tests' job, says so, and never writes over one that's there", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await cli(root, ["init", "--yes"]), 0);
    assert.equal(await exists(join(root, ".github/workflows/echo-design.yml")), false, "only when asked for");
    assert.equal(await cli(root, ["init", "--yes", "--ci"]), 0);
    const job = await readFile(join(root, ".github/workflows/echo-design.yml"), "utf8");
    assert.match(job, /pnpm exec echo-ui test --url http:\/\/localhost:3000/);
    // The fixture's package.json doesn't name its pnpm, so the job does.
    assert.match(job, /uses: pnpm\/action-setup@v6\n {8}with:\n {10}version: \S+\n/);
    assert.match(job, /pnpm exec next start -p 3000/);
    await writeFile(join(root, ".github/workflows/echo-design.yml"), "# mine\n");
    assert.equal(await cli(root, ["init", "--yes", "--ci"]), 0);
    assert.equal(await readFile(join(root, ".github/workflows/echo-design.yml"), "utf8"), "# mine\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init writes the config, the lock and the theme", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await cli(root, ["init", "--yes"]), 0);
    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    assert.equal(config.framework, "next");
    assert.equal(config.packageManager, "pnpm");
    // It points at the schema the registry publishes, and fits it.
    const schema = configSchema() as { properties: Record<string, { enum?: string[] }>; required: string[] };
    assert.ok(config.$schema.endsWith(`/e/${CONFIG_SCHEMA_PATH}`), config.$schema);
    for (const key of Object.keys(config)) assert.ok(key in schema.properties, `${key} isn't in the schema`);
    for (const key of schema.required) assert.ok(key in config, `${key} is required`);
    for (const [key, spec] of Object.entries(schema.properties)) if (spec.enum) assert.ok(spec.enum.includes(config[key]), key);
    assert.equal(config.dir, join("src", "components", "echo"));
    const theme = await readFile(join(root, config.dir, "echo-theme.css"), "utf8");
    assert.match(theme, /--echo-accent:/);
    assert.match(theme, /--echo-radius-md:/);
    // It has to be valid CSS, not just contain the right tokens — one
    // top-level :root block, balanced braces. A stray `}` got through the
    // first time.
    //
    // Two `:root` blocks are expected: the tokens, and the one inside
    // the `@supports not (color: color-mix(…))` legibility guard. Only the
    // unindented one is top level, and there is exactly one.
    const topLevelRoot = theme.match(/^:root\s*\{/gm) ?? [];
    assert.equal(topLevelRoot.length, 1, "exactly one top-level :root block");
    assert.match(
      theme,
      /@supports not \(color: color-mix\(in oklch, white, black\)\)/,
      "the out-of-baseline legibility guard is emitted with the theme",
    );
    assert.equal(
      (theme.match(/\{/g) ?? []).length,
      (theme.match(/\}/g) ?? []).length,
      "braces are balanced",
    );
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    assert.deepEqual(lock, { lockVersion: 1, core: "", items: {} });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init takes a seed, and the theme it writes carries it", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes", "--seed", "#3D8EF0"]);
    const theme = await readFile(join(root, "src/components/echo/echo-theme.css"), "utf8");
    // The seed reached the generated file, not the default purple.
    assert.match(theme, /--echo-accent: #3d8ef0/i);
    assert.doesNotMatch(theme, /--echo-accent: #8b6fe8/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init takes the whole seed as the generator shows it, and refuses what isn't one", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await cli(root, ["init", "--yes", "--seed", "#3D8EF0,#1B2230,#F2F5FA"]), 0);
    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    assert.deepEqual(config.seed, { accent: "#3D8EF0", chassis: "#1B2230", paper: "#F2F5FA" });
    const theme = await readFile(join(root, "src/components/echo/echo-theme.css"), "utf8");
    assert.match(theme, /--echo-accent: #3d8ef0/i);
    assert.equal(await cli(root, ["init", "--yes", "--seed", "blue"]), 1, "a word isn't a seed");
    assert.equal(await cli(root, ["init", "--yes", "--seed", "#111,#222,#333,#444"]), 1, "nor are four colours");
    assert.deepEqual(JSON.parse(await readFile(join(root, "echo.json"), "utf8")).seed, config.seed, "and a refused one changes nothing");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("add copies an item, its Echo dependencies, and records them", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    assert.equal(await cli(root, ["add", "chat"]), 0);
    const dir = join(root, "src/components/echo");
    assert.ok(await exists(join(dir, "chat/chat.tsx")), "the item itself");
    assert.ok(await exists(join(dir, "hardware-button/hardware-button.tsx")), "an item it depends on");
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    assert.ok(lock.items.chat, "chat is in the lock");
    assert.ok(lock.items["hardware-button"], "so is what it needed");
    assert.equal(lock.items.chat.files["chat/chat.tsx"], hashContent(await readFile(join(dir, "chat/chat.tsx"), "utf8")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("add refuses to replace a file you edited, until you say so", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    await cli(root, ["add", "hardware-button"]);
    const file = join(root, "src/components/echo/hardware-button/hardware-button.tsx");
    await writeFile(file, "// mine now\n");

    assert.equal(await cli(root, ["add", "hardware-button"]), 1, "it should refuse");
    assert.equal(await readFile(file, "utf8"), "// mine now\n", "and leave the file alone");

    assert.equal(await cli(root, ["add", "hardware-button", "--overwrite"]), 0);
    assert.notEqual(await readFile(file, "utf8"), "// mine now\n", "--overwrite replaces it");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a dry run writes nothing", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    assert.equal(await cli(root, ["add", "badge", "--dry-run"]), 0);
    assert.equal(await exists(join(root, "src/components/echo/badge")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("add without init explains what to run first", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await cli(root, ["add", "badge"]), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a name that isn't in the registry stops the install", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    assert.equal(await cli(root, ["add", "not-a-component"]), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("list reads the catalog and marks what is installed", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    await cli(root, ["add", "badge"]);
    assert.equal(await cli(root, ["list"]), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unknown command is a usage error, not a crash", async () => {
  assert.equal(await run(["frobnicate"]), 2);
  assert.equal(await run(["--help"]), 0);
});

test("the version the CLI reports is the one in package.json", async () => {
  const pkg = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"));
  const { VERSION } = await import("./index");
  assert.equal(VERSION, pkg.version);
});

test("re-running init keeps the lock, so installed files stay Echo's", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    await cli(root, ["init", "--yes"]);
    await cli(root, ["add", "badge"]);
    const before = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    assert.ok(before.items.badge, "badge is in the lock after add");

    // The documented way to change the seed is to run init again (--yes, since
    // echo.json is already there). That must not forget what is installed: an
    // empty lock makes every file Echo wrote look like one the user edited.
    assert.equal(await cli(root, ["init", "--yes", "--seed", "#1FA8A0"]), 0);
    const after = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    assert.deepEqual(after, before, "the lock is the same as before the re-init");

    // And the proof of what that record is for: re-adding is still an upgrade,
    // not a conflict over the user's own file.
    assert.equal(await cli(root, ["add", "badge"]), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the core version is read out of a range, or not read at all", () => {
  // A caret or tilde in front of a real version is the version.
  assert.equal(declaredVersion("^0.1.0"), "0.1.0");
  assert.equal(declaredVersion("~1.2.3"), "1.2.3");
  assert.equal(declaredVersion(">=0.1.0 <0.2.0"), "0.1.0");
  assert.equal(declaredVersion("0.1.0-rc.1"), "0.1.0-rc.1");
  // Everything else names no version this can compare. Stripping the leading
  // non-digits turned "^1" into "1" (which the range parser throws on) and
  // "workspace:*", "latest" and "*" into "", which skipped the check silently
  // and then went into the lock file as the installed core version.
  for (const declared of ["^1", "1.x", "workspace:*", "latest", "*", "npm:echo-ui-core@latest"]) {
    assert.equal(declaredVersion(declared), undefined, declared);
  }
});

test("add survives a core range it cannot read, and still refuses a real mismatch", { skip: !built }, async () => {
  const root = await fixtureApp();
  const setCore = async (declared: string) =>
    writeFile(
      join(root, "package.json"),
      JSON.stringify(
        { name: "fixture", dependencies: { next: "16.3.5", react: "18.3.1", "echo-ui-core": declared } },
        null,
        2,
      ),
    );
  try {
    await cli(root, ["init", "--yes"]);

    await setCore("^1");
    assert.equal(await cli(root, ["add", "badge"]), 0, "an unreadable range is no answer, not a crash");
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    assert.notEqual(lock.core, "1", "and it never gets recorded as a version");

    await setCore(`^${coreVersion}`);
    assert.equal(await cli(root, ["add", "badge"]), 0, "a range that reads as the current core satisfies the item");

    await setCore("^1.0.0");
    assert.equal(await cli(root, ["add", "otp-field"]), 1, "a core that really is too new still stops it");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the install command is never handed to a shell to parse", () => {
  // macOS and Linux: the package manager is the program, the specs are its
  // arguments, and nothing between them parses anything.
  const unix = spawnPlan("pnpm", ["add", "@base-ui/react@>=1.6.0 <2.0.0"], "darwin");
  assert.equal(unix.file, "pnpm");
  assert.deepEqual(unix.args, ["add", "@base-ui/react@>=1.6.0 <2.0.0"]);
  assert.equal("shell" in unix.options, false, "no shell, on any platform");

  // Windows has to go through cmd.exe — CreateProcess cannot run npm.cmd —
  // but every argument is quoted, so a `<` in a comparator range is a
  // character and not a redirect. `shell: true` joined them raw, which broke
  // the install of anything with a range like this one.
  const win = spawnPlan("pnpm", ["add", "@base-ui/react@>=1.6.0 <2.0.0"], "win32");
  assert.match(win.file, /cmd\.exe$/i);
  assert.equal("shell" in win.options, false);
  assert.equal(win.options.windowsVerbatimArguments, true);
  assert.deepEqual(win.args.slice(0, 3), ["/d", "/s", "/c"]);
  assert.equal(win.args[3], '""pnpm" "add" "@base-ui/react@>=1.6.0 <2.0.0""');
});

test("a package name that isn't one never reaches a command line", async () => {
  for (const spec of ["react@^18.3.1", "@base-ui/react@>=1.6.0 <2.0.0", "gsap@^3.13.0", "echo-ui-core"]) {
    assert.deepEqual(unreadableSpecs([spec]), [], spec);
  }
  for (const spec of ["evil&calc", 'a"b', "x%PATH%", "a;b", "$(whoami)", "a b", "../../etc", "-rf"]) {
    assert.deepEqual(unreadableSpecs([spec]), [spec], spec);
  }

  // And the install refuses before spawning anything.
  let ran = false;
  const result = await installDependencies("pnpm", ["evil&calc"], "/tmp", async () => {
    ran = true;
  });
  assert.equal(result.ok, false);
  assert.equal(ran, false, "nothing was spawned");
  assert.match(result.error!, /evil&calc/);
});

/** The CLI as an agent reads it: the exit code, stdout, and stderr. */
async function capture(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const [log, warn, error] = [console.log, console.warn, console.error];
  let out = "";
  let err = "";
  console.log = (...parts: unknown[]) => void (out += `${parts.join(" ")}\n`);
  console.warn = console.error = (...parts: unknown[]) => void (err += `${parts.join(" ")}\n`);
  try {
    const code = await run(args);
    return { code, out, err };
  } finally {
    [console.log, console.warn, console.error] = [log, warn, error];
  }
}

/**
 * echo.json and echo-lock.json were read with every error swallowed,
 * so one stray comma made a file that's there read as one that isn't: `add`
 * said "No echo.json here", and `init` then wrote a fresh one over the team's
 * seed, style and rules without being asked.
 */
test("an echo.json or lock that isn't JSON is said, and never written over", { skip: !built }, async () => {
  const root = await fixtureApp();
  try {
    assert.equal(await cli(root, ["init", "--seed", "#1FA8A0"]), 0);
    const config = join(root, "echo.json");
    const broken = (await readFile(config, "utf8")).replace(/\n}\n$/, ",\n}\n");
    await writeFile(config, broken);

    for (const args of [["add", "badge"], ["init"], ["init", "--yes"]]) {
      const said = await capture([...args, "--cwd", root, "--registry", registry, "--skip-install"]);
      assert.equal(said.code, 1, `${args.join(" ")} stops`);
      assert.match(said.err, /echo\.json isn't valid JSON/, `${args.join(" ")} names the file and what's wrong`);
      assert.doesNotMatch(said.err, /No echo\.json here/);
    }
    assert.equal(await readFile(config, "utf8"), broken, "the file is as the team left it");

    // The lock is the record of which files are Echo's: an unreadable one is
    // said, not replaced with an empty one, which would forget them all.
    await writeFile(config, broken.replace(/,\n}\n$/, "\n}\n"));
    const lock = join(root, "echo-lock.json");
    await writeFile(lock, "{ \"lockVersion\": 1, ");
    const said = await capture(["init", "--yes", "--cwd", root, "--registry", registry, "--skip-install"]);
    assert.equal(said.code, 1);
    assert.match(said.err, /echo-lock\.json isn't valid JSON/);
    assert.equal(await readFile(lock, "utf8"), "{ \"lockVersion\": 1, ");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * The package manager `init` and `add` call was spawned with the
 * CLI's own stdout, so what it printed ("Packages: +1", "added 3 packages")
 * landed on the stream `--json` promises holds the result and nothing else,
 * in front of it. An agent parsing stdout got pnpm's progress and no result.
 */
test("--json stdout is the result alone, even when the package manager prints", { skip: !built || process.platform === "win32" }, async () => {
  const root = await fixtureApp();
  const bin = await mkdtemp(join(tmpdir(), "echo-pm-"));
  // A pnpm that talks on stdout, as the real one does, and installs nothing.
  await writeFile(join(bin, "pnpm"), "#!/bin/sh\necho 'Packages: +1'\necho 'Progress: resolved 1, reused 1, done'\n", { mode: 0o755 });
  try {
    const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const ran = spawnSync(process.execPath, ["--import", "tsx", "src/index.ts", "init", "--json", "--skip-agent", "--cwd", root, "--registry", registry], {
      cwd: cliRoot,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` },
    });
    assert.equal(ran.status, 0, ran.stderr);
    const result = JSON.parse(ran.stdout) as { ok: boolean; added: { id: string }[] };
    assert.equal(result.ok, true);
    assert.ok(result.added.some((a) => a.id === "core"), "the install ran");
    // What the package manager said still reaches the person, on stderr.
    assert.match(ran.stderr, /Packages: \+1/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(bin, { recursive: true, force: true });
  }
});

test("--json never reports ok on an exit code that says otherwise", async () => {
  // No command at all: the usage text is not a result, it's the refusal.
  const usage = await capture(["--json"]);
  assert.equal(usage.code, 2);
  assert.equal(usage.out.trim(), "", "stdout carries results only");
  assert.equal(JSON.parse(usage.err.trim()).ok, false);

  const unknown = await capture(["frobnicate", "--json"]);
  assert.equal(unknown.code, 2);
  assert.equal(unknown.out.trim(), "");
  assert.equal(JSON.parse(unknown.err.trim()).ok, false);

  // Help that was asked for is a result, and exits 0.
  const help = await capture(["--help", "--json"]);
  assert.equal(help.code, 0);
  assert.equal(JSON.parse(help.out.trim()).ok, true);
});

/* ------------------------------------------------ what init puts in a project */

/** Every file under `root`, with its contents, dependencies left out. */
async function snapshot(root: string, dir = ""): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") for (const [k, v] of await snapshot(root, rel)) files.set(k, v);
    } else {
      files.set(rel, await readFile(join(root, rel), "utf8"));
    }
  }
  return files;
}

/**
 * `init` says what it added in one line, from the same list the docs page
 * and the remove command read. A file it writes that the list doesn't name is
 * a file nobody was told about.
 */
/**
 * `init` told people to paste `import "./echo-theme.css"`, a path
 * that resolves only from inside the Echo folder: pasted into the root
 * layout, where the line said to put it, it's "Module not found".
 */
test("init prints the theme import that resolves from the file it goes in", { skip: !built }, async () => {
  const printed = async (setup: (root: string) => Promise<unknown>) => {
    const root = await fixtureApp();
    const lines: string[] = [];
    const log = console.log;
    try {
      await setup(root);
      console.log = (...parts: unknown[]) => void lines.push(parts.join(" "));
      assert.equal(await cli(root, ["init", "--yes"]), 0);
    } finally {
      console.log = log;
      await rm(root, { recursive: true, force: true });
    }
    return lines.join("\n");
  };
  const relative = await printed((root) => mkdir(join(root, "src", "app"), { recursive: true }));
  assert.match(relative, /src\/app\/layout\.tsx/);
  assert.match(relative, /import "\.\.\/components\/echo\/echo-theme\.css";/);
  assert.doesNotMatch(relative, /import "\.\/echo-theme\.css"/);

  const aliased = await printed((root) => writeFile(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } })));
  assert.match(aliased, /import "@\/components\/echo\/echo-theme\.css";/);

  const vite = await printed((root) => writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { react: "19.0.0" }, devDependencies: { vite: "6.0.0" } })));
  assert.match(vite, /src\/main\.tsx/);
  assert.match(vite, /import "\.\/components\/echo\/echo-theme\.css";/);
});

/**
 * The ground `init` printed, the agent's setup line and the page
 * check's advice gave the page a background and a text colour but no
 * typeface, where the installation guide gives all three. Pasted as printed,
 * the page's own words fell back to the browser's serif, and a style's type
 * never reached them.
 */
test("every place that gives the page its ground gives it Echo's type too", async () => {
  const ground = ["background: var(--echo-well)", "color: var(--echo-text)", "font-family: var(--echo-font-sans)"];
  const check = await readFile(resolve(repoRoot, "packages/core/src/check/run.ts"), "utf8");
  const surfaces: Record<string, string> = {
    "init's step": themeStep({ file: "app/layout.tsx", line: "" }).lines.join("\n"),
    "the agent's setup": THEME_SETUP,
    "the Echo block": projectBlock("components/echo"),
    "the page check": check.slice(check.indexOf("the page has no ground")).split("\n")[0]!,
    "the installation guide": await readFile(resolve(repoRoot, "apps/www/app/docs/(guides)/installation/content.mdx"), "utf8"),
  };
  for (const [where, text] of Object.entries(surfaces)) {
    for (const declaration of ground) assert.ok(text.includes(declaration), `${where} gives no ${declaration}`);
  }
});

test("init writes only what the footprint list names, and says so from that list", { skip: !built }, async () => {
  const root = await fixtureApp();
  const lines: string[] = [];
  const log = console.log;
  try {
    const before = await snapshot(root);
    console.log = (...parts: unknown[]) => void lines.push(parts.join(" "));
    assert.equal(await cli(root, ["init", "--yes"]), 0);
    console.log = log;
    const after = await snapshot(root);

    const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
    const named = footprintPaths({ dir: config.dir });
    const written = [...after].filter(([path, text]) => before.get(path) !== text).map(([path]) => path);
    assert.ok(written.length > 0);
    assert.deepEqual(written.filter((path) => !named.has(path)), [], "written, but not in the footprint list");

    // --skip-install: the package manager never ran, so the summary doesn't claim it did.
    assert.ok(
      lines.some((l) => l.includes(addedLine(["config", "lock", "theme", "catalog", "agents-block", "design-md", "hook", "skill", "design-eye", "style-fit"], { dir: config.dir }))),
      lines.join("\n"),
    );
  } finally {
    console.log = log;
    await rm(root, { recursive: true, force: true });
  }
});

test("every footprint entry says what it is and how it comes out", () => {
  const ids = FOOTPRINT.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const f of FOOTPRINT) {
    assert.ok(f.what.length > 20, `${f.id}: what`);
    assert.ok(f.removal.length > 10, `${f.id}: removal`);
    if (f.kind !== "dependency") assert.ok(f.paths({ dir: "components/echo" }).length > 0, `${f.id}: paths`);
  }
});
