/**
 * Where the benchmark keeps things, and what stays fixed from run to run.
 */
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { REGISTRY_HOMEPAGE } from "../../registry/src/agent/guidance";

/**
 * Results and transcripts. Outside the repository on purpose: a transcript
 * quotes whatever the agent read. `ECHO_BENCH_RESULTS` puts them elsewhere.
 */
export const RESULTS_DIR = process.env.ECHO_BENCH_RESULTS ?? join(homedir(), ".echo-ui", "bench");

/**
 * Where the apps are built and the agent works: in the temp folder, never this
 * repository, and never the home folder, which the sandbox keeps the agent out
 * of. A folder of its own, made once with mkdtemp (a name nobody else can have
 * taken first, open to this user alone) and remembered in RESULTS_DIR, so runs
 * share its templates. It used to be `echo-bench` in the temp folder, a name
 * anyone on a shared machine could take first. `ECHO_BENCH_WORK` puts
 * it elsewhere.
 */
export const WORK_DIR = process.env.ECHO_BENCH_WORK ?? workDir();

/** A folder that's this user's alone: a real folder, not a link, owned by them, and closed to everyone else. */
export function isPrivateDir(path: string): boolean {
  try {
    const s = lstatSync(path);
    return s.isDirectory() && !s.isSymbolicLink() && s.uid === process.getuid?.() && (s.mode & 0o077) === 0;
  } catch {
    return false;
  }
}

function workDir(): string {
  const note = join(RESULTS_DIR, "work-dir");
  const kept = (() => {
    try {
      return readFileSync(note, "utf8").trim();
    } catch {
      return "";
    }
  })();
  if (kept && isPrivateDir(kept)) return kept;
  const made = mkdtempSync(join(tmpdir(), "echo-bench-"));
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(note, made);
  return made;
}

/**
 * One model for every run, recorded with the results, so runs made weeks
 * apart compare. Changing it starts a new series.
 */
export const MODEL = "claude-sonnet-5";

/**
 * Tools that reach outside the throwaway app (publishing a page, scheduling,
 * messaging other sessions). An app being built never needs them, and a run
 * must not leave anything behind anywhere else.
 */
export const DISALLOWED_TOOLS = [
  "Artifact",
  "ArtifactComments",
  "ArtifactData",
  "CronCreate",
  "CronDelete",
  "CronList",
  "DesignSync",
  "PushNotification",
  "RemoteTrigger",
  "ScheduleWakeup",
  "SendMessage",
  "ListAgents",
  "EnterWorktree",
  "ExitWorktree",
];

/**
 * What a run's agent may reach, enforced by Claude Code's sandbox (Seatbelt on
 * macOS) for every shell command it runs and their children, and by deny
 * rules for its own file tools.
 *
 * The first run without it showed why: the agent searched the whole disk for
 * the library's name, listed the maintainer's notes folder, found a dev
 * server it hadn't started on port 3000, and killed it. So:
 *
 * - no reads of the home folder, except npm's cache (installs) and the
 *   browsers Playwright keeps (an agent that checks its page in one);
 * - writes only in the run's own folder, the temp folder and npm's cache;
 * - the network only to npm, Echo's registry and the fonts Next downloads;
 * - no command that runs outside the sandbox, and none that signals a process;
 * - `readable`: extra folders a setup needs, such as a local registry build.
 *
 * `failIfUnavailable`: a run that can't be sandboxed doesn't start at all.
 */
export function sandboxSettings(readable: readonly string[] = []) {
  return {
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      autoAllowBashIfSandboxed: true,
      filesystem: {
        denyRead: ["~/"],
        allowRead: ["~/.npm", "~/Library/Caches/ms-playwright", ...readable],
        allowWrite: ["~/.npm"],
      },
      network: {
        allowedDomains: ["registry.npmjs.org", new URL(REGISTRY_HOMEPAGE).hostname, "fonts.googleapis.com", "fonts.gstatic.com"],
        allowLocalBinding: true,
      },
    },
    permissions: {
      deny: [
        "Read(~/**)",
        "Edit(~/**)",
        "Write(~/**)",
        "Bash(kill:*)",
        "Bash(pkill:*)",
        "Bash(killall:*)",
        "Bash(xargs kill:*)",
        "Bash(fuser:*)",
      ],
    },
  };
}

/** A run that goes on longer than this is stopped and recorded as timed out. */
export const RUN_TIMEOUT_MS = 30 * 60 * 1000;

/** And one that costs more than this, in API-equivalent dollars. */
export const RUN_BUDGET_USD = 20;

/**
 * The environment a run gets: this one, minus everything that belongs to
 * whatever launched the benchmark. A run started from inside another agent
 * session would otherwise inherit that session's effort level, its API key
 * and its messaging socket, and stop being the same run as one started from
 * a plain terminal.
 */
export function runEnvironment(env: NodeJS.ProcessEnv = process.env, port?: number): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_AGENT_SDK|CLAUDE_EFFORT|CLAUDE_PID|MCP_|ANTHROPIC_API_KEY)/.test(key)) continue;
    clean[key] = value;
  }
  // `next dev` and `next start` listen on PORT when it's set, so a run's own
  // server lands on a port of its own instead of meeting whatever else is
  // running on 3000. Telemetry off: it's a write outside the sandbox.
  if (port) clean.PORT = String(port);
  clean.NEXT_TELEMETRY_DISABLED = "1";
  return clean;
}
