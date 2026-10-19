/**
 * `echo-ui init`: make the project ready, and say what is left
 * for the person to do.
 *
 * It detects, installs `echo-ui-core` and itself, writes `echo.json`, an
 * `echo-lock.json` (an empty one, or the one already there) and a static
 * `echo-theme.css`, keeps the catalog, writes what agents read (the marked
 * Echo block, the check hook and the skill), and prints the three setup
 * steps and one line naming everything it added. It never edits the user's source code:
 * the only files of theirs it writes into are CLAUDE.md or AGENTS.md and
 * .claude/settings.json, and only inside what is marked as Echo's.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import type { EchoSeedInput } from "echo-ui-core/theme";

import {
  CONFIG_FILE,
  DEFAULT_REGISTRY,
  LOCK_FILE,
  checkBaseline,
  defaultDir,
  detectFramework,
  detectPackageManager,
  readConfig,
  readLock,
  writeJson,
  type EchoConfig,
} from "../project";
import { installArgs, installDependencies } from "../packages";
import { refreshCatalog } from "../catalog";
import { blockTargets, writeAgentFiles } from "../agent-files";
import { CI_WORKFLOW, ciWorkflow, pnpmVersionFor } from "../ci";
import { VERSION } from "../version";
import { setupFor, themeStep } from "../setup";
import { themeImport } from "../import-path";
import { accentMoved, writeTheme } from "../theme-file";
import { style as styleCommand } from "./style";
import type { Reporter } from "../output";
import { bold, dim } from "../output";
import { runCommand } from "@registry/agent/guidance";
import { CONFIG_SCHEMA_PATH } from "@registry/agent/config-schema";
import { addedLine, footprintItem, type FootprintContext } from "@registry/agent/footprint";
import { withoutTrailingSlashes } from "@echo-ui/client";

/** This CLI's own version, as a range: the copy a project keeps matches the one that set it up. */
const CLI_SPEC = `echo-ui-cli@^${VERSION}`;

/** What `init` prints for you to paste after the theme, by setup step. The docs are held to it. */
export const INIT_SETUP: readonly string[] = ["client-boundary", "page-check"];

const installArgsText = (manager: string, packages: string[], dev = false) =>
  [manager, ...installArgs(manager as Parameters<typeof installArgs>[0], packages, dev)].join(" ");

/** What `--json` reports as added: each thing's id and where it landed. */
function footprintResult(ids: readonly string[], ctx: FootprintContext) {
  return ids.map((id) => ({ id, paths: footprintItem(id).paths(ctx) }));
}

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * `--seed`: the accent alone (`#8B6FE8`), or the whole seed as the generator
 * shows it, `accent,chassis,paper`. Undefined when it's neither.
 */
export function parseSeed(value: string): { accent: string; chassis?: string; paper?: string } | undefined {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length > 3 || !parts.every((part) => HEX.test(part))) return undefined;
  const [accent, chassis, paper] = parts.map((part) => (part.startsWith("#") ? part : `#${part}`));
  return { accent: accent!, ...(chassis ? { chassis } : {}), ...(paper ? { paper } : {}) };
}

/** The pnpm the CI job installs, when package.json doesn't name one. */
async function projectPnpm(root: string): Promise<string | undefined> {
  const read = (file: string) => readFile(join(root, file), "utf8").catch(() => undefined);
  const pkg = await read("package.json").then((text) => (text ? (JSON.parse(text) as unknown) : {})).catch(() => ({}));
  // Asked only when it matters. Windows can't run `pnpm.cmd` without a shell, so there the lockfile answers.
  const running = pnpmVersionFor(pkg, "0.0.0", undefined) === undefined
    ? undefined
    : await promisify(execFile)("pnpm", ["--version"], { cwd: root, timeout: 10_000 }).then((r) => r.stdout, () => undefined);
  return pnpmVersionFor(pkg, running, await read("pnpm-lock.yaml"));
}

export interface InitOptions {
  root: string;
  dir?: string;
  seed?: string;
  registry?: string;
  yes: boolean;
  dryRun: boolean;
  /** Write the files but don't call the package manager (CI, agents, offline). */
  skipInstall?: boolean;
  /** Leave out the block, the hook and the skill. */
  skipAgent?: boolean;
  /** A style to wear from the start: yours, or Echo's. */
  style?: string;
  /** Also write the GitHub Actions job that runs Echo's tests on pull requests. */
  ci?: boolean;
}

export async function init(options: InitOptions, out: Reporter): Promise<number> {
  const { root } = options;
  const framework = await detectFramework(root);
  const problems = await checkBaseline(root, framework);
  if (problems.length) {
    out.error("This project is outside what Echo supports:");
    for (const problem of problems) {
      out.line(`  ${bold(problem.what)}`);
      out.line(`  ${dim(problem.fix)}`);
    }
    return 1;
  }

  if (options.seed !== undefined && options.style !== undefined) {
    out.error("Give `--seed` or `--style`, not both: a style carries its own seed.");
    return 2;
  }
  const given = options.seed === undefined ? undefined : parseSeed(options.seed);
  if (options.seed !== undefined && !given) {
    out.error(`\`--seed ${options.seed}\` isn't a seed. Give the accent as a hex (\`#8B6FE8\`), or the whole seed as \`accent,chassis,paper\` (\`#8B6FE8,#232130,#EFEBFA\`).`);
    return 1;
  }

  const existing = await readConfig(root);
  // Read before anything is written: one that can't be read stops init here, not halfway.
  const lock = (await readLock(root)) ?? { lockVersion: 1 as const, core: "", items: {} };
  if (existing && !options.yes) {
    out.error(`${CONFIG_FILE} is already here (components in ${existing.dir}). Pass --yes to write it again.`);
    return 1;
  }

  const config: EchoConfig = {
    $schema: `${withoutTrailingSlashes(options.registry ?? DEFAULT_REGISTRY)}/${CONFIG_SCHEMA_PATH}`,
    dir: options.dir ?? existing?.dir ?? (await defaultDir(root)),
    framework,
    packageManager: await detectPackageManager(root),
    registry: options.registry ?? existing?.registry ?? DEFAULT_REGISTRY,
  };
  // Recorded, so the theme and DESIGN.md can be written again from it: a new
  // --seed replaces it, and running init again without one keeps it.
  const seed = given ?? existing?.seed;
  if (seed) config.seed = seed;
  // A style the project wears stays with its seed; a new --seed is a new look, and the style goes.
  if (existing?.style && !given) config.style = existing.style;
  if (existing?.check !== undefined) config.check = existing.check;
  if (existing?.test !== undefined) config.test = existing.test;


  const ctx = { dir: config.dir };
  const writes = ["config", "lock", "theme"];
  const adds = [...writes, "catalog", ...(options.skipInstall ? [] : ["core", "cli"])];
  if (!options.skipAgent) {
    const read = (file: string) => readFile(join(root, file), "utf8").catch(() => undefined);
    for (const file of blockTargets(await read("CLAUDE.md"), await read("AGENTS.md"))) adds.push(file === "CLAUDE.md" ? "claude-block" : "agents-block");
    adds.push("design-md");
    adds.push("hook", "skill", "design-eye", "style-fit");
  }
  if (options.ci) adds.push("ci");

  if (options.dryRun) {
    out.step(`Would add ${adds.map((id) => footprintItem(id).label(ctx)).join(", ")}.`);
    out.result({ command: "init", dryRun: true, config, added: footprintResult(adds, ctx) });
    return 0;
  }

  await writeJson(join(root, CONFIG_FILE), config);
  // A second init — a new seed, a new folder — must not forget what is already
  // installed. The lock is the only record of which files are Echo's, so an
  // empty one turns every installed file into "yours, edited" and `add`
  // refuses to touch any of them.
  await writeJson(join(root, LOCK_FILE), lock);
  // A style the project still wears names itself in the file's header.
  const themeReport = await writeTheme(root, config.dir, seed as EchoSeedInput | undefined, config.style?.name);
  if (themeReport.corrected.length) out.step(`The theme corrected for AA contrast: ${themeReport.corrected.join(", ")}.`);
  const moved = accentMoved(themeReport);
  if (moved) out.step(moved);
  if (themeReport.unsatisfiable.length) out.warn(`No colour could make these readable everywhere they sit: ${themeReport.unsatisfiable.join("; ")}.`);

  out.step(`${config.framework} app, ${config.packageManager}, components in ${bold(config.dir)}`);
  const added = [...writes];
  // The catalog `which`, `docs` and `check` answer from, kept so they answer
  // offline. Not having it yet is no reason to fail a setup: the first of
  // them to run fetches it.
  try {
    await refreshCatalog(root, config.registry);
    added.push("catalog");
  } catch (error) {
    out.warn(`Couldn't fetch the catalog yet (${(error as Error).message}); \`${runCommand("which")}\` fetches it when it first runs.`);
  }
  if (options.skipInstall) {
    out.step(`Skipped installing echo-ui-core and echo-ui-cli — run \`${installArgsText(config.packageManager, ["echo-ui-core"])}\` and \`${installArgsText(config.packageManager, [CLI_SPEC], true)}\` yourself.`);
  } else {
    const core = await installDependencies(config.packageManager, ["echo-ui-core"], root);
    if (!core.ok) out.warn(`Could not install echo-ui-core (${core.error}). Install it yourself: ${core.command}`);
    else added.push("core");
    // The CLI itself, as a dev dependency: \`npx echo-ui-cli\` then runs this
    // copy without downloading anything, and a hook can call it by path.
    const cli = await installDependencies(config.packageManager, [CLI_SPEC], root, undefined, { dev: true });
    if (!cli.ok) out.warn(`Could not install echo-ui-cli (${cli.error}). Install it yourself: ${cli.command}`);
    else added.push("cli");
  }
  // What agents read, so an agent in this project knows it's an Echo one.
  if (!options.skipAgent) {
    const agentFiles = await writeAgentFiles(root, { dir: config.dir, seed: config.seed, style: config.style, installed: Object.keys(lock.items) });
    for (const warning of agentFiles.warnings) out.warn(warning);
    added.push(...agentFiles.added);
  }
  // Echo's tests in CI, only when asked for, and never over a job already there.
  if (options.ci) {
    const path = join(root, CI_WORKFLOW);
    if (await readFile(path, "utf8").then(() => true, () => false)) out.step(`${CI_WORKFLOW} is already there, so it's left as it is.`);
    else {
      await mkdir(dirname(path), { recursive: true });
      const pnpmVersion = config.packageManager === "pnpm" ? await projectPnpm(root) : undefined;
      await writeFile(path, ciWorkflow(config.framework, config.packageManager, { pnpmVersion }));
      added.push("ci");
    }
  }
  out.step(addedLine(added, ctx));

  // A look from the start: the same as `style use` right after, so it says the same things.
  if (options.style) {
    const worn = await styleCommand({ root, action: "use", args: [options.style], registry: config.registry }, out);
    if (worn !== 0) return worn;
  }

  out.line();
  out.line(bold("Three things left, and they're yours to paste:"));
  for (const step of [themeStep(await themeImport(root, config.dir, framework)), ...setupFor(INIT_SETUP)]) {
    out.line();
    out.line(bold(step.title));
    for (const line of step.lines) out.line(`  ${line}`);
  }
  out.line();
  out.line(`Then: ${bold(runCommand("add hardware-button"))}`);
  if (!options.style) out.line(dim(`A look of its own: ${runCommand("style list")}, or give your agent a moodboard.`));
  out.result({ command: "init", config, theme: join(config.dir, "echo-theme.css"), added: footprintResult(added, ctx) });
  return 0;
}
