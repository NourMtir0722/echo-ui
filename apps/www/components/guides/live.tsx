/**
 * Live values for the guide pages. Every table here is rendered from the
 * registry's own exports, so a guide cannot name a token, a seed field or a
 * tool that does not exist — the freshness rule the component pages follow,
 * applied to prose.
 *
 * The description maps are typed as Records over the real key sets: add a
 * role, a font role or a seed field and the site stops compiling until the
 * guide says what it is.
 */
import type { ReactNode } from "react";
import { ECHO_FONT_ROLES, ECHO_ROLES, type EchoFontRole } from "echo-ui-core/theme";
import { defaultSeed, type EchoSeedResolved } from "echo-ui-core/theme";
import { EchoSeedSchema } from "@registry/echo/theme/seed-schema";
import {
  DURATION_SCALE,
  EASE_SCALE,
  LEADING_SCALE,
  TEXT_STYLES,
  TRACKING_SCALE,
  TYPE_SCALE,
  WEIGHT_SCALE,
  Z_SCALE,
  BORDER_SCALE,
  ICON_SCALE,
  BREAKPOINTS,
  SHADOW_RECIPES,
} from "echo-ui-core/theme";
import { motion, type MotionName } from "echo-ui-core/motion";
import { HAPTIC_FOR_SOUND, sound, type SoundName } from "echo-ui-core/sound";
import { describeProps } from "@registry/agent/props";
import { motionNames, soundNames } from "@registry/agent/token-usage";
import { ALL_METAS } from "@registry/agent/metas";
import {
  AGENT_INSTRUCTIONS,
  CONFORMANCE,
  ECHO_CLI,
  HOSTED_MCP_URL,
  REGISTRY_HOMEPAGE,
  CLAIMS,
  installCommand,
  projectBlock,
} from "@registry/agent/guidance";
import { CSP_NEEDS, cspPolicy } from "@registry/agent/csp";
import { ROLE_ABOUT } from "@registry/agent/roles-about";
import { CHECK_RULES, CHECK_RULE_ABOUT, configSchema, type RuleRuns } from "@registry/agent/config-schema";
import { CLI_FLAG_ABOUT } from "@registry/agent/cli-options";
// Not "echo-ui-core/check": in development that's a "use client" module, and a
// server component importing data from one gets a reference, not the array.
import { PAGE_RULES } from "../../../../packages/core/src/check/types";
import { TOOL_DEFINITIONS } from "../../../../mcp/src/tools";
import { CHATGPT_LISTING_URL, CODEX_FOLDER, LOCAL_MARKETPLACE, PLUGIN_NAME, SITE_DOWNLOADS } from "../../../../mcp/src/plugin-downloads";
import { CodeBlock } from "@/components/CodeBlock";
import { InstallCommand } from "@/components/InstallCommand";
import { PreRelease } from "@/components/PreRelease";
import { DOC_GROUPS, DOC_ITEMS } from "@/components/docs-manifest";
import { changelogSource, installedFiles, principlesSource, registrySummary } from "@/components/docs-server";
import { MarkdownDocument, inline } from "@/components/inline-markdown";
import { slugify } from "../../mdx-components";
import { GROUP_OVERVIEWS } from "@/components/site/docs-nav";
import { GUIDE_SECTIONS, guideHref } from "@/components/guides";

function Table({ label, head, children }: { label: string; head: string[]; children: ReactNode }) {
  return (
    <div className="guide__table" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------- registry --- */

export const HOMEPAGE = REGISTRY_HOMEPAGE;

/**
 * The "not released yet" banner, for the two guides that show commands as
 * plain code blocks rather than through `InstallCommand` — which carries the
 * banner itself everywhere else.
 */
export { PreRelease };

/** The one command that makes a project ready. */
export function InitLine({ runner = `npx ${ECHO_CLI}` }: { runner?: string }) {
  return <CodeBlock code={`${runner} init`} label="sh" copyLabel="init command" />;
}

/**
 * The `echo.json` init writes. Spelled out from the real host rather than
 * pasted, so the registry URL on this page is the one the CLI defaults to.
 */
export function EchoConfig() {
  const config = {
    $schema: `${REGISTRY_HOMEPAGE}/e/schema/config.json`,
    dir: "src/components/echo",
    framework: "next",
    packageManager: "pnpm",
    registry: `${REGISTRY_HOMEPAGE}/e`,
  };
  return <CodeBlock code={JSON.stringify(config, null, 2)} label="echo.json" />;
}

/** What every component promises, and the one limit it does not. */
export function Conformance() {
  return <p>{CONFORMANCE}</p>;
}

/**
 * The package-manager switcher and copy button every component page has.
 *
 * Without its own banner: the only page that uses this is the installation
 * guide, which already opens with one above the `init` line a reader meets
 * first.
 */
export function Install({ item }: { item: string }) {
  return <InstallCommand item={item} notice={false} />;
}

/** A plain install line, for prose that shows several in a row. */
export function InstallLine({ items, runner }: { items: string[]; runner?: string }) {
  return <CodeBlock code={items.map((i) => installCommand(i, runner)).join("\n")} label="sh" />;
}

/** "54 items: 45 components, 4 blocks, 3 libraries, 2 hooks" — counted, not typed. */
export function ItemCount() {
  const { total, byType } = registrySummary();
  const words: Record<string, [string, string]> = {
    "registry:component": ["component", "components"],
    "registry:block": ["template", "templates"],
    "registry:lib": ["token library", "token libraries"],
    "registry:hook": ["hook", "hooks"],
  };
  const parts = Object.entries(byType).map(([type, n]) => {
    const [one, many] = words[type] ?? [type, type];
    return `${n} ${n === 1 ? one : many}`;
  });
  return (
    <>
      {total} items — {parts.join(", ")}
    </>
  );
}

/**
 * The folder an install produces, drawn from the files it writes. Rooted at
 * the Echo folder rather than at the project, because where that folder sits
 * is `dir` in the reader's own echo.json.
 */
export function InstallTree({ item }: { item: string }) {
  const byDir = new Map<string, string[]>();
  for (const path of installedFiles(item)) {
    const parts = path.split("/");
    const file = parts.pop()!;
    const dir = parts.join("/");
    byDir.set(dir, [...(byDir.get(dir) ?? []), file]);
  }
  const lines: string[] = [];
  for (const [dir, files] of [...byDir].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${dir}/`, ...files.map((f) => `  ${f}`));
  }
  return <CodeBlock code={lines.join("\n")} label="files" copyLabel="file list" />;
}

/** Items by registry type, with an example of each. */
export function ItemTypes() {
  const { byTypeItems } = registrySummary();
  const about: Record<string, string> = {
    "registry:lib": "Token libraries. No UI of their own; every component builds on them.",
    "registry:hook": "React hooks that fuse motion, sound and presence.",
    "registry:component": "One component, with its CSS and its meta.",
    "registry:block": "A whole screen, composed from components. Installing one pulls in all of them.",
  };
  return (
    <Table label="Registry item types" head={["Type", "Count", "What it is", "For example"]}>
      {Object.entries(byTypeItems).map(([type, names]) => (
        <tr key={type}>
          <td>
            <code>{type}</code>
          </td>
          <td>{names.length}</td>
          <td>{about[type] ?? ""}</td>
          <td>
            <code>{names[0]}</code>
          </td>
        </tr>
      ))}
    </Table>
  );
}

/* ---------------------------------------------------------------- theme --- */


export function SeedTable() {
  return (
    <Table label="Seed fields" head={["Field", "Default", "What it sets"]}>
      {describeProps(EchoSeedSchema).map((p) => (
        <tr key={p.name}>
          <td>
            <code>{p.name}</code>
          </td>
          <td>
            <code>{p.defaultValue ?? "derived"}</code>
          </td>
          <td>{p.description}</td>
        </tr>
      ))}
    </Table>
  );
}


/** Every colour role, with a swatch that shows it under the current seed. */
export function RoleTable() {
  return (
    <Table label="Colour roles" head={["Swatch", "Role", "What it is for"]}>
      {ECHO_ROLES.map((role) => (
        <tr key={role}>
          <td>
            <span className="guide-swatch" style={{ background: `var(--echo-${role})` }} aria-hidden="true" />
          </td>
          <td>
            <code>--echo-{role}</code>
          </td>
          <td>{ROLE_ABOUT[role]}</td>
        </tr>
      ))}
    </Table>
  );
}

/* ----------------------------------------------------------------- type --- */

const FONT_ABOUT: Record<EchoFontRole, { use: string; sample: string }> = {
  machine: { use: "Instrument labels, caps, panel legends, captions. The library's voice.", sample: "REC · 48 kHz · MONITOR" },
  sans: { use: "Body and UI prose.", sample: "Settings are saved on this device." },
  mono: { use: "Code, data, and digits that have to be told apart at a glance.", sample: "0O 1lI 5S — 12:04:59" },
  lcd: { use: "The screen face on LCD panels and readouts. Tabular by necessity.", sample: "-12.4 dB" },
};

export function FontRoles() {
  return (
    <Table label="Type roles" head={["Role", "Specimen", "Use it for", "Default stack"]}>
      {ECHO_FONT_ROLES.map((role) => (
        <tr key={role}>
          <td>
            <code>--echo-font-{role}</code>
          </td>
          <td style={{ fontFamily: `var(--echo-font-${role})`, color: "var(--echo-text)", whiteSpace: "nowrap" }}>
            {FONT_ABOUT[role].sample}
          </td>
          <td>{FONT_ABOUT[role].use}</td>
          <td>
            <code>{defaultSeed[`font${role[0]!.toUpperCase()}${role.slice(1)}` as keyof EchoSeedResolved]}</code>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function TypeScale() {
  return (
    <Table label="Type scale" head={["Token", "Size", "Specimen"]}>
      {Object.entries(TYPE_SCALE).map(([step, size]) => (
        <tr key={step}>
          <td>
            <code>--echo-text-{step}</code>
          </td>
          <td>{size}</td>
          <td style={{ fontSize: `var(--echo-text-${step})`, color: "var(--echo-text)" }}>Signal meter</td>
        </tr>
      ))}
    </Table>
  );
}

/** Weight, line height and tracking: one table per scale, values from the engine. */
export function TypeTokens() {
  const rows: [string, string, Record<string, string>][] = [
    ["Weight", "weight", WEIGHT_SCALE],
    ["Line height", "leading", LEADING_SCALE],
    ["Letter-spacing", "tracking", TRACKING_SCALE],
  ];
  return (
    <Table label="Weight, line height and tracking tokens" head={["Scale", "Token", "Value"]}>
      {rows.flatMap(([scale, prefix, values]) =>
        Object.entries(values).map(([step, value]) => (
          <tr key={`${prefix}-${step}`}>
            <td>{scale}</td>
            <td>
              <code>
                --echo-{prefix}-{step}
              </code>
            </td>
            <td>{value}</td>
          </tr>
        )),
      )}
    </Table>
  );
}

const TEXT_STYLE_SAMPLE: Record<keyof typeof TEXT_STYLES, string> = {
  "machine-label": "Output level",
  body: "The signal drops out when the cable is loose.",
  "body-sm": "Changes apply to every channel on this device.",
  caption: "Last synced 2 minutes ago",
  heading: "Delete this preset?",
  readout: "-12.4 dB",
  display: "017",
};

export function TextStyles() {
  return (
    <Table label="Text styles" head={["Style", "Built from", "Specimen"]}>
      {(Object.keys(TEXT_STYLES) as (keyof typeof TEXT_STYLES)[]).map((name) => {
        const t = TEXT_STYLES[name];
        return (
          <tr key={name}>
            <td>
              <code>--echo-type-{name}</code>
            </td>
            <td>
              {t.font}, {t.size}, {t.weight}, leading {t.leading}, tracking {t.tracking}
              {t.case === "uppercase" ? ", uppercase" : ""}
            </td>
            <td
              style={{
                font: `var(--echo-type-${name})`,
                letterSpacing: `var(--echo-type-${name}-tracking)`,
                textTransform: t.case,
                color: "var(--echo-text)",
              }}
            >
              {TEXT_STYLE_SAMPLE[name]}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function ScaleTable({ label, prefix, scale }: { label: string; prefix: string; scale: Record<string, string> }) {
  return (
    <Table label={label} head={["Token", "Value"]}>
      {Object.entries(scale).map(([step, value]) => (
        <tr key={step}>
          <td>
            <code>
              --echo-{prefix}-{step}
            </code>
          </td>
          <td>{value}</td>
        </tr>
      ))}
    </Table>
  );
}

/** The stacking order, bottom to top. */
export const ZScale = () => <ScaleTable label="Stacking order" prefix="z" scale={Z_SCALE} />;
export const BorderScale = () => <ScaleTable label="Border widths" prefix="border" scale={BORDER_SCALE} />;
export const IconScale = () => <ScaleTable label="Icon sizes" prefix="icon" scale={ICON_SCALE} />;

/** The shadow recipes, in the theme's order: recessed, raised, floating, then focus and glow. */
export function ShadowRecipes() {
  return (
    <Table label="Shadow recipes" head={["Token", "Kind", "For"]}>
      {Object.entries(SHADOW_RECIPES).map(([name, recipe]) => (
        <tr key={name}>
          <td>
            <code>--echo-shadow-{name}</code>
          </td>
          <td>{recipe.kind}</td>
          <td>{recipe.use}</td>
        </tr>
      ))}
    </Table>
  );
}

/** What Echo needs from a Content Security Policy, from the list the tests hold to the code. */
export function CspNeeds() {
  const title = (name: string) => ALL_METAS.find((m) => m.name === name)?.title ?? name;
  return (
    <Table label="What Echo needs from a Content Security Policy" head={["Allow", "For", "Why"]}>
      {CSP_NEEDS.map((need) => (
        <tr key={`${need.directive} ${need.source}`}>
          <td>
            <code>
              {need.directive} {need.source}
            </code>
          </td>
          <td>{need.items === "all" ? "Every component" : need.items.map(title).join(", ")}</td>
          <td>{inline(need.why)}</td>
        </tr>
      ))}
    </Table>
  );
}

/** The whole policy, with the two component-only lines in. */
export function CspPolicy() {
  return (
    <CodeBlock
      code={["Content-Security-Policy:", ...cspPolicy({ textures: true, voiceNote: true }).map((line) => `  ${line};`)].join("\n")}
      label="header"
      copyLabel="policy"
    />
  );
}

/** Breakpoints aren't custom properties (media queries can't read them); they're exported for JS. */
export function Breakpoints() {
  return (
    <Table label="Breakpoints" head={["Name", "Width"]}>
      {Object.entries(BREAKPOINTS).map(([name, width]) => (
        <tr key={name}>
          <td>
            <code>BREAKPOINTS.{name}</code>
          </td>
          <td>{width}</td>
        </tr>
      ))}
    </Table>
  );
}

/* ------------------------------------------------------- motion & sound --- */

export function MotionTable() {
  return (
    <Table label="Motion tokens" head={["Token", "Duration", "Ease", "Reduced motion"]}>
      {(Object.entries(motion) as [MotionName, (typeof motion)[MotionName]][]).map(([name, t]) => (
        <tr key={name}>
          <td>
            <code>{name}</code>
          </td>
          <td>{"duration" in t ? `${t.duration}ms` : "scrubbed"}</td>
          <td>
            <code>{t.ease}</code>
            {"loop" in t && t.loop ? " · loops" : ""}
          </td>
          <td>{t.reduced === "none" ? "none — no movement" : "opacity only"}</td>
        </tr>
      ))}
    </Table>
  );
}

export function DurationScale() {
  return (
    <Table label="CSS duration and ease scale" head={["Step", "Duration", "Ease"]}>
      {(Object.keys(DURATION_SCALE) as (keyof typeof DURATION_SCALE)[]).map((step) => (
        <tr key={step}>
          <td>
            <code>--echo-duration-{step}</code>
          </td>
          <td>{DURATION_SCALE[step]}</td>
          <td>
            <code>{EASE_SCALE[step]}</code>
          </td>
        </tr>
      ))}
    </Table>
  );
}

/* --------------------------------------------------- the meaning map --- */

/**
 * What each token MEANS, as opposed to what it is made of. The tables above
 * are the physics — a waveform, a duration, a curve; this is the part a
 * person has to decide, and the part an agent gets wrong by picking whichever
 * name sounds nicest.
 *
 * Typed as a Record over the real token names, so a new token stops the site
 * compiling until someone says what it is for. The components column is
 * counted from the metas, never typed: a meaning nothing carries is a claim,
 * and this way the page can only describe tokens that are really in use.
 */
const MOTION_MEANING: Record<MotionName, string> = {
  press: "A part goes down under your finger, and comes back with a little overshoot. 90ms — an acknowledgement, not an animation.",
  pop: "Something small arrives: a chip, a badge, a count. It overshoots, the way a light part would.",
  summon: "Something larger arrives or leaves: a panel, a sheet, a dialog. The only family that fades under reduced motion instead of stopping.",
  breath: "A slow loop that says a thing is alive and idle — a status light, a meter at rest. It never demands attention.",
  settle: "A part finds its final position after being moved, dragged or released. Slower, and it decelerates.",
  glitch: "A screen changes. `steps(3)`, never an ease: this is a segment display, and glass timing on it looks wrong.",
  flood: "A surface is taken over — a wash of light, a value sweeping across a track.",
  drain: "Time passing, scrubbed by a clock rather than played. Linear, because nothing about elapsed time accelerates.",
  lift: "A part notices the pointer and rises toward the light before anything is pressed. Quick, with a small overshoot.",
  follow: "A part trails the hand: a knob being dragged, a cap leaning toward the cursor. Short, so it feels heavy but never late.",
  travel: "A part lands somewhere new — a knob sent across a rail, a switch thrown, a selection moving over. It springs into place.",
  squash: "A part gives under the finger as it is grabbed. Faster than a press, and it holds until released.",
  rebound: "A part is let go and springs back past rest before it settles. The overshoot is what says it has weight.",
  light: "A highlight tracks the pointer across a glossy surface. Smooth, because light has no mass.",
  bloom: "A popup grows out of what opened it — a menu from its trigger, a tooltip from its target — overshooting a touch and settling. Solid almost at once, so it never reads as a fade.",
  island: "A panel swells out of a small pill, like an island opening: wider first, then taller, on a spring that settles with a soft wobble. Closing gathers it back into the pill.",
  boot: "A readout powers on: cells light in steps, digits count up. Stepped like glitch, because it is still a screen.",
};
const SOUND_MEANING: Record<SoundName, string> = {
  tap: "The lightest mark: a key in a field, a step in a sequence. Quieter and higher than a press.",
  press: "A cap has gone down. It bends downward in pitch, the way a real key loads.",
  release: "The cap has come back up and the action has happened.",
  select: "One of several has been chosen — a tab, an option, an item in a menu.",
  transition: "Something has arrived or left: a panel, a sheet, a drawer. It bends upward.",
  notify: "Something happened that you did not ask for, now. Two tones, so it is not mistaken for a press.",
  caution: "The one rough sound. A confirm that deserves a second of hesitation, and nothing else.",
  error: "An action was refused, or a destructive one went through. Low and falling.",
  celebrate: "A finished thing worth marking. Spend it rarely; it stops meaning anything otherwise.",
};
/** name → the components whose meta says they use it. */
function usage<T extends string>(read: (meta: unknown) => T[]): Map<T, string[]> {
  const out = new Map<T, string[]>();
  for (const meta of ALL_METAS) {
    for (const token of read(meta)) {
      out.set(token, [...(out.get(token) ?? []), (meta as { title?: string; name: string }).title ?? meta.name]);
    }
  }
  return out;
}

function MeaningRows<T extends string>({
  meaning,
  used,
}: {
  meaning: Record<T, string>;
  used: Map<T, string[]>;
}) {
  return (
    <>
      {(Object.keys(meaning) as T[]).map((token) => {
        const components = used.get(token) ?? [];
        return (
          <tr key={token}>
            <td>
              <code>{token}</code>
            </td>
            <td>{meaning[token]}</td>
            <td>
              {components.length === 0
                ? // Honest rather than blank: a token nothing uses is available
                  // for your own controls, and saying so is the useful answer.
                  "— yours to use"
                : `${components.length}: ${components.slice(0, 4).join(", ")}${components.length > 4 ? "…" : ""}`}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export function MotionMeaning() {
  return (
    <Table label="What each motion token means" head={["Token", "What it means", "Used by"]}>
      <MeaningRows meaning={MOTION_MEANING} used={usage(motionNames)} />
    </Table>
  );
}

export function SoundMeaning() {
  return (
    <Table label="What each sound token means" head={["Token", "What it means", "Used by"]}>
      <MeaningRows meaning={SOUND_MEANING} used={usage(soundNames)} />
    </Table>
  );
}

export function SoundTable() {
  return (
    <Table label="Sound tokens" head={["Token", "Wave", "Pitch", "Length", "Gain", "Haptic"]}>
      {(Object.entries(sound) as [SoundName, (typeof sound)[SoundName]][]).map(([name, r]) => (
        <tr key={name}>
          <td>
            <code>{name}</code>
          </td>
          <td>{r.wave}</td>
          <td>
            {Array.isArray(r.freq) ? `${(r.freq as readonly number[]).join(" → ")} Hz` : `${r.freq} Hz`}
            {"bend" in r ? ` (bend ${r.bend! > 0 ? "+" : ""}${r.bend} Hz)` : ""}
          </td>
          <td>{Math.round(r.decay * 1000)}ms</td>
          <td>{r.gain}</td>
          <td>{HAPTIC_FOR_SOUND[name] ?? "none"}</td>
        </tr>
      ))}
    </Table>
  );
}

/* --------------------------------------------------------------- checks --- */

const RUNS_IN: Record<RuleRuns, string> = {
  code: "Your code",
  page: "A running page",
  both: "Your code and a running page",
  axe: "A running page, by axe",
};

/**
 * What the page check finds, one row per rule it runs (this table
 * was a hand copy that had 5 of the 9).
 */
export function PageRules() {
  return (
    <Table label="What the page check finds" head={["Rule", "What it finds"]}>
      {PAGE_RULES.map((rule) => (
        <tr key={rule}>
          <td>
            <code>{rule}</code>
          </td>
          <td>{inline(CHECK_RULE_ABOUT[rule].about)}</td>
        </tr>
      ))}
    </Table>
  );
}

/** Every rule name `echo.json`'s `check.rules` takes, where it looks, and what it finds. */
export function CheckRules() {
  return (
    <Table label="Check rules" head={["Rule", "Looks at", "What it finds"]}>
      {CHECK_RULES.map((rule) => (
        <tr key={rule}>
          <td>
            <code>{rule}</code>
          </td>
          <td>{RUNS_IN[CHECK_RULE_ABOUT[rule].runs]}</td>
          <td>{inline(CHECK_RULE_ABOUT[rule].about)}</td>
        </tr>
      ))}
    </Table>
  );
}

/** Every flag the CLI parses, the commands that read it, and what it does. */
export function CliFlags() {
  return (
    <Table label="Flags" head={["Flag", "Commands", "What it does"]}>
      {(Object.keys(CLI_FLAG_ABOUT) as (keyof typeof CLI_FLAG_ABOUT)[]).map((flag) => {
        const f = CLI_FLAG_ABOUT[flag];
        return (
          <tr key={flag}>
            <td>
              <code>
                --{flag}
                {f.takes ? ` ${f.takes}` : ""}
              </code>
            </td>
            <td>{f.commands === "every command" ? "every command" : f.commands.map((c, i) => [i > 0 && ", ", <code key={c}>{c}</code>])}</td>
            <td>{inline(f.about)}</td>
          </tr>
        );
      })}
    </Table>
  );
}

type SchemaNode = {
  type?: string;
  enum?: readonly unknown[];
  format?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
};

/** What a schema node takes, in a few words. */
function takes(node: SchemaNode): string {
  if (node.enum) return node.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (node.type === "array") {
    const item = node.items;
    if (item?.properties) return `a list of { ${Object.keys(item.properties).join(", ")} }`;
    return `a list of ${item ? takes(item) : "values"}`;
  }
  if (node.type === "number" && node.minimum !== undefined && node.maximum !== undefined) return `${node.minimum} to ${node.maximum}`;
  if (node.format === "uri") return "a URL";
  return node.type ?? "—";
}

/** Who writes each of echo.json's fields: the rest are yours to add. */
const WRITTEN_BY: Record<string, string> = {
  $schema: "`init`",
  dir: "`init` (`--dir`)",
  framework: "`init`, as it detected it",
  packageManager: "`init`, as it detected it",
  registry: "`init` (`--registry`)",
  seed: "`init --seed`, `style use`, `style set`",
  style: "`style use` and `init --style`; `style set` adds to `changed`",
  check: "You",
  test: "You",
};

/**
 * echo.json, field by field, from the schema `init` points it at: the same
 * descriptions an editor shows. `check.rules` names its rules in
 * `<CheckRules />`.
 */
export function ConfigReference() {
  const schema = configSchema() as { properties: Record<string, SchemaNode>; required: string[] };
  const rows: { field: string; node: SchemaNode; top: string }[] = [];
  for (const [key, node] of Object.entries(schema.properties)) {
    rows.push({ field: key, node, top: key });
    if (node.type === "object" && node.properties) {
      for (const [child, sub] of Object.entries(node.properties)) rows.push({ field: `${key}.${child}`, node: sub, top: key });
    }
  }
  return (
    <Table label="echo.json fields" head={["Field", "Takes", "Written by", "What it is"]}>
      {rows.map(({ field, node, top }) => (
        <tr key={field}>
          <td>
            <code>{field}</code>
            {schema.required.includes(field) ? " (required)" : ""}
          </td>
          <td>{field === "check.rules" ? "a rule name → \"off\" | \"info\"" : node.type === "object" ? "an object" : takes(node)}</td>
          <td>{field === top ? inline(WRITTEN_BY[top] ?? "You") : ""}</td>
          <td>{node.description ? inline(node.description) : ""}</td>
        </tr>
      ))}
    </Table>
  );
}

/* ------------------------------------------------------------------- AI --- */

export function McpTools() {
  return (
    <Table label="MCP tools" head={["Tool", "Takes", "Answers with"]}>
      {Object.entries(TOOL_DEFINITIONS).map(([name, def]) => {
        const params = Object.entries(def.inputSchema as Record<string, { isOptional?: () => boolean }>);
        return (
          <tr key={name}>
            <td>
              <code>{name}</code>
            </td>
            <td>
              {params.length === 0
                ? "—"
                : params.map(([p, schema], i) => (
                    <span key={p}>
                      {i > 0 && ", "}
                      <code>
                        {p}
                        {schema.isOptional?.() ? "?" : ""}
                      </code>
                    </span>
                  ))}
            </td>
            <td>{def.description}</td>
          </tr>
        );
      })}
    </Table>
  );
}

/** The hosted server's address, inline: the one thing a remote client asks for. */
export function HostedMcpUrl() {
  return <code>{HOSTED_MCP_URL}</code>;
}

/** How each client that runs a terminal command connects to the hosted server. */
export function HostedMcpSetup() {
  return (
    <CodeBlock
      code={[
        "# Claude Code",
        `claude mcp add --transport http echo-ui ${HOSTED_MCP_URL}`,
        "",
        "# Cursor (.cursor/mcp.json)",
        JSON.stringify({ mcpServers: { "echo-ui": { url: HOSTED_MCP_URL } } }, null, 2),
      ].join("\n")}
      label="hosted"
      copyLabel="hosted server setup"
    />
  );
}

/** How the plugin installs: one row per app, ChatGPT from its directory and the rest with a download from this site. */
export function PluginInstall() {
  const claude = `/${SITE_DOWNLOADS.claude}`;
  const codex = `/${SITE_DOWNLOADS.codex}`;
  return (
    <Table label="Installing the plugin" head={["Where", "Download", "Then"]}>
      <tr>
        <td>ChatGPT</td>
        <td>
          <a href={CHATGPT_LISTING_URL}>Echo UI in the plugin directory</a>
        </td>
        <td>Add it there. Nothing to download.</td>
      </tr>
      <tr>
        <td>claude.ai</td>
        <td>
          <a href={claude} download>
            {SITE_DOWNLOADS.claude.split("/").pop()}
          </a>
        </td>
        <td>Customize, then Plugins, Add, and Upload plugin: choose the ZIP as it is.</td>
      </tr>
      <tr>
        <td>Claude Code</td>
        <td>
          <a href={claude} download>
            {SITE_DOWNLOADS.claude.split("/").pop()}
          </a>
        </td>
        <td>
          Unzip it into a folder, then <code>claude --plugin-dir &lt;that folder&gt;</code>.
        </td>
      </tr>
      <tr>
        <td>Codex and ChatGPT desktop</td>
        <td>
          <a href={codex} download>
            {SITE_DOWNLOADS.codex.split("/").pop()}
          </a>
        </td>
        <td>
          Unzip it, then <code>codex plugin marketplace add ./{CODEX_FOLDER}</code> and{" "}
          <code>
            codex plugin add {PLUGIN_NAME}@{LOCAL_MARKETPLACE}
          </code>.
        </td>
      </tr>
    </Table>
  );
}

/** The standing brief — the same text the MCP server sends as its instructions. */
export function AgentBrief() {
  return <CodeBlock code={AGENT_INSTRUCTIONS} label="brief" copyLabel="agent brief" />;
}

/** What you can count on: the five claims, in the one wording the README is held to. */
export function Claims() {
  return (
    <ul>
      {CLAIMS.map((c) => (
        <li key={c.title}>
          <strong>{inline(c.title)}</strong> {inline(c.text)}
        </li>
      ))}
    </ul>
  );
}

/** The block `init` writes into CLAUDE.md or AGENTS.md, exactly, for a project whose Echo folder is components/echo. */
export function EchoBlock() {
  return <CodeBlock code={projectBlock("components/echo")} label="md" copyLabel="Echo block" />;
}

/* --------------------------------------------------------------- index --- */

/** Every item, grouped as in the sidebar, with its one-line description. */
export function ComponentIndex() {
  return (
    <>
      {DOC_GROUPS.map((group) => {
        const items = DOC_ITEMS.filter((d) => d.group === group);
        const overview = GROUP_OVERVIEWS.find((g) => g.group === group);
        return (
          <section key={group} aria-labelledby={`group-${group.toLowerCase().replace(/\s+/g, "-")}`} className="guide-group">
            <h2 id={`group-${group.toLowerCase().replace(/\s+/g, "-")}`} className="doc__h2 guide__h2">
              {group}
            </h2>
            {overview && (
              <p className="guide-group__overview">
                All {items.length}, composed on one page: <a href={overview.href}>{overview.label ?? group}</a>
              </p>
            )}
            <ul className="guide-index" data-testid="component-index">
              {items.map((d) => (
                <li key={d.slug}>
                  <a href={`/docs/${d.slug}`}>{d.meta.title}</a>
                  <span>{firstSentence(d.meta.description)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/** The meta descriptions are dense; the index wants their first sentence. */
function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/.exec(text);
  return match ? match[0] : text;
}

/** The Introduction's three reader paths, from the guide manifest. */
export function StartPaths() {
  const paths = [
    { who: "Developers", blurb: "Install, wire, own the code.", section: "Get started" },
    { who: "Designers", blurb: "Retheme it, understand the feel — no code required.", section: "Design" },
    { who: "AI-assisted builders", blurb: "Give your agent the catalog.", section: "AI" },
  ];
  return (
    <div className="guide-cards">
      {paths.map((p) => {
        const guides = GUIDE_SECTIONS.find((s) => s.label === p.section)!.guides.filter((g) => g.slug);
        return (
          <div key={p.who} className="guide-card">
            <span className="guide-card__title">{p.who}</span>
            <span className="guide-card__blurb">{p.blurb}</span>
            <ul>
              {guides.map((g) => (
                <li key={g.slug}>
                  <a href={guideHref(g)}>{g.title}</a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** CHANGELOG.md, rendered as it is written — the page is never a second copy. */
export function ChangelogDocument({ children }: { children?: ReactNode }) {
  // What the page adds (a summary) goes under the file's own title, not above it.
  const [title = "", ...rest] = changelogSource().split("\n");
  return (
    <>
      <MarkdownDocument source={title} headingIds={slugify} />
      {children}
      <MarkdownDocument source={rest.join("\n")} headingIds={slugify} />
    </>
  );
}

/**
 * PRINCIPLES.md, the same way. This document was approved line by line; the
 * page has to be it, not a retelling of it that quietly says something else.
 */
export function PrinciplesDocument() {
  return <MarkdownDocument source={principlesSource()} headingIds={slugify} />;
}
