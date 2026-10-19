/**
 * Echo's scales, as the check reads them: a value written by hand either is
 * a step (then the token says it, so density and radius reach it) or isn't
 * (then the nearest step is what to write instead). Shadows are the same with
 * recipes: Echo's light is one light, and a shadow written by hand is another.
 *
 * Page layout is the builder's: spacing past 32px (a page gutter, a section's
 * breathing room) isn't held to a component scale.
 */
import { DURATION_SCALE, EASE_SCALE, RADIUS_SCALE, SHADOW_RECIPES, SPACE_SCALE, shadowValue, type ShadowName } from "echo-ui-core/theme";

/** A px length, or undefined for anything else (0, %, em, auto, a var). */
export function px(value: string | number): number | undefined {
  if (typeof value === "number") return value;
  const m = /^(-?\d*\.?\d+)(px|rem)$/.exec(value.trim());
  if (!m) return undefined;
  return Number(m[1]) * (m[2] === "rem" ? 16 : 1);
}

const steps = (scale: Record<string, string>) =>
  Object.entries(scale)
    .map(([step, value]) => ({ step, px: px(value) }))
    .filter((s): s is { step: string; px: number } => s.px !== undefined && s.px > 0);

const SPACE = steps(SPACE_SCALE);
const RADIUS = steps(RADIUS_SCALE).filter((s) => s.step !== "full");

function nearest(scale: { step: string; px: number }[], value: number) {
  return scale.reduce((best, s) => (Math.abs(s.px - value) < Math.abs(best.px - value) ? s : best));
}

/** The largest spacing Echo holds a value to; past it, it's page layout. */
const COMPONENT_SPACE = 32;

/** What a value becomes on Echo's scale: the tokens, and whether any part was off it. */
export interface ScaleFix {
  replacement: string;
  off: boolean;
}

/**
 * A spacing value (`padding`, `margin`, `gap`: one length or several) on
 * Echo's scale, or undefined when there's nothing to say.
 */
export function spaceFix(value: string | number): ScaleFix | undefined {
  const parts = typeof value === "number" ? [value] : value.trim().split(/\s+/);
  let off = false;
  let touched = false;
  const out = parts.map((part) => {
    const n = px(part);
    if (n === undefined || n === 0) return String(part);
    const abs = Math.abs(n);
    const exact = SPACE.find((s) => s.px === abs);
    if (!exact && abs > COMPONENT_SPACE) return String(part);
    const step = exact ?? nearest(SPACE, abs);
    if (!exact) off = true;
    touched = true;
    return n < 0 ? `calc(var(--echo-space-${step.step}) * -1)` : `var(--echo-space-${step.step})`;
  });
  return touched ? { replacement: out.join(" "), off } : undefined;
}

/** A radius on Echo's scale, or undefined. */
export function radiusFix(value: string | number): ScaleFix | undefined {
  const parts = typeof value === "number" ? [value] : value.trim().split(/\s+/);
  if (parts.length !== 1) return undefined;
  const n = px(parts[0]!);
  if (n === undefined || n === 0) return undefined;
  if (n >= 999) return { replacement: "var(--echo-radius-full)", off: false };
  const exact = RADIUS.find((s) => s.px === n);
  const step = exact ?? nearest(RADIUS, n);
  return { replacement: `var(--echo-radius-${step.step})`, off: !exact };
}

/** How a fix reads to the agent, whichever way the value was written. */
export function scaleMessage(written: string, fix: ScaleFix, what: "spacing" | "radius", write = fix.replacement): string {
  return fix.off
    ? `\`${written}\` is off Echo's ${what} scale: write \`${write}\`, the nearest ${fix.replacement.includes(" ") ? "steps" : "step"}.`
    : `\`${written}\` is Echo's ${what}: write \`${write}\`, so the theme's ${what === "spacing" ? "density" : "molding"} reaches it.`;
}

const DURATIONS = Object.entries(DURATION_SCALE).map(([step, v]) => ({ step, ms: Number(v.replace("ms", "")) }));
const EASES = Object.entries(EASE_SCALE).map(([step, v]) => ({ step, value: v.replace(/\s+/g, "") }));

/** Every time in a transition value, in ms. */
function times(value: string): { text: string; ms: number }[] {
  return [...value.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])/g)].map((m) => ({
    text: m[0],
    ms: Number(m[1]) * (m[2] === "s" ? 1000 : 1),
  }));
}

/** What to write instead of the durations and eases in a transition, or undefined. */
export function timingAdvice(value: string): string | undefined {
  const advice: string[] = [];
  for (const t of times(value)) {
    if (t.ms === 0) continue;
    const exact = DURATIONS.find((d) => d.ms === t.ms);
    const near = exact ?? DURATIONS.reduce((best, d) => (Math.abs(d.ms - t.ms) < Math.abs(best.ms - t.ms) ? d : best));
    advice.push(`\`${t.text}\` → \`var(--echo-duration-${near.step})\`${exact ? "" : ` (${near.ms}ms)`}`);
  }
  for (const m of value.matchAll(/cubic-bezier\([^)]*\)|steps\([^)]*\)/g)) {
    const found = EASES.find((e) => e.value === m[0].replace(/\s+/g, ""));
    advice.push(found ? `\`${m[0]}\` → \`var(--echo-ease-${found.step})\`` : `\`${m[0]}\` → an Echo ease, \`var(--echo-ease-swap)\` or its neighbours`);
  }
  if (!advice.length) return undefined;
  return `invents its timing: ${advice.join(", ")}. Every timing in Echo is a token, so motion stays one system.`;
}

const flat = (v: string) => v.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
/**
 * A recipe as a molded device draws it: without the drawn device's line (the
 * outline, the ink edge it stands on) and with the light it collapses at full
 * strength. It's what a recipe looked like before the drawn device, and what an
 * agent copies from a molded page, so it's the recipe written out too.
 */
function moldedValue(name: ShadowName): string {
  return SHADOW_RECIPES[name].layers
    .filter((l) => !/^(inset )?0 (0|calc\([^)]*var\(--echo-drawn[^)]*\)\)) 0 var\(--echo-line-width, 0px\) var\(--echo-line, transparent\)$/.test(l))
    .map((l) =>
      l
        .replace(/calc\((\d+px) \* \(1 - var\(--echo-drawn, 0\)\)\)/g, "$1")
        .replace(/ var\(--echo-line-width, 0px\)/g, "")
        .replace("var(--echo-lit-edge, var(--echo-accent-6))", "var(--echo-accent-6)"),
    )
    .join(", ");
}
const RECIPE_BY_VALUE = new Map(
  (Object.keys(SHADOW_RECIPES) as ShadowName[]).flatMap((n) => [
    [flat(moldedValue(n)), n],
    [flat(shadowValue(n)), n],
  ]),
);

/** The recipe a hand-drawn shadow is closest to in spirit: set in, standing on, or floating above. */
function recipeFor(value: string): ShadowName {
  const layers = value.split(/,(?![^(]*\))/);
  if (layers.every((l) => /\binset\b/.test(l))) return "well";
  const blur = Math.max(0, ...layers.map((l) => px(l.trim().replace(/^inset\s+/, "").split(/\s+/)[2] ?? "") ?? 0));
  if (blur >= 40) return "modal";
  if (blur >= 16) return "popover";
  if (blur >= 6) return "panel";
  return "chip";
}

/** What to write instead of a shadow, or undefined when it's a recipe or nothing. */
export function shadowAdvice(value: string): string | undefined {
  const v = value.trim();
  if (/^(none|inherit|initial|unset|revert)$/i.test(v)) return undefined;
  const name = RECIPE_BY_VALUE.get(flat(v));
  if (name) return `is Echo's \`${name}\` shadow written out: write \`var(--echo-shadow-${name})\`.`;
  // Built from recipes (a recipe plus a ring, say) is Echo's light.
  if (/var\(--echo-shadow-/.test(v) && !/rgba?\(|#[0-9a-f]{3,8}\b|hsla?\(|oklch\(/i.test(v)) return undefined;
  // Only spread, no offset or blur: a ring, not light.
  const layers = v.split(/,(?![^(]*\))/).map((l) => l.trim());
  if (layers.every((l) => /^(inset\s+)?0(px)?\s+0(px)?\s+0(px)?\s+\d/.test(l))) {
    const inset = layers.every((l) => l.startsWith("inset"));
    return `is a focus ring drawn by hand: Echo's is \`var(--echo-shadow-${inset ? "ring-inset" : "ring"})\`${inset ? "" : " (`--echo-shadow-ring-inset` inside a well)"}, so every ring on the page is the same.`;
  }
  const suggestion = recipeFor(v);
  return `is a shadow drawn by hand, and Echo has one light: take a recipe, like \`var(--echo-shadow-${suggestion})\` (${SHADOW_RECIPES[suggestion].use.replace(/\.$/, "").toLowerCase()}). The recipes: \`--echo-shadow-*\`, in the theming guide and the MCP server's get_tokens.`;
}

/* ------------------------------------------------------------ Tailwind */

const TW_SPACE = /(?:^|\s)(-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y))-\[(-?[\d.]+(?:px|rem))\](?=\s|$)/g;
const TW_RADIUS = /(?:^|\s)(rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?)-\[([\d.]+(?:px|rem))\](?=\s|$)/g;
const TW_SHADOW = /(?:^|\s)(shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner)|-\[[^\]]+\])?)(?=\s|$)/g;
const TW_TIMING = /(?:^|\s)((?:duration|delay)-\[[\d.]+m?s\]|ease-\[[^\]]+\])(?=\s|$)/g;

/** Tailwind's own palette: colours that never went through the seed. */
const TW_PALETTE =
  /(?:^|\s)((?:[a-z0-9-]+:)*(?:text|bg|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-(?:(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)|black|white)(?:\/\d+)?)(?=\s|$)/g;
const STATE_HUES = new Set(["red", "orange", "amber", "yellow", "lime", "green", "emerald", "rose"]);

export interface ClassAdvice {
  rule: "space" | "radius" | "shadow" | "timing" | "colour";
  className: string;
  message: string;
}

/** Tailwind classes that write a value Echo has a token for. Its own spacing utilities are its scale, not flagged. */
export function tailwindAdvice(classes: string): ClassAdvice[] {
  const out: ClassAdvice[] = [];
  for (const m of classes.matchAll(TW_SPACE)) {
    const fix = spaceFix(m[2]!);
    const written = `${m[1]}-[${m[2]}]`;
    if (fix) out.push({ rule: "space", className: written, message: scaleMessage(written, fix, "spacing", `${m[1]}-[${fix.replacement.replace(/ /g, "_")}]`) });
  }
  for (const m of classes.matchAll(TW_RADIUS)) {
    const fix = radiusFix(m[2]!);
    const written = `${m[1]}-[${m[2]}]`;
    if (fix) out.push({ rule: "radius", className: written, message: scaleMessage(written, fix, "radius", `${m[1]}-[${fix.replacement}]`) });
  }
  for (const m of classes.matchAll(TW_SHADOW)) {
    out.push({
      rule: "shadow",
      className: m[1]!,
      message: `\`${m[1]}\` is a shadow that isn't Echo's light: give the element an Echo shadow in CSS, \`box-shadow: var(--echo-shadow-panel)\` or the recipe that fits (\`--echo-shadow-*\`).`,
    });
  }
  for (const m of classes.matchAll(TW_PALETTE)) {
    const state = m[2] && STATE_HUES.has(m[2]);
    out.push({
      rule: "colour",
      className: m[1]!,
      message: `\`${m[1]}\` is a colour from Tailwind's palette, not your theme: colours come from the seed, so use a role (\`[var(--echo-text)]\`, \`[var(--echo-surface)]\`…) or the Echo component that draws it.${state ? " An error or a success is said in words and shape, not in red or green." : ""}`,
    });
  }
  for (const m of classes.matchAll(TW_TIMING)) {
    out.push({ rule: "timing", className: m[1]!, message: `\`${m[1]}\` invents a timing: use Echo's, \`var(--echo-duration-*)\` and \`var(--echo-ease-*)\`, in CSS.` });
  }
  return out;
}

/* ------------------------------------------------------ motion libraries */

/** Animation libraries that would move things next to Echo's springs. */
const MOTION_LIBRARIES = [
  /^framer-motion(\/|$)/,
  /^motion(\/|$)/,
  /^@motionone\//,
  /^react-spring$/,
  /^@react-spring\//,
  /^animejs$/,
  /^anime$/,
  /^@formkit\/auto-animate(\/|$)/,
  /^react-transition-group(\/|$)/,
  /^popmotion$/,
  /^velocity-animate$/,
];

export function isMotionLibrary(specifier: string): boolean {
  return MOTION_LIBRARIES.some((re) => re.test(specifier));
}
