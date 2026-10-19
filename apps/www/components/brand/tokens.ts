/**
 * The brand's colours.
 *
 * The whole site, creature included, follows the chosen seed.
 *
 * `BRAND_REFERENCE` keeps the brand as it was drawn, on the raspberry seed
 * (`BRAND_DRAWN_ON`). `brand-theme.ts` relights every value from it for the
 * current seed and emits the result as `--brand-*` variables beside the
 * `--echo-*` ones, so on Raspberry nothing moves, and on the default purple
 * seed the creature is purple.
 *
 * What components import are the `var(--brand-*)` references below — never
 * the reference hexes, which would pin a colour back to raspberry. None of
 * this may be imported by registry code.
 */
export const BRAND_DRAWN_ON = { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" } as const;

export const BRAND_REFERENCE = {
  creature: {
    body: "#DE3B74", // Echo Raspberry — the mark
    livePink: "#E64980", // Creature Pink — the live animated fill
    aura: "#A61E4D", // Aura Raspberry — the glow behind glass
    bodyLight: "#F0A6C0", // top-lit gloss highlight
    bodyDeep: "#A61E4D", // shadow side
    // Eyes stay white and black under every seed: they carry no hue, and
    // they are what keeps the mark legible whatever colour the body is.
    eye: "#EEEAE4",
    pupil: "#131216",
  },
  neutral: {
    void: "#16121A",
    ink: "#0E0B11",
    graphite: "#26222B",
    slate: "#3A343F",
    cream: "#F5EDE0",
  },
  /** The three aura ramps, light → dark; [2] is the brand hue. */
  aura: {
    raspberry: ["#F7D0DE", "#EC9BB6", "#E64980", "#C93168", "#A61E4D", "#741538", "#40101F"],
    lavender: ["#EDE7FF", "#D6C8FE", "#B197FC", "#9575E8", "#7554C9", "#533A94", "#2E2154"],
    peach: ["#FFF0E6", "#FFDCC4", "#FFC9A8", "#F2AD86", "#D98E64", "#A66743", "#6E4028"],
  },
  /** The glitch's split channels: the brand pink and its cyan complement. */
  glitch: { pink: "#FF2E7A", cyan: "#39E6FF" },
} as const;

const v = (name: string) => `var(--brand-${name})`;
type Ramp = readonly [string, string, string, string, string, string, string];
const ramp = (name: string) => [1, 2, 3, 4, 5, 6, 7].map((i) => v(`${name}-${i}`)) as unknown as Ramp;

export const creature = {
  body: v("body"),
  livePink: v("live-pink"),
  aura: v("aura"),
  bodyLight: v("body-light"),
  bodyDeep: v("body-deep"),
  eye: BRAND_REFERENCE.creature.eye,
  pupil: BRAND_REFERENCE.creature.pupil,
} as const;

export const neutral = {
  void: v("void"),
  ink: v("ink"),
  graphite: v("graphite"),
  slate: v("slate"),
  cream: v("cream"),
} as const;

export const aura = {
  raspberry: ramp("raspberry"),
  lavender: ramp("lavender"),
  peach: ramp("peach"),
} as const;

export const glitch = { pink: v("glitch-pink"), cyan: v("glitch-cyan") } as const;

/**
 * `color` at `percent`% opacity — a hex alpha suffix cannot be put on a var().
 * In oklab: the same colour for a vivid one, and a near-grey (cream, ink)
 * keeps its hue, which Chromium drops in oklch.
 */
export const alpha = (color: string, percent: number) =>
  `color-mix(in oklab, ${color} ${percent}%, transparent)`;
