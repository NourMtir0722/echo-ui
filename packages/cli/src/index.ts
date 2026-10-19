#!/usr/bin/env node
/**
 * `echo-ui` — Echo UI's installer.
 *
 * Built to be run by agents as much as by people: every question has a flag,
 * `--yes` takes the defaults, `--json` prints machine-readable output, and the
 * exit codes are part of the contract:
 *
 *   0  it worked
 *   1  it refused, and said why (outside the baseline, edited files, bad hash)
 *   2  the command line was wrong
 */
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { realpath } from "node:fs/promises";

import { add } from "./commands/add";
import { agent } from "./commands/agent";
import { check } from "./commands/check";
import { test } from "./commands/test";
import { diff } from "./commands/diff";
import { docs } from "./commands/docs";
import { init } from "./commands/init";
import { list } from "./commands/list";
import { update } from "./commands/update";
import { which } from "./commands/which";
import { style } from "./commands/style";
import { VERSION } from "./version";
import { reporter, bold, dim } from "./output";
import { runCommand } from "@registry/agent/guidance";
import { CLI_COMMANDS, CLI_OPTIONS } from "@registry/agent/cli-options";

const USAGE = `${bold("echo-ui")} — install Echo UI components

  ${bold(runCommand("init"))} [--dir <path>] [--seed <hex[,hex,hex]> | --style <name>] [--ci] [--yes] [--dry-run] [--skip-agent]
      Set the project up: install echo-ui-core, and echo-ui-cli as a dev
      dependency, write echo.json, echo-lock.json and echo-theme.css, keep the
      catalog, write what agents read (a marked Echo block in CLAUDE.md or
      AGENTS.md, DESIGN.md, the check hook and the Stop gate for Echo's tests,
      and three skills: building with Echo, Design Eye and Style Fit), and
      print the setup lines. Never edits your source code. --ci also writes a
      GitHub Actions job that runs Echo's tests on every pull request.

  ${bold(runCommand('which "<need>" […]'))}
      Which Echo item does each job ("a settings toggle", "confirm a delete"),
      with the reason and the install command. Says so when nothing fits.

  ${bold(runCommand("docs <name…>"))}
      Props, the smallest working use, accessibility and what not to do, for
      each item named, with imports the way this project resolves them.

  ${bold(runCommand("check"))} [<file…>] [--hook] [--url <page>]
      The mistakes an agent makes with Echo, in your own code: colours written
      by hand, raw elements where Echo has the component, props a component
      doesn't take, unnamed controls, and markup a keyboard or screen reader
      can't use. Each line says the Echo way. Exits 1 when it finds something.
      --hook reads a Claude Code hook's JSON and checks the file just edited.
      --url loads a running page headless, in this machine's Chrome (or your
      project's Playwright), and checks what only a rendered page shows:
      colours as they paint, names, contrast, the design tests, the setup,
      the screen rules that need a render, and axe's WCAG A and AA rules.
      --stop is Echo's tests as Claude Code's Stop hook: the agent can't
      stop until the pages it changed pass them (three rounds at most).

  ${bold(runCommand("test"))} [<route…>] [--url <app>] [--width <px>]
      Echo's tests on your app's pages, as a test suite runs: contrast,
      alignment (text cut off, actions out of line, empty columns), depth
      (glows, stacked shadows), corners and icons, then axe's WCAG A and AA
      rules. Each finding says what to change; a picture of each, and what
      only a person can check, is in .echo/report/index.html. The pages are the ones named, echo.json's
      test.routes, or every route the app has; the app is --url, test.url, or
      the port its dev script runs on. Exits 1 when it finds something.

  ${bold(runCommand("style list | show <name> | fit --profile <W V D F E C O> | use <name> | set <setting> <value> … | check <file> | sample <image> --out <dir>"))}
      The looks this project can wear on top of Echo: Echo's own, and yours,
      from your styles folder (~/Documents/styles, or ECHO_STYLES_DIR). \`use\`
      writes the style's seed to echo.json and echo-theme.css and its rules to
      DESIGN.md; the style's documents stay where they are. \`set\` moves one
      setting of this project's seed, or several (\`style set radius 0.8
      finish 0.7\`; \`default\` gives one back to Echo; alone, it lists them),
      and writes the theme and DESIGN.md again. \`show\` prints one
      in full. \`fit\` measures every style against a product's place on the
      seven axes (--profile "W4 V2 D1 F2 E3 C3 O3", --tolerance, 0 locks an
      axis). \`check\` says whether a style.json is one Echo can apply, which
      device it makes, and what contrast corrects.
      \`sample\` is Design Eye's evidence: a reference image's dominant values
      (--swatches), one tile of a collage (--region x,y,w,h), and magnified
      crops (--crop x,y,w,h:name, --zoom).

  ${bold(runCommand("agent on|off"))}
      Put Echo's block, DESIGN.md, the hook and the skills in, or take them
      all back out. Files they were added to are left as they were before.

  ${bold(runCommand("add <name…>"))} [--overwrite] [--dry-run] [--yes]
      Copy items in, with the Echo items they need. Stops if a file you edited
      would be replaced, unless you pass --overwrite.

  ${bold(runCommand("list"))}
      Everything in the registry, with what this project has.

  ${bold(runCommand("diff"))} [<name…>]
      What has changed since you installed. No names: one line per item. With
      names: the actual diff between your copy and the latest.

  ${bold(runCommand("update"))} [<name…>] [--overwrite] [--dry-run]
      Move items to the latest version, merging Echo's change into files you
      have edited. Where your edits and Echo's meet in the same lines, the item
      is left as it is and the lines are shown. --overwrite takes Echo's.

  ${dim("Everywhere: --json for machine-readable output, --registry <url> for a")}
  ${dim("local or staging registry, --cwd <path> to run against another folder, and")}
  ${dim("--skip-install to write the files without calling your package manager.")}
  ${dim("which and docs answer from the catalog kept in node_modules/.cache/echo-ui;")}
  ${dim("--refresh fetches it again first.")}`;

/** Every option any command takes. Exported so what the skills tell an agent to type can be checked against it. */
export const OPTIONS = CLI_OPTIONS;

export async function run(argv: readonly string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: [...argv], allowPositionals: true, options: OPTIONS });
  } catch (error) {
    console.error((error as Error).message);
    console.error(USAGE);
    return 2;
  }

  const { values, positionals } = parsed;
  const [command, ...rest] = positionals;
  const out = reporter(values.json === true);
  const root = values.cwd ? values.cwd : process.cwd();

  if (values.version) {
    out.line(VERSION);
    out.result({ version: VERSION });
    return 0;
  }
  if (values.help) {
    out.line(USAGE);
    out.result({ usage: true });
    return 0;
  }
  if (!command) {
    // Usage nobody asked for is the refusal, not the result: printing an
    // `ok: true` envelope on stdout while exiting 2 told an agent reading
    // --json the opposite of what the exit code says.
    out.error(`Which command? ${CLI_COMMANDS.slice(0, -1).join(", ")} or ${CLI_COMMANDS.at(-1)}.`);
    out.line(USAGE);
    return 2;
  }

  const shared = {
    root,
    registry: values.registry,
    yes: values.yes === true,
    dryRun: values["dry-run"] === true,
    skipInstall: values["skip-install"] === true,
  };
  try {
    switch (command) {
      case "init":
        return await init({ ...shared, dir: values.dir, seed: values.seed, style: values.style, skipAgent: values["skip-agent"] === true, ci: values.ci === true }, out);
      case "agent":
        return await agent({ root, action: rest[0] }, out);
      case "add":
        return await add({ ...shared, names: rest, overwrite: values.overwrite === true }, out);
      case "list":
        return await list({ root, registry: values.registry }, out);
      case "which":
        return await which({ root, needs: rest, registry: values.registry, refresh: values.refresh === true }, out);
      case "docs":
        return await docs({ root, names: rest, registry: values.registry, refresh: values.refresh === true }, out);
      case "check":
        return await check({ root, files: rest, registry: values.registry, refresh: values.refresh === true, hook: values.hook === true, stop: values.stop === true, url: values.url }, out);
      case "test":
        return await test({ root, routes: rest, url: values.url, width: values.width }, out);
      case "diff":
        return await diff({ root, names: rest, registry: values.registry }, out);
      case "style":
        return await style(
          {
            root,
            action: rest[0],
            args: rest.slice(1),
            registry: values.registry,
            out: values.out,
            region: values.region,
            swatches: values.swatches ? Number(values.swatches) : undefined,
            crops: values.crop,
            zoom: values.zoom ? Number(values.zoom) : undefined,
            maxWidth: values["max-width"] ? Number(values["max-width"]) : undefined,
            profile: values.profile,
            tolerance: values.tolerance,
          },
          out,
        );
      case "update":
        return await update({ ...shared, names: rest, overwrite: values.overwrite === true }, out);
      default:
        out.error(`There's no \`${command}\` command.`);
        out.line(USAGE);
        return 2;
    }
  } catch (error) {
    out.error((error as Error).message);
    return 1;
  }
}

export { VERSION } from "./version";

/*
 * Whether this file is the program rather than an import. Compared as real
 * paths, not URLs: a path with a space in it is percent-encoded in
 * import.meta.url and would never match.
 */
async function isEntrypoint(): Promise<boolean> {
  const invoked = process.argv[1];
  if (!invoked) return false;
  try {
    return (await realpath(invoked)) === (await realpath(fileURLToPath(import.meta.url)));
  } catch {
    return false;
  }
}

if (await isEntrypoint()) {
  process.exitCode = await run(process.argv.slice(2));
}
