/**
 * `echo-ui diff [name…]`: your copy against the
 * latest the registry serves.
 *
 * Echo is copy-paste. The moment you install `field`, your copy and Echo's
 * diverge, and every fix after that is
 * unreachable unless something tells you it exists. This is that something.
 *
 * With no names it is a roll call: one line per installed item, what state it
 * is in, and where a version moved. With names it prints the actual diff, so
 * you can read what Echo changed before deciding to take it.
 */
import { RegistryClient, RegistryError } from "@echo-ui/client";

import { DEFAULT_REGISTRY, installedCore, readConfig, readLock } from "../project";
import { diffStat, unifiedDiff } from "../diff";
import { describe, survey, type ItemReport } from "../status";
import { bold, dim, green, red, type Reporter } from "../output";
import { runCommand } from "@registry/agent/guidance";

export interface DiffOptions {
  root: string;
  names: string[];
  registry?: string;
}

/** Red for what leaves, green for what arrives — the colours every diff uses. */
const paint = (line: string): string =>
  line.startsWith("+") ? green(line) : line.startsWith("-") ? red(line) : line;

export async function diff(options: DiffOptions, out: Reporter): Promise<number> {
  const { root } = options;
  const config = await readConfig(root);
  if (!config) {
    out.error(`No ${bold("echo.json")} here. Run \`${runCommand("init")}\` first.`);
    return 1;
  }
  const lock = await readLock(root);
  if (!lock || Object.keys(lock.items).length === 0) {
    out.line(`Nothing installed yet. \`${runCommand("add <name>")}\` puts something here.`);
    out.result({ command: "diff", items: [] });
    return 0;
  }

  const client = new RegistryClient(options.registry ?? config.registry ?? DEFAULT_REGISTRY);
  let result;
  try {
    result = await survey(root, config, lock, client, options.names, await installedCore(root));
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }

  const { reports } = result;
  const detailed = options.names.length > 0;

  if (!detailed) {
    const width = Math.max(...reports.map((r) => r.name.length), 4);
    out.line(dim(`${reports.length} installed · registry ${result.registry} · core ${result.core}`));
    out.line();
    for (const report of reports) out.line(`  ${summaryLine(report, width)}`);
    out.line();
    const stale = reports.filter((r) => r.state === "behind" || r.state === "edited-behind");
    if (stale.length === 0) {
      out.line(dim("Everything is at the version the registry serves."));
    } else {
      const safe = stale.filter((r) => r.state === "behind");
      const edited = stale.length - safe.length;
      out.line(
        `${stale.length} behind${edited ? `, ${edited} of them edited` : ""}. ` +
          `${bold(runCommand("update"))} takes the ${safe.length} Echo can replace on its own.`,
      );
      out.line(dim(`  ${runCommand(`diff ${stale[0]!.name}`)}  shows what changed.`));
    }
  } else {
    for (const report of reports) printDetail(report, out);
  }

  out.result({
    command: "diff",
    registry: client.registry,
    core: result.core,
    items: reports.map(asJson),
  });
  return 0;
}

function summaryLine(report: ItemReport, width: number): string {
  const name = report.name.padEnd(width);
  const moved =
    report.latest && report.latest !== report.installed ? `${report.installed} → ${report.latest}` : report.installed;
  const state =
    report.state === "current" || report.state === "gone" ? dim(describe(report.state)) : bold(describe(report.state));
  const core = report.coreTooOld ? ` ${bold("!")} needs echo-ui-core ${report.coreTooOld.needs}` : "";
  return `${name}  ${dim(moved.padEnd(16))}  ${state}${core}`;
}

function printDetail(report: ItemReport, out: Reporter): void {
  const moved = report.latest && report.latest !== report.installed ? ` (${report.installed} → ${report.latest})` : "";
  out.step(`${bold(report.name)} — ${describe(report.state)}${dim(moved)}`);

  if (report.coreTooOld) {
    out.warn(
      `${report.name} needs echo-ui-core ${report.coreTooOld.needs}; this project has ` +
        `${report.coreTooOld.installed}. Update core before taking these changes.`,
    );
  }

  for (const file of report.files) {
    if (file.state === "current") continue;
    if (file.state === "missing") {
      out.line(`  ${bold(file.path)} ${dim("— Echo wrote this and it is gone. `update` puts it back.")}`);
      continue;
    }
    if (file.state === "added") {
      out.line(`  ${bold(file.path)} ${dim("— new in this version, not installed yet.")}`);
      continue;
    }
    const text = unifiedDiff(file.current ?? "", file.latest ?? "", {
      fromLabel: `${file.path} (yours)`,
      toLabel: `${file.path} (${report.latest})`,
    });
    if (!text) continue;
    const stat = diffStat(file.current ?? "", file.latest ?? "");
    out.line();
    out.line(`  ${bold(file.path)} ${dim(`+${stat.added} -${stat.removed}`)}`);
    for (const line of text.split("\n")) out.line(`  ${paint(line)}`);
  }

  for (const orphan of report.orphans) {
    out.line(`  ${dim(`${orphan} — this version no longer ships it. Yours to keep or delete.`)}`);
  }
  out.line();
}

function asJson(report: ItemReport) {
  return {
    name: report.name,
    installed: report.installed,
    ...(report.latest ? { latest: report.latest } : {}),
    state: report.state,
    ...(report.coreTooOld ? { coreTooOld: report.coreTooOld } : {}),
    files: report.files
      .filter((f) => f.state !== "current")
      .map((f) => ({
        path: f.path,
        state: f.state,
        ...(f.current !== undefined && f.latest !== undefined ? diffStat(f.current, f.latest) : {}),
      })),
    ...(report.orphans.length ? { orphans: report.orphans } : {}),
  };
}
