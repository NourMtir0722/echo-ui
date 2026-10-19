/**
 * One headless Claude Code run: the prompt in, every event of the streamed
 * JSON out to the transcript, and the run stopped at once if its first event
 * shows an agent that isn't the clean default.
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

import { DISALLOWED_TOOLS, RUN_BUDGET_USD, RUN_TIMEOUT_MS, runEnvironment, sandboxSettings } from "../config";
import { isInitEvent, type InitEvent } from "./init-event";

export interface ResultEvent {
  type: "result";
  subtype: string;
  is_error?: boolean;
  duration_ms?: number;
  num_turns?: number;
  total_cost_usd?: number;
  result?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface AgentRun {
  init?: InitEvent;
  result?: ResultEvent;
  /** Why the run ended early, when it did. */
  stopped?: string;
  exitCode: number | null;
  wallMs: number;
}

/**
 * The flags every run gets. `--setting-sources project,local` leaves out the
 * machine's own settings (its hooks, plugins and permissions) while keeping
 * what the app ships in `.claude/`; `--strict-mcp-config` with no config
 * leaves out every MCP server. Edits and shell commands run without prompts,
 * and only inside the sandbox `--settings` sets up (see sandboxSettings).
 */
export function agentArgs(prompt: string, model: string, readable: readonly string[] = []): string[] {
  return [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--permission-mode",
    "acceptEdits",
    "--settings",
    JSON.stringify(sandboxSettings(readable)),
    "--disallowedTools",
    DISALLOWED_TOOLS.join(","),
    "--max-budget-usd",
    String(RUN_BUDGET_USD),
  ];
}

export interface RunAgentOptions {
  cwd: string;
  prompt: string;
  model: string;
  transcriptPath: string;
  /** Problems with the agent's setup, from its first event; any at all stops the run. */
  vet: (init: InitEvent) => string[];
  timeoutMs?: number;
  /** The port the app's own server defaults to in this run. */
  port?: number;
  /** Folders outside the app the setup needs to read (a local registry). */
  readable?: readonly string[];
}

export function runAgent(options: RunAgentOptions): Promise<AgentRun> {
  const started = Date.now();
  const transcript = createWriteStream(options.transcriptPath);
  const child = spawn("claude", agentArgs(options.prompt, options.model, options.readable), {
    cwd: options.cwd,
    env: runEnvironment(process.env, options.port),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const run: AgentRun = { exitCode: null, wallMs: 0 };
  const stop = (why: string) => {
    if (run.stopped) return;
    run.stopped = why;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 5000).unref();
  };
  const timer = setTimeout(() => stop(`timed out after ${Math.round((options.timeoutMs ?? RUN_TIMEOUT_MS) / 60000)} minutes`), options.timeoutMs ?? RUN_TIMEOUT_MS);

  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    transcript.write(`${line}\n`);
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (isInitEvent(event) && !run.init) {
      run.init = event;
      const problems = options.vet(event);
      if (problems.length) stop(`not a clean agent: ${problems.join("; ")}`);
    } else if ((event as { type?: string }).type === "result") {
      run.result = event as ResultEvent;
    }
  });

  return new Promise((resolve) => {
    child.on("close", (code) => {
      clearTimeout(timer);
      run.exitCode = code;
      run.wallMs = Date.now() - started;
      if (code !== 0 && !run.stopped && !run.result) run.stopped = `claude exited with ${code}: ${stderr.trim().slice(0, 500)}`;
      transcript.end(() => resolve(run));
    });
  });
}
