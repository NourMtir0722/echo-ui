import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * pnpm runs its own command before a script of the same name.
 *
 * The site's deploy script was called `deploy`, and `deploy` is a
 * pnpm command — the one that copies a workspace package into a folder. So
 * `pnpm deploy` never built or shipped anything: it printed
 * ERR_PNPM_NOTHING_TO_DEPLOY, the release workflow's deploy step called it
 * that way, and a first real release would have published to npm and then
 * failed to put the site up. `pnpm run deploy` worked, which is how a script
 * nobody could run by its own name looked fine from the outside.
 *
 * Two checks. No script in the workspace is named after a pnpm command, so
 * `pnpm <script>` always means the script. And every `pnpm <word>` the
 * pipeline or a script calls is a script that exists, or one of the few pnpm
 * commands it means to use — so a call left pointing at a renamed script, or
 * at a pnpm command by accident, is caught here rather than at release time.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The commands pnpm 9 handles itself, and the ones it hands to npm. Checked
 * against pnpm 9.15 by defining a script under each name and running
 * `pnpm <name>`. Not here: `test`, `t` and `start`, which run the script.
 */
const PNPM_COMMANDS = new Set([
  // pnpm's own
  "add", "audit", "bin", "c", "cat-file", "cat-index", "config", "create", "dedupe", "deploy",
  "dlx", "doctor", "env", "exec", "fetch", "find-hash", "i", "import", "init", "install",
  "install-test", "it", "licenses", "link", "list", "ll", "ln", "ls", "outdated", "pack",
  "patch", "patch-commit", "patch-remove", "prune", "publish", "rb", "rebuild", "recursive",
  "remove", "rm", "root", "run", "self-update", "server", "setup", "store", "un", "uninstall",
  "unlink", "up", "update", "upgrade", "why",
  // passed through to npm
  "access", "adduser", "bugs", "deprecate", "dist-tag", "docs", "edit", "info", "login",
  "logout", "owner", "ping", "pkg", "prefix", "profile", "repo", "s", "se", "search",
  "set-script", "show", "star", "stars", "team", "token", "unpublish", "unstar", "v", "version",
  "view", "whoami", "xmas",
]);

/** The pnpm commands the pipeline and scripts mean to call. Anything else must be a script. */
const INTENDED_COMMANDS = new Set(["install", "exec", "dlx"]);

interface Manifest {
  file: string;
  scripts: Record<string, string>;
}

/** The root package and every package `pnpm-workspace.yaml` names. */
function manifests(): Manifest[] {
  const globs = readFileSync(join(repoRoot, "pnpm-workspace.yaml"), "utf8")
    .split("\n")
    .map((l) => /^\s*-\s*["']?([^"'\s]+)["']?\s*$/.exec(l)?.[1])
    .filter((g): g is string => Boolean(g));
  const dirs = [repoRoot];
  for (const glob of globs) {
    if (glob.endsWith("/*")) {
      const parent = join(repoRoot, glob.slice(0, -2));
      for (const name of readdirSync(parent)) dirs.push(join(parent, name));
    } else dirs.push(join(repoRoot, glob));
  }
  return dirs
    .map((dir) => join(dir, "package.json"))
    .filter(existsSync)
    .map((file) => ({
      file: relative(repoRoot, file) || "package.json",
      scripts: (JSON.parse(readFileSync(file, "utf8")) as { scripts?: Record<string, string> }).scripts ?? {},
    }));
}

/** The word pnpm dispatches on in every `pnpm …` call in a piece of shell, past `-r` and `--filter`. */
function pnpmCalls(shell: string): string[] {
  const call = /\bpnpm((?:\s+(?:-r|--recursive|-w|--workspace-root|--if-present|--filter[ =]\S+|-F\s+\S+))*)\s+([a-z][\w:.-]*)/g;
  return [...shell.matchAll(call)].map((m) => m[2]!);
}

test("no workspace script is named after a pnpm command", () => {
  const problems = manifests().flatMap(({ file, scripts }) =>
    Object.keys(scripts)
      .filter((name) => PNPM_COMMANDS.has(name))
      .map((name) => `${file}: script "${name}" can't be run as \`pnpm ${name}\` — pnpm runs its own command`),
  );
  assert.deepEqual(problems, []);
});

test("every pnpm call in a workflow or script runs a script that exists", () => {
  const all = manifests();
  const scriptNames = new Set(all.flatMap((m) => Object.keys(m.scripts)));
  const sources: { where: string; shell: string }[] = [
    ...all.flatMap(({ file, scripts }) =>
      Object.entries(scripts).map(([name, shell]) => ({ where: `${file} "${name}"`, shell })),
    ),
    ...readdirSync(join(repoRoot, ".github/workflows"))
      .filter((f) => /\.ya?ml$/.test(f))
      .flatMap((f) =>
        readFileSync(join(repoRoot, ".github/workflows", f), "utf8")
          .split("\n")
          .map((line, i) => ({ where: `.github/workflows/${f}:${i + 1}`, shell: line }))
          .filter(({ shell }) => !/^\s*#/.test(shell)),
      ),
  ];
  const problems = sources.flatMap(({ where, shell }) =>
    pnpmCalls(shell)
      .filter((word) => (PNPM_COMMANDS.has(word) ? !INTENDED_COMMANDS.has(word) : !scriptNames.has(word)))
      .map((word) =>
        PNPM_COMMANDS.has(word)
          ? `${where}: \`pnpm ${word}\` is pnpm's own command, not a script`
          : `${where}: \`pnpm ${word}\` names no script in the workspace`,
      ),
  );
  assert.deepEqual(problems, []);
});
