/**
 * `echo-ui add <name…>`: copy items into the project, with their
 * Echo dependencies, and record what was installed.
 *
 * The order matters. Everything is resolved, verified and planned before a
 * single file is written, so a name that doesn't exist, a file the user has
 * edited, or a core version that doesn't match stops the whole thing with
 * nothing half-done.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RegistryClient, RegistryError, resolveItems, satisfies } from "@echo-ui/client";

import { installedCore, LOCK_FILE, readConfig, readLock, resolveInside, writeJson } from "../project";
import { filesToWrite, nextLock, planInstall } from "../plan";
import { installDependencies } from "../packages";
import { refreshCatalog } from "../catalog";
import { refreshAgentFiles } from "../agent-files";
import { setupFor } from "../setup";
import { bold, dim, type Reporter } from "../output";
import { runCommand } from "@registry/agent/guidance";
import { footprintItem } from "@registry/agent/footprint";

export interface AddOptions {
  root: string;
  names: string[];
  registry?: string;
  overwrite: boolean;
  dryRun: boolean;
  yes: boolean;
  /** Write the files but don't call the package manager (CI, agents, offline). */
  skipInstall?: boolean;
}

export async function add(options: AddOptions, out: Reporter): Promise<number> {
  const { root } = options;
  const config = await readConfig(root);
  if (!config) {
    out.error(`No ${bold("echo.json")} here. Run \`${runCommand("init")}\` first.`);
    return 1;
  }
  if (options.names.length === 0) {
    out.error(`Which components? e.g. \`${runCommand("add hardware-button field")}\``);
    return 2;
  }

  const client = new RegistryClient(options.registry ?? config.registry);
  let items;
  try {
    items = await resolveItems(client, options.names);
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }

  // The core the items were built against, before anything is written.
  const core = await installedCore(root);
  const tooOld = items.filter((item) => core && !satisfies(core, item.core));
  if (tooOld.length) {
    out.error(
      `echo-ui-core ${core} is outside what ${tooOld.map((i) => i.name).join(", ")} needs (${tooOld[0]!.core}).`,
    );
    out.line(dim("  Update it first: your package manager's update for echo-ui-core."));
    return 1;
  }

  const dir = join(root, config.dir);
  const onDisk = new Map<string, string>();
  for (const item of items) {
    for (const file of item.files) {
      try {
        onDisk.set(file.path, await readFile(resolveInside(dir, file.path), "utf8"));
      } catch {
        /* not there yet */
      }
    }
  }

  const lock = await readLock(root);
  const plan = planInstall(items, lock, onDisk);

  if (plan.conflicts.length && !options.overwrite) {
    out.error("These files have been edited since Echo wrote them:");
    for (const conflict of plan.conflicts) out.line(`  ${config.dir}/${conflict.path}`);
    out.line(dim("  Nothing was written. Pass --overwrite to replace them, or move your copies aside."));
    return 1;
  }

  const asked = new Set(options.names);
  for (const item of plan.items) {
    const why = asked.has(item.name) ? "" : dim(" (needed by another item)");
    const what = item.installed
      ? item.installed === item.version
        ? dim("already at this version")
        : `${item.installed} → ${item.version}`
      : item.version;
    out.step(`${bold(item.name)} ${what}${why}`);
    for (const file of item.files) {
      const note = file.state === "modified" ? " (yours, overwritten)" : file.state === "unchanged" ? " (unchanged)" : "";
      out.line(`    ${dim(`${file.state.padEnd(9)} ${config.dir}/${file.path}${note}`)}`);
    }
  }

  if (options.dryRun) {
    out.line();
    out.step("Nothing written — this was a dry run.");
    out.result({ command: "add", dryRun: true, items: plan.items.map((i) => ({ name: i.name, version: i.version })) });
    return 0;
  }

  const written: string[] = [];
  for (const file of filesToWrite(plan)) {
    const target = resolveInside(dir, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
    written.push(file.path);
  }
  // Overwriting is explicit, so it happens after the plan was shown.
  if (options.overwrite) {
    for (const item of plan.items) {
      for (const file of item.files.filter((f) => f.state === "modified")) {
        await writeFile(resolveInside(dir, file.path), file.content);
        written.push(file.path);
      }
    }
  }

  const deps = Object.entries(plan.dependencies)
    .filter(([name]) => name !== "echo-ui-core")
    .map(([name, range]) => `${name}@${range}`);
  if (deps.length && options.skipInstall) {
    out.step(`Skipped installing: ${deps.join(" ")}`);
  } else if (deps.length) {
    const result = await installDependencies(config.packageManager, deps, root);
    if (!result.ok) out.warn(`Install the dependencies yourself: ${result.command}`);
  }

  await writeJson(join(root, LOCK_FILE), nextLock(lock, core ?? lock?.core ?? "", plan));
  // The project's Echo just changed; so do the answers about it. Not worth
  // failing the install over: the next `which` or `docs` fetches it.
  await refreshCatalog(root, options.registry ?? config.registry).catch(() => undefined);
  // What agents read lists what's installed: the files already marked as Echo's follow.
  const refreshed = await refreshAgentFiles(root, { dir: config.dir, seed: config.seed, style: config.style, installed: Object.keys((await readLock(root))?.items ?? {}) }).catch(() => []);
  if (refreshed.length) out.step(`Brought ${refreshed.map((id) => footprintItem(id).label({ dir: config.dir })).join(", ")} up to date.`);

  const steps = setupFor(plan.setup).filter((step) => step.id !== "theme-css");
  if (steps.length) {
    out.line();
    out.line(bold("What these need from you:"));
    for (const step of steps) {
      out.line();
      out.line(bold(step.title));
      for (const line of step.lines) out.line(`  ${line}`);
    }
  }

  out.result({
    command: "add",
    items: plan.items.map((i) => ({ name: i.name, version: i.version })),
    files: written,
    dependencies: deps,
    lock: LOCK_FILE,
  });
  return 0;
}
