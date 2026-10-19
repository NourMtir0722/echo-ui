/**
 * echo.json, described for the editors that read `$schema`: what each field
 * is, which values it takes, and which ones every project has.
 *
 * `init` points each project's echo.json at `<registry>/schema/config.json`,
 * and the `/e/` build publishes this there, so the two can't drift: the CLI's
 * types come from the lists below too.
 */
import { AXE_RULES, type AxeRule } from "./axe-rules";
import { SEED_SETTINGS } from "./style-schema";

/** Where the schema lives, relative to the registry. */
export const CONFIG_SCHEMA_PATH = "schema/config.json";

export const FRAMEWORKS = ["next", "vite", "unknown"] as const;
export const PACKAGE_MANAGERS = ["npm", "pnpm", "bun", "yarn"] as const;

export type Framework = (typeof FRAMEWORKS)[number];
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

/**
 * Every rule `check` has, by the name its findings carry. `setup`,
 * `contrast` and the design tests (`alignment`, `depth`, `corners`, `icons`)
 * come only from a running page (`check --url`, `test`, `<EchoCheck />`);
 * `colour`, `name` and `screen` from both. `axe` is axe-core's WCAG A and AA
 * rules, which `test`, `check --url` and the Stop gate run on each page
 * (`<EchoCheck />` doesn't); `axe:<id>` names one of them (axe-rules.ts).
 */
export const CHECK_RULES = [
  "colour",
  "space",
  "radius",
  "shadow",
  "timing",
  "motion-library",
  "restyle",
  "label",
  "error-colour",
  "motion",
  "screen",
  "weight",
  "lookalike",
  "echo-class",
  "prop",
  "name",
  "keyboard",
  "img-alt",
  "focus-ring",
  "tabindex",
  "hidden-focusable",
  "team",
  "setup",
  "contrast",
  "alignment",
  "depth",
  "corners",
  "icons",
  "slop",
  "axe",
] as const;
export type CheckRule = (typeof CHECK_RULES)[number];

/**
 * Where a rule looks: `code` is the source (`check`, its hook, the MCP
 * server's `check_code`); `page` is a rendered page (`<EchoCheck />`,
 * `check --url`, `test`, the Stop gate); `axe` runs on the pages `test`,
 * `check --url` and the Stop gate load, and not in `<EchoCheck />`.
 */
export type RuleRuns = "code" | "page" | "both" | "axe";

/** What each rule finds, for the docs and the published schema. */
export const CHECK_RULE_ABOUT: Record<CheckRule, { runs: RuleRuns; about: string }> = {
  colour: { runs: "both", about: "A colour written by hand, or painted on the page, that the seed doesn't make. The theme's colours at any opacity, and `check.colours`, are allowed." },
  space: { runs: "code", about: "Spacing off Echo's scale, or a step of it written as a number. Page layout past 32px is yours." },
  radius: { runs: "code", about: "A corner off Echo's radius scale." },
  shadow: { runs: "code", about: "A shadow or focus ring drawn by hand instead of a `--echo-shadow-*` recipe." },
  timing: { runs: "code", about: "A duration or easing invented instead of one of Echo's motion tokens." },
  "motion-library": { runs: "code", about: "A second animation library imported beside Echo." },
  restyle: { runs: "code", about: "Echo restyled from outside: a class or style on a closed component, your CSS reaching into Echo's classes, a theme token set anywhere but the theme." },
  label: { runs: "code", about: "A field with no label." },
  "error-colour": { runs: "code", about: "`aria-invalid` with no words tied to it: an error said only by colour." },
  motion: { runs: "code", about: "GSAP used straight in a file that uses Echo but not its motion, or an animation with no reduced-motion fallback." },
  screen: { runs: "both", about: "Echo's screen rules: another library's parts on an Echo screen, two primary caps in one decision, something destructive on one press, a confirmation that says \"OK\"; on the page, \"you are here\" lit twice." },
  weight: { runs: "code", about: "A heavy part (WebGL, or a lot of code) loaded with the page instead of lazily." },
  lookalike: { runs: "code", about: "A raw element where Echo has the component: `<button>`, `<select>`, `<input type=\"checkbox\">`, `role=\"switch\"`." },
  "echo-class": { runs: "code", about: "One of Echo's classes borrowed onto a raw element." },
  prop: { runs: "code", about: "A prop an Echo component doesn't take, a value it doesn't have, or one it needs and didn't get, read from the version you installed." },
  name: { runs: "both", about: "A control with no accessible name, which a screen reader can only call \"button\" or \"textbox\"." },
  keyboard: { runs: "code", about: "A click on something a keyboard can't reach, like `onClick` on a `div`." },
  "img-alt": { runs: "code", about: "An `<img>` with no `alt`." },
  "focus-ring": { runs: "code", about: "The focus ring taken away with nothing in its place." },
  tabindex: { runs: "code", about: "A positive `tabIndex`, which takes a part out of the reading order." },
  "hidden-focusable": { runs: "code", about: "`aria-hidden` on something the keyboard still lands on." },
  team: { runs: "code", about: "An import the team banned in `check.ban`, with the team's own words for what to use." },
  setup: { runs: "page", about: "The theme, the page's ground or `SoundProvider` missing from the page." },
  contrast: { runs: "page", about: "Text under WCAG AA against what's actually behind it, gradients included; small text that passes AA but reads under APCA Lc 45." },
  alignment: { runs: "page", about: "Text cut off with \"…\", cards side by side whose actions sit at different heights, a lone action off its column's edge, a grid that leaves columns empty." },
  depth: { runs: "page", about: "A control that glows at rest, or a raised surface on a raised one with no well between." },
  corners: { runs: "page", about: "Parts of one kind with different corners, or a corner inside a corner that doesn't follow it." },
  icons: { runs: "page", about: "One group's icons at different sizes or stroke weights, or one filled among outlined ones." },
  slop: { runs: "code", about: "What reads as made by AI: gradient text, an emoji as an icon, the sparkle for \"AI\", labels like \"Get started\", stand-in names and photos." },
  axe: { runs: "axe", about: "axe-core's WCAG 2.0, 2.1 and 2.2 A and AA rules. `axe:<id>` names one of them (`axe:target-size`)." },
};

/** One axe rule, as echo.json's `check.rules` names it: `axe:target-size`. */
export type AxeRuleKey = `axe:${AxeRule}`;
export const AXE_RULE_KEYS: readonly AxeRuleKey[] = AXE_RULES.map((id) => `axe:${id}` as const);

/** What the team can do to a rule: turn it off, or say it without counting it. */
export const RULE_LEVELS = ["off", "info"] as const;

/** A team's own additions to `check`, from echo.json's `check`. */
export interface TeamRules {
  rules?: Partial<Record<CheckRule | AxeRuleKey, (typeof RULE_LEVELS)[number]>>;
  ban?: { import: string; message: string }[];
  colours?: string[];
}

/** A JSON Schema (draft-07, which every editor reads) for echo.json. */
export function configSchema(): Record<string, unknown> {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "echo.json",
    description: "Where Echo UI keeps this project's components, and where it gets them. Written by `npx echo-ui-cli init`.",
    type: "object",
    properties: {
      $schema: { type: "string", description: "This file's schema." },
      dir: { type: "string", description: "The one folder every Echo item is copied into, relative to the project root." },
      framework: { enum: [...FRAMEWORKS], description: "What the project is built with, as `init` detected it." },
      packageManager: { enum: [...PACKAGE_MANAGERS], description: "What installs the packages Echo's items need." },
      registry: { type: "string", format: "uri", description: "Where items come from: Echo's `/e/` registry, or a copy of it." },
      seed: {
        type: "object",
        description: "The seed the theme and DESIGN.md are made from, as `createEchoTheme` takes it. `init --seed` writes it; Echo's defaults when absent.",
        properties: {
          accent: { type: "string", description: "The one saturated colour, as a hex." },
          chassis: { type: "string", description: "The plastic the device is molded from, as a hex." },
          paper: { type: "string", description: "The colour everything is written in, as a hex." },
          lcdTint: { type: "string", description: "The screens' tint, as a hex; worked out from the chassis when absent." },
          finish: { type: "number", minimum: 0, maximum: 1, description: "Matte (0) to glossy (1)." },
          radius: { type: "number", minimum: 0, maximum: 1, description: "Crisp (0) to soft (1)." },
          density: { enum: ["compact", "default", "comfortable"], description: "How tightly parts are packed." },
          pills: { type: "boolean", description: "Buttons and segments as pills (true) or following the radius (false), whatever the radius." },
          render: { enum: ["molded", "drawn"], description: "Molded and lit (plastic under the key light), or drawn in the ink (outlined, hollow, standing on a hard ink edge)." },
          fontMachine: { type: "string", description: "Labels, caps and captions: a font stack." },
          fontSans: { type: "string", description: "Body text: a font stack." },
          fontMono: { type: "string", description: "Data and code: a font stack." },
          fontLcd: { type: "string", description: "The screens' face: a font stack." },
        },
      },
      style: {
        type: "object",
        description: "The style this project wears, as `npx echo-ui-cli style use` applied it: what DESIGN.md tells the agent. Its colours, fonts and shape are the seed.",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          essence: { type: "string", description: "One line: what the style is." },
          from: { enum: ["echo", "yours"], description: "Echo's library, or your own (your Documents' styles folder)." },
          rules: { type: "array", items: { type: "string" }, description: "Short lines for the agent: how screens in this style are put together." },
          refusals: {
            type: "array",
            description: "What the style wanted that Echo's grammar refuses, and the closest Echo gets.",
            items: { type: "object", properties: { wants: { type: "string" }, instead: { type: "string" } }, required: ["wants", "instead"], additionalProperties: false },
          },
          fonts: {
            type: "array",
            description: "The fonts the style uses, and where to get them.",
            items: {
              type: "object",
              properties: { role: { enum: ["machine", "sans", "mono", "lcd"] }, family: { type: "string" }, source: { type: "string" }, url: { type: "string" } },
              required: ["role", "family", "source"],
              additionalProperties: false,
            },
          },
          changed: {
            type: "array",
            items: { enum: [...SEED_SETTINGS] },
            description: "The settings `npx echo-ui-cli style set` has moved since the style was worn: the project wears the style with these changed. `style use` clears it.",
          },
        },
        required: ["name", "title", "essence", "from"],
        additionalProperties: false,
      },
      check: {
        type: "object",
        description: "The team's own additions to `npx echo-ui-cli check`. Nothing here is needed; it only adds.",
        properties: {
          rules: {
            type: "object",
            description:
              "Turn a rule off, or to `info`: said, never counted. `axe` is every axe rule `test` runs, and `axe:<id>` one of them (`axe:target-size`). Problems a project already has are kept rule by rule, `\"axe:target-size\": \"info\"`, so new ones still count; `\"axe\": \"info\"` hides those too.",
            propertyNames: { enum: [...CHECK_RULES, ...AXE_RULE_KEYS] },
            properties: Object.fromEntries(CHECK_RULES.map((rule) => [rule, { enum: [...RULE_LEVELS], description: CHECK_RULE_ABOUT[rule].about }])),
            additionalProperties: { enum: [...RULE_LEVELS] },
          },
          ban: {
            type: "array",
            description: "Imports the team doesn't use, each with what to use instead.",
            items: {
              type: "object",
              properties: {
                import: { type: "string", description: "A module, or a prefix ending in `*` (`@/legacy/*`)." },
                message: { type: "string", description: "What to use instead, in the team's words." },
              },
              required: ["import", "message"],
              additionalProperties: false,
            },
          },
          colours: {
            type: "array",
            description: "Brand colours the seed doesn't produce (a logo's colour), allowed where the check would flag a colour written by hand.",
            items: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
          },
        },
        additionalProperties: false,
      },
      test: {
        type: "object",
        description: "What `npx echo-ui-cli test` and the Stop gate run Echo's tests on (the design tests, contrast, names and axe). Nothing here is needed: without it they find the app's routes and the port its dev script runs on.",
        properties: {
          url: { type: "string", format: "uri", description: "Where the app runs, `http://localhost:3000`." },
          routes: { type: "array", description: "The pages to test, as paths (`/`, `/pricing`): for a page with a `[slug]`, name one.", items: { type: "string", pattern: "^/" } },
          widths: { type: "array", description: "Widths to test each page at, in pixels. Default `[1280]`.", items: { type: "number", minimum: 240, maximum: 3840 }, minItems: 1 },
          stop: { type: "boolean", description: "`false` turns the Stop gate off: Claude Code no longer runs Echo's tests when the agent stops. `test` still runs." },
        },
        additionalProperties: false,
      },
    },
    required: ["dir", "framework", "packageManager", "registry"],
    additionalProperties: false,
  };
}
