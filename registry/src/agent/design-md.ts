/**
 * DESIGN.md: this project's look, in Echo's terms, in the sections Google's
 * DESIGN.md format uses (Overview, Colors, Typography, Layout, Elevation &
 * Depth, Shapes, Components, Do's and Don'ts), plus Echo's own (Motion,
 * Sound). `init` writes it at the project root between Echo's markers, and
 * the block in CLAUDE.md / AGENTS.md points to it for screen work.
 *
 * Read on demand, not in every session: an always-loaded design file is what
 * made agents cost ~92% more tokens in Atlassian's test, so this one is kept
 * short and loaded only when a screen is built. Everything in it is rendered
 * from the theme this project's seed produces and from what the rest of the
 * agent layer already says, so it can't drift from the code.
 */
import {
  BREAKPOINTS,
  CONTROL_HEIGHT,
  DURATION_SCALE,
  ECHO_FONT_ROLES,
  ECHO_ROLES,
  RADIUS_SCALE,
  SEED_DEFAULTS,
  SHADOW_RECIPES,
  SPACE_SCALE,
  TEXT_STYLES,
  createEchoTheme,
  type EchoSeedInput,
} from "echo-ui-core/theme";
import { SOUND_NAMES } from "echo-ui-core/sound";

import { ACCESSIBILITY_SHORT, BLOCK_END, BLOCK_START, ECHO_CORE, REGISTRY_HOMEPAGE, STYLE_LIBRARY, runCommand } from "./guidance";
import { ROLE_ABOUT } from "./roles-about";
import { DECISIONS, undecided, type AppliedStyle, type DecisionKey } from "./style-schema";

export interface DesignContext {
  /** The Echo folder, as echo.json names it. */
  dir: string;
  /** The seed the theme was made from; the defaults when absent. */
  seed?: EchoSeedInput;
  /** Which CLI wrote it, as a stamp line (guidance's `writtenBy`). */
  stamp?: string;
  /** The items this project has installed, by the name they're installed under. */
  installed?: readonly string[];
  /**
   * For a project without Echo (the generator's download): it opens by
   * sending an agent that has a terminal to `init`, with this seed.
   */
  standalone?: boolean;
  /** The style the project wears (`style use`): its rules and refusals are the agent's to keep. */
  style?: AppliedStyle;
}

const px = (v: string) => v.replace(/px$/, "");

/** The seed as `init --seed` takes it: the accent, then chassis and paper only as far as they differ from Echo's. */
export function seedFlag(seed: EchoSeedInput = {}): string {
  const defaults = [SEED_DEFAULTS.accent, SEED_DEFAULTS.chassis, SEED_DEFAULTS.paper];
  const parts = [seed.accent ?? defaults[0]!, seed.chassis ?? defaults[1]!, seed.paper ?? defaults[2]!];
  while (parts.length > 1 && parts[parts.length - 1]!.toLowerCase() === defaults[parts.length - 1]!.toLowerCase()) parts.pop();
  return parts.join(",");
}

/** The style's own part of DESIGN.md: what it is, how its screens are put together, what it gave up. */
function styleSection(style: AppliedStyle): string[] {
  const from = style.from === "echo" ? "Echo's library" : "this builder's own library";
  return [
    "## Style",
    "",
    `**${style.title}**, from ${from}: ${style.essence} Its colours, type and shape are the seed below; the grammar above is unchanged.${style.changed?.length ? ` Changed for this product with \`${runCommand("style set")}\`: ${style.changed.join(", ")}; the values below are the ones to use.` : ""}`,
    ...(style.decisions && Object.keys(style.decisions).length
      ? [
          "",
          "Every screen keeps these decisions. Every choice on a screen comes from one of them, from Echo's own default, or from the builder: never from your own habits.",
          "",
          ...(Object.keys(DECISIONS) as DecisionKey[]).filter((key) => style.decisions![key]).map((key) => `- **${DECISIONS[key]}:** ${style.decisions![key]}`),
          ...(undecided(style).length
            ? ["", `Not decided by the style: ${undecided(style).map((key) => DECISIONS[key].toLowerCase()).join("; ")}. Ask the builder (one message, at most three questions, a suggested answer first), or use Echo's default and say so.`]
            : []),
        ]
      : []),
    ...(style.rules?.length ? ["", "Build every screen to these:", "", ...style.rules.map((rule) => `- ${rule}`)] : []),
    ...(style.keeps?.length
      ? ["", `The builder kept these on purpose, though the slop police (\`${runCommand("check")}\`) bans them elsewhere:`, "", ...style.keeps.map((k) => `- ${k.rule}: ${k.reason}`)]
      : []),
    ...(style.refusals?.length
      ? ["", "What the style wanted that Echo's grammar refuses, and the closest Echo gets. Don't reach for the first:", "", ...style.refusals.map((r) => `- ${r.wants}: instead, ${r.instead}`)]
      : []),
    ...(style.fonts?.length ? ["", `Fonts: ${style.fonts.map((f) => `${f.family} (${f.role}, ${f.source})`).join("; ")}.`] : []),
    "",
  ];
}

export function designMd({ dir, seed, stamp, installed = [], standalone = false, style }: DesignContext): string {
  const { values } = createEchoTheme(seed, { quiet: true });
  const { finish, radius, density, render, pills } = values.device;
  const light = values.polarity === "light";
  const drawn = render === "drawn";
  const cmd = (c: string) => `\`${runCommand(c)}\``;
  // A style is set up by its name, so the project keeps its rules too; a bare seed, by its colours.
  const setup = style
    ? `${cmd(`init --style ${style.name}`)}${style.from === "yours" ? ` (with the style's folder in the builder's library, \`${STYLE_LIBRARY}/${style.name}/\`)` : ""}`
    : cmd(`init --seed ${seedFlag(seed)}`);
  const opening = standalone
    ? `This is **Echo UI**'s look, from ${style ? `the ${style.title} style` : "the seed below"}, for a project that doesn't have Echo yet: tactile React components, on the grammar in the \`${ECHO_CORE}\` package. **In a project with a terminal, don't build from this file:** run ${setup}, then ${cmd('which "<the job>"')} and ${cmd("add <name>")} for each part; \`init\` writes this file again for what it installs. Without a terminal, put the theme's CSS on the page (${REGISTRY_HOMEPAGE}/generator copies it), style only with \`var(--echo-*)\`, and give the agent ${REGISTRY_HOMEPAGE}/llms.txt.`
    : `This project's interface is **Echo UI**: tactile React components in \`${dir}/\`, on the grammar in the \`${ECHO_CORE}\` package. This file is its look in Echo's terms. **In this codebase, build with those components; don't rebuild them from this file.** ${cmd('which "<the job>"')} names the part for a job, ${cmd("docs <name>")} shows it.`;
  return [
    BLOCK_START,
    ...(stamp ? [stamp] : []),
    "# Design",
    "",
    opening,
    "",
    "## Overview",
    "",
    drawn
      ? `A device, not a skin, drawn in the ink: every part outlined at one weight and hollow on the ${light ? "paper" : "body"}, the way a spec sheet draws a key; raised parts stand on a hard ink edge and travel down it when pressed, and the primary key is the paper one that stands highest; nothing glows, so what's lit is solid ink and the accent is a fill under it. The grammar is fixed (what each material is for, state without hue, motion as physics, sound as feedback, WCAG 2.2 AA); a drawn device only shows its parts in line instead of light. The vocabulary below (colour, type, radius, density, render) comes from this project's ${style ? `style, ${style.title}` : "seed"}, and its pale or dark chassis makes this a ${light ? "light" : "dark"} device.`
      : `A device, not a skin: ${light ? "light molded plastic" : "molded plastic"} lit by one key light from the upper left, ${light ? "screens of paper glass printed in ink" : "screens that glow"}, keys that travel when pressed. The grammar is fixed (the light, what each material is for, state without hue, motion as physics, sound as feedback, WCAG 2.2 AA). The vocabulary below (colour, type, radius, density, finish) comes from this project's ${style ? `style, ${style.title}` : "seed"}, and its pale or dark chassis makes this a ${light ? "light" : "dark"} device.`,
    "",
    ...(style ? styleSection(style) : []),
    "## Colors",
    "",
    "| Role | Value | For |",
    "| --- | --- | --- |",
    ...ECHO_ROLES.map((role) => `| \`--echo-${role}\` | ${values.roles[role].toLowerCase()} | ${ROLE_ABOUT[role]} |`),
    "",
    drawn
      ? "One colour, a flat fill for what's on: what's chosen (a segment, a checked box, the current page), a slider's travel, a switch that's on, with whatever's drawn on it inverted when the ink can't read there. The primary key isn't filled: it's the paper key that stands highest. What a molded device lights (LEDs, the rail, a readout, the focus ring) is solid ink. A state is said in words and shape, never by hue: there's no success green or danger red."
      : `One saturated colour, with two jobs only: a lit cap (the primary action, the current page) and ${light ? "what's lit (LEDs, the rail), with the text it lights and the focus ring printed in the accent's ink (screen digits, a current tab)" : "something emitting light (LEDs, LCD digits, the rail)"}. A state is said in words and shape, never by hue: there's no success green or danger red.`,
    "",
    "## Typography",
    "",
    ...ECHO_FONT_ROLES.map((role) => `- \`--echo-font-${role}\`: ${values.fonts[role]}`),
    `- Text styles, as \`font: var(--echo-type-<style>)\`: ${Object.keys(TEXT_STYLES).join(", ")}.`,
    "",
    "## Layout",
    "",
    `- Spacing, \`--echo-space-1\` to \`--echo-space-${Object.keys(SPACE_SCALE).length - 1}\`: ${Object.values(SPACE_SCALE).slice(1).map(px).join(", ")}px, at density \`${density}\`.`,
    `- Control heights: ${Object.entries(CONTROL_HEIGHT).map(([k, v]) => `${k} ${v}`).join(", ")}. No target is smaller than 24×24px.`,
    `- Breakpoints: ${Object.values(BREAKPOINTS).join(", ")}.`,
    "",
    "## Elevation & Depth",
    "",
    drawn
      ? "Drawn, not lit: every part is outlined in the ink (`var(--echo-line-width)` of `var(--echo-line)`), a raised part stands on a hard ink edge as deep as it rises, a recess is an outline drawn inside, and something floating stands on a deeper edge. Nothing casts a soft shadow. Take a recipe, never a shadow written by hand, and outline your own parts with the line:"
      : "Raised parts catch light on their top edge and cast a shadow below; recessed parts are shaded at the top and lit at the bottom lip. Take a recipe, never a shadow written by hand:",
    "",
    ...Object.entries(SHADOW_RECIPES).map(([name, r]) => `- \`--echo-shadow-${name}\`: ${r.use}`),
    "",
    "## Shapes",
    "",
    `- Radius, \`--echo-radius-*\`: ${Object.entries(RADIUS_SCALE).map(([k, v]) => `${k} ${v}`).join(", ")}, at this seed's radius ${radius} (0 crisp, 1 soft). Buttons and segments ${pills ? "are pills" : "follow the radius"} (\`pills\`).`,
    drawn
      ? "- Render `drawn`: parts are drawn in the ink instead of molded and lit, so finish doesn't apply."
      : `- Finish ${finish} (0 matte, 1 glossy): how brightly edges shine and how deep shadows fall.`,
    "",
    "## Motion",
    "",
    `- Durations, \`--echo-duration-*\`: ${Object.entries(DURATION_SCALE).map(([k, v]) => `${k} ${v}`).join(", ")}, each with its \`--echo-ease-*\`.`,
    "- Controls acknowledge you quickly; things that arrive and leave take a little longer; glass moves smoothly, pixels move in steps. Anything the hand can redirect moves on a spring. Under reduced motion, movement collapses to a fade or stops.",
    "",
    "## Sound",
    "",
    `- ${SOUND_NAMES.length} tokens: ${SOUND_NAMES.join(", ")}. Dry and short, like a device. It confirms what you can see and never carries anything on its own; it starts muted until the person turns it on.`,
    "",
    "## Components",
    "",
    standalone
      ? `Not installed here. With a terminal, ${cmd('which "<the job>"')} names the part for a job and ${cmd("add <name>")} copies it in; without one, ${REGISTRY_HOMEPAGE}/llms.txt describes every part.`
      : installed.length
        ? `Installed here: ${installed.join(", ")}. ${cmd("which")} names the rest by job.`
        : `None installed yet: ${cmd('which "<the job>"')} names one, ${cmd("add <name>")} copies it in.`,
    "",
    "## Do's and Don'ts",
    "",
    "- Do use Echo's component for every job it has, and build what it lacks from Echo's parts, styled only with `var(--echo-*)`.",
    "- Do keep one primary action per form or dialog, and put anything destructive behind a confirmation that names what happens.",
    ...ACCESSIBILITY_SHORT.map((rule) => `- Do: ${rule}.`),
    "- Don't write a colour, a shadow, a spacing or a duration by hand; don't restyle Echo from outside (a `className` it doesn't take, CSS aimed at `.echo-…`); don't show a state with colour alone.",
    `- Don't mix another component library into an Echo screen. After changing UI, run ${cmd("check")}.`,
    BLOCK_END,
  ].join("\n");
}
