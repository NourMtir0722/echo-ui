/**
 * One run of the release matrix: build a real app, install Echo
 * into it the way a user would, and prove it compiles and builds.
 *
 *   node scripts/matrix/install-app.mjs --framework next --pm pnpm [--react 18]
 *
 * The app is written here rather than scaffolded by `create-next-app`, so a
 * job doesn't depend on a generator's network, prompts or template of the day.
 * Echo arrives as packed tarballs — the actual published artefacts — installed
 * with the package manager under test, so what the matrix proves is what a
 * stranger gets.
 *
 * Every item in the registry is added in one call, which is the case that
 * finds cross-item problems: a missing dependency, a name collision, a file
 * written twice.
 */
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { install as installWith, installBase, packEcho, repoRoot, run, writeApp, writeHookProbe } from "./fresh-app.mjs";

const { values } = parseArgs({
  options: {
    framework: { type: "string", default: "next" },
    pm: { type: "string", default: "npm" },
    react: { type: "string", default: "19" },
    tailwind: { type: "boolean", default: false },
    keep: { type: "boolean", default: false },
    // Build the app, serve it, and look at it. Everything else here stops
    // at `tsc` and a production build, which cannot see a theme that did not
    // load — and a theme that did not load is a page of colourless controls
    // that every test in this repository still calls green.
    serve: { type: "boolean", default: false },
    // What a button, a form, a template and the whole library cost,
    // measured in a real app rather than estimated from a bundler report.
    sizes: { type: "boolean", default: false },
  },
});

const FRAMEWORK = values.framework;
const PM = values.pm;
const REACT = values.react;

const install = (cwd, packages, dev = false) => installWith(PM, cwd, packages, { dev });

/* -------------------------------------------------------------- scaffolding */

/**
 * The app, before any Echo item is added: package.json, tsconfig, the
 * framework, React, and Echo installed from the packed tarballs.
 *
 * Split out of `main` so that `--sizes` can install once and then add
 * different subsets to the same app. Installing a framework from scratch five
 * times to answer one question is how a measurement stops being taken.
 */
async function scaffold(root, packDir) {
  const tarballs = await packEcho(packDir);

  await writeApp(root, { framework: FRAMEWORK });
  await installBase(root, { pm: PM, framework: FRAMEWORK, react: REACT, tailwind: values.tailwind });

  // `src/` before `init`, not after. `init` picks `src/components/echo` where
  // there is a src/ and `components/echo` where there is not, so creating it
  // afterwards meant a second `init` in the same app chose a different folder
  // from the first — and every import written against the first one broke.
  // A real Vite app has a src/; this now looks like one before Echo arrives.
  await mkdir(join(root, "src"), { recursive: true });

  // Echo, installed the way a user installs it.
  await install(root, tarballs);
  const cli = join(root, "node_modules", "echo-ui-cli", "index.js");
  const registry = process.env.ECHO_REGISTRY ?? pathToFileURL(join(repoRoot, "apps/www/public/e")).href;

  // The project already has instructions and a hook of its own, as most do.
  await writeFile(join(root, "CLAUDE.md"), "# House rules\n\nBe kind to the build.\n");
  await mkdir(join(root, ".claude"), { recursive: true });
  await writeFile(
    join(root, ".claude", "settings.json"),
    `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo done" }] }] } }, null, 2)}\n`,
  );
  const before = await agentSide(root);

  await run("node", [cli, "init", "--yes", "--skip-install", "--registry", registry], { cwd: root });
  await agentChecks(root, before);

  const index = JSON.parse(await readFile(join(repoRoot, "apps/www/public/e/index.json"), "utf8"));
  const echoDir = JSON.parse(await readFile(join(root, "echo.json"), "utf8")).dir.split(/[\\/]/).join("/");
  return { cli, registry, echoDir, allNames: index.items.map((item) => item.name) };
}

/* ------------------------------------------------------- what agents read */

/** CLAUDE.md, AGENTS.md and everything under .claude/, as they are on disk. */
async function agentSide(root) {
  const out = {};
  for (const file of ["CLAUDE.md", "AGENTS.md", "DESIGN.md"]) {
    try {
      out[file] = await readFile(join(root, file), "utf8");
    } catch {
      /* not there */
    }
  }
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        out[`${rel}/`] = "";
        await walk(rel);
      } else {
        out[rel] = await readFile(join(root, rel), "utf8");
      }
    }
  };
  await walk(".claude");
  return out;
}

/** Runs a command with input on stdin and gives back its exit code. */
function exitCode(command, args, options) {
  return new Promise((ok) => {
    const child = spawn(command, args, { stdio: ["pipe", "inherit", "inherit"], ...options });
    child.on("error", () => ok(-1));
    child.on("close", (code) => ok(code));
    child.stdin.end(options.input ?? "");
  });
}

/**
 * What `init` writes for agents works on every row: the block, DESIGN.md,
 * the hook and the skill exist; the command agents are told to type runs; the hook command
 * `init` wrote runs as Claude Code would run it (through bash, which Claude
 * Code uses on Windows too); and `agent off` gives CLAUDE.md, AGENTS.md,
 * DESIGN.md and .claude/ back exactly as they were before `init`.
 */
async function agentChecks(root, before) {
  const problems = [];
  const after = await agentSide(root);
  if (!/<!-- echo-ui:start -->/.test(after["CLAUDE.md"] ?? "")) problems.push("no Echo block in CLAUDE.md");
  if (!after[".claude/skills/echo-ui/SKILL.md"]) problems.push("no skill at .claude/skills/echo-ui/SKILL.md");
  if (!/<!-- echo-ui:start -->/.test(after["DESIGN.md"] ?? "")) problems.push("no Echo block in DESIGN.md");
  const settings = JSON.parse(after[".claude/settings.json"] ?? "{}");
  const hook = settings.hooks?.PostToolUse?.flatMap((g) => g.hooks).find((h) => /check --hook/.test(h.command));
  if (!hook) problems.push("no check hook in .claude/settings.json");
  if (!settings.hooks?.Stop) problems.push("the project's own hook was lost");

  const which = await exitCode("npx", ["echo-ui-cli", "which", "button"], { cwd: root, shell: process.platform === "win32" });
  if (which !== 0) problems.push(`npx echo-ui-cli which button exited ${which}`);
  if (hook) {
    const probe = await writeHookProbe(root);
    const input = JSON.stringify({ tool_name: "Write", tool_input: { file_path: probe.path }, cwd: root });
    const code = await exitCode("bash", ["-c", hook.command], { cwd: root, input, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    await probe.remove();
    // 0 is a clean file and 2 is findings: either way, the check ran.
    if (code !== 0 && code !== 2) problems.push(`the hook command exited ${code}: ${hook.command}`);
  }

  await run("node", [join(root, "node_modules", "echo-ui-cli", "index.js"), "agent", "off"], { cwd: root });
  const restored = await agentSide(root);
  if (JSON.stringify(restored) !== JSON.stringify(before)) {
    problems.push(`agent off did not give the files back as they were:\n${JSON.stringify({ before, restored }, null, 2)}`);
  }
  if (problems.length) throw new Error(`What init writes for agents is wrong:\n  ${problems.join("\n  ")}`);
  console.log("\n✓ the Echo block, DESIGN.md, the hook and the skill: written, run, and taken back out cleanly.");
}

/** The npm packages a set of items declares, so a build can resolve them. */
async function itemDependencies(names) {
  const deps = new Set();
  for (const name of names) {
    const item = JSON.parse(await readFile(join(repoRoot, "apps/www/public/e", `${name}.json`), "utf8"));
    for (const [dep, range] of Object.entries(item.dependencies)) {
      if (dep !== "echo-ui-core") deps.add(`${dep}@${range}`);
    }
  }
  return [...deps];
}

/**
 * A screen that imports every named item, so the bundler has to keep all of
 * them. `import * as` plus a reference is the cheapest way to defeat
 * tree-shaking honestly: it measures the code, not a contrived usage of it.
 */
function screenSource(names, echoDir) {
  return [
    '"use client";',
    "",
    ...names.map((name, i) => `import * as item${i} from "../${echoDir}/${name}";`),
    "",
    `const items = [${names.map((_, i) => `item${i}`).join(", ")}];`,
    "",
    "export function Screen() {",
    "  return <main>{items.length} Echo items installed</main>;",
    "}",
    "",
  ].join("\n");
}

/** The wiring `init` prints and a user pastes: the theme, and a root that mounts it. */
async function writeEntry(root, echoDir, { screen = true } = {}) {
  const themeImport = `@import "../${echoDir}/echo-theme.css";`;
  if (FRAMEWORK === "next") {
    await writeFile(
      join(root, "app", "globals.css"),
      `${themeImport}\n\nbody {\n  background: var(--echo-well);\n  color: var(--echo-text);\n  font-family: var(--echo-font-sans);\n}\n`,
    );
    await writeFile(
      join(root, "app", "page.tsx"),
      screen
        ? 'import { Screen } from "../src/screen";\n\nexport default function Page() {\n  return <Screen />;\n}\n'
        : "export default function Page() {\n  return <main>nothing installed</main>;\n}\n",
    );
  } else {
    // Both halves of the `theme-css` setup step the CLI prints, not just the
    // import: a user is told to give the page the device's ground as well, and
    // an app that imports the theme without it renders on the browser's white.
    // Looking at the served app caught this harness writing only half of
    // what it tells people to.
    await writeFile(
      join(root, "src", "app.css"),
      `@import "../${echoDir}/echo-theme.css";\n\nbody {\n  background: var(--echo-well);\n  color: var(--echo-text);\n  font-family: var(--echo-font-sans);\n}\n`,
    );
    await writeFile(
      join(root, "src", "main.tsx"),
      [
        'import { createRoot } from "react-dom/client";',
        ...(screen ? ['import "./app.css";', 'import { Screen } from "./screen";'] : []),
        "",
        screen
          ? 'createRoot(document.getElementById("root")!).render(<Screen />);'
          : 'createRoot(document.getElementById("root")!).render(<main>nothing installed</main>);',
        "",
      ].join("\n"),
    );
  }
}

const buildApp = (root) =>
  run("npx", FRAMEWORK === "next" ? ["next", "build"] : ["vite", "build"], { cwd: root });

/* ---------------------------------------------------------------- --sizes */

/** Every asset the build emitted, gzipped, in bytes. Gzip because that is what is served. */
async function bundleBytes(root) {
  const dir = join(root, FRAMEWORK === "next" ? ".next/static" : "dist");
  let total = 0;
  const walk = async (path) => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(js|css|mjs)$/.test(entry.name)) {
        total += gzipSync(await readFile(full)).byteLength;
      }
    }
  };
  await walk(dir);
  return total;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

/**
 * What Echo costs, measured rather than estimated.
 *
 * The number that means something is a DELTA. "The bundle is 180 kB" says as
 * much about React and the bundler as about Echo, so each row is built in the
 * same app and reported against a baseline of that app with no Echo in it at
 * all. The theme CSS and `echo-ui-core` are inside the delta, because they are
 * what a component needs to be the thing it looks like — quoting a button
 * without them would be quoting a number nobody can reproduce.
 */
async function measureSizes(root, ctx) {
  const subsets = [
    // First, because it is the row that makes the others readable. A badge
    // pulls neither GSAP nor Base UI, so this is the theme, `echo-ui-core` and
    // one component — Echo's own floor, with nobody else's library in it.
    { label: "a badge (no GSAP, no Base UI)", names: ["badge"] },
    { label: "a button", names: ["hardware-button"] },
    { label: "a form", names: ["field", "textarea", "switch", "select", "hardware-button"] },
    { label: "a template", names: ["chat"] },
    { label: "the whole library", names: ctx.allNames },
  ];

  // Everything any row needs, installed once. An unused package is not in the
  // graph, so it does not reach a bundle it was not imported into.
  const deps = await itemDependencies(ctx.allNames);
  if (deps.length) await install(root, deps);

  await writeEntry(root, ctx.echoDir, { screen: false });
  await buildApp(root);
  const baseline = await bundleBytes(root);
  console.log(`\n  baseline (React + ${FRAMEWORK}, no Echo): ${kb(baseline)} gzipped`);

  const rows = [];
  for (const subset of subsets) {
    // The lock file has to go with the folder. `init` deliberately preserves
    // an existing lock, so wiping only the directory leaves the
    // previous subset's items still recorded as installed — and the screen is
    // generated FROM the lock, so the next build imports files that are no
    // longer there. Each row starts from nothing, which is what makes it a
    // measurement of that row.
    for (const path of [ctx.echoDir, "echo-lock.json", "echo.json"]) {
      await rm(join(root, path), { recursive: true, force: true });
    }
    await run(
      "node",
      [ctx.cli, "init", "--yes", "--skip-install", "--dir", ctx.echoDir, "--registry", ctx.registry],
      { cwd: root },
    );
    await run("node", [ctx.cli, "add", ...subset.names, "--yes", "--skip-install", "--registry", ctx.registry], {
      cwd: root,
    });
    // What `add` actually wrote, which is the subset plus everything it needed.
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    const installed = Object.keys(lock.items);
    await writeFile(join(root, "src", "screen.tsx"), screenSource(installed, ctx.echoDir));
    await writeEntry(root, ctx.echoDir, { screen: true });
    await buildApp(root);
    const total = await bundleBytes(root);
    rows.push({ ...subset, installed: installed.length, total, delta: total - baseline });
    console.log(`  ${subset.label}: ${kb(total - baseline)} over baseline (${installed.length} items)`);
  }

  console.log("\n| What | Gzipped | Items copied |");
  console.log("| --- | --- | --- |");
  for (const row of rows) console.log(`| ${row.label} | ${kb(row.delta)} | ${row.installed} |`);
  console.log(
    `\nMeasured in a Vite + React ${REACT} app: every asset the production build emits, gzipped,` +
      ` minus the same app with no Echo in it (${kb(baseline)}).`,
  );
  return rows;
}

/* ---------------------------------------------------------------- --serve */

/**
 * Open the copied install in a browser and look at it.
 *
 * Everything else in this repository proves Echo renders by rendering it from
 * the SOURCE tree: `apps/www` imports through `@registry/*`, so all 1036
 * Playwright tests exercise files the CLI never touched. The file the CLI
 * writes is byte-for-byte that source, so a component cannot render
 * differently — the risk was never there. It is in everything `init` writes
 * AROUND the components: `echo-theme.css`, the import line it tells you to
 * paste, the folder `echo.json` names. A theme that does not load is a page of
 * colourless controls, and every test here stays green through it.
 *
 * So the assertions are deliberately about the wiring, not the widget.
 */
async function serveAndCheck(root) {
  const { chromium } = await import("@playwright/test");
  const port = 4317;
  const preview = spawn(
    "npx",
    FRAMEWORK === "next" ? ["next", "start", "-p", String(port)] : ["vite", "preview", "--port", String(port)],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );

  const problems = [];
  let browser;
  try {
    const url = `http://localhost:${port}/`;
    await waitForServer(url);
    browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    await page.goto(url, { waitUntil: "networkidle" });

    // 1. The theme reached the page. This is the one that fails when the
    //    import line is wrong, and the only symptom is that everything is grey.
    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        accent: root.getPropertyValue("--echo-accent").trim(),
        well: root.getPropertyValue("--echo-well").trim(),
        text: root.getPropertyValue("--echo-text").trim(),
        body: getComputedStyle(document.body).backgroundColor,
      };
    });
    for (const [name, value] of Object.entries(tokens)) {
      if (!value) problems.push(`--echo-${name} resolves to nothing: the theme did not load`);
    }
    if (tokens.body === "rgba(0, 0, 0, 0)" || tokens.body === "transparent") {
      problems.push("the page has no ground: body background never resolved from --echo-well");
    }

    // 2. A control rendered, and rendered WITH Echo's material — a class is
    //    not enough, because an unstyled element has the class too.
    // `.echo-hw__cap` rather than the root: the root is layout, the cap is the
    // element the material is painted on, and painting is what a missing
    // stylesheet takes away.
    const cap = page.locator(".echo-hw__cap").first();
    if ((await cap.count()) === 0) {
      problems.push("no .echo-hw__cap on the page: the copied component did not render");
    } else {
      const material = await cap.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          background: `${style.backgroundImage}|${style.backgroundColor}`,
          radius: style.borderRadius,
          height: style.height,
        };
      });
      if (/^none\|rgba\(0, 0, 0, 0\)$/.test(material.background)) {
        problems.push("the control has its class but no material: hardware-button.css did not load");
      }
      if (!material.radius || material.radius === "0px") {
        problems.push("the control has no corner radius: --echo-radius-scale did not resolve");
      }
      // --hw-h is 52px times --echo-density, so a height of `auto` means the
      // component's own custom properties never applied.
      if (!/^\d/.test(material.height)) {
        problems.push(`the control has no height (${material.height}): its own custom properties did not apply`);
      }
    }

    // A named, operable control — the accessibility floor Echo claims, checked
    // on the COPY rather than on the source tree.
    if ((await page.getByRole("button", { name: "Press" }).count()) === 0) {
      problems.push("no button named Press: the copied control has no accessible name");
    }

    // 3. Nothing shouted on the way in.
    for (const error of consoleErrors) problems.push(`console error: ${error}`);
  } finally {
    await browser?.close();
    preview.kill();
  }

  if (problems.length) {
    console.error(`\n✗ the copied install renders wrong:\n  ${problems.join("\n  ")}`);
    return false;
  }
  console.log("\n✓ the copied install renders: theme tokens resolved, a control has its material, console clean.");
  return true;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`${url} did not come up within ${timeoutMs}ms`);
    await new Promise((ok) => setTimeout(ok, 500));
  }
}

/* -------------------------------------------------------------------- main */

async function main() {
  const root = await mkdtemp(join(tmpdir(), `echo-matrix-${FRAMEWORK}-${PM}-`));
  const mode = values.sizes ? " × sizes" : values.serve ? " × serve" : "";
  console.log(
    `\n=== ${FRAMEWORK} × ${PM} × React ${REACT}${values.tailwind ? " × Tailwind" : ""}${mode} in ${root}\n`,
  );
  const packDir = await mkdtemp(join(tmpdir(), "echo-packs-"));
  let ok = true;

  try {
    const ctx = await scaffold(root, packDir);

    if (values.sizes) {
      await measureSizes(root, ctx);
      return;
    }

    // Every item at once: the case that finds cross-item problems.
    await run("node", [ctx.cli, "add", ...ctx.allNames, "--yes", "--skip-install", "--registry", ctx.registry], {
      cwd: root,
    });

    const deps = await itemDependencies(ctx.allNames);
    if (deps.length) await install(root, deps);

    await writeFile(join(root, "src", "screen.tsx"), screenSource(ctx.allNames, ctx.echoDir));
    await writeEntry(root, ctx.echoDir, { screen: true });

    await run("npx", ["tsc", "--noEmit"], { cwd: root });
    await buildApp(root);

    console.log(
      `\n✓ ${FRAMEWORK} × ${PM} × React ${REACT}: ${ctx.allNames.length} items installed, type-checked and built.`,
    );

    if (values.serve) {
      // A screen that renders a control, rather than counting them — there has
      // to be something on the page to look at.
      await writeFile(join(root, "src", "screen.tsx"), RENDERED_SCREEN(ctx.echoDir));
      await buildApp(root);
      ok = await serveAndCheck(root);
    }
  } finally {
    if (!values.keep) {
      await rm(root, { recursive: true, force: true });
      await rm(packDir, { recursive: true, force: true });
    } else {
      console.log(`\nKept: ${root}`);
    }
  }
  if (!ok) process.exitCode = 1;
}

/** One of everything the checks look at, rendered for real. */
const RENDERED_SCREEN = (echoDir) =>
  [
    '"use client";',
    `import { HardwareButton } from "../${echoDir}/hardware-button";`,
    `import { Field } from "../${echoDir}/field";`,
    "",
    "export function Screen() {",
    "  return (",
    "    <main>",
    "      <HardwareButton>Press</HardwareButton>",
    '      <Field label="Email" type="email" />',
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");

await main();
