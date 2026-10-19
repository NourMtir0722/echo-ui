/**
 * The standing corrections an agent needs BEFORE it writes Echo code. These
 * ride in llms.txt and in the MCP server's instructions, so one wording covers
 * both channels.
 */
import { CONFORMANCE_CHECKS, CONFORMANCE_LIMITS, CONFORMANCE_STANDARD } from "./conformance";
import { askTheBuilder } from "./skills/ask";

/** Agents' training data predates the package rename; this is the top cause of a broken install. */
export const BASE_UI_CORRECTION =
  "The Base UI package is `@base-ui/react` (per-component imports, e.g. `@base-ui/react/dialog`), NOT `@base-ui-components/react` (the old name). Training data may be stale.";

/**
 * What Echo is, for a model. It names one installer, Echo's own: a model that
 * meets another tool's name in its brief will reach for that tool's commands
 * no matter what the next line says.
 */
export const ECHO_PITCH =
  "A neo-skeuomorphic React component library you install into your own source tree with `npx echo-ui-cli`. Molded caps in recessed wells, emissive readouts, real press travel. Motion (GSAP) and sound (zero-dep WebAudio synth) are first-class token families alongside color and type.";

/**
 * The prefix registry.json gives every item (`echo-tabs`), which `/e/` — the
 * registry the CLI reads — drops, because its whole namespace is Echo already.
 * Item names in the two formats differ by exactly this, so `installName` is
 * what turns a docs page's item into the name you type at a prompt.
 *
 * Kept in step with `eName` in `registry/src/registry/e-format.ts` by
 * `identity.test.ts`, which walks every item in registry.json.
 */
export const installName = (item: string) => item.replace(/^echo-/, "");

/**
 * The CLI that installs Echo. The npm package is `echo-ui-cli` (npm refused
 * `echo-ui`, too similar to the abandoned `echoui`); the command it installs
 * is `echo-ui`. `npx echo-ui-cli` names the package, so it works before
 * anything is installed — which is the state every install line is read in.
 *
 * Unpinned: the CLI is Echo's own, so a major version of it that broke these
 * lines would be Echo's bug to not ship.
 */
export const ECHO_CLI = "echo-ui-cli";

/** The one npm package Echo actually publishes components against. */
export const ECHO_CORE = "echo-ui-core";

/**
 * The command `echo-ui-cli` installs. Named in prose, never typed: it lands in
 * `node_modules/.bin`, which no shell has on its PATH — not a person's, not an
 * agent's, not a hook's — so a bare `echo-ui update` is "command not found"
 * for anyone who didn't install the CLI globally.
 */
export const ECHO_BIN = "echo-ui";

/**
 * How anyone runs a command: `npx echo-ui-cli which "a settings toggle"`.
 *
 * The package name, not the command's: it runs whether or not the CLI is
 * installed, and a guessed `npx echo-ui` would install a different package
 * altogether. In a project `init` set up, npx finds the local copy and
 * downloads nothing. Every line that tells someone what to type comes from
 * here, so none of them can drift back to the bare command.
 */
export const runCommand = (command: string, runner = `npx ${ECHO_CLI}`) => `${runner} ${command}`;

/**
 * What Claude Code's hook runs after each edit: the installed file, by path.
 * A hook's shell has no `node_modules/.bin` on its PATH either, and skipping
 * npm's startup keeps a check inside its two seconds.
 */
export const HOOK_COMMAND = `"$CLAUDE_PROJECT_DIR"/node_modules/.bin/${ECHO_BIN} check --hook`;

/**
 * What Claude Code runs when the agent tries to stop: Echo's tests (the
 * design tests and axe) on the pages its change touched, which keep it
 * working until they pass (three rounds at most). The installed file, by path, for the same reasons.
 */
export const STOP_COMMAND = `"$CLAUDE_PROJECT_DIR"/node_modules/.bin/${ECHO_BIN} check --stop`;

/**
 * Whether the packages are on npm, installable and runnable. They are:
 * `echo-ui-cli` is published with its `bin`, and the published `echo-ui-core`
 * is the version every `/e/` item declares. While this was false, every
 * install line Echo showed was a promise, and saying so was the only honest
 * thing a docs page could do.
 *
 * This is the switch, not a note: set it to false and `release-state.test.ts`
 * hands back the list of places the notice has to go back on.
 */
export const CLI_RELEASED = true;

/**
 * What a reader is told in its place, in one wording, so the README, the
 * install banner on every docs page and the agent brief cannot drift into
 * three different accounts of the same fact.
 */
export const PRERELEASE_HEADLINE = "Echo is not released yet";

export const PRERELEASE_NOTICE =
  `The commands below are what installing Echo will look like. They do not work today: \`${ECHO_CLI}\` is a reserved name on npm with no command behind it, so \`npx\` fails with an error about a missing executable. Nothing here is installable until the first release.`;

/** The same fact for the agent channel, phrased as the instruction it has to be. */
export const PRERELEASE_AGENT_NOTICE =
  "NOT RELEASED YET. `echo-ui-cli` is a reserved npm name with no executable behind it, and the published `echo-ui-core` is older than the version every item requires, so no install path works today. Do not tell a user to run these commands as though they would succeed; say that Echo has not shipped yet.";

/** The full install command for one item. */
export const installCommand = (item: string, runner = `npx ${ECHO_CLI}`) =>
  runCommand(`add ${installName(item)}`, runner);

/**
 * Where the registry is served from. Canonically declared in `registry.json`;
 * mirrored here because TypeScript callers cannot read that file at build time
 * in every package, and pinned to it by `identity.test.ts`.
 *
 * This is the project's IDENTITY. It is printed in the homepage hero, in
 * llms.txt, in catalog.json, on every doc page, in every install line and in
 * the CLI's default `--registry`, so changing it after launch is a breaking
 * change for consumers. `identity.test.ts` enumerates every file that carries
 * it, so a rename is a checklist rather than a search.
 */
export const REGISTRY_HOMEPAGE = "https://echo-ui.com";

/**
 * The hosted MCP server, for the tools that take only a remote server
 * (ChatGPT, claude.ai, the builders that run in a browser): the same tools as
 * `npx echo-ui-mcp`. Like the homepage, it's for good once it's out: a
 * ChatGPT plugin can't move its server, and people keep it in their settings.
 */
export const HOSTED_MCP_URL = `https://mcp.${new URL(REGISTRY_HOMEPAGE).host}/mcp`;

/**
 * Where people write: help with Echo, a privacy question, a security report.
 * One address for all three, given on `/contact`, the
 * privacy policy, the terms, the plugin's README and `SECURITY.md`. Both
 * plugin directories ask for a way to reach the developer, and Anthropic's
 * terms for a way to report a security problem.
 */
export const SUPPORT_EMAIL = `support@${new URL(REGISTRY_HOMEPAGE).host}`;

/**
 * The builder's own style library, as Echo's skills and tools name it: where
 * Design Eye saves a style and where `style use` and `init --style` look for
 * one by name. `ECHO_STYLES_DIR` moves it; the CLI's `style list` prints where.
 */
export const STYLE_LIBRARY = "~/Documents/styles";

/**
 * The one-time project setup, stated once for llms.txt and the MCP server.
 *
 * `add` refuses to run without `echo.json`, so this is not advice — it is the
 * first command. It was the top cause of a failed first install under the old
 * installer too, when it meant mapping a namespace by hand; the CLI now does
 * that job itself, and the part it cannot do is the part it prints.
 */
export const PROJECT_SETUP =
  "Set the project up once with `npx echo-ui-cli init`. It installs `echo-ui-core` (and `echo-ui-cli` as a dev dependency), writes `echo.json`, `echo-lock.json` and `echo-theme.css`, adds a marked Echo block to CLAUDE.md or AGENTS.md, a check hook to .claude/settings.json and three skills (building with Echo; Design Eye, which reads a moodboard into a style the project can wear; and Style Fit, which picks the style it wears), and prints the lines to paste. It never edits your source code, and `add` refuses to run before it.";

/**
 * The page's ground: the device's plastic, its ink and its type, so the page's
 * own words sit on Echo as Echo's do. One line, wherever it's given (`init`,
 * the agent's setup, the Echo block); the page check and the installation
 * guide say the same.
 */
export const PAGE_GROUND = "background: var(--echo-well); color: var(--echo-text); font-family: var(--echo-font-sans)";

/**
 * Nothing on a component's own record says this, and without it an installed
 * screen renders colourless and silent — the first thing the fresh-app test
 * hit when it followed the MCP server's answers and nothing else.
 */
export const THEME_SETUP =
  "Components render with no colour until the theme is on the page. `init` writes `echo-theme.css` into the Echo folder — import it once from your global CSS or your root layout (or call `createEchoTheme().css` from `echo-ui-core/theme` to build it at runtime). Give the page the device's ground (`body { " +
  PAGE_GROUND +
  "; }`), dark or light as the chassis makes it, and wrap the app in `SoundProvider` from `echo-ui-core/sound` — without it every component is silent. It starts muted until the person turns sound on, and remembers their choice; `defaultMuted={false}` starts with sound. Put `<EchoCheck />` from `echo-ui-core/check` once in the root layout: in development it says in the console what's still missing, and in production it renders nothing.";

/** The second thing the fresh-app test hit: a server page cannot hand an Echo screen its onSave. */
export const CLIENT_BOUNDARY =
  "Echo components are client components. In the Next.js App Router, a file that passes them a function (`onSave`, `onSubmit`, `onClick`) must start with `\"use client\"`.";

/**
 * What an installed item actually is, once it is on disk. Agents reach for
 * `npm install` for anything that looks like a component library, and the
 * answer to "where does this live" decides whether they edit the file or
 * wrap it.
 */
export const OWNERSHIP =
  `Echo is a REGISTRY, not an npm component package. Components are installed with \`${installCommand("<component>")}\` and then live in the consumer's own source tree, importing each other by relative path inside one Echo folder. Never suggest \`npm install\` for a component. The one npm package is \`echo-ui-core\`, the grammar they all import (theme, sound, motion, tactile, presence).`;

/**
 * How an installed file gets Echo's later fixes, which is the question nobody
 * asks until the day it matters.
 *
 * Copied files lose this by default: once a file is in someone's tree, every
 * later fix is invisible to them. Echo records a hash per file at
 * install time so it can tell their edits from its own, and the two commands
 * that read it are the difference between owning the files and being stranded
 * with them.
 */
export const UPGRADES =
  "Installed files still receive Echo's later fixes. `npx echo-ui-cli diff` reports every installed item as up to date, behind, edited, or edited and behind; `npx echo-ui-cli update` brings them forward and merges Echo's change into files somebody edited; where an edit and Echo's change meet in the same lines, it leaves that item and prints the lines between git's conflict markers, to bring together before running it again. Never tell a user to re-run `add --overwrite` to upgrade — that discards their edits without showing them what it is discarding.";

/**
 * The accessibility rules an agent has to follow.
 *
 * Echo's audience includes designers who build through an agent and never read
 * the docs. The types refuse an unnamed control, but a model that knows why
 * writes the accessible version first instead of fixing a compile error.
 */
export const ACCESSIBILITY_RULES =
  "Accessibility is part of the grammar, not a review step. Echo guarantees WCAG 2.2 AA, and these are the parts a consumer can still get wrong:";

export const ACCESSIBILITY_INSTRUCTIONS = [
  "- Every control needs a name. `Switch`, `Checkbox`, `Slider`, `Segmented`, `Select`, `RadioGroup` and `Progress` take `aria-label` (or `aria-labelledby` pointing at visible text); `Field`, `Textarea` and `OtpField` take a visible `label`. Without one they do not compile.",
  "- An icon-only `HardwareButton` (`iconOnly`) needs `aria-label`: it has no text to read.",
  "- Forms: put the help text in `description` and the problem in `error`, both on the field. They are linked to the input and set `aria-invalid` for you. Never signal an error with colour or a red border alone.",
  "- Announcements: mount `<Toaster>` once and call `toast()` from `useToast()`. A message rendered into the page when it happens is usually never announced.",
  "- Sign-in: `Field` with `autoComplete` (`email`, `current-password`), and `OtpField` for a one-time code — it allows pasting, which people rely on.",
  "- State is never colour alone: Echo has one accent, and its components already carry state in shape and words. Do not add a red for danger; use `AlertDialog`, which asks before anything destructive.",
  "- Do not remove a focus ring, shrink a target below 24×24px, or set `aria-hidden` on something focusable.",
].join("\n");

/**
 * What every item promises, and what it does not. An agent that knows the
 * floor is guaranteed stops re-implementing it — and knows which one thing is
 * still unverified, rather than assuming either everything or nothing is.
 *
 * Built from `conformance.ts`, which is also what the `/e/` build publishes
 * per item and what every component page prints, so the three cannot drift.
 */
export const CONFORMANCE = [
  `Every component is tested against ${CONFORMANCE_STANDARD}:`,
  CONFORMANCE_CHECKS.map((c) => c.id).join(", "),
  `— and each item's \`/e/\` record carries the same block. Not covered: ${CONFORMANCE_LIMITS.join("; ")}.`,
].join(" ");

/** What a model has to know to use this library correctly, in the order it needs it. */
/**
 * What the placeholder in Echo's snippets stands for. They import from
 * `@/echo`, which is no project's real path: the CLI's `docs` writes the
 * project's own in its place, but an answer over MCP has no project to read.
 * Both defaults `init` installs into are named.
 */
export const IMPORT_PLACEHOLDER =
  "Imports from `@/echo` stand for the folder Echo is installed in: write `@/components/echo` in a Next.js app (its `@/` alias), and `./components/echo` from a file in `src/` in a Vite app.";

export const AGENT_INSTRUCTIONS = [
  ECHO_PITCH,
  "",
  "Working rules:",
  // First, because every rule under it describes a command that does not run
  // yet. A model that meets the setup line before the caveat has already
  // written the install step into its answer.
  ...(CLI_RELEASED ? [] : [`- ${PRERELEASE_AGENT_NOTICE}`]),
  `- ${BASE_UI_CORRECTION}`,
  `- ${PROJECT_SETUP}`,
  `- ${THEME_SETUP}`,
  `- ${CLIENT_BOUNDARY}`,
  `- ${OWNERSHIP}`,
  `- ${UPGRADES}`,
  "- Style only through the Layer-3 semantic vars (`var(--echo-*)`) from `createEchoTheme`. Never hardcode a hex, and never invent a token name — call get_tokens for the real list.",
  "- Read a component's anti-patterns before using it. They exist because the obvious thing is wrong for this material system (a screen readout does not ease smoothly; severity is not red/amber/green).",
  "",
  ACCESSIBILITY_RULES,
  ACCESSIBILITY_INSTRUCTIONS,
  "",
  CONFORMANCE,
].join("\n");

/* ------------------------------------------------ what init writes for agents */

/**
 * The accessibility rules, short enough for a block that loads in every
 * conversation. The same rules as ACCESSIBILITY_INSTRUCTIONS, which says why
 * and names every component; `guidance.test.ts` keeps the two saying the
 * same things.
 */
export const ACCESSIBILITY_SHORT = [
  "every control has a name: `label`, `aria-label` or `aria-labelledby` (the types require it)",
  "a form error goes in words, in the field's `error`; never colour alone",
  "announce with `toast()` from `useToast()`, under one `<Toaster>`",
  "never remove a focus ring, shrink a target below 24×24px, or put `aria-hidden` on something focusable",
];

/**
 * The screens an agent reads before building one of its own: finished Echo
 * screens, each a registry item, so `docs` returns them. A template Noor
 * designs joins this list.
 */
export const REFERENCE_SCREENS: readonly { item: string; for: string }[] = [
  { item: "console", for: "dashboards, data and instruments" },
  { item: "chat", for: "a conversation" },
];

/** Where the Echo block starts and ends, so it can be updated in place and taken out whole. */
export const BLOCK_START = "<!-- echo-ui:start -->";
export const BLOCK_END = "<!-- echo-ui:end -->";

/** Where the skill lives in a project, and its name. */
export const SKILL_NAME = "echo-ui";
export const SKILL_PATH = `.claude/skills/${SKILL_NAME}/SKILL.md`;
/** The design file `init` writes at the project root: the look, in Echo's terms, read when a screen is built. */
export const DESIGN_PATH = "DESIGN.md";
/** Cursor's rule, for a Cursor project whose block Cursor wouldn't otherwise read. */
export const CURSOR_RULE_PATH = ".cursor/rules/echo-ui.mdc";

/**
 * Which CLI wrote an agent file, and from which seed: `check` compares it with
 * the CLI running and the seed in echo.json, and says when a file is stale.
 */
export function writtenBy(version: string, seed?: object): string {
  return `<!-- written by ${ECHO_CLI} ${version}${seed && Object.keys(seed).length ? ` from seed ${JSON.stringify(seed)}` : ""} -->`;
}

/** The stamp in a file Echo wrote, if it has one. */
export function readWrittenBy(text: string): { version: string; seed?: Record<string, unknown> } | undefined {
  const m = new RegExp(`<!-- written by ${ECHO_CLI} (\\S+)(?: from seed (\\{.*?\\}))? -->`).exec(text);
  if (!m) return undefined;
  let seed: Record<string, unknown> | undefined;
  try {
    seed = m[2] ? (JSON.parse(m[2]) as Record<string, unknown>) : undefined;
  } catch {
    seed = undefined;
  }
  return { version: m[1]!, ...(seed ? { seed } : {}) };
}

/**
 * The block `init` puts in `CLAUDE.md` and/or `AGENTS.md`: the rules an
 * agent needs every time it touches this project's UI. It loads into every
 * conversation, so every line has to earn its tokens: what Echo is, where it
 * lives, the exact package names, how to ask, how to style, the accessibility
 * floor, and to run the check.
 */
export function projectBlock(dir: string, stamp?: string): string {
  return [
    BLOCK_START,
    ...(stamp ? [stamp] : []),
    "## Echo UI",
    "",
    `This project's UI is built with Echo: tactile React components copied into \`${dir}/\` (see \`echo.json\`), on the grammar in the \`${ECHO_CORE}\` package.`,
    "",
    "- Use Echo's component for every job it has. Never imitate one with raw elements or its classes.",
    `- Before using a component, ask: \`${runCommand('which "<the job>"')}\`, then \`${runCommand("docs <name>")}\`. Add one with \`${runCommand("add <name>")}\`.`,
    `- Set up once: import \`${dir}/echo-theme.css\` from the root layout or global CSS, give \`body\` \`${PAGE_GROUND}\`, wrap the app in \`SoundProvider\` from \`${ECHO_CORE}/sound\`, and put \`<EchoCheck />\` from \`${ECHO_CORE}/check\` in the root layout.`,
    "- Style only with `var(--echo-*)`. Never write a colour value: the theme sets them all.",
    `- The packages are \`${ECHO_CLI}\` and \`${ECHO_CORE}\`. There is no \`echo-ui\` or \`echoui\` package: never install one.`,
    ...ACCESSIBILITY_SHORT.map((rule) => `- Accessibility: ${rule}.`),
    `- Building a screen? Read \`${DESIGN_PATH}\` (its look and decisions), then follow \`${SKILL_PATH}\`. Every choice comes from a decision, Echo's default or the builder: when unsure, ask the builder.`,
    `- A look of its own: a moodboard becomes a style with \`.claude/skills/echo-design-eye/SKILL.md\`, Style Fit picks one with \`.claude/skills/echo-style-fit/SKILL.md\`; \`${runCommand("style set <setting> <value>")}\` moves one setting.`,
    `- After changing UI, run \`${runCommand("check")}\`, then \`${runCommand("test")}\` with the app running, and fix what they find. Only the builder keeps a slop-police finding.`,
    BLOCK_END,
  ].join("\n");
}

/**
 * The skill: the procedures, which are too long for the block and only needed
 * for the job at hand. Claude Code loads it when a task matches its
 * description; any other agent is pointed at the file by the block.
 */
export function skillFile(dir: string): string {
  const cmd = (c: string) => `\`${runCommand(c)}\``;
  return [
    "---",
    `name: ${SKILL_NAME}`,
    `description: Build or change this project's UI with Echo UI — a screen, a component, fixing what \`${runCommand("check")}\` reports, or updating Echo. Use it for any task that touches the interface.`,
    "---",
    "",
    "# Echo UI in this project",
    "",
    `Echo's components live in \`${dir}/\`, copied in by the CLI; its grammar (theme, sound, motion) is the \`${ECHO_CORE}\` package. Every command below is \`npx ${ECHO_CLI} …\`, which runs the project's own copy.`,
    "",
    "## Build a screen",
    "",
    `0. Read \`${DESIGN_PATH}\`: this project's colours, type, spacing and depth, in Echo's terms, and its style's decisions. Every choice on the screen (what leads, how the main action looks, the words, the icons, the images) comes from a decision, from Echo's own default, or from the builder: never from your own habits. Where the style decides nothing, ask the builder (below), or use Echo's default and say so.`,
    "1. Name the screen's one main action. Everything else on it is quieter than that.",
    `2. Ask which Echo item does each job, all at once: ${cmd('which "<job>" "<job>" …')}. Where it says nothing in Echo does the job, build that part from Echo's parts, styled only with \`var(--echo-*)\`.`,
    `3. Read the reference screen closest to yours: ${REFERENCE_SCREENS.map((s) => `${cmd(`docs ${s.item}`)} for ${s.for}`).join(", or ")}. Copy how it composes, not its content.`,
    `4. Read what you'll use: ${cmd("docs <name> <name> …")}. Its imports are written the way this project resolves them.`,
    "5. Build it from those components. Lay it out with Layout, Panel and Card; never restyle a component to look like another.",
    `6. Run ${cmd("check")} and fix everything it reports before saying you're done.`,
    `7. With the app running, read the browser console (Next.js 16's dev server prints it in its terminal too): each \`Echo check ·\` line is something only the rendered page shows. Fix it as below, and the line goes on the next look.`,
    `8. Last, run Echo's tests: ${cmd("test")} loads each page headless, measures what a designer checks (contrast, text cut off, actions out of line, empty columns, glows, stacked shadows, corners, icons) and runs axe's WCAG A and AA rules. Fix each finding the way it says, changing only what it names, and run it again until it passes. When one is in markup you can't change (a library's widget, an embed), tell the builder: never turn its rule off in echo.json, and never work around it. In Claude Code they run by themselves when you stop, and you can't stop until they pass. One page: ${cmd("test /pricing")}; another address: \`--url\`.`,
    "",
    "## Add a component",
    "",
    `${cmd('which "<the job>"')} names it, ${cmd("add <name>")} copies it in with what it needs, and ${cmd("docs <name>")} shows its props and a working use.`,
    "",
    "## Change the look",
    "",
    `One setting, or a few, is ${cmd("style set <setting> <value> …")}: it checks every value first, writes the theme and \`DESIGN.md\` again, keeps contrast at AA, and prints the line that puts it back. Run ${cmd("style set")} alone first to see where each setting is, then move it from there:`,
    "",
    "- rounder or softer: `radius` up (0 crisp, 1 soft); sharper or crisper: `radius` down;",
    "- pill buttons whatever the corners: `pills true`; buttons that follow the corners: `pills false`;",
    "- glossier or shinier: `finish` up (0 matte, 1 glossy); flatter or more matte: `finish` down;",
    "- denser or tighter: `density compact`; roomier or airier: `density comfortable`;",
    "- another brand colour: `accent` (Echo holds every accent to one lightness, and the output says if it moved);",
    "- a light device or a dark one: `chassis` and `paper` together (a pale chassis makes a light device, with dark text on it);",
    "- another typeface: `fontSans`, `fontMachine`, `fontMono` or `fontLcd`, as a quoted font stack, and load the font in the app;",
    "- back to Echo's own: `<setting> default`.",
    "",
    `A whole new look is a style, not a pile of settings: read a moodboard with Design Eye, or pick one with Style Fit, and wear it with ${cmd("style use <name>")}. Never edit the theme file or the seed by hand, and never restyle a component to get a look.`,
    "",
    "## Fix what the check reports",
    "",
    "Each line is `file:line` and the Echo way to do it. The usual ones:",
    "",
    "- a colour written by hand: use the role it names, `var(--echo-…)`;",
    "- spacing, a radius or a timing off Echo's scales: write the token the line gives;",
    "- a shadow drawn by hand: use the shadow recipe it names, `var(--echo-shadow-…)`;",
    "- a restyle from outside (a `className` Echo doesn't take, CSS aimed at `.echo-…`, a theme token set by hand): use the component's props, a Scope for a colour of its own, or the seed;",
    "- a raw `<button>`, `<select>`, `<input>` or `<dialog>`: use the Echo component it names;",
    "- a prop the component doesn't take: the line names the one it has (`variant`, `onCheckedChange`);",
    "- a control without a name: give it the `label` or `aria-label` the line asks for;",
    "- `onClick` on a `div`: use HardwareButton, or Item for a row;",
    "- a field without a label, or an error that's only a colour: name the field, and say the error in words (Field's `error` does both);",
    "- motion outside Echo's: move your own parts with `useTactile`, `createSpring` and the motion tokens, and give every animation a reduced-motion fallback;",
    "- a screen rule: the line quotes the rule by number. Change the screen the way it says (one primary action, a confirm step, a label that names what happens), not the check;",
    "- from the console, `Echo check · contrast`: text too faint for what's behind it. Use the text role made for that ground (`--echo-text`, `--echo-text-dim`), not a colour of your own;",
    "- `Echo check · setup`: the theme, the page's ground or `SoundProvider` is missing. Do what the line says, once, in the root layout.",
    "- `alignment`: text cut off with \"…\" (let it wrap, or fewer words), cards side by side whose actions sit at different heights (each card fills its cell, its actions last), a lone action off its column's edge (start it where the content starts), a grid that leaves columns empty (let the items share the row);",
    "- `depth`: a control that glows at rest (light says a state in Echo: take it off), or a raised surface on a raised one (set the inner one flat or into a well; never a Card in a Card);",
    "- `corners`: parts of one kind with different corners (give them one), or a corner inside a corner that doesn't follow it (the outer radius less the gap, the number the line gives);",
    "- `icons`: one group's icons at different sizes, stroke weights or styles (one set, one size, one stroke);",
    "- `Slop police, …`: something that reads as AI-made (gradient text, an emoji as an icon, the sparkle for AI, \"Get started\", an arrow stapled to a label, a headline that could front any product, a stand-in name or photo, a stripe down one edge, spaced capitals made by hand, an `A · B · C` string). Do what the line says. Never add it to the style's `keeps`: only the builder keeps one. A note about a number that may be invented asks you to use the real one or mark it as sample data.",
    "",
    askTheBuilder(),
    "",
    "## Update Echo",
    "",
    `${cmd("diff")} says which items are behind, and ${cmd("update")} brings them forward, merging Echo's change into files you've edited. Where your edits and Echo's change meet in the same lines, it leaves that item as it is and prints the lines between git's conflict markers: bring Echo's change into those lines of the file, keeping what's yours, then run ${cmd("update <name>")} again. Never re-run \`add --overwrite\` to upgrade; it discards edits without showing them.`,
    "",
  ].join("\n");
}

/* --------------------------------------------------------------- the claims */

/** Echo's one idea, in two sentences: what it is today, and what it promises. */
export const HEADLINE = "Tactile components you can feel.";
export const PROMISE = "The design system that keeps your AI on-brand.";

/**
 * What Echo already does that people have long asked of a UI library, said
 * plainly, in one wording: the installation page renders these, and a test
 * holds the README to them word for word. Each was checked against the code
 * when it was written; the accessibility one is built from the conformance
 * record, so it changes when that does.
 */
/**
 * What isn't covered yet, as the claims say it: each limit's record
 * ("screen-reader: not yet verified by a person") read as a phrase, so the
 * sentence doesn't stack two colons. The records themselves are
 * published per item and stay as they are.
 */
export const CONFORMANCE_OPEN: readonly string[] = CONFORMANCE_LIMITS.map((limit) => limit.replace(/^([^:]+): /, "$1, "));

export const CLAIMS: readonly { title: string; text: string }[] = [
  {
    title: "Updates keep your edits.",
    text: `Echo records a hash of every file it installs. \`${runCommand("diff")}\` says what changed since, and \`${runCommand("update")}\` merges Echo's change into files you've edited; where the two meet in the same lines, it shows them and changes nothing.`,
  },
  {
    title: "`init` doesn't touch your CSS.",
    text: "It writes the theme into its own file in the Echo folder and prints the one import line for you to paste. Your global CSS and your layout stay yours.",
  },
  {
    title: "Few dependencies.",
    text: `\`${ECHO_CORE}\` has none of its own: it asks for React and GSAP, which your app installs once. Components add Base UI where they need it, and nothing else.`,
  },
  {
    title: "First-party code only.",
    text: "Every file you install is Echo's own source, in your repository, where you can read it. Once the repository is public, the release workflow publishes each package with npm provenance, so a version can be traced to the commit it was built from; until then, releases are published by hand.",
  },
  {
    title: "Accessible, and kept that way.",
    text: `Every component is tested against ${CONFORMANCE_STANDARD}: ${CONFORMANCE_CHECKS.map((c) => c.id).join(", ")}. \`${runCommand("check")}\` keeps an agent from undoing it in the screens it builds: unnamed controls, clicks with no keyboard, images without alt text, removed focus rings. What a check can't judge still needs a person: the reading order, and whether a name makes sense. Still open: ${CONFORMANCE_OPEN.join("; ")}.`,
  },
];
