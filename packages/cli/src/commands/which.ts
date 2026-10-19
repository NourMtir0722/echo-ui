/**
 * `echo-ui which "<need>" […]`: which Echo item does each job, with a
 * one-line reason and the install command. Several needs in one call, since
 * every call an agent makes costs it a process start.
 *
 * The answer is `answerNeed`, the same function behind the MCP server's
 * search, and "nothing fits" is one of its answers: handed the nearest word
 * match instead, an agent builds the wrong thing with confidence.
 */
import { RegistryError } from "@echo-ui/client";
import { installName, runCommand } from "@registry/agent/guidance";
import { answerNeed } from "@registry/agent/which";

import { loadCatalog } from "../catalog";
import { DEFAULT_REGISTRY, readConfig, readLock } from "../project";
import { bold, dim, type Reporter } from "../output";

export interface WhichOptions {
  root: string;
  needs: string[];
  registry?: string;
  refresh?: boolean;
}

export async function which(options: WhichOptions, out: Reporter): Promise<number> {
  if (options.needs.length === 0) {
    out.error(`Which job? e.g. \`${runCommand('which "a settings toggle" "confirm a delete"')}\``);
    return 2;
  }
  const config = await readConfig(options.root);
  let loaded;
  try {
    loaded = await loadCatalog(options.root, options.registry ?? config?.registry ?? DEFAULT_REGISTRY, { refresh: options.refresh, keep: config !== undefined });
  } catch (error) {
    out.error(error instanceof RegistryError ? error.message : String(error));
    return 1;
  }
  const lock = await readLock(options.root);

  const answers = options.needs.map((need) => answerNeed(loaded.catalog, need));
  let gaps = false;
  for (const answer of answers) {
    out.line(bold(answer.need));
    if (answer.fits.length === 0) {
      gaps = true;
      out.line(`  Nothing in Echo does this yet.${answer.gap ? ` ${answer.gap}` : ""}`);
      continue;
    }
    for (const { component, reason } of answer.fits) {
      const name = installName(component.name);
      const installed = lock?.items[name] ? dim(" (installed)") : "";
      out.line(`  ${bold(name)}${installed} — ${reason}`);
      out.line(`    ${dim(component.install)}`);
    }
  }
  const named = [...new Set(answers.flatMap((a) => a.fits.slice(0, 1).map((f) => installName(f.component.name))))];
  out.line();
  if (named.length) out.line(dim(`Before using one: ${runCommand(`docs ${named.join(" ")}`)}`));
  if (gaps) out.line(dim("For a job Echo doesn't do, build it from Echo's parts and style it only with var(--echo-*); never imitate an Echo component."));
  if (loaded.from === "stale cache") out.warn("The registry couldn't be reached, so this is the catalog kept from before.");

  out.result({
    command: "which",
    answers: answers.map((a) => ({
      need: a.need,
      fits: a.fits.map(({ component, reason }) => ({
        name: installName(component.name),
        title: component.title,
        reason,
        install: component.install,
        ...(lock?.items[installName(component.name)] ? { installed: lock.items[installName(component.name)]!.version } : {}),
      })),
      ...(a.gap ? { gap: a.gap } : {}),
    })),
  });
  return 0;
}
