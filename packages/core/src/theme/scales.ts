/**
 * The dimensional scales.
 *
 * Before these, Echo had a scale for colour and for nothing else. In
 * production CSS: 18 distinct border-radii, 15 distinct type sizes with 88 of
 * 91 declarations in `px`, 15 distinct transition durations of which only four
 * matched a motion token, and freehand spacing. The half-pixel type sizes are
 * the tell — 11.5px and 13.5px are not decisions, they are nudges.
 *
 * Every scale here was derived from what the library ACTUALLY used, clustered
 * so that the most frequent values stayed put and the strays moved to them.
 * The migration therefore shifts a lot of declarations by 1-2px and almost
 * nothing by more; the alternative, a clean powers-of-two scale, would have
 * moved nearly every value in the library and made the diff unreviewable.
 *
 * These are seed-independent, but they are emitted by `createEchoTheme`
 * alongside the colour and type roles for the same reason they are: a consumer
 * installing a component from the registry has to get the tokens it
 * references, and the docs app is not a source of truth.
 */

import { DENSITY_FACTOR, DEVICE_DEFAULTS, radiusFactor, type EchoDevice } from "./device";
import { SHADOW_RECIPES, shadowValue, type ShadowName } from "./shadow";

/* ------------------------------------------------------------------- radius */

/**
 * Radius: seven steps and `full`, from 18 values.
 *
 * Clustered on the frequent ones (12px ×9, 14px ×8, 10px ×7, 9px ×6), so the
 * caps, panels and wells that define the material keep their shape.
 */
export const RADIUS_SCALE = {
  xs: "2px", // hairline rounding: pips, cells, the smallest chips
  sm: "6px", // small controls
  md: "9px", // default control
  lg: "12px", // cards, panels
  xl: "14px", // buttons and larger caps
  "2xl": "18px", // stages and frames
  "3xl": "22px", // the largest panels
  full: "999px", // pills and discs
} as const;

export type RadiusStep = keyof typeof RADIUS_SCALE;

/* --------------------------------------------------------------------- type */

/**
 * Type sizes: eight steps, in `rem`, from 15 sizes.
 *
 * `rem` is the whole point. Page zoom already worked, so this was never a
 * 1.4.4 failure — but a reader who has raised their browser's default text
 * size, which is the standard low-vision accommodation and the one most people
 * actually use, got no change at all from an Echo interface. On a library
 * where 21 declarations sat at 11px or below, that is the group least able to
 * afford it.
 *
 * Values are the px sizes divided by 16, so a default-configured browser
 * renders exactly what it rendered before.
 */
export const TYPE_SCALE = {
  "3xs": "0.625rem", // 10px — machine labels, captions
  "2xs": "0.6875rem", // 11px
  xs: "0.75rem", // 12px
  sm: "0.8125rem", // 13px — body small
  md: "0.875rem", // 14px — body
  lg: "1rem", // 16px
  xl: "1.25rem", // 20px
  "2xl": "1.625rem", // 26px — readouts
  // 40px — display: an entry's index number, a page's one headline. Both
  // moodboard runs for Paperlab reached for a display line and found the
  // scale stopped at 26px.
  "3xl": "2.5rem",
} as const;

export type TypeStep = keyof typeof TYPE_SCALE;

/**
 * Weights, line heights and tracking, from what
 * the component CSS used: 3 weights, 9 line heights and 16 letter-spacings.
 * Echo's voice (spaced uppercase machine labels) lived in the tracking, and
 * the tracking was the least consistent part: labels doing the same job sat
 * anywhere from 0.16em to 0.22em.
 */
export const WEIGHT_SCALE = {
  regular: "400", // sentences
  semibold: "600", // secondary labels
  bold: "700", // labels, titles, cap legends
  heavy: "800", // display titles
} as const;

export type WeightStep = keyof typeof WEIGHT_SCALE;

export const LEADING_SCALE = {
  none: "1", // one line that has to sit exactly in its box: caps, chips, readouts
  tight: "1.25", // titles and short labels that may wrap
  snug: "1.4", // small UI text: badges, tooltips, breadcrumbs
  body: "1.55", // paragraphs
} as const;

export type LeadingStep = keyof typeof LEADING_SCALE;

export const TRACKING_SCALE = {
  tighter: "-0.02em", // display titles
  tight: "-0.01em", // dialog titles
  normal: "0", // sentences and inputs
  wide: "0.06em", // small mono and badge text
  wider: "0.12em", // cap legends: buttons, segments, LCD tags
  label: "0.2em", // the machine label: small uppercase field and section labels
  widest: "0.25em", // engraved and stamped labels
} as const;

export type TrackingStep = keyof typeof TRACKING_SCALE;

/**
 * Text styles: the scales above, bundled by job, so a designer or an agent can
 * ask for "a machine label" by name. Each is emitted as a `font` shorthand
 * (`--echo-type-<style>`) plus its tracking and case, because letter-spacing
 * and text-transform aren't part of `font`:
 *
 *   font: var(--echo-type-machine-label);
 *   letter-spacing: var(--echo-type-machine-label-tracking);
 *   text-transform: var(--echo-type-machine-label-case);
 */
export const TEXT_STYLES = {
  "machine-label": { font: "machine", size: "3xs", weight: "bold", leading: "tight", tracking: "label", case: "uppercase" },
  body: { font: "sans", size: "md", weight: "regular", leading: "body", tracking: "normal", case: "none" },
  "body-sm": { font: "sans", size: "sm", weight: "regular", leading: "body", tracking: "normal", case: "none" },
  caption: { font: "sans", size: "xs", weight: "regular", leading: "snug", tracking: "normal", case: "none" },
  heading: { font: "machine", size: "lg", weight: "bold", leading: "tight", tracking: "tight", case: "none" },
  readout: { font: "lcd", size: "xl", weight: "regular", leading: "none", tracking: "normal", case: "none" },
  // The one large line a screen can carry: a headline, an entry's index.
  display: { font: "sans", size: "3xl", weight: "bold", leading: "none", tracking: "tighter", case: "none" },
} as const satisfies Record<
  string,
  {
    font: "sans" | "machine" | "mono" | "lcd";
    size: TypeStep;
    weight: WeightStep;
    leading: LeadingStep;
    tracking: TrackingStep;
    case: "uppercase" | "none";
  }
>;

export type TextStyle = keyof typeof TEXT_STYLES;

/* ------------------------------------------------------------------ spacing */

/**
 * Space: a linear scale. Numeric names rather than t-shirt sizes: there are
 * thirteen steps and `space-9` orders itself, where `3xl` does not.
 */
export const SPACE_SCALE = {
  "0": "0",
  "1": "2px",
  "2": "4px",
  "3": "6px",
  "4": "8px",
  "5": "10px",
  "6": "12px",
  "7": "14px",
  "8": "16px",
  "9": "20px",
  "10": "24px",
  "11": "32px",
  "12": "64px",
} as const;

export type SpaceStep = keyof typeof SPACE_SCALE;

/* ---------------------------------------------------------- control heights */

/**
 * One control height scale.
 *
 * One column of controls once held EIGHT different control heights —
 * 44, 24, 32, 44, 44, 44, 44, 22 — which is the best available argument that
 * Echo had no coherent control language. Three steps is the whole vocabulary.
 */
export const CONTROL_HEIGHT = {
  compact: "32px",
  default: "44px",
  large: "60px",
} as const;

export type ControlHeightStep = keyof typeof CONTROL_HEIGHT;

/* ------------------------------------------------------------------- motion */

/**
 * The CSS half of the motion system.
 *
 * `motion.ts` shipped 8 tokens and documented its own anti-pattern: "Never
 * invent a duration inline… scattered magic numbers are how a motion system
 * dies." The component CSS then contained 44 inline durations across 15
 * values, of which four matched a token. `120ms` appeared 7 times and `190ms`
 * 6 times — de facto tokens nobody had named.
 *
 * These are the UI-transition durations, and they are deliberately a different
 * family from the narrative GSAP tokens in `motion.ts`: those describe a thing
 * happening (a chip popping, a panel being summoned), these describe a control
 * acknowledging you. Four of them are named here for the first time, from the
 * values the CSS had already converged on by itself.
 */
export const DURATION_SCALE = {
  glitch: "80ms", // steppy, non-smoothed — matches motion.glitch
  press: "90ms", // the cap going down — matches motion.press
  tick: "120ms", // the smallest acknowledgement: a hover, a colour
  swap: "160ms", // a control changing state
  glide: "190ms", // a selection or panel moving
  sweep: "220ms", // a larger movement across a surface
  pop: "400ms", // something arriving — matches motion.pop
  flood: "700ms", // a takeover — matches motion.flood
} as const;

export type DurationStep = keyof typeof DURATION_SCALE;

/**
 * CSS timing functions per duration token. GSAP ease strings ("back.out(2)")
 * are not valid CSS, so the CSS side needs its own spelling of the same feel.
 */
export const EASE_SCALE = {
  glitch: "steps(3, end)",
  press: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  tick: "ease",
  swap: "ease-out",
  glide: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  sweep: "cubic-bezier(0.4, 0, 0.2, 1)",
  pop: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  flood: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/* ------------------------------------------------------------------ z-index */

/**
 * One stacking order.
 *
 * The first three stack parts inside one component (a button's glint, label
 * and loading dots). The rest are page layers, in the order things open: a
 * popup opened from inside a dialog has to land on top of it. Before this
 * scale, Select, Popover and Tooltip set no z-index and Menu set one on an
 * element that isn't positioned, so all four opened behind a Modal or Sheet.
 */
export const Z_SCALE = {
  base: "0", // inside a component: the bottom part
  raised: "1", // inside a component: above its base
  top: "2", // inside a component: its topmost part
  sticky: "100", // rails and bars that stay put while the page scrolls
  overlay: "200", // the backdrop behind a dialog
  modal: "210", // the dialog itself: Modal, Sheet, AlertDialog, Command
  popover: "300", // popups that open from a control: Select, Popover, Menu
  toast: "400", // announcements, above whatever is open
  tooltip: "500", // a tooltip describes whatever is under it, so it's above all of it
  skip: "600", // the skip link, the first thing a keyboard user reaches
} as const;

export type ZStep = keyof typeof Z_SCALE;

/* ------------------------------------------------- borders, icons, widths */

/** Border widths: 1px ×24, 1.5px ×3, 2px ×4, 4px ×1. */
export const BORDER_SCALE = {
  hairline: "1px", // seams and edges
  fine: "1.5px", // rings on small glyphs: avatar, status dot, banner icon
  thick: "2px", // state edges drawn in forced colors
  heavy: "4px", // an edge that carries meaning: the error banner's lit side
} as const;

export type BorderStep = keyof typeof BORDER_SCALE;

/**
 * Icon sizes. Echo draws its own component glyphs and recommends Lucide for
 * yours (PRINCIPLES.md decision 8); these sizes make the two agree. From 12,
 * 14, 15, 16, 17, 19 and 28px.
 */
export const ICON_SCALE = {
  xs: "12px", // dismiss and remove crosses
  sm: "14px", // checks and indicators, small button icons
  md: "16px", // the default
  lg: "20px", // large button icons
  xl: "28px", // empty states
} as const;

export type IconStep = keyof typeof ICON_SCALE;

/**
 * Viewport breakpoints, from 560, 620, 640, 900 and 1100px. CSS can't read a
 * custom property inside a media query, so these are exported for JavaScript
 * (matchMedia) and scales.test.ts holds every component media query to them.
 * Prefer a container query when a component should respond to its own width.
 */
export const BREAKPOINTS = {
  sm: "560px", // phones: single column
  md: "640px", // small tablets
  lg: "900px", // room for a sidebar
  xl: "1100px", // room for a third column
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Scale a `Npx` value, rounding to the half pixel. "0" and non-px values pass through. */
function scalePx(value: string, factor: number, step = 0.5): string {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value);
  if (!m || factor === 1) return value;
  return `${Math.round((Number(m[1]) * factor) / step) * step}px`;
}

/**
 * Renders every scale as CSS custom properties, shaped by the device settings
 * (device.ts): radius scales the radius steps (not `full`), density scales
 * spacing and control heights. At the defaults every factor is 1 and the
 * output is today's values exactly.
 *
 * Emitted by `createEchoTheme` so an installed component inherits them.
 */
export function renderScaleTokens(device: EchoDevice = DEVICE_DEFAULTS): string[] {
  const radius = radiusFactor(device.radius);
  const density = DENSITY_FACTOR[device.density];
  const lines: string[] = [];
  for (const [step, value] of Object.entries(RADIUS_SCALE)) {
    lines.push(`  --echo-radius-${step}: ${step === "full" ? value : scalePx(value, radius)};`);
  }
  for (const [step, value] of Object.entries(TYPE_SCALE)) {
    lines.push(`  --echo-text-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(SPACE_SCALE)) {
    lines.push(`  --echo-space-${step}: ${scalePx(value, density)};`);
  }
  // Whole pixels for control heights; compact's smallest (28px) stays above
  // the 24px target minimum.
  for (const [step, value] of Object.entries(CONTROL_HEIGHT)) {
    lines.push(`  --echo-control-${step}: ${scalePx(value, density, 1)};`);
  }
  for (const [step, value] of Object.entries(DURATION_SCALE)) {
    lines.push(`  --echo-duration-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(EASE_SCALE)) {
    lines.push(`  --echo-ease-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(Z_SCALE)) {
    lines.push(`  --echo-z-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(BORDER_SCALE)) {
    lines.push(`  --echo-border-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(ICON_SCALE)) {
    lines.push(`  --echo-icon-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(WEIGHT_SCALE)) {
    lines.push(`  --echo-weight-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(LEADING_SCALE)) {
    lines.push(`  --echo-leading-${step}: ${value};`);
  }
  for (const [step, value] of Object.entries(TRACKING_SCALE)) {
    lines.push(`  --echo-tracking-${step}: ${value};`);
  }
  for (const [name, t] of Object.entries(TEXT_STYLES)) {
    lines.push(
      `  --echo-type-${name}: var(--echo-weight-${t.weight}) var(--echo-text-${t.size})/var(--echo-leading-${t.leading}) var(--echo-font-${t.font});`,
      `  --echo-type-${name}-tracking: var(--echo-tracking-${t.tracking});`,
      `  --echo-type-${name}-case: ${t.case};`,
    );
  }
  // Declared with the gloss, shade and roles they read, so they resolve with
  // this block's values (see shadow.ts).
  for (const name of Object.keys(SHADOW_RECIPES) as ShadowName[]) {
    lines.push(`  --echo-shadow-${name}: ${shadowValue(name)};`);
  }
  return lines;
}
