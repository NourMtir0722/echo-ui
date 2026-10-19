/**
 * The first event of a run's stream names the model, tools, skills, plugins
 * and MCP servers the agent had. A run is only a measurement of the setup when
 * that list is Claude Code's defaults plus what the app itself provides —
 * nothing from the machine it ran on. This decides that.
 */

export interface InitEvent {
  type: "system";
  subtype: "init";
  model: string;
  tools: string[];
  mcp_servers: { name: string; status?: string }[];
  skills?: string[];
  agents?: string[];
  plugins?: { name: string; path: string; source?: string }[];
  apiKeySource?: string;
  claude_code_version?: string;
  permissionMode?: string;
}

/** What a run in an empty folder had: recorded once with `bench defaults`. */
export interface Defaults {
  claudeCodeVersion: string;
  tools: string[];
  skills: string[];
  agents: string[];
  plugins: string[];
}

export const isInitEvent = (event: unknown): event is InitEvent =>
  typeof event === "object" &&
  event !== null &&
  (event as { type?: unknown }).type === "system" &&
  (event as { subtype?: unknown }).subtype === "init";

export function defaultsFrom(init: InitEvent): Defaults {
  return {
    claudeCodeVersion: init.claude_code_version ?? "unknown",
    tools: [...init.tools].sort(),
    skills: [...(init.skills ?? [])].sort(),
    agents: [...(init.agents ?? [])].sort(),
    plugins: (init.plugins ?? []).map((p) => p.source ?? p.name).sort(),
  };
}

/**
 * Every way this run's agent differs from the defaults, beyond the skills the
 * app ships in `.claude/skills/`. An empty list means the run is clean.
 */
export function initProblems(init: InitEvent, defaults: Defaults, model: string, projectSkills: readonly string[]): string[] {
  const problems: string[] = [];
  if (init.model !== model) problems.push(`model is ${init.model}, not the pinned ${model}`);
  if (init.mcp_servers.length) problems.push(`MCP servers: ${init.mcp_servers.map((s) => s.name).join(", ")}`);
  if (init.apiKeySource && init.apiKeySource !== "none") problems.push(`authenticated with ${init.apiKeySource}, not the account login`);

  const extra = (have: readonly string[], allowed: readonly string[]) => have.filter((x) => !allowed.includes(x));
  const plugins = extra((init.plugins ?? []).map((p) => p.source ?? p.name), defaults.plugins);
  if (plugins.length) problems.push(`plugins beyond the defaults: ${plugins.join(", ")}`);
  const skills = extra(init.skills ?? [], [...defaults.skills, ...projectSkills]);
  if (skills.length) problems.push(`skills beyond the defaults and the app's own: ${skills.join(", ")}`);
  const agents = extra(init.agents ?? [], defaults.agents);
  if (agents.length) problems.push(`agents beyond the defaults: ${agents.join(", ")}`);
  const tools = extra(init.tools, defaults.tools);
  if (tools.length) problems.push(`tools beyond the defaults: ${tools.join(", ")}`);
  return problems;
}
