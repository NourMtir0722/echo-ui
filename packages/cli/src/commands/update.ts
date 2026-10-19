/**
 * `echo-ui update [name…]`: bring Echo's newer code into your project
 * without losing what you changed.
 *
 * The rule, and it is the whole command: **never silently replace someone's
 * work.** A file nobody edited is Echo's to move forward. A file you edited
 * and Echo changed too is merged: your edits and Echo's change together,
 * against the file as it was installed. Where the two meet in the same lines
 * nothing is guessed: the item is left as it is and the lines are shown, for
 * you (or your agent) to bring together. `--overwrite` is the way to say
 * "take Echo's anyway", and it is spelled out rather than implied.
 *
 * An item is updated whole or not at all. Half an item on disk would make the
 * lock file a lie, and the lock file is the only reason any of this works.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { hashContent, RegistryClient, RegistryError } from "@echo-ui/client";

import {
  DEFAULT_REGISTRY,
  installedCore,
  LOCK_FILE,
  readConfig,
  readLock,
  resolveInside,
  writeJson,
  type LockFile,
} from "../project";
import { installDependencies } from "../packages";
import { refreshCatalog } from "../catalog";
import { refreshAgentFiles } from "../agent-files";
import { setupFor } from "../setup";
import { describe, survey, type ItemReport } from "../status";
import { conflictText, planForward, type ForwardPlan } from "../forward";
import { bold, dim, type Reporter } from "../output";
import { runCommand } from "@registry/agent/guidance";
import { footprintItem } from "@registry/agent/footprint";

export interface UpdateOptions {
  root: string;
  names: string[];
  registry?: string;
  overwrite: boolean;
  dryRun: boolean;
  yes: boolean;
  skipInstall?: boolean;
}

export async function update(options: UpdateOptions, out: Reporter): Promise<number> {
  const { root } = options;
  const config = await readConfig(root);
  if (!config) {
    out.error(`No ${bold("echo.json")} here. Run \`${runCommand("init")}\` first.`);
    return 1;
  }
  const lock = await readLock(root);
  if (!lock || Object.keys(lock.items).length === 0) {
    out.line("Nothing installed yet — nothing to update.");
    out.result({ command: "update", updated: [], skipped: [] });
    return 0;
  }

  const client = new RegistryClient(options.registry ?? config.registry ?? DEFAULT_REGISTRY);
  const core = await installedCore(root);
  let result;
  try {
    result = await survey(root, config, lock, client, options.names, core);
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }
  const { reports } = result;

  // The same gate `add` applies, for the same reason: code built against a
  // newer core, dropped into a project with an older one, compiles into an
  // error the user did not cause and cannot read.
  const tooOld = reports.filter((r) => r.coreTooOld);
  if (tooOld.length) {
    out.error(
      `echo-ui-core ${core} is outside what ${tooOld.map((r) => r.name).join(", ")} now needs ` +
        `(${tooOld[0]!.coreTooOld!.needs}).`,
    );
    out.line(dim("  Update it first: your package manager's update for echo-ui-core. Nothing was written."));
    return 1;
  }

  /*
   * What each item would become: every file kept, written or merged, or the
   * item stops at a conflict, or at a merge with nothing to merge against.
   */
  const moves: { report: ItemReport; plan: ForwardPlan }[] = [];
  const conflicted: { report: ItemReport; plan: ForwardPlan }[] = [];
  const held: { report: ItemReport; plan: ForwardPlan }[] = [];
  for (const report of reports) {
    if (report.state === "gone" || report.state === "current") continue;
    // Edited, and nothing new from Echo: there's nothing to take, and naming it would invent a decision.
    if (report.state === "edited" && !options.overwrite) continue;
    const merging = !options.overwrite && report.files.some((f) => f.state === "edited-behind");
    // The version as installed, to merge against. The registry keeps every version it served.
    const base = merging ? await client.item(report.name, report.installed).catch(() => undefined) : undefined;
    const plan = planForward(report, lock.items[report.name]!, base, options.overwrite);
    if (plan.conflicts.length) conflicted.push({ report, plan });
    else if (plan.blocked.length) held.push({ report, plan });
    else moves.push({ report, plan });
  }
  const gone = reports.filter((r) => r.state === "gone");

  if (moves.length === 0 && held.length === 0 && conflicted.length === 0 && gone.length === 0) {
    out.line(dim(`Everything is at ${result.registry}. Nothing to do.`));
    out.result({ command: "update", registry: client.registry, updated: [], skipped: [] });
    return 0;
  }

  const at = (path: string) => `${config.dir}/${path}`;
  for (const { report, plan } of moves) {
    const moved = report.latest === report.installed ? "restored" : `${report.installed} → ${report.latest}`;
    const merged = plan.steps.some((step) => step.do === "merge");
    out.step(`${bold(report.name)} ${moved}${merged ? ", with your edits" : ""}`);
    for (const step of plan.steps) {
      if (step.do === "merge") out.line(`    ${dim(`${"merged".padEnd(13)} ${at(step.path)} (your edits and Echo's change)`)}`);
      else if (step.do === "write") {
        const note = step.state === "edited" || step.state === "edited-behind" ? " (yours, overwritten)" : "";
        out.line(`    ${dim(`${step.state.padEnd(13)} ${at(step.path)}${note}`)}`);
      } else if (step.state === "edited") out.line(`    ${dim(`${"kept".padEnd(13)} ${at(step.path)} (yours; Echo didn't change it)`)}`);
    }
    for (const orphan of report.orphans) {
      out.line(`    ${dim(`dropped       ${at(orphan)} — left on disk, yours now`)}`);
    }
  }

  const summary = {
    command: "update",
    registry: client.registry,
    updated: moves.map(({ report, plan }) => ({
      name: report.name,
      from: report.installed,
      to: report.latest,
      ...(plan.steps.some((s) => s.do === "merge") ? { merged: plan.steps.filter((s) => s.do === "merge").map((s) => s.path) } : {}),
    })),
    skipped: held.map(({ report, plan }) => ({ name: report.name, state: report.state, reason: "nothing to merge against", files: plan.blocked })),
    ...(conflicted.length
      ? {
          conflicts: conflicted.map(({ report, plan }) => ({ name: report.name, from: report.installed, to: report.latest, files: plan.conflicts })),
        }
      : {}),
  };

  const written: string[] = [];
  const dependencies = new Map<string, string>();
  const setup: string[] = [];
  if (!options.dryRun) {
    const nextLock: LockFile = { lockVersion: 1, core: core ?? lock.core, items: { ...lock.items } };
    const dir = join(root, config.dir);
    for (const { report, plan } of moves) {
      for (const step of plan.steps) {
        if (step.do === "keep") continue;
        const target = resolveInside(dir, step.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, step.content);
        written.push(step.path);
      }
      // The whole item moved, so the whole item's entry is rewritten, with Echo's hashes: a
      // merged file reads as yours from here on, edited on top of this version. Paths this
      // version no longer ships leave the lock with it: the file stays on disk and stops being
      // Echo's, which is what `status` then reports it as.
      nextLock.items[report.name] = {
        version: report.latest!,
        files: Object.fromEntries(
          report.files.filter((f) => f.latest !== undefined).map((f) => [f.path, hashContent(f.latest!)]),
        ),
      };
    }

    // Newer code can need newer packages. Re-read them from the registry rather
    // than trusting the lock, which records files and versions but not deps.
    for (const { report } of moves) {
      try {
        const item = await client.item(report.name);
        for (const [name, range] of Object.entries(item.dependencies)) {
          if (name !== "echo-ui-core") dependencies.set(name, range);
        }
        for (const id of item.setup) if (!setup.includes(id)) setup.push(id);
      } catch {
        /* already surveyed; a failure here is not worth losing the write over */
      }
    }

    nextLock.items = Object.fromEntries(Object.entries(nextLock.items).sort(([a], [b]) => a.localeCompare(b)));
    await writeJson(join(root, LOCK_FILE), nextLock);
    // The project's Echo just changed; so do the answers about it. Not worth
    // failing the install over: the next `which` or `docs` fetches it.
    await refreshCatalog(root, options.registry ?? config.registry).catch(() => undefined);
    // What agents read lists what's installed: the files already marked as Echo's follow.
    const refreshed = await refreshAgentFiles(root, { dir: config.dir, seed: config.seed, style: config.style, installed: Object.keys((await readLock(root))?.items ?? {}) }).catch(() => []);
    if (refreshed.length) out.step(`Brought ${refreshed.map((id) => footprintItem(id).label({ dir: config.dir })).join(", ")} up to date.`);
  }

  const deps = [...dependencies].map(([name, range]) => `${name}@${range}`);
  if (deps.length && options.skipInstall) {
    out.step(`Skipped installing: ${deps.join(" ")}`);
  } else if (deps.length) {
    const installed = await installDependencies(config.packageManager, deps, root);
    if (!installed.ok) out.warn(`Install the dependencies yourself: ${installed.command}`);
  }

  if (gone.length) {
    out.line();
    out.line(dim(`No longer in the registry, so left exactly as they are: ${gone.map((r) => r.name).join(", ")}.`));
  }

  if (conflicted.length) {
    out.line();
    out.line(bold("Not merged: your edits and Echo's change meet in the same lines, so these are left as they are:"));
    for (const { report, plan } of conflicted) {
      for (const { path, hunks } of plan.conflicts) {
        out.line();
        out.line(`  ${report.name} ${dim(`— ${at(path)}`)}`);
        for (const hunk of hunks) {
          out.line();
          for (const line of conflictText(hunk, report.installed, report.latest!).split("\n")) out.line(`    ${line}`);
        }
      }
    }
    const name = conflicted[0]!.report.name;
    out.line();
    out.line(
      dim(
        `  Bring Echo's change into those lines of yours, or keep yours where it already does the same, then run \`${runCommand(`update ${name}`)}\` again: ` +
          `what no longer meets merges. \`${runCommand(`update ${name} --overwrite`)}\` takes Echo's whole and drops your edits.`,
      ),
    );
  }

  if (held.length) {
    out.line();
    out.line(bold("Left alone: you and Echo both changed these, and there's no copy of the version you installed to merge against:"));
    for (const { report, plan } of held) {
      out.line(`  ${report.name} ${dim(`— ${describe(report.state)}; ${plan.blocked.map(at).join(", ")}`)}`);
    }
    out.line();
    const read = runCommand(`diff ${held[0]!.report.name}`);
    const take = runCommand(`update ${held[0]!.report.name} --overwrite`);
    const width = Math.max(read.length, take.length) + 3;
    out.line(dim(`  ${read.padEnd(width)}read what Echo changed`));
    out.line(dim(`  ${take.padEnd(width)}take it and lose your edits`));
  }

  const steps = setupFor(setup).filter((step) => step.id !== "theme-css");
  if (steps.length && written.length) {
    out.line();
    out.line(bold("What these need from you:"));
    for (const step of steps) {
      out.line();
      out.line(bold(step.title));
      for (const line of step.lines) out.line(`  ${line}`);
    }
  }

  if (options.dryRun) {
    out.line();
    out.step("Nothing written — this was a dry run.");
    out.result({ ...summary, dryRun: true });
    return 0;
  }
  out.result({ ...summary, files: written, dependencies: deps, lock: LOCK_FILE });
  return 0;
}
