/**
 * createEchoTheme — the Echo theme engine (Layer 2).
 *
 * One derivation, two mirrors: returns `{ css, values }`. Every semantic role
 * is computed in OKLCH from the three seeds (accent, chassis, paper), so the
 * molded-plastic material physics stays correct at any hue. The engine was
 * calibrated on the raspberry seed the first Echo device was drawn in
 * (#DE3B74), which it reproduces exactly; any other seed, the purple default
 * included, relights the whole device with no raspberry left in it.
 *
 * Pure + SSR-safe: no window/document access anywhere here.
 */
import { EchoSeed, type EchoSeedInput } from "./seed";
import {
  ECHO_ROLES,
  ECHO_FONT_ROLES,
  type EchoRole,
  type EchoFontRole,
  type EchoTheme,
} from "./roles";
import { hexToOklch, oklchToHex, adjust, clampToGamut, type OKLCH } from "./oklch";
import { CAP_OFF_BODY, RIM_OFF_CAP, readability, type ReadabilityNote } from "./readability";
import { renderScaleTokens } from "./scales";
import { DENSITY_FACTOR, DRAWN_LINE_WIDTH, KEY_LIGHT_ANGLE, glossFactor, radiusFactor, shadeFactor, type EchoDevice } from "./device";
import {
  ensureContrast,
  ensureBackgroundContrast,
  contrastRatio,
  apcaContrast,
  AA_NORMAL,
  AA_NON_TEXT,
  APCA_SMALL_TEXT,
} from "./contrast";

/**
 * Accent ramp envelope, lifted from the reference `ramp.raspberry` (L and C per
 * stop, light → dark). Hue comes from the seed accent, and chroma scales to the
 * seed's own chroma, so the raspberry reference reproduces the original ramp
 * while any other hue gets a coherent, in-family ramp.
 */
const RAMP_L = [0.895, 0.778, 0.64, 0.563, 0.48, 0.374, 0.26] as const;
const RAMP_C = [0.047, 0.102, 0.197, 0.191, 0.172, 0.131, 0.076] as const;
/** Chroma of the raspberry reference accent (#DE3B74) the envelope was measured against. */
const REFERENCE_ACCENT_C = 0.2019;

/**
 * `accent-highlight` used to subtract an ABSOLUTE 0.109 of chroma,
 * calibrated against raspberry (C = 0.2019). Teal's chroma is 0.109 exactly, so
 * it landed on C = 0.000 — a pure grey highlight (#CFCFCF) on a teal device,
 * and the same for any seed at or below ~0.109 chroma.
 *
 * The fix is the one `buildAccentRamp` already had two functions earlier:
 * scale chroma proportionally instead of subtracting a constant. The ratio is
 * the reference subtraction expressed as a fraction, so the raspberry reference
 * reproduces #F0A6C0 exactly and every other hue keeps its colour.
 */
const HIGHLIGHT_C_SCALE = (REFERENCE_ACCENT_C - 0.109) / REFERENCE_ACCENT_C;

/**
 * The accent role is the only derived value that was passed
 * straight through from the seed, so its lightness was whatever the user
 * typed: raspberry 0.610, teal 0.662, amber 0.738, purple 0.626. The same
 * component read as a different emphasis level depending on the seed, which is
 * the one thing a derivation engine exists to prevent.
 *
 * The band is the two ramp stops the reference accent sits between (ramp[3]
 * 0.563 → ramp[2] 0.64, widened slightly), so ordinary seeds move as little
 * as possible, and neither the raspberry reference nor the purple default
 * moves at all.
 */
const ACCENT_L_MIN = 0.56;
const ACCENT_L_MAX = 0.66;

/**
 * Light or dark, decided by the chassis: a body lighter than this (OKLCH L)
 * is molded in light plastic. There's no setting for it. A white calculator
 * and a cream radio are the same device as a black one, lit by the same key
 * light, and the chassis is the only choice that tells them apart.
 */
export const LIGHT_CHASSIS_L = 0.6;

/** Whether a chassis makes a light device or a dark one. */
export function devicePolarity(chassis: string): "light" | "dark" {
  return hexToOklch(chassis).L > LIGHT_CHASSIS_L ? "light" : "dark";
}

/**
 * How much of a light device's shadow is drawn. Every shade in Echo is black
 * scaled by `--echo-shade`, tuned on dark plastic, where black barely shows;
 * on pale plastic the same alpha reads as soot. Half is where a white cap
 * reads as raised and a well as set in, without the body looking dirty.
 */
const LIGHT_SHADE = 0.5;

/**
 * The accent's ink on a light device, against every ground: text at AA with
 * room to spare, because the ink is also the focus ring. A focused cap sets
 * its ring where its cast shadow was, and on pale plastic that pixel is about
 * half the ground's luminance: at 4.5:1 on the ground the ring fell under 3:1
 * there (tests/focus-contrast.spec.ts). 6:1 holds 3:1 over the shadow too.
 */
const LIGHT_INK = 6;


/**
 * Samples the accent ramp at a CONTINUOUS position, 0..6.
 *
 * The discrete ramp is a material envelope — L and C move together along it,
 * which is what makes every stop read as the same plastic under different
 * light. Sliding along that envelope keeps the material; stepping off it (say,
 * dropping L while holding C) produces a muddy, desaturated colour that no
 * longer belongs to the family. The primary cap below needs to slide.
 */
function rampAt(accent: OKLCH, u: number): string {
  const scale = accent.C / REFERENCE_ACCENT_C;
  const clamped = Math.min(RAMP_L.length - 1, Math.max(0, u));
  const i = Math.floor(clamped);
  const j = Math.min(RAMP_L.length - 1, i + 1);
  const f = clamped - i;
  return oklchToHex({
    L: RAMP_L[i]! + (RAMP_L[j]! - RAMP_L[i]!) * f,
    C: (RAMP_C[i]! + (RAMP_C[j]! - RAMP_C[i]!) * f) * scale,
    H: accent.H,
  });
}

/**
 * Finds where on the ramp a gradient of width `span` can sit so that `fg`
 * clears `target` at BOTH ends, landing as close to `preferred` as possible.
 *
 * This is the one move that fixes a contrast failure without leaving the
 * material: the window slides along the envelope instead of the colours being
 * pushed off it. Which way it slides falls out of the search rather than being
 * assumed — a light chassis needs the fill to go lighter, a dark one darker,
 * and hardcoding "darker" is how a derivation engine acquires a polarity bug.
 *
 * Returns `null` when no window on the ramp works, so the caller can fall back
 * rather than silently emit a failing pair.
 */
function findRampWindow(
  accent: OKLCH,
  fg: string,
  target: number,
  span: number,
  preferred: number,
): number | null {
  const max = RAMP_L.length - 1 - span;
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let u = 0; u <= max; u += 0.05) {
    if (contrastRatio(fg, rampAt(accent, u)) < target) continue;
    if (contrastRatio(fg, rampAt(accent, u + span)) < target) continue;
    const distance = Math.abs(u - preferred);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = u;
    }
  }
  return best;
}

/** Down the ramp from the emissive stop until the colour reads at `target` on every ground. */
/**
 * A colour lifted, same hue, until it reads at APCA `lc` on every ground: how
 * a dark device's small text clears what the WCAG 2 ratio overrates.
 */
function liftUntilReadable(colour: string, grounds: readonly string[], lc: number): string {
  let c = hexToOklch(colour);
  const worst = (hex: string) => Math.min(...grounds.map((ground) => apcaContrast(hex, ground)));
  let hex = colour;
  while (worst(hex) < lc && c.L < 0.99) {
    c = clampToGamut({ ...c, L: Math.min(0.99, c.L + 0.005) });
    hex = oklchToHex(c);
  }
  return hex;
}

function slideUntil(accent: OKLCH, grounds: readonly string[], target: number): string {
  let u = 2;
  while (u < RAMP_L.length - 1 && grounds.some((ground) => contrastRatio(rampAt(accent, u), ground) < target)) u += 0.05;
  let colour = rampAt(accent, u);
  for (const ground of grounds) colour = ensureContrast(colour, ground, target).color;
  return colour;
}

function buildAccentRamp(accent: OKLCH): EchoTheme["accentRamp"] {
  const scale = accent.C / REFERENCE_ACCENT_C;
  const stops = RAMP_L.map((L, i) =>
    oklchToHex({ L, C: RAMP_C[i]! * scale, H: accent.H }),
  );
  /*
   * The palest stop is a label on the two deepest (AlertDialog's destructive
   * confirm). The envelope is fixed in OKLCH lightness, and at one lightness a
   * green is brighter than a violet, so on greens that label read 4.38:1
   *. Lift the palest stop until it reads; a hue that already did
   * keeps its stop exactly.
   */
  const palest = (): number => Math.min(contrastRatio(stops[0]!, stops[4]!), contrastRatio(stops[0]!, stops[5]!));
  for (let L: number = RAMP_L[0]; palest() < AA_NORMAL && L < 1; ) {
    L = Math.min(1, L + 0.005);
    stops[0] = oklchToHex(clampToGamut({ L, C: RAMP_C[0] * scale, H: accent.H }));
  }
  return stops as unknown as EchoTheme["accentRamp"];
}

/** The roles the text guard reads: the two text roles and the grounds they sit on. */
type GuardedRole = Extract<
  EchoRole,
  "text" | "text-dim" | "surface" | "well" | "lcd" | "cap" | "cap-highlight" | "cap-shadow"
>;

/** Contrast pairs to guard: [textRole, backgroundRole, target]. */
const CONTRAST_PAIRS: ReadonlyArray<[GuardedRole, GuardedRole, number]> = [
  ["text", "surface", AA_NORMAL],
  ["text", "well", AA_NORMAL],
  ["text", "lcd", AA_NORMAL],
  // The neutral cap's three stops. A paper that only just cleared
  // the chassis failed every cap drawn lighter than it, silently.
  ["text", "cap-highlight", AA_NORMAL],
  ["text", "cap", AA_NORMAL],
  ["text", "cap-shadow", AA_NORMAL],
  // AA_NORMAL, not AA_LARGE: every use of text-dim in this library is small
  // text — 10-13px labels, captions and descriptions — so guaranteeing it only
  // to the large-text threshold guarantees the wrong thing. All four shipped
  // seeds already land at 6.5:1 or better, so this tightens the contract for
  // hostile seeds rather than changing what anyone currently sees.
  ["text-dim", "surface", AA_NORMAL],
  ["text-dim", "cap", AA_NORMAL],
];

/**
 * A light device's extra pairs: dim text on the page's own ground and on the
 * screens. On a dark device both are darker than the surface, so clearing the
 * surface clears them and they'd only change the path the solver takes on
 * seeds that are already unsatisfiable; on a light device they're the darker
 * grounds, and dim text on the page is where it first failed (3.95:1 on the
 * well).
 */
const LIGHT_CONTRAST_PAIRS: ReadonlyArray<[GuardedRole, GuardedRole, number]> = [
  ["text-dim", "well", AA_NORMAL],
  ["text-dim", "lcd", AA_NORMAL],
];

export interface CreateEchoThemeOptions {
  /** CSS selector the variables are scoped to. Default ":root". */
  selector?: string;
  /**
   * Silence the contrast auto-correction warning.
   *
   * Defaults to **true in production and false in development**.
   * It used to default to `false` and then be passed `true` at nearly every
   * call site, including the root layout — so the one runtime signal the
   * theme engine emits was switched off in the one place anybody would have
   * seen it. Console hygiene is a reasonable thing to want; achieving it by
   * having every caller opt out is how a warning stops existing.
   *
   * The unsatisfiable-palette warning is never silenced by this: an
   * auto-correction is routine, a palette no colour can satisfy is a defect.
   */
  quiet?: boolean;
}

/**
 * Warnings already emitted this process, keyed by message.
 *
 * A theme is derived on every render of every themed component — the generator
 * re-derives on each keystroke — so warning per call would produce hundreds of
 * identical lines and train everyone to ignore the console. Once per distinct
 * problem is the useful frequency.
 */
const seenWarnings = new Set<string>();

function warnOnce(message: string): void {
  if (seenWarnings.has(message)) return;
  seenWarnings.add(message);
  console.warn(message);
}

/** Test seam: lets the suite assert the once-per-message behaviour. */
export function __resetThemeWarnings(): void {
  seenWarnings.clear();
}

export interface EchoThemeResult {
  /** CSS custom-property block, ready to inject at :root or a scope class. */
  css: string;
  /** JS mirror of the same derivation (GSAP / canvas / ShaderField). */
  values: EchoTheme;
  /**
   * What the theme changed about the seed, so a tool can say it: a role the
   * contrast guarantee moved to reach AA ("text-dim (→ 4.52:1)"), a role no
   * colour could make readable on every ground it sits on, and the accent,
   * when it was moved into Echo's lightness band (every accent is held to
   * one, so a lit cap reads the same whatever the seed, and an acid yellow
   * comes out olive). Empty, and no `accent`, when the seed needed nothing.
   * The console says the contrast part outside production.
   */
  report: {
    corrected: string[];
    unsatisfiable: string[];
    accent?: { from: string; to: string };
    /** Past AA: small text in APCA, a cap's edge, colour blindness. What the engine couldn't fix, said. */
    readability: ReadabilityNote[];
  };
}

/*
 * Declared rather than taken from Node's types, so this file type-checks the
 * way a consumer's app compiles it — with no `@types/node` in scope. The three
 * components that carry the same declaration do so for the same reason
 *. It never reaches a consumer: the package ships its own `.d.ts`.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Are we in a production build?
 *
 * `process` is a Node global, and this package is published compiled and runs
 * in a browser. Bundlers replace `process.env.NODE_ENV` at build time, so a
 * bare read works under Next and Vite — and throws
 * `ReferenceError: process is not defined` under anything that does not do
 * the replacement: a plain ESM import, a CDN, a worker. It would throw from
 * the first `createEchoTheme` call, which is the first thing an Echo app makes.
 *
 * The guard costs nothing and is erased by the same bundlers anyway.
 */
function isProduction(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "production";
}

export function createEchoTheme(
  seed: EchoSeedInput = {},
  options: CreateEchoThemeOptions = {},
): EchoThemeResult {
  const { selector = ":root", quiet = isProduction() } = options;
  const resolved = EchoSeed.parse(seed);

  const seedAccent = hexToOklch(resolved.accent);
  // Normalise accent lightness into the band before anything is
  // derived from it, so the ramp, the highlight and the cap all inherit it.
  // Gamut-mapped as well as clamped: a colour can sit at the lightness you
  // asked for and still be unreachable in sRGB, in which case the hex clips
  // per channel and reads back outside the band (pure green came back at
  // 0.681). Chroma is the axis that gives way.
  const accent: OKLCH = clampToGamut({
    ...seedAccent,
    L: Math.min(ACCENT_L_MAX, Math.max(ACCENT_L_MIN, seedAccent.L)),
  });
  const chassis = hexToOklch(resolved.chassis);
  const paper = hexToOklch(resolved.paper);

  const accentRamp = buildAccentRamp(accent);

  const light = chassis.L > LIGHT_CHASSIS_L;
  // Molded and lit, or drawn in the ink (device.ts). A drawn device has no light.
  const drawn = resolved.render === "drawn";

  // --- Chassis-derived molded-plastic neutrals (calibrated vs colors.ts) ---
  const surface = resolved.chassis;
  let cap: string, capHighlight: string, capShadow: string, well: string, seam: string;
  if (!light) {
    /*
     * The dark ladder steps caps up by fixed amounts, and near black a fixed
     * step stops showing: on a #030529 body a cap stood off it at 1.19:1 and
     * its lit rim off the cap at 1.34:1, so a button on a Panel (the same
     * plastic) had no edge. Every body Echo was tuned on clears
     * CAP_OFF_BODY and RIM_OFF_CAP at the fixed steps, and keeps them exactly;
     * a darker one steps further until it does too.
     */
    const stepped = (dL: number, dC = 0) => oklchToHex(adjust(chassis, { dL, dC }));
    let capStep = 0.09;
    while (contrastRatio(stepped(capStep), surface) < CAP_OFF_BODY && capStep < 0.3) capStep += 0.005;
    let rimStep = Math.max(0.18, capStep + 0.09);
    while (contrastRatio(stepped(rimStep, 0.004), stepped(capStep)) < RIM_OFF_CAP && rimStep < 0.5) rimStep += 0.005;
    cap = stepped(capStep);
    capHighlight = stepped(rimStep, 0.004);
    capShadow = oklchToHex(adjust(chassis, { dL: -0.05, dC: 0.003 }));
    well = oklchToHex(adjust(chassis, { dL: -0.104 }));
    seam = oklchToHex(adjust(chassis, { dL: -0.13 }));
  } else {
    /*
     * The light ladder. The dark one steps caps up by fixed amounts, and on a
     * near-white body both the cap and its lit rim clip to pure white: no
     * bevel. Here the steps share out the room left above the body, so a cap
     * is always a little lighter than the plastic it stands on and its rim
     * lighter still, however pale the body. Depth is carried by the shadow
     * side: the underside and the seam are shaded darker.
     *
     * The well is the page's ground as well as the recess, so it stays the
     * body barely set in. At 0.055 below the body every light page was a
     * mid grey, a dim room; a recess reads from its inset shade, and a panel
     * from its edge and its shadow, as on any light screen.
     */
    const room = 1 - chassis.L;
    cap = oklchToHex(clampToGamut({ ...chassis, L: chassis.L + room * 0.5 }));
    capHighlight = oklchToHex(clampToGamut({ L: chassis.L + room * 0.85, C: chassis.C * 0.6, H: chassis.H }));
    capShadow = oklchToHex(clampToGamut(adjust(chassis, { dL: -0.1, dC: 0.003 })));
    well = oklchToHex(clampToGamut(adjust(chassis, { dL: -0.03 })));
    seam = oklchToHex(clampToGamut(adjust(chassis, { dL: -0.16 })));
  }
  if (drawn) {
    /*
     * A drawn part is hollow: an outline in the ink around the paper it's drawn
     * on, as a spec sheet draws a key. No rim, no underside, no recess shade:
     * the cap, its stops and the well are the body, and the page's ground is
     * the body too, so the sheet is white where the board is white. The seam,
     * the ink, comes after the text is held below.
     */
    cap = capHighlight = capShadow = well = surface;
  }

  // --- Accent-derived roles ---
  // Not `resolved.accent`: the seed's own lightness is normalised above.
  const accentHex = oklchToHex(accent);
  const accentHighlight = oklchToHex({
    L: accent.L + 0.193,
    C: accent.C * HIGHLIGHT_C_SCALE,
    H: (((accent.H - 8) % 360) + 360) % 360,
  });
  const accentPressed = accentRamp[4]; // deep stop — reproduces #A61E4D

  // --- Screen / LCD ---
  // A light device's screens are paper glass printed in ink, a shade under the
  // body, like a pocket calculator's: a glow needs a dark room.
  const lcd = resolved.lcdTint ?? (drawn ? surface : light ? oklchToHex(clampToGamut(adjust(chassis, { dL: -0.02 }))) : oklchToHex(adjust(chassis, { dL: -0.12 })));

  /*
   * What's lit, and what's printed lit. On a dark device they're one colour,
   * the ramp's emissive stop (reproduces ~#E64980): light reads as text on
   * every dark ground. On a light device they part. The light (an LED, the
   * lit rail) is the accent itself, slid down the ramp only as far as 3:1 on
   * every ground, the contrast a graphic needs. The text a readout or a
   * current tab prints is its ink, slid on to 6:1, and so is a focus ring:
   * at 3:1 a ring faded wherever it crossed a shadow or an edge. Drawing all
   * of it in the ink made "on" darker than "off": a lit LED read as a hole.
   */
  const glowGrounds = [surface, cap, well, lcd];
  let accentGlow: string = accentRamp[2];
  let accentInk: string;
  if (light) {
    accentGlow = slideUntil(accent, glowGrounds, AA_NON_TEXT);
    accentInk = slideUntil(accent, glowGrounds, LIGHT_INK);
  } else {
    /*
     * On a dark device the light stays the glow (LEDs, the rail, halos), and
     * the text printed lit is the glow lifted until a small label reads:
     * APCA Lc 60 on every dark ground. The WCAG 2 ratio alone passed lit text
     * at 5:1 that read at Lc 30 to 43 on every seed Echo was tuned on, and a
     * deep cobalt's "Checked in" hurt to read. Same hue, lighter.
     */
    accentInk = liftUntilReadable(accentGlow, glowGrounds, APCA_SMALL_TEXT);
  }
  // The halo around lit screen text. Every use is a halo, never a colour of its
  // own, so on a light device it's the glass itself: on paper glass a halo is a
  // smudge, and in the glass's colour it disappears.
  const lcdGlow = light || drawn ? lcd : accentGlow;

  // --- Paper-derived text ---
  // Held against every ground it sits on BEFORE anything is fitted to it. The
  // primary cap below slides until this text reads on it, so it must be the
  // text the theme emits, not the paper as typed.
  const guarded: Record<GuardedRole, string> = {
    surface,
    well,
    lcd,
    cap,
    "cap-highlight": capHighlight,
    "cap-shadow": capShadow,
    text: resolved.paper,
    // Dim text moves toward the ground by the same step on either device: darker on a dark one,
    // lighter on a light one. At +0.3 it read 4.66:1 on a light page, washed out.
    "text-dim": light ? oklchToHex(clampToGamut(adjust(paper, { dL: 0.21 }))) : oklchToHex(adjust(paper, { dL: -0.21 })),
  };

  /*
   * --- Contrast guardrails: auto-correct text roles that fail AA ---
   *
   * Corrections are solved PER FOREGROUND ROLE, against all of that role's
   * backgrounds at once. Applying the pairs one after another the obvious way
   * is wrong: each correction overwrites the last, so `text` fixed against a
   * light `surface` is then re-fixed against a dark `lcd` and ends up failing
   * the surface it was corrected for. That never showed on a dark seed, where
   * every ground pulls the same direction and the corrections happen to agree,
   * and `quiet` hid even the notice.
   *
   * When the constraints genuinely conflict — one `text` cannot be legible on
   * both a light chassis and a dark screen — no value satisfies them, so the
   * theme SAYS SO instead of emitting a token that quietly fails. That warning
   * is not silenced by `quiet`: an auto-correction is routine, an unsatisfiable
   * palette is a defect in the seed.
   */
  const byForeground = new Map<GuardedRole, [GuardedRole, number][]>();
  for (const [fgRole, bgRole, target] of light ? [...CONTRAST_PAIRS, ...LIGHT_CONTRAST_PAIRS] : CONTRAST_PAIRS) {
    const list = byForeground.get(fgRole) ?? [];
    list.push([bgRole, target]);
    byForeground.set(fgRole, list);
  }

  const adjustedRoles: string[] = [];
  const unsatisfiable: string[] = [];

  for (const [fgRole, constraints] of byForeground) {
    let color = guarded[fgRole];
    let adjusted = false;

    // Fixpoint: re-apply every constraint until a pass changes nothing. With
    // agreeing constraints this settles in one or two passes; with conflicting
    // ones it oscillates, and the bound is what stops it.
    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      for (const [bgRole, target] of constraints) {
        const fix = ensureContrast(color, guarded[bgRole], target);
        if (fix.adjusted) {
          color = fix.color;
          adjusted = true;
          changed = true;
        }
      }
      if (!changed) break;
    }

    guarded[fgRole] = color;

    const failing = constraints.filter(
      ([bgRole, target]) => contrastRatio(color, guarded[bgRole]) < target,
    );
    if (failing.length > 0) {
      // Report every ground it cannot satisfy, so the seed can be fixed rather
      // than guessed at.
      unsatisfiable.push(
        `${fgRole} on ${failing
          .map(([bgRole, target]) => `${bgRole} (${contrastRatio(color, guarded[bgRole]).toFixed(2)}:1, needs ${target})`)
          .join(" and ")}`,
      );
    } else if (adjusted) {
      adjustedRoles.push(`${fgRole} (→ ${contrastRatio(color, guarded[constraints[0]![0]]).toFixed(2)}:1)`);
    }
  }

  if (adjustedRoles.length > 0 && !quiet) {
    warnOnce(
      `[echo-theme] Contrast auto-corrected to meet WCAG AA: ${adjustedRoles.join(", ")}`,
    );
  }
  if (unsatisfiable.length > 0) {
    warnOnce(
      `[echo-theme] No colour satisfies every contrast pair for: ${unsatisfiable.join("; ")}. ` +
        `This usually means the seed mixes polarities: a screen tint (lcdTint) of the opposite lightness ` +
        `to the body, or a paper that isn't far enough from the chassis. A device's screens take its ` +
        `polarity: a light body's are paper glass, a dark body's are lit glass.`,
    );
  }

  const text = guarded.text;
  const textDim = guarded["text-dim"];
  if (drawn) {
    /*
     * A drawing has no light, so nothing glows: what's lit on a molded device
     * (an LED, the rail, a readout, the focus ring) is solid ink, the way a
     * spec sheet fills in the one value that's set. Every line is the ink
     * too, the seam included.
     */
    seam = text;
    accentGlow = text;
    accentInk = text;
  }

  /*
   * --- The primary cap gradient, held to AA at every point ---
   *
   * The cap painted `accent-2 → accent-glow (45%) → accent-pressed (100%)`
   * under a `--echo-text` label. Measured across the four shipped seeds, that
   * label ran 1.74–1.82:1 at the top stop, 2.82–3.20:1 at the middle one, and
   * cleared AA only over the bottom fifth. The most important control in the
   * library failed its own label on every seed.
   *
   * The label does not move — one label colour on every seed is worth more
   * than a bright cap — so the material does. The gradient SLIDES DOWN THE
   * ACCENT RAMP until its lightest point clears AA, then spans a fixed, narrow
   * window from there. Sliding rather than darkening in place is the whole
   * trick: the ramp carries its own chroma envelope, so the cap stays the same
   * plastic under dimmer light instead of turning into a muddy neutral.
   *
   * This still darkens the cap, which the first proposal hoped to avoid, and the
   * arithmetic leaves no third option: paper text needs a background at or
   * below 0.15 relative luminance and the old top stop sat at 0.45. A dark
   * label cannot work either — it would need the bottom stop lighter than
   * 0.175 while the top needs 0.45, and no single label colour spans both.
   * Constraining `accent-glow` alone, the obvious fix, moves the 45%
   * stop and leaves the top of the cap at 1.8:1. The gloss is carried by the
   * white specular rim in `hardware-button.css`, which is untouched.
   */
  const CAP_SPAN = 1.3; // ramp units from the top stop to the 100% stop
  const CAP_MID = 0.5; // where the 45% stop sits inside that window

  const capFor = (ink: string): [string, string, string] => {
    const top = findRampWindow(accent, ink, AA_NORMAL, CAP_SPAN, 1);
    // No window on the ramp carries this label. Muddy beats illegible, and the
    // contract is the thing that has to hold.
    if (top === null) {
      return [
        ensureBackgroundContrast(accentRamp[1], ink, AA_NORMAL).color,
        ensureBackgroundContrast(accentRamp[2], ink, AA_NORMAL).color,
        ensureBackgroundContrast(accentPressed, ink, AA_NORMAL).color,
      ];
    }
    return [rampAt(accent, top), rampAt(accent, top + CAP_MID), rampAt(accent, top + CAP_SPAN)];
  };
  /*
   * The label is the text on a dark device, and on a light one it's the lit
   * rim's near-white. Fitted to the light device's dark text, the cap slid UP
   * the ramp to a pastel: the most important control became the weakest
   * colour on the page, weaker than a badge. Fitted to a light label, it's the
   * accent itself with a light label, the same cap as the dark device's.
   *
   * The pour is the plastic poured into a neutral cap or a slider, under a
   * label that is also on the unlit plastic, so it's fitted to the text: on a
   * dark device that's the primary cap, on a light one the accent's pale stops.
   */
  let primaryCapInk = light ? capHighlight : text;
  let [primaryCapTop, primaryCapMid, primaryCapBase] = capFor(primaryCapInk);
  let [pourTop, pourMid, pourBase] = light ? capFor(text) : [primaryCapTop, primaryCapMid, primaryCapBase];

  /*
   * On a drawn device the accent is a fill under the ink: a highlighter on the
   * sheet. Every accent is held to one lightness so a LIT cap reads the same in
   * every style, and that's what turned an acid #D3F44F into olive; a drawn
   * cap isn't lit, it's outlined in the ink, so the seed's own colour stays,
   * flat, wherever the ink reads on it at AA. The label is the ink, or the body
   * when the accent is too dark for the ink. The outline carries the cap's
   * edge against the page (1.4.11), so the fill needs no contrast of its own.
   */
  let drawnFill: string | undefined;
  if (drawn) {
    const seedFill = oklchToHex(clampToGamut(seedAccent));
    const label = [text, surface].find((ink) => contrastRatio(ink, seedFill) >= AA_NORMAL);
    if (label) {
      drawnFill = seedFill;
      primaryCapTop = primaryCapMid = primaryCapBase = seedFill;
      primaryCapInk = label;
    }
    const pourFill = contrastRatio(text, seedFill) >= AA_NORMAL ? seedFill : capFor(text)[1];
    pourTop = pourMid = pourBase = pourFill;
  }

  /*
   * --- The bright accent fill, read with DARK text ---
   *
   * Badge, CountBadge and the current Pagination page paint an accent gradient
   * and put `--echo-surface` on it — the opposite polarity to the cap. Nobody
   * had measured them: they run 3.70:1 (badge, count-badge) and 3.06:1
   * (pagination) on the default seed, all three under AA. Same fix, mirrored: slide the window along the ramp until the dark
   * text clears AA at both ends.
   */
  const FILL_SPAN = 1;
  const fillTopU = findRampWindow(accent, surface, AA_NORMAL, FILL_SPAN, 1);
  const accentFillTop =
    fillTopU === null
      ? ensureBackgroundContrast(accentRamp[1], surface, AA_NORMAL).color
      : rampAt(accent, fillTopU);
  const accentFillBase =
    fillTopU === null
      ? ensureBackgroundContrast(accentHex, surface, AA_NORMAL).color
      : rampAt(accent, fillTopU + FILL_SPAN);

  const roles: Record<EchoRole, string> = {
    surface,
    cap,
    "cap-highlight": capHighlight,
    "cap-shadow": capShadow,
    well,
    accent: accentHex,
    "accent-highlight": accentHighlight,
    "accent-pressed": accentPressed,
    "accent-glow": accentGlow,
    "accent-ink": accentInk,
    "primary-cap-top": primaryCapTop,
    "primary-cap-mid": primaryCapMid,
    "primary-cap-base": primaryCapBase,
    "primary-cap-ink": primaryCapInk,
    "pour-top": pourTop,
    "pour-mid": pourMid,
    "pour-base": pourBase,
    "accent-fill-top": accentFillTop,
    "accent-fill-base": accentFillBase,
    lcd,
    "lcd-glow": lcdGlow,
    text,
    "text-dim": textDim,
    seam,
  };

  /*
   * The type contract. Emitted from here rather than from the docs
   * app so that an installed component inherits its type from the registry,
   * which is the whole point of a theme engine that ships tokens.
   */
  const fonts: Record<EchoFontRole, string> = {
    machine: resolved.fontMachine,
    sans: resolved.fontSans,
    mono: resolved.fontMono,
    lcd: resolved.fontLcd,
  };

  const device: EchoDevice = {
    finish: resolved.finish,
    radius: resolved.radius,
    density: resolved.density,
    render: resolved.render,
    // Unset, pills come with radius 1, as they always have.
    pills: resolved.pills ?? resolved.radius >= 1,
  };

  const values: EchoTheme = {
    roles,
    accentRamp,
    keyAngle: KEY_LIGHT_ANGLE,
    fonts,
    device,
    polarity: light ? "light" : "dark",
    ...(drawn ? { drawnFill: oklchToHex(clampToGamut(seedAccent)) } : {}),
  };

  // The accent as given, when the band moved it: the one change a builder sees most.
  const accentMoved = seedAccent.L < ACCENT_L_MIN || seedAccent.L > ACCENT_L_MAX;
  const report: EchoThemeResult["report"] = { corrected: adjustedRoles, unsatisfiable, readability: readability(roles, light ? "light" : "dark") };
  // A drawn device that keeps the seed's colour as its fill hasn't moved it where it's seen.
  if (accentMoved && !drawnFill) report.accent = { from: resolved.accent, to: accentHex };
  return { css: renderCss(values, selector), values, report };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** A light body's shadow colour: its own hue, deep, with a little more of its colour. A grey body's is grey. */
function shadowInk(body: string): string {
  const { C, H } = hexToOklch(body);
  return oklchToHex(clampToGamut({ L: 0.22, C: Math.min(C * 3, 0.05), H }));
}

function renderCss(values: EchoTheme, selector: string): string {
  const lines: string[] = [];
  for (const role of ECHO_ROLES) {
    lines.push(`  --echo-${role}: ${values.roles[role]};`);
  }
  /*
   * What a reflective screen (`data-echo-screen="reflective"`) is made of.
   * On a dark device it's the body turned inside out, paper glass printed in
   * the body's colour, and the rule in scope.css works that out itself; these
   * are reset so a light theme outside can't reach in. On a light device every
   * screen is already paper glass, so a reflective one is the same glass and
   * the same ink.
   */
  const screen: [string, string][] = [
    ["screen-glass", values.roles.lcd],
    ["screen-well", values.roles.well],
    ["screen-ink", values.roles.text],
    ["screen-ink-dim", values.roles["text-dim"]],
    /*
     * Paper things (a plate, a ticket, a receipt) and soft molding's pillow of
     * light: the lightest stock on the device, and what's printed on it. On a
     * dark device that's the paper colour itself, and the components' own
     * fallbacks say so; on a light one the paper is the lit rim's near-white.
     */
    ["paper-stock", values.roles["cap-highlight"]],
    ["paper-ink", values.roles.text],
    // A quiet field's bloom: the deep accent on a dark body, a light one on a light body.
    ["bloom", values.accentRamp[1]],
  ];
  for (const [name, value] of screen) lines.push(`  --echo-${name}: ${values.polarity === "light" ? value : "initial"};`);
  // What a recess's shade mixes toward: black on dark plastic; on light plastic,
  // the body's own seam, so a well is set in rather than smudged.
  // On a drawn device a recess has no shade, so it mixes toward the body: hollow.
  const drawn = values.device.render === "drawn";
  lines.push(`  --echo-shade-ink: ${drawn ? values.roles.surface : values.polarity === "light" ? values.roles.seam : "black"};`);
  // What a cast shadow is drawn in: black on dark plastic; on light plastic a
  // deep colour of the body's own hue. Black at any alpha greys a tinted body
  // out, a shadow that reads as soot; a shadow of the body's own temperature
  // reads as the plastic in its own shade.
  lines.push(`  --echo-cast-ink: ${values.polarity === "light" ? shadowInk(values.roles.surface) : "black"};`);
  values.accentRamp.forEach((hex, i) => {
    lines.push(`  --echo-accent-${i + 1}: ${hex};`);
  });
  for (const role of ECHO_FONT_ROLES) {
    lines.push(`  --echo-font-${role}: ${values.fonts[role]};`);
  }
  // The seed-independent scales. Emitted here so that a component installed
  // from the registry gets the tokens it references, rather than depending on
  // the docs app to define them.
  lines.push(...renderScaleTokens(values.device));
  // Finish: multipliers on highlight and shadow opacity. Component CSS reads
  // them with a fallback of 1, so it also renders under an older theme.
  // A drawn device has no light, so neither: its depth is the ink line below.
  lines.push(`  --echo-gloss: ${drawn ? 0 : round3(glossFactor(values.device.finish))};`);
  lines.push(`  --echo-shade: ${drawn ? 0 : round3(shadeFactor(values.device.finish) * (values.polarity === "light" ? LIGHT_SHADE : 1))};`);
  /*
   * The drawn device's line, read by the recipes and the components: 1 and an
   * ink outline 1.5px wide on a drawn device; 0 and 0px on a molded one, where
   * every outline layer draws nothing and the device renders as it always has.
   * The lit cap's hard edge is the ink on a drawn device and the accent's deep
   * stop (accent-6) on a molded one, the colour it was before.
   */
  lines.push(`  --echo-drawn: ${drawn ? 1 : 0};`);
  lines.push(`  --echo-line: ${drawn ? values.roles.text : values.roles.seam};`);
  lines.push(`  --echo-line-width: ${drawn ? DRAWN_LINE_WIDTH : "0px"};`);
  lines.push(`  --echo-lit-edge: ${drawn ? values.roles.text : values.accentRamp[5]};`);
  /*
   * What a component draws instead, on a drawn device only. Each is \`initial\`
   * on a molded one, so \`var(--echo-drawn-fill, <the molded paint>)\` falls back
   * to exactly what the component always drew: a molded device can't move.
   * - fill: the seed's own colour as a flat fill (a slider's travel, a switch on,
   *   a meter), and on-fill: what's drawn on top of it (a switch's thumb), the
   *   ink where the ink stands off the fill at 3:1, the body where it doesn't, so
   *   a black fill takes a paper thumb, the way a drawing inverts.
   * - ink: a value drawn solid, the way a spec sheet fills in the one that's set
   *   (a fader's knob, a radio's pip, a switch's thumb).
   * - rule: a divider, one straight ink line.
   * - glass: a screen's field, flat, with no sheen.
   * - hollow: a recess's paint (a field, a track, a box to tick): the body, with no shade.
   * - decoration: what a low-emphasis action is drawn with: an underline.
   * - key, key-ink: the primary key's face and label. A drawing has no light to
   *   light a cap with, so the main action is the paper key that stands
   *   highest, outlined in the ink (a spec sheet's CTA), and the accent is
   *   left to mark what's on.
   */
  const ifDrawn = (value: string) => (drawn ? value : "initial");
  lines.push(`  --echo-drawn-fill: ${ifDrawn(values.drawnFill ?? values.roles["pour-mid"])};`);
  lines.push(`  --echo-drawn-on-fill: ${ifDrawn(contrastRatio(values.roles.text, values.drawnFill ?? values.roles["pour-mid"]) >= AA_NON_TEXT ? values.roles.text : values.roles.surface)};`);
  lines.push(`  --echo-drawn-ink: ${ifDrawn(values.roles.text)};`);
  lines.push(`  --echo-drawn-rule: ${ifDrawn(`linear-gradient(${values.roles.text}, ${values.roles.text}) center / 100% ${DRAWN_LINE_WIDTH} no-repeat`)};`);
  lines.push(`  --echo-drawn-glass: ${ifDrawn(values.roles.lcd)};`);
  lines.push(`  --echo-drawn-hollow: ${ifDrawn(values.roles.surface)};`);
  lines.push(`  --echo-drawn-decoration: ${ifDrawn("underline")};`);
  lines.push(`  --echo-drawn-key: ${ifDrawn(values.roles.surface)};`);
  lines.push(`  --echo-drawn-key-ink: ${ifDrawn(values.roles.text)};`);
  // Density: a multiplier for control heights that aren't one of the three
  // control tokens (a button's 52px cap, a 50px palette input).
  lines.push(`  --echo-density: ${DENSITY_FACTOR[values.device.density]};`);
  // Radius: the same factor the radius steps use, for a component whose
  // molding isn't on the scale (HardwareButton's 11/13/15px caps).
  lines.push(`  --echo-radius-scale: ${round3(radiusFactor(values.device.radius))};`);
  // A pill cap's corners reach half its height, whatever its size: at radius 1, or wherever `pills` says.
  lines.push(`  --echo-cap-round: ${values.device.pills ? 1 : 0};`);
  lines.push(`  --echo-key-angle: ${values.keyAngle}deg;`);
  return `${selector} {\n${lines.join("\n")}\n}\n${renderLegibilityGuard(values, selector)}`;
}

/**
 * One guard, not 105.
 *
 * Echo's declared baseline is Chrome/Edge 111+, Safari 16.2+, Firefox 113+,
 * because the colour system is built on `oklch()` and `color-mix()`. Below it,
 * the failure is silent and total: an unsupported `color-mix()` does not fall
 * back, it makes the whole declaration invalid, so a surface loses its colour
 * rather than degrading. 104 uses across component CSS means invisible text on
 * an invisible background — a blank page with no error.
 *
 * Per-property fallbacks for all of them would mean maintaining a second,
 * worse design system in parallel, permanently. This does the one thing worth
 * doing instead: it turns "the page is broken and I don't know why" into
 * "this needs a newer browser". Plain, unmixed values straight from the seed,
 * so an out-of-baseline visitor gets something legible and obviously unstyled.
 *
 * `@supports not` is itself only understood by browsers that have `@supports`,
 * which is every browser since 2013 — comfortably below anything that lacks
 * `color-mix`.
 *
 * A theme for the whole page paints the page's body; a theme scoped to one
 * element paints that element and nothing outside it.
 */
function renderLegibilityGuard(values: EchoTheme, selector: string): string {
  const { well, surface, text, accent } = values.roles;
  const ground = selector === ":root" ? "body" : selector;
  return [
    "@supports not (color: color-mix(in oklch, white, black)) {",
    `  ${selector} {`,
    `    --echo-well: ${well};`,
    `    --echo-surface: ${surface};`,
    `    --echo-text: ${text};`,
    `    --echo-accent: ${accent};`,
    "  }",
    `  ${ground} {`,
    `    background: ${well};`,
    `    color: ${text};`,
    "  }",
    "}",
    "",
  ].join("\n");
}
