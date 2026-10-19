/**
 * The one command the CLI runs on the user's behalf: their package manager's
 * install, for the dependencies an item declares.
 *
 * Nothing from the registry is ever executed. The package names come from the
 * item's `dependencies`, the versions from its ranges, and the call is spawned
 * without a shell so a name can't smuggle in a command.
 */
import { spawn, type SpawnOptions } from "node:child_process";
import type { PackageManager } from "./project";

/**
 * npm's package-name grammar, with an optional range after it.
 *
 * Every spec is checked against this before it can reach a command line, so
 * the shell metacharacters a Windows install would otherwise have to survive
 * — `&`, `|`, `;`, `%`, `"`, `$(` — are refused at the door instead.
 * Ranges keep the characters semver actually uses, spaces included.
 */
const SPEC = /^(?:@[a-z0-9~][a-z0-9._~-]*\/)?[a-z0-9~][a-z0-9._~-]*(?:@[A-Za-z0-9.+~^*<>=| -]+)?$/;

/** The specs that are not a package name and a range — none, normally. */
export function unreadableSpecs(packages: readonly string[]): string[] {
  return packages.filter((spec) => !SPEC.test(spec));
}

export interface SpawnPlan {
  file: string;
  args: string[];
  options: SpawnOptions;
}

/**
 * How the install is spawned, per platform.
 *
 * Windows can't run `npm.cmd` through CreateProcess, so it has to go through
 * cmd.exe. `shell: true` did that by joining the arguments with spaces and
 * handing cmd the raw line, which makes a `<` in a comparator range a
 * redirect and breaks the install (and would run a `&` in a name). Each
 * argument is quoted here instead, and `/s` makes cmd strip only the outer
 * pair — the same shape Node uses, with the quoting it leaves out.
 */
export function spawnPlan(
  manager: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): SpawnPlan {
  if (platform !== "win32") return { file: manager, args: [...args], options: {} };
  const line = [manager, ...args].map((arg) => `"${arg}"`).join(" ");
  return {
    file: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", `"${line}"`],
    options: { windowsVerbatimArguments: true },
  };
}

export interface InstallResult {
  ok: boolean;
  command: string;
  error?: string;
}

/**
 * `pnpm add a b`, `npm install a b`, … — one call for everything at once.
 * `dev` puts them in devDependencies, which each manager spells its own way.
 */
export function installArgs(manager: PackageManager, packages: readonly string[], dev = false): string[] {
  switch (manager) {
    case "pnpm":
      return ["add", ...(dev ? ["-D"] : []), ...packages];
    case "bun":
      return ["add", ...(dev ? ["--dev"] : []), ...packages];
    case "yarn":
      return ["add", ...(dev ? ["--dev"] : []), ...packages];
    case "npm":
    default:
      return ["install", ...(dev ? ["--save-dev"] : []), ...packages];
  }
}

export async function installDependencies(
  manager: PackageManager,
  packages: readonly string[],
  cwd: string,
  run = spawnInstall,
  { dev = false }: { dev?: boolean } = {},
): Promise<InstallResult> {
  if (packages.length === 0) return { ok: true, command: "" };
  const args = installArgs(manager, packages, dev);
  const command = `${manager} ${args.join(" ")}`;
  const unreadable = unreadableSpecs(packages);
  if (unreadable.length) {
    return { ok: false, command, error: `not a package name and range: ${unreadable.join(", ")}` };
  }
  try {
    await run(manager, args, cwd);
    return { ok: true, command };
  } catch (error) {
    return { ok: false, command, error: (error as Error).message };
  }
}

function spawnInstall(manager: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // No shell: the arguments are passed as-is, so nothing in them is parsed.
    // On Windows that means cmd.exe with the line quoted here (see spawnPlan).
    const plan = spawnPlan(manager, args);
    const child = spawn(plan.file, plan.args, {
      ...plan.options,
      cwd,
      // Its output goes to our stderr, never our stdout: stdout is where
      // `--json` puts the result, and nothing else may be on it.
      stdio: ["inherit", 2, "inherit"],
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${manager} exited with ${code}`)),
    );
  });
}
