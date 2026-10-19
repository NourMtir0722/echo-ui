/**
 * A style, as data: what Design Eye writes next to a style's foundation
 * document, what Echo publishes for its own styles, and what `style use`
 * applies to a project.
 *
 * A style changes Echo's vocabulary, never its grammar. What it can set today
 * is the seed (colours, finish, radius, density, the four type roles); the
 * rest is for the agent (rules), for the builder (the fonts to install), or
 * said out loud (what the board wanted that Echo refuses, and its closest).
 * Motion and sound are recorded as read from the board, for when a style can
 * set them.
 *
 * Checked by hand, with no schema library, so the CLI and the MCP read a style
 * the same way and the published JSON Schema below says the same thing. The
 * seed inside is checked again by `createEchoTheme`, which also corrects its
 * contrast.
 */

import { FLOOR, KEEPABLE } from "./slop";

/** Where the schema lives, relative to the registry. */
export const STYLE_SCHEMA_PATH = "schema/style.json";

/** The file's version. A newer Echo reads an older file; a newer file than this Echo knows is refused. */
export const STYLE_VERSION = 1;

/** The seven axes a style is placed on, 1 to 5, with what each end means. */
export const AXES = {
  warmth: ["clinical", "human"],
  volume: ["whisper", "shout"],
  density: ["sparse", "dense"],
  formality: ["playful", "severe"],
  era: ["heritage", "futuristic"],
  craft: ["raw", "engineered"],
  ornament: ["austere", "decorative"],
} as const;
export type Axis = keyof typeof AXES;
export type Fingerprint = Record<Axis, number>;

export const FONT_ROLES = ["machine", "sans", "mono", "lcd"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

export const DENSITIES = ["compact", "default", "comfortable"] as const;
/** Molded and lit, or drawn in the ink: how the parts are shown, never what they are. */
export const RENDERS = ["molded", "drawn"] as const;

/** The part of a style the theme applies: the seed, as `createEchoTheme` takes it. */
export interface StyleSeed {
  accent?: string;
  chassis?: string;
  paper?: string;
  lcdTint?: string;
  finish?: number;
  radius?: number;
  density?: (typeof DENSITIES)[number];
  render?: (typeof RENDERS)[number];
  pills?: boolean;
  fontMachine?: string;
  fontSans?: string;
  fontMono?: string;
  fontLcd?: string;
}

export interface StyleFont {
  role: FontRole;
  /** The family, as `font-family` takes it: "IBM Plex Sans". */
  family: string;
  /** Where to get it: "Google Fonts", "system", "owned". */
  source: string;
  url?: string;
}

/** Something the board wants that Echo's grammar refuses, and the closest Echo gets. */
export interface StyleRefusal {
  wants: string;
  instead: string;
}

/**
 * The decisions every screen in the style keeps: what a designer used to
 * settle in each screen's mock. Design Eye writes them from the board, one
 * short line each; one the board doesn't show stays out, and the agent
 * building a screen asks the builder or uses Echo's default and says so.
 * The labels are how DESIGN.md says them.
 */
export const DECISIONS = {
  emphasis: "How something is made important",
  primaryAction: "The one main action",
  secondaryAction: "A second action",
  destructiveAction: "A destructive action",
  currentPlace: "\"You are here\"",
  status: "How a state is said",
  typeRoles: "What each type size is for",
  layout: "How a screen is composed",
  surfaces: "How one level sits above another",
  colourJobs: "What each colour is for",
  iconography: "Icons",
  imagery: "Photos and illustration",
  copyVoice: "How the product talks",
  emptyStates: "An empty screen",
} as const;
export type DecisionKey = keyof typeof DECISIONS;
export type StyleDecisions = Partial<Record<DecisionKey, string>>;

/** A pairing the slop police bans that the builder chose to keep, in their words. Only the builder adds one. */
export interface StyleKeep {
  /** The police's name for it: `cream-terracotta`, `gradient-text`. */
  rule: string;
  reason: string;
}

export interface EchoStyle {
  $schema?: string;
  version: number;
  /** The folder's name: lower case, words joined by hyphens. */
  name: string;
  title: string;
  /** One line: what the style is. */
  essence: string;
  fingerprint: Fingerprint;
  seed: StyleSeed;
  fonts?: StyleFont[];
  /** Short lines for the agent: how screens in this style are put together. */
  rules?: string[];
  refusals?: StyleRefusal[];
  /** What every screen keeps, one line per decision. */
  decisions?: StyleDecisions;
  /** Banned pairings the builder kept on purpose, with their reason. */
  keeps?: StyleKeep[];
  /** Read from the board, not applied yet: a style can't set motion or sound today. */
  motion?: { character: string; inferred: boolean };
  sound?: { voice: string; inferred: boolean };
}

/**
 * What a project records about the style it wears, in echo.json: what the
 * agent needs to keep to it (DESIGN.md is written from this) and where it came
 * from. The colours, fonts and shape are the project's `seed`. The foundation
 * document and the moodboard stay in the builder's library.
 */
export interface AppliedStyle {
  name: string;
  title: string;
  essence: string;
  /** Echo's library, or the builder's own (their Documents). */
  from: "echo" | "yours";
  rules?: string[];
  refusals?: StyleRefusal[];
  fonts?: StyleFont[];
  decisions?: StyleDecisions;
  /** What the builder kept of what the slop police bans: `check` doesn't flag these. */
  keeps?: StyleKeep[];
  /**
   * The settings `style set` has moved since the style was worn: the project
   * wears the style with these changed. `style use` clears it.
   */
  changed?: SeedSetting[];
}

/** The part of a style a project keeps. */
export function appliedStyle(style: EchoStyle, from: AppliedStyle["from"]): AppliedStyle {
  const { name, title, essence, rules, refusals, fonts, decisions, keeps } = style;
  return {
    name,
    title,
    essence,
    from,
    ...(rules?.length ? { rules } : {}),
    ...(refusals?.length ? { refusals } : {}),
    ...(fonts?.length ? { fonts } : {}),
    ...(decisions && Object.keys(decisions).length ? { decisions } : {}),
    ...(keeps?.length ? { keeps } : {}),
  };
}

/** The decisions a style leaves open: where the agent building a screen asks, or uses Echo's default and says so. */
export function undecided(style: { decisions?: StyleDecisions }): DecisionKey[] {
  return (Object.keys(DECISIONS) as DecisionKey[]).filter((key) => !style.decisions?.[key]?.trim());
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOURS = ["accent", "chassis", "paper", "lcdTint"] as const;
const UNIT = ["finish", "radius"] as const;
const FONTS = ["fontMachine", "fontSans", "fontMono", "fontLcd"] as const;

/** Everything a seed can set, in the order it's said: the names `style set` takes. */
export const SEED_SETTINGS = [...COLOURS, ...UNIT, "density", "render", "pills", ...FONTS] as const;
export type SeedSetting = (typeof SEED_SETTINGS)[number];

/** Settings that are numbers (the rest are text): how `style set` reads a value from the command line. */
export const NUMBER_SETTINGS: readonly SeedSetting[] = UNIT;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/**
 * A seed's problems, each in words, or none: what a style's `seed` may hold,
 * and what `style set` accepts, in one place so the two never disagree.
 * `prefix` names where the seed sits (`seed.` inside a style file).
 */
export function seedProblems(seed: Record<string, unknown>, prefix = ""): string[] {
  const problems: string[] = [];
  for (const key of COLOURS) if (seed[key] !== undefined && !(typeof seed[key] === "string" && HEX.test(seed[key]))) problems.push(`\`${prefix}${key}\` is a six-digit hex: \`#8B6FE8\`.`);
  for (const key of UNIT) if (seed[key] !== undefined && !(typeof seed[key] === "number" && seed[key] >= 0 && seed[key] <= 1)) problems.push(`\`${prefix}${key}\` is a number from 0 to 1.`);
  if (seed.density !== undefined && !DENSITIES.includes(seed.density as (typeof DENSITIES)[number])) problems.push(`\`${prefix}density\` is ${DENSITIES.map((d) => `"${d}"`).join(", ")}.`);
  if (seed.pills !== undefined && typeof seed.pills !== "boolean") problems.push(`\`${prefix}pills\` is true or false: buttons and segments as pills, whatever the radius.`);
  if (seed.render !== undefined && !RENDERS.includes(seed.render as (typeof RENDERS)[number])) problems.push(`\`${prefix}render\` is ${RENDERS.map((r) => `"${r}"`).join(" or ")}: molded and lit, or drawn in the ink.`);
  for (const key of FONTS) if (seed[key] !== undefined && !isText(seed[key])) problems.push(`\`${prefix}${key}\` is a font stack: \`"IBM Plex Sans", system-ui, sans-serif\`.`);
  const known = new Set<string>(SEED_SETTINGS);
  for (const key of Object.keys(seed)) if (!known.has(key)) problems.push(`\`${prefix}${key}\` isn't something a style can set yet. It can set: ${SEED_SETTINGS.join(", ")}.`);
  return problems;
}

/**
 * A style file's problems, each in words, or none. Everything is listed at
 * once: a file with three mistakes says three things.
 */
export function styleProblems(input: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(input)) return ["A style is a JSON object."];
  const s = input;

  if (typeof s.version !== "number" || !Number.isInteger(s.version) || s.version < 1) problems.push("`version` is a whole number, 1 or more.");
  else if (s.version > STYLE_VERSION) problems.push(`\`version\` ${s.version} is newer than this Echo reads (${STYLE_VERSION}): update echo-ui-cli.`);
  if (!isText(s.name) || !NAME.test(s.name)) problems.push("`name` is lower case, words joined by hyphens: `porcelain-window`.");
  if (!isText(s.title)) problems.push("`title` is the style's name as people say it: `Porcelain Window`.");
  if (!isText(s.essence)) problems.push("`essence` is one line saying what the style is.");

  if (!isObject(s.fingerprint)) problems.push(`\`fingerprint\` places the style on the seven axes, 1 to 5: ${Object.keys(AXES).join(", ")}.`);
  else {
    for (const axis of Object.keys(AXES) as Axis[]) {
      const v = s.fingerprint[axis];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) problems.push(`\`fingerprint.${axis}\` is a whole number from 1 (${AXES[axis][0]}) to 5 (${AXES[axis][1]}).`);
    }
    for (const key of Object.keys(s.fingerprint)) if (!(key in AXES)) problems.push(`\`fingerprint.${key}\` isn't an axis. The axes: ${Object.keys(AXES).join(", ")}.`);
  }

  if (!isObject(s.seed)) problems.push("`seed` is what the theme applies: colours, finish, radius, density and fonts.");
  else problems.push(...seedProblems(s.seed, "seed."));

  if (s.fonts !== undefined) {
    if (!Array.isArray(s.fonts)) problems.push("`fonts` is a list.");
    else
      s.fonts.forEach((f, i) => {
        if (!isObject(f) || !FONT_ROLES.includes(f.role as FontRole) || !isText(f.family) || !isText(f.source)) {
          problems.push(`\`fonts[${i}]\` needs \`role\` (${FONT_ROLES.join(", ")}), \`family\` and \`source\`.`);
        }
      });
  }
  if (s.rules !== undefined && !(Array.isArray(s.rules) && s.rules.every(isText))) problems.push("`rules` is a list of short lines.");
  if (s.refusals !== undefined) {
    if (!Array.isArray(s.refusals)) problems.push("`refusals` is a list.");
    else
      s.refusals.forEach((r, i) => {
        if (!isObject(r) || !isText(r.wants) || !isText(r.instead)) problems.push(`\`refusals[${i}]\` needs \`wants\` and \`instead\`.`);
      });
  }
  if (s.decisions !== undefined) {
    if (!isObject(s.decisions)) problems.push(`\`decisions\` is an object, one short line per decision: ${Object.keys(DECISIONS).join(", ")}.`);
    else
      for (const [key, value] of Object.entries(s.decisions)) {
        if (!(key in DECISIONS)) problems.push(`\`decisions.${key}\` isn't a decision a style makes. They are: ${Object.keys(DECISIONS).join(", ")}.`);
        else if (!isText(value)) problems.push(`\`decisions.${key}\` is one short line.`);
      }
  }
  if (s.keeps !== undefined) {
    if (!Array.isArray(s.keeps)) problems.push("`keeps` is a list of what the builder kept, each `{ rule, reason }`.");
    else
      s.keeps.forEach((k, i) => {
        if (!isObject(k) || !isText(k.rule) || !isText(k.reason)) problems.push(`\`keeps[${i}]\` needs \`rule\` and \`reason\`, the builder's own words.`);
        else if (FLOOR.includes(k.rule)) problems.push(`\`keeps[${i}]\`: ${k.rule} can't be kept. Fake content is wrong whatever the style.`);
        else if (!KEEPABLE.includes(k.rule)) problems.push(`\`keeps[${i}].rule\` is ${k.rule}, which the slop police doesn't ban. It bans: ${KEEPABLE.join(", ")}.`);
      });
  }
  for (const key of ["motion", "sound"] as const) {
    const v = s[key];
    const field = key === "motion" ? "character" : "voice";
    if (v !== undefined && !(isObject(v) && isText(v[field]) && typeof v.inferred === "boolean")) problems.push(`\`${key}\` needs \`${field}\` and \`inferred\`.`);
  }
  return problems;
}

/** A style file read and checked: the style, or every problem with it. */
export function parseStyle(input: unknown): { style: EchoStyle; problems: [] } | { style: undefined; problems: string[] } {
  const problems = styleProblems(input);
  return problems.length ? { style: undefined, problems } : { style: input as EchoStyle, problems: [] };
}

/** The same rules, as the JSON Schema editors read from a style file's `$schema`. */
export function styleSchema(): Record<string, unknown> {
  const hex = { type: "string", pattern: HEX.source };
  const unit = { type: "number", minimum: 0, maximum: 1 };
  const font = { type: "string", minLength: 1 };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Echo UI style",
    description: "A style, as data: what Echo's Design Eye writes next to a style's foundation, and what `echo-ui style use` applies.",
    type: "object",
    required: ["version", "name", "title", "essence", "fingerprint", "seed"],
    properties: {
      $schema: { type: "string" },
      version: { type: "integer", minimum: 1, maximum: STYLE_VERSION, description: "The file's version." },
      name: { type: "string", pattern: NAME.source, description: "Lower case, words joined by hyphens." },
      title: { type: "string", minLength: 1 },
      essence: { type: "string", minLength: 1, description: "One line: what the style is." },
      fingerprint: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(AXES),
        properties: Object.fromEntries(
          (Object.entries(AXES) as [Axis, readonly [string, string]][]).map(([axis, [low, high]]) => [
            axis,
            { type: "integer", minimum: 1, maximum: 5, description: `1 ${low} to 5 ${high}` },
          ]),
        ),
      },
      seed: {
        type: "object",
        additionalProperties: false,
        properties: {
          accent: hex,
          chassis: hex,
          paper: hex,
          lcdTint: hex,
          finish: unit,
          radius: unit,
          density: { enum: [...DENSITIES] },
          pills: { type: "boolean", description: "Buttons and segments are pills (true) or follow the radius (false), whatever the radius. Unset: pills at radius 1 only." },
          render: { enum: [...RENDERS], description: "molded: plastic lit by the key light. drawn: the same parts drawn in the ink, outlined and hollow, standing on a hard ink edge." },
          fontMachine: font,
          fontSans: font,
          fontMono: font,
          fontLcd: font,
        },
      },
      fonts: {
        type: "array",
        items: {
          type: "object",
          required: ["role", "family", "source"],
          properties: { role: { enum: [...FONT_ROLES] }, family: font, source: font, url: { type: "string" } },
        },
      },
      rules: { type: "array", items: { type: "string", minLength: 1 } },
      refusals: {
        type: "array",
        items: { type: "object", required: ["wants", "instead"], properties: { wants: font, instead: font } },
      },
      decisions: {
        type: "object",
        additionalProperties: false,
        description: "What every screen keeps, one short line per decision.",
        properties: Object.fromEntries(Object.entries(DECISIONS).map(([key, label]) => [key, { type: "string", minLength: 1, description: label }])),
      },
      keeps: {
        type: "array",
        description: "Banned pairings the builder kept on purpose. Only the builder adds one.",
        items: { type: "object", required: ["rule", "reason"], properties: { rule: { enum: [...KEEPABLE] }, reason: font } },
      },
      motion: { type: "object", required: ["character", "inferred"], properties: { character: font, inferred: { type: "boolean" } } },
      sound: { type: "object", required: ["voice", "inferred"], properties: { voice: font, inferred: { type: "boolean" } } },
    },
  };
}
