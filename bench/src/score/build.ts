/**
 * Does what the agent built compile, and does it build? Measured the same way
 * in every setup, so they measure any library, not only Echo's rules.
 */
import { spawn } from "node:child_process";

export interface CommandResult {
  code: number | null;
  output: string;
}

/** Runs a command in the app and keeps everything it printed. */
export function capture(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: env ?? process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", (error) => resolve({ code: null, output: `${output}\n${error.message}` }));
    child.on("close", (code) => resolve({ code, output }));
  });
}

/** Distinct type errors `tsc` reports: `file(line,col): error TSnnnn`. */
export function typeErrorCount(output: string): number {
  return (output.match(/error TS\d+/g) ?? []).length;
}

export interface BuildResult {
  typeErrors: number;
  typeOutput: string;
  built: boolean;
  buildOutput: string;
}

export async function typecheckAndBuild(root: string): Promise<BuildResult> {
  const tsc = await capture("npx", ["tsc", "--noEmit", "-p", "."], root);
  // A production build, as it would deploy. It type-checks again, so an app
  // that fails tsc usually fails here too; both are reported.
  const build = await capture("npx", ["next", "build"], root, { ...process.env, NEXT_TELEMETRY_DISABLED: "1" });
  return {
    typeErrors: typeErrorCount(tsc.output),
    typeOutput: tsc.output,
    built: build.code === 0,
    buildOutput: build.output,
  };
}
