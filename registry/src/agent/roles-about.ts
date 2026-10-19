/**
 * What each colour role is for, in a sentence. Typed over the real role set,
 * so a new role can't ship without saying what it's for. The theming guide's
 * role table and the DESIGN.md `init` writes both read it.
 */
import type { EchoRole } from "echo-ui-core/theme";

export const ROLE_ABOUT: Record<EchoRole, string> = {
  surface: "The molded chassis base.",
  cap: "Neutral button-cap plastic.",
  "cap-highlight": "The lit top rim of a bevel.",
  "cap-shadow": "A cap's underside and side wall.",
  well: "Recesses: the shade a cap sits in.",
  accent: "The one saturated colour — emissive marks: LEDs, LCD digits, the lit rail.",
  "accent-highlight": "Top-lit gloss on an active cap.",
  "accent-pressed": "The pressed or recording accent.",
  "accent-glow": "What's lit: an LED, the current rail. On a light device, 3:1 on every ground.",
  "accent-ink": "What's lit, printed: a readout, a count, a current tab's text, and the focus ring. The glow on a dark device, a step deeper on a light one; AA on every ground.",
  "primary-cap-top": "Top of the primary cap's gradient. Guaranteed AA against its label, primary-cap-ink.",
  "primary-cap-mid": "Middle of the primary cap's gradient.",
  "primary-cap-base": "Base of the primary cap's gradient.",
  "primary-cap-ink": "The label on the primary cap: the text on a dark device, near-white on a light one.",
  "pour-top": "The liquid a cap or slider fills with, under a label that also sits on the unlit plastic. AA against text.",
  "pour-mid": "Middle of the pour.",
  "pour-base": "Base of the pour.",
  "accent-fill-top": "A bright accent fill that carries dark text. Emitted for your own use; no component paints it.",
  "accent-fill-base": "Base of that fill.",
  lcd: "The screen field: dark glass, or paper glass on a light device.",
  "lcd-glow": "Emissive tint on the screen.",
  text: "Primary text.",
  "text-dim": "Secondary text. Still AA on every ground it is used on.",
  seam: "Panel seams and the darkest hairline.",
};
