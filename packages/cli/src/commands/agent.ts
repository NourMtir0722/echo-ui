/**
 * `echo-ui agent on|off`: the files Echo writes for agents — the Echo block
 * in CLAUDE.md / AGENTS.md, DESIGN.md, the check hook and the skills — put
 * in, or taken back out. `init` does `on`; `off` is the one command that
 * removes them all and leaves those files as they were before Echo arrived.
 */
import { runCommand } from "@registry/agent/guidance";
import { addedLine, footprintItem } from "@registry/agent/footprint";

import { removeAgentFiles, writeAgentFiles } from "../agent-files";
import { readConfig, readLock } from "../project";
import { bold, type Reporter } from "../output";

export interface AgentOptions {
  root: string;
  action?: string;
}

export async function agent(options: AgentOptions, out: Reporter): Promise<number> {
  if (options.action !== "on" && options.action !== "off") {
    out.error(`\`${runCommand("agent on")}\` writes Echo's block, DESIGN.md, the hook and the skills; \`${runCommand("agent off")}\` takes them out.`);
    return 2;
  }
  const config = await readConfig(options.root);
  if (options.action === "on") {
    if (!config) {
      out.error(`No ${bold("echo.json")} here. Run \`${runCommand("init")}\` first.`);
      return 1;
    }
    const lock = await readLock(options.root);
    // The style too: DESIGN.md is its only voice to the agent.
    const { added, warnings } = await writeAgentFiles(options.root, { dir: config.dir, seed: config.seed, style: config.style, installed: Object.keys(lock?.items ?? {}) });
    for (const warning of warnings) out.warn(warning);
    out.step(addedLine(added, { dir: config.dir }));
    out.result({ command: "agent", action: "on", added });
    return 0;
  }

  const { removed } = await removeAgentFiles(options.root);
  const ctx = { dir: config?.dir ?? "" };
  out.step(removed.length ? `Removed ${removed.map((id) => footprintItem(id).label(ctx)).join(", ")}.` : "Nothing of Echo's was there to remove.");
  out.result({ command: "agent", action: "off", removed });
  return 0;
}
