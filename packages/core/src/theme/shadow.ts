/**
 * Shadow recipes: Echo's shadows, by name.
 *
 * Every Echo shadow is drawn by the same light: one key light, top left, whose
 * highlights are white scaled by the finish (`--echo-gloss`) and whose shade is
 * black scaled by it (`--echo-shade`). What varies is how deep a part sits and
 * how high it floats. These are the depths the library uses most, each taken
 * exactly from the component that defined it, so a component that switched to
 * a recipe looks as it did.
 *
 * `createEchoTheme` emits each as `--echo-shadow-<name>`, for your own parts
 * and for the components whose shadow is one of them. A component reads a
 * recipe with the recipe as its fallback, `var(--echo-shadow-well, <value>)`,
 * so it still renders under a theme written before the recipes existed.
 *
 * Not every Echo shadow is a recipe, on purpose:
 *
 * - A shadow that moves with its part stays in the component. A cap's drop
 *   shortens as it's pressed (`var(--press)`), a well deepens as it takes
 *   focus (`var(--well-depth)`). CSS resolves the `var()`s inside a custom
 *   property where the property is declared, so a recipe declared on the page
 *   would freeze those at their resting values.
 * - A component tuned by eye keeps its own depth. scales.test.ts counts those
 *   and fails if the count grows, so a new component starts from a recipe.
 *
 * A rule that re-declares a token a recipe reads (Scope's reflective screens
 * re-declare the glow) re-declares the recipe with it, for the same reason;
 * scales.test.ts holds that too.
 */

/**
 * Shade, scaled by the finish: black on a dark device, and on a light one a
 * deep colour of the body's own (`--echo-cast-ink`), so pale plastic casts
 * a shadow of its own temperature instead of a grey smudge.
 */
const shade = (alpha: number) =>
  `color-mix(in oklab, var(--echo-cast-ink, black) calc(${alpha} * var(--echo-shade, 1) * 100%), transparent)`;
/** White highlight, scaled by the finish. */
const gloss = (alpha: number) => `rgb(255 255 255 / calc(${alpha} * var(--echo-gloss, 1)))`;

/*
 * The drawn device's line (device.ts, `render`). On a molded device the line is
 * 0px wide and `--echo-drawn` is 0, so each of these draws nothing and every
 * recipe renders as it did; on a drawn one the light is off (gloss and shade
 * 0) and these are what's left: an outline in the ink, and under a raised or
 * floating part a hard ink edge as deep as it stands.
 */
/** The ink outline around a raised or floating part. */
const outline = "0 0 0 var(--echo-line-width, 0px) var(--echo-line, transparent)";
/** The ink outline inside a recess, a hollow drawn into the sheet. */
const inline = "inset 0 0 0 var(--echo-line-width, 0px) var(--echo-line, transparent)";
/** A hard ink edge under a part that stands `px` off the sheet, on a drawn device only. */
const stands = (px: number) => `0 calc(${px}px * var(--echo-drawn, 0)) 0 var(--echo-line-width, 0px) var(--echo-line, transparent)`;

export type ShadowKind = "recessed" | "raised" | "floating" | "focus" | "glow";

export interface ShadowRecipe {
  kind: ShadowKind;
  /** What it's for, in a sentence. */
  use: string;
  /** Its layers, top first, as `box-shadow` takes them. */
  layers: readonly string[];
}

export const SHADOW_RECIPES = {
  /* ---- recessed: set into the body ---- */
  well: {
    kind: "recessed",
    use: "Set into the body: a field, a tray, the bed a cap sits in.",
    layers: [`inset 0 2px 5px ${shade(0.6)}`, `inset 0 -1px 0 ${gloss(0.05)}`, inline],
  },
  "well-screen": {
    kind: "recessed",
    use: "The glass of a screen or a readout.",
    layers: [`inset 0 2px 6px ${shade(0.8)}`, `inset 0 -1px 0 ${gloss(0.05)}`, inline],
  },
  "well-deep": {
    kind: "recessed",
    use: "A deep bezel: a large screen, a keypad's window.",
    layers: [`inset 0 3px 7px ${shade(0.9)}`, `inset 0 -1px 0 ${gloss(0.05)}`, inline],
  },
  groove: {
    kind: "recessed",
    use: "A track cut into the body, for progress and levels.",
    layers: [`inset 0 2px 5px ${shade(0.7)}`, inline],
  },

  /* ---- raised: standing out of the body ---- */
  edge: {
    kind: "raised",
    use: "Light catching the top edge of a small raised part.",
    layers: [`inset 0 1px 0 ${gloss(0.4)}`],
  },
  hairline: {
    kind: "raised",
    use: "The lit lip under a divider.",
    layers: [`0 1px 0 ${gloss(0.04)}`],
  },
  chip: {
    kind: "raised",
    use: "A small raised part: a badge, a count.",
    layers: [`inset 0 1px 0 ${gloss(0.15)}`, `0 1px 2px ${shade(0.4)}`, outline],
  },
  key: {
    kind: "raised",
    use: "A low key standing on its seam.",
    layers: [`inset 0 1px 0 ${gloss(0.3)}`, outline, "0 2px 0 var(--echo-line-width, 0px) var(--echo-seam)"],
  },
  cap: {
    kind: "raised",
    use: "A molded cap at rest.",
    layers: [
      `inset 0 1.5px 0 ${gloss(0.42)}`,
      `inset 0 -1px 0 ${gloss(0.05)}`,
      `inset 0 -3px 4px ${shade(0.5)}`,
      outline,
      "0 4px 0 var(--echo-line-width, 0px) var(--echo-seam)",
      `0 9px 14px ${shade(0.55)}`,
    ],
  },
  "cap-lit": {
    kind: "raised",
    use: "The lit cap, the one place the hardware turns accent.",
    layers: [
      `inset 0 1px 0 ${gloss(0.45)}`,
      `inset 0 -2px 4px ${shade(0.35)}`,
      outline,
      "0 4px 0 var(--echo-line-width, 0px) var(--echo-lit-edge, var(--echo-accent-6))",
      // The lit cap's halo. A drawing has no light: it collapses under the cap.
      "0 calc(8px * (1 - var(--echo-drawn, 0))) calc(20px * (1 - var(--echo-drawn, 0))) color-mix(in oklch, var(--echo-accent-4) 40%, transparent)",
    ],
  },
  panel: {
    kind: "raised",
    use: "A panel resting on the body.",
    layers: [`0 1px 0 ${gloss(0.05)}`, `0 6px 14px ${shade(0.4)}`, outline],
  },
  lifted: {
    kind: "raised",
    use: "A panel lifted off the body, the way a card rises under the pointer.",
    layers: [`0 1px 0 ${gloss(0.07)}`, `0 10px 22px ${shade(0.45)}`, outline, stands(4)],
  },
  chassis: {
    kind: "raised",
    use: "The device's own body.",
    layers: [
      `inset 0 1.5px 0 ${gloss(0.07)}`,
      `inset 0 -3px 8px ${shade(0.55)}`,
      "inset 0 0 0 1px var(--echo-seam)",
      `0 30px 60px -22px ${shade(0.75)}`,
    ],
  },

  /* ---- floating: above the page, lowest first ---- */
  tooltip: {
    kind: "floating",
    use: "A tooltip, the lowest thing that floats.",
    layers: [`inset 0 1px 0 ${gloss(0.08)}`, "inset 0 0 0 1px var(--echo-seam)", `0 8px 20px -8px ${shade(0.7)}`, outline, stands(3)],
  },
  popover: {
    kind: "floating",
    use: "A popover or a small popup.",
    layers: [`inset 0 1px 0 ${gloss(0.08)}`, "inset 0 0 0 1px var(--echo-seam)", `0 20px 40px -16px ${shade(0.75)}`, outline, stands(4)],
  },
  toast: {
    kind: "floating",
    use: "An announcement floating over the page.",
    layers: [
      `inset 0 1.5px 0 ${gloss(0.28)}`,
      "inset 0 0 0 1px color-mix(in oklab, var(--echo-seam) 70%, transparent)",
      `0 18px 36px -14px ${shade(0.75)}`,
      outline,
      stands(5),
    ],
  },
  modal: {
    kind: "floating",
    use: "A dialog, the highest thing that floats.",
    layers: [
      "inset 0 1px 0 color-mix(in oklab, var(--echo-cap-highlight) 46%, transparent)",
      "inset 0 0 0 1px var(--echo-seam)",
      `0 40px 80px -24px ${shade(0.85)}`,
      outline,
      stands(6),
    ],
  },

  /* ---- focus and glow ---- */
  ring: {
    kind: "focus",
    use: "Keyboard focus around a raised part: a gap in the body's colour, then the accent's ink (the glow, on a dark device).",
    layers: ["0 0 0 2px var(--echo-surface)", "0 0 0 4px var(--echo-accent-ink, var(--echo-accent-glow))"],
  },
  "ring-inset": {
    kind: "focus",
    use: "Keyboard focus inside a well, where a ring outside would sit on the rim.",
    layers: ["inset 0 0 0 2px var(--echo-accent-ink, var(--echo-accent-glow))"],
  },
  glow: {
    kind: "glow",
    use: "The glow of something lit: the current tab, the page you're on.",
    // A drawing has no light: on a drawn device the glow collapses to nothing.
    layers: ["0 0 calc(7px * (1 - var(--echo-drawn, 0))) color-mix(in oklch, var(--echo-accent-glow) 70%, transparent)"],
  },
} as const satisfies Record<string, ShadowRecipe>;

export type ShadowName = keyof typeof SHADOW_RECIPES;

/** A recipe as one `box-shadow` value. */
export function shadowValue(name: ShadowName): string {
  return SHADOW_RECIPES[name].layers.join(", ");
}
