/**
 * Layer 3 — Semantic roles. The component contract.
 * Components consume ONLY these; every value is a derivation output.
 *
 * Roles marked "(extension)" are additions beyond the original starter set,
 * each documented where it is declared.
 */
import type { EchoDevice } from "./device";


export const ECHO_ROLES = [
  "surface", // molded chassis base
  "cap", // neutral button-cap plastic (mid)
  "cap-highlight", // bevel top rim light (L+, C slightly down)
  "cap-shadow", // cap underside / side wall (L-, C slightly up)
  "well", // recess / ambient-occlusion shade
  "accent", // the one saturated color (the mark / "on" state)
  "accent-highlight", // (extension) top-lit gloss on the active cap — reproduces bodyLight
  "accent-pressed", // pressed/record dark accent
  "accent-glow", // emissive aura core (used with alpha for bloom)
  // (extension) What's lit, printed: a readout, a count, a current tab's
  // text. The glow itself on a dark device, where light reads as text; on a
  // light one nothing glows, so it's the accent's ink, a step deeper than
  // the light, held to AA on every ground.
  "accent-ink",
  // (extension) The three stops of the primary cap gradient, derived
  // from the accent ramp and then guaranteed to clear AA against `text` at
  // every point along the gradient. They exist as roles rather than as raw
  // ramp stops because the guarantee has to survive a reseed: the ramp is a
  // material envelope, and nothing in it knows what colour sits on top of it.
  "primary-cap-top",
  "primary-cap-mid",
  "primary-cap-base",
  // (extension) The label printed on the primary cap: the text on a dark
  // device, near-white on a light one. The three stops above are fitted to
  // it, so the lit cap is the accent itself, with a light label, on both.
  "primary-cap-ink",
  // (extension) The liquid a cap or a slider fills with, under a label that
  // is also on the unlit plastic: the primary cap on a dark device, the
  // accent's pale stops on a light one, so the plastic's own label reads
  // on both.
  "pour-top",
  "pour-mid",
  "pour-base",
  // (extension) The bright accent fill that carries DARK text — Badge,
  // CountBadge, the current Pagination page. Opposite polarity to the cap, and
  // guaranteed the same way.
  "accent-fill-top",
  "accent-fill-base",
  "lcd", // dark screen field
  "lcd-glow", // (extension) emissive tint on the screen
  "text", // primary text on dark
  "text-dim", // secondary text
  "seam", // panel seam / darkest hairline
] as const;

export type EchoRole = (typeof ECHO_ROLES)[number];

/**
 * Layer 3 — Type roles. Emitted as `--echo-font-<role>`.
 *
 * Separate from ECHO_ROLES because they are not colours and nothing derives
 * them from the seed's OKLCH maths — but they are the same kind of contract:
 * a component names a role, and the engine guarantees the role exists. 60
 * declarations referencing two tokens that were never emitted is what happens
 * without that guarantee.
 */
export const ECHO_FONT_ROLES = [
  "machine", // instrument labels: caps, panel legends, captions
  "sans", // body and UI prose
  "mono", // data, code, digits that must be distinguishable
  "lcd", // the screen face on LCD panels and readouts
] as const;

export type EchoFontRole = (typeof ECHO_FONT_ROLES)[number];

/** The JS mirror consumed by GSAP, canvas, and ShaderField. */
export interface EchoTheme {
  /** Resolved hex per semantic role. */
  roles: Record<EchoRole, string>;
  /** Full 7-stop accent ramp (light → dark), hues follow the seed accent. */
  accentRamp: [string, string, string, string, string, string, string];
  /** The key light's direction in degrees: always KEY_LIGHT_ANGLE (145); it's grammar, not seed. */
  keyAngle: number;
  /** Resolved font stack per type role. */
  fonts: Record<EchoFontRole, string>;
  /** The device's shape and feel, as resolved from the seed. */
  device: EchoDevice;
  /** Light plastic or dark, decided by the chassis's lightness (`devicePolarity`). */
  polarity: "light" | "dark";
  /** On a drawn device, the seed's own accent as the flat fill things are drawn over. */
  drawnFill?: string;
}
