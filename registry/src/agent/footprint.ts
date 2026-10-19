/**
 * Everything `init` puts in a project, and how each thing comes out.
 *
 * One list, read by everything that has to say it: `init`'s one-line summary,
 * the command that takes Echo's agent files back out, the docs page that lists
 * what Echo writes, and the tests that fail when `init` writes something this
 * doesn't name. Kept as data rather than prose in four places, because four
 * lists of the same thing drift, and a tool that writes into someone's
 * project has to say exactly what it wrote.
 */
import { CURSOR_RULE_PATH, DESIGN_PATH, ECHO_BIN, SKILL_NAME, SKILL_PATH, runCommand } from "./guidance";
import { DESIGN_EYE_NAME, DESIGN_EYE_PATH, DESIGN_EYE_REFERENCE } from "./skills/design-eye";
import { STYLE_FIT_NAME, STYLE_FIT_PATH } from "./skills/style-fit";

/**
 * - `file`: a file Echo owns outright.
 * - `block`: a marked block inside a file the project owns; nothing outside
 *   the markers is Echo's.
 * - `entry`: one entry inside a settings file the project owns.
 * - `dependency`: a package added to `package.json` by the package manager.
 */
export type FootprintKind = "file" | "block" | "entry" | "dependency";

/** What a path depends on: the Echo folder `echo.json` names. */
export interface FootprintContext {
  dir: string;
}

export interface FootprintItem {
  id: string;
  kind: FootprintKind;
  /**
   * Every path it can land at, relative to the project root, with forward
   * slashes. A dependency lands in `package.json` and the lockfile, which are
   * the package manager's to write, so it names none.
   */
  paths: (ctx: FootprintContext) => string[];
  /** How the summary line names it: `echo.json`, `echo-ui-core`. */
  label: (ctx: FootprintContext) => string;
  /** What it is and why it's there, in one sentence. */
  what: string;
  /** How it comes out. */
  removal: string;
}

/** A folder and a file, with forward slashes and no doubled slash between them (trimmed by count: /\/+$/ is quadratic on a long run of slashes). */
const join = (dir: string, file: string) => {
  const d = dir.split(/[\\/]/).join("/");
  let end = d.length;
  while (end > 0 && d[end - 1] === "/") end--;
  return `${d.slice(0, end)}/${file}`;
};

/** Where `init --ci` writes the GitHub Actions job that runs Echo's tests. */
export const CI_WORKFLOW_PATH = ".github/workflows/echo-design.yml";

export const FOOTPRINT: readonly FootprintItem[] = [
  {
    id: "config",
    kind: "file",
    paths: () => ["echo.json"],
    label: () => "echo.json",
    what: "Where Echo's components go in this project, and which registry they come from. `add`, `update` and `check` read it.",
    removal: "Delete it, with the Echo folder, when you remove Echo.",
  },
  {
    id: "lock",
    kind: "file",
    paths: () => ["echo-lock.json"],
    label: () => "echo-lock.json",
    what: "What Echo installed, at which version, with a hash per file, so `update` can tell your edits from Echo's code and never replace yours without asking.",
    removal: "Delete it, with the Echo folder, when you remove Echo.",
  },
  {
    id: "theme",
    kind: "file",
    paths: (ctx) => [join(ctx.dir, "echo-theme.css")],
    label: (ctx) => join(ctx.dir, "echo-theme.css"),
    what: "The theme, built from your colour seed. Import it once from your global CSS; the components have no colour without it.",
    removal: "Delete it, with the Echo folder, when you remove Echo.",
  },
  {
    id: "catalog",
    kind: "file",
    paths: () => ["node_modules/.cache/echo-ui/catalog.json"],
    label: () => "the catalog (in node_modules/.cache)",
    what: "A copy of Echo's catalog, so `which`, `docs` and `check` answer in milliseconds and offline. `add` and `update` refresh it.",
    removal: "It goes with node_modules. Delete it any time: the next command fetches it again.",
  },
  {
    id: "claude-block",
    kind: "block",
    paths: () => ["CLAUDE.md"],
    label: () => "the Echo block in CLAUDE.md",
    what: "Echo's rules for an agent, between `<!-- echo-ui:start -->` and `<!-- echo-ui:end -->`: use Echo's components, style with `var(--echo-*)`, the exact package names, the accessibility floor, and to run the check. Claude Code reads CLAUDE.md at the start of every session. Nothing outside the markers is touched.",
    removal: `\`${runCommand("agent off")}\` takes the block out, and deletes the file only if nothing else is in it.`,
  },
  {
    id: "agents-block",
    kind: "block",
    paths: () => ["AGENTS.md"],
    label: () => "the Echo block in AGENTS.md",
    what: "The same block, for the agents that read AGENTS.md: Codex, Cursor, and Claude Code when there's no CLAUDE.md. It goes here too when the project has AGENTS.md, or when it has neither file.",
    removal: `\`${runCommand("agent off")}\` takes the block out, and deletes the file only if nothing else is in it.`,
  },
  {
    id: "design-md",
    kind: "block",
    paths: () => [DESIGN_PATH],
    label: () => "the Echo block in DESIGN.md",
    what: "This project's look in Echo's terms: the colours your seed makes, type, spacing, depth, motion, sound, and the do's and don'ts, in the sections Google's DESIGN.md format uses. Agents read it when they build a screen, not in every session. It sits between Echo's markers, so a DESIGN.md of your own keeps everything else in it.",
    removal: `\`${runCommand("agent off")}\` takes the block out, and deletes the file only if nothing else is in it.`,
  },
  {
    id: "cursor-rule",
    kind: "file",
    paths: () => [CURSOR_RULE_PATH],
    label: () => "the Echo rule for Cursor",
    what: "The same block, as a Cursor rule. Written only when the project uses Cursor and the block went to CLAUDE.md alone: Cursor reads AGENTS.md by itself.",
    removal: `\`${runCommand("agent off")}\` deletes it.`,
  },
  {
    id: "hook",
    kind: "entry",
    paths: () => [".claude/settings.json"],
    label: () => "the check hook and the Stop gate in .claude/settings.json",
    what: `Two Claude Code hooks. One runs \`${ECHO_BIN} check\` on each file the agent writes or edits and hands what it finds straight back to the agent. The other, the Stop gate, runs Echo's tests (the design tests and axe) on the pages the agent changed when it tries to stop, and keeps it working until they pass (three rounds at most; it lets the agent stop when the app isn't running, and \`test.stop: false\` in echo.json turns it off). Each is one entry, merged beside any hooks already there; a settings file that isn't valid JSON is left alone.`,
    removal: `\`${runCommand("agent off")}\` takes both entries out, and deletes the file only if nothing else is in it.`,
  },
  {
    id: "skill",
    kind: "file",
    paths: () => [SKILL_PATH],
    label: () => `the ${SKILL_NAME} skill`,
    what: "How to build a screen, add a component, fix what the check reports and update Echo, step by step. Claude Code loads it when a task needs it, so it costs nothing the rest of the time.",
    removal: `\`${runCommand("agent off")}\` deletes it.`,
  },
  {
    id: "design-eye",
    kind: "file",
    paths: () => [DESIGN_EYE_PATH, DESIGN_EYE_REFERENCE],
    label: () => `the ${DESIGN_EYE_NAME} skill`,
    what: "Echo's Design Eye: give your agent a moodboard, and it reads each style in it into a design foundation and a `style.json` this project can wear with `style use`. What it writes goes to your own style library (`~/Documents/styles`), private to you, never into the project. Its one reference is Echo's own style, written as a foundation. Claude Code loads it only when you share references.",
    removal: `\`${runCommand("agent off")}\` deletes it.`,
  },
  {
    id: "style-fit",
    kind: "file",
    paths: () => [STYLE_FIT_PATH],
    label: () => `the ${STYLE_FIT_NAME} skill`,
    what: "Echo's Style Fit: ask your agent which style the product should wear, and it profiles the product, has `style fit` order every style in your library and Echo's against it, reads the best of them, and argues for one; then it wears it with `style use`. Its decision goes to your library, next to the styles. Claude Code loads it only when the question comes up.",
    removal: `\`${runCommand("agent off")}\` deletes it.`,
  },
  {
    id: "ci",
    kind: "file",
    paths: () => [CI_WORKFLOW_PATH],
    label: () => CI_WORKFLOW_PATH,
    what: "Only with `init --ci`: a GitHub Actions job that builds and starts the app on every pull request and runs Echo's tests (the design tests and axe) on its pages, so a screen that fails them fails the pull request; the report is kept as an artifact. Yours to edit, and never written over.",
    removal: "Delete the file.",
  },
  {
    id: "core",
    kind: "dependency",
    paths: () => [],
    label: () => "echo-ui-core",
    what: "The one npm package Echo's components import: theme, sound, motion and touch.",
    removal: "Your package manager's remove, e.g. `npm uninstall echo-ui-core`.",
  },
  {
    id: "cli",
    kind: "dependency",
    paths: () => [],
    label: () => "echo-ui-cli (dev)",
    what: "This CLI, as a dev dependency, so `npx echo-ui-cli` runs the project's own copy without downloading anything, and a hook can call it directly.",
    removal: "Your package manager's remove, e.g. `npm uninstall echo-ui-cli`.",
  },
];

export function footprintItem(id: string): FootprintItem {
  const item = FOOTPRINT.find((f) => f.id === id);
  if (!item) throw new Error(`No footprint entry "${id}"`);
  return item;
}

/** Every path any entry can land at, for a project whose Echo folder is `dir`. */
export function footprintPaths(ctx: FootprintContext): Set<string> {
  return new Set(FOOTPRINT.flatMap((f) => f.paths(ctx)));
}

/** The one line `init` prints: what it added, named the way this list names it. */
export function addedLine(ids: readonly string[], ctx: FootprintContext): string {
  return `Added ${ids.map((id) => footprintItem(id).label(ctx)).join(", ")}.`;
}
