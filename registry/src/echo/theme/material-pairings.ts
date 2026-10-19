/**
 * The contrast contract.
 *
 * `CONTRAST_PAIRS` in `create-echo-theme.ts` guards eight flat role pairs. The
 * library has roughly twenty pairings that matter, and almost all of them are
 * gradients, because every Echo surface is a gradient. That is not a detail:
 * axe skips `color-contrast` entirely on a gradient background and reports
 * "incomplete", so the one tool anybody would expect to catch this is
 * structurally unable to. A 2.82:1 primary button label shipped on all four
 * seeds behind that silence.
 *
 * This file is the missing inventory. Every pairing a user can read text
 * against, or perceive a control boundary by, is declared here once, resolved
 * from a theme, and swept across every shipped seed by `echo-theme.test.ts`.
 *
 * Keeping it honest: the pairings are declared in terms of ROLES, and
 * `echo-theme.test.ts` parses the component CSS to assert that the gradients
 * described here are the gradients actually painted. A pairing that drifts
 * out of the CSS fails rather than silently stops being checked.
 */
import type { EchoTheme } from "echo-ui-core/theme";
import { AA_NORMAL, AA_LARGE, hexToOklch, oklchToHex, type GradientStop } from "echo-ui-core/theme";

/** Resolves the stops of a gradient (or a flat fill, as a single stop). */
export type StopsOf = (theme: EchoTheme) => GradientStop[];

export interface TextPairing {
  /** Stable id, used in failure messages. */
  name: string;
  /** Where in the library this is painted. */
  where: string;
  /** The text colour. */
  foreground: (theme: EchoTheme) => string;
  background: StopsOf;
  /**
   * `enforced` — real text, held to AA, fails the build.
   * `decorative` — a debossed/engraved treatment that is SUPPOSED to be
   *   low-contrast, allowed to fail AA, but pinned to a measured range so it
   *   cannot silently get worse and cannot be used where it is the only signal
   *   (see `hardware-button/treatment.ts`).
   */
  kind: "enforced" | "decorative";
  target: number;
  note?: string;
}

const flat = (pick: (t: EchoTheme) => string): StopsOf => (t) => [[pick(t), 0], [pick(t), 1]];

/**
 * CSS's `color-mix(in oklab, a p%, b)`, for pairings a stylesheet mixes rather
 * than takes straight from a role. Every such mix is of two greys, which the
 * stylesheets make in oklab: a straight line, no hue to go round.
 */
export function mixOklab(a: string, b: string, p: number): string {
  const x = hexToOklch(a);
  const y = hexToOklch(b);
  const lab = ({ C, H }: { C: number; H: number }) => [C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)] as const;
  const [xa, xb] = lab(x);
  const [ya, yb] = lab(y);
  const q = 1 - p;
  const A = xa * p + ya * q;
  const B = xb * p + yb * q;
  return oklchToHex({ L: x.L * p + y.L * q, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 });
}

/** A reflective screen's glass (scope.css): paper, a little of the chassis in it. */
const reflectiveGlass: StopsOf = (t) => [
  [mixOklab(t.roles.text, t.roles.surface, 0.84), 0],
  [mixOklab(t.roles.text, t.roles.surface, 0.93), 1],
];

export const TEXT_PAIRINGS: readonly TextPairing[] = [
  /* ---------------------------------------------------- the primary cap */
  {
    name: "hardware-button/primary label",
    where: "hardware-button.css .echo-hw__cap[data-variant=primary]",
    foreground: (t) => t.roles["primary-cap-ink"],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
    note: "The most important control in the library. Was 1.74-3.20:1 on every shipped seed.",
  },
  {
    name: "hardware-button/neutral label",
    where: "hardware-button.css .echo-hw__cap[data-variant=neutral]",
    foreground: (t) => t.roles.text,
    background: (t) => [
      [t.roles["cap-highlight"], 0],
      [t.roles.cap, 0.4],
      [t.roles.cap, 0.62],
      [t.roles["cap-shadow"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "hardware-button/label over the pour",
    where: "hardware-button.css .echo-hw__fill, under a neutral cap's label (VoiceNote, Timer); fill-slider.css .echo-fill-slider__fill",
    foreground: (t) => t.roles.text,
    background: (t) => [
      [t.roles["pour-top"], 0],
      [t.roles["pour-mid"], 0.45],
      [t.roles["pour-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
    note: "One label across two plastics: the neutral cap and the liquid poured into it. On a light device the primary cap carries a light label, so the pour is the accent's pale stops instead.",
  },
  {
    name: "hardware-button/caption",
    where: "hardware-button.css .echo-hw__caption",
    foreground: (t) => t.roles["text-dim"],
    background: flat((t) => t.roles.surface),
    kind: "enforced",
    target: AA_NORMAL,
  },

  /*
   * ------------------------------------ light text on the primary cap (the one accent)
   *
   * Badge, CountBadge and the current Pagination page used to paint the bright
   * accent FILL under dark text — a second, paler shade of the accent next to
   * the primary cap every control uses. They are molded caps with a label, so they wear
   * the primary cap (2026-09-18). The fill roles stay emitted for consumers.
   */
  {
    name: "badge/accent",
    where: "badge.css .echo-badge[data-variant=accent]",
    foreground: (t) => t.roles["primary-cap-ink"],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "count-badge/accent",
    where: "count-badge.css .echo-count-badge[data-tone=accent]",
    foreground: (t) => t.roles["primary-cap-ink"],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "pagination/current page",
    where: "pagination.css .echo-pagination__page[data-current]",
    foreground: (t) => t.roles["primary-cap-ink"],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "count-badge/neutral",
    where: "count-badge.css .echo-count-badge[data-tone=neutral]",
    foreground: (t) => t.roles.text,
    background: (t) => [
      [t.roles["cap-highlight"], 0],
      [t.roles.cap, 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },

  /* ------------------------------------------------------------- screens and wells */
  {
    name: "badge/lcd",
    where: "badge.css .echo-badge[data-variant=lcd]",
    foreground: (t) => t.roles["accent-ink"],
    background: flat((t) => t.roles.lcd),
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "text on well",
    where: "field/textarea recessed inputs",
    foreground: (t) => t.roles.text,
    background: flat((t) => t.roles.well),
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "text-dim on well",
    where: "placeholder text in recessed inputs",
    foreground: (t) => t.roles["text-dim"],
    background: flat((t) => t.roles.well),
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "text-dim on cap",
    where: "secondary labels on molded caps",
    foreground: (t) => t.roles["text-dim"],
    background: flat((t) => t.roles.cap),
    kind: "enforced",
    target: AA_NORMAL,
  },

  {
    name: "tabs/selected label",
    where: "tabs.css .echo-tabs__tab[data-active] — on the chassis, with a lit rail beneath",
    foreground: (t) => t.roles.text,
    background: flat((t) => t.roles.surface),
    kind: "enforced",
    target: AA_NORMAL,
    note: "Was painted over the primary cap — and the rule targeted [data-selected], which Base UI never sets, so the real label was 53% text on pink. Rebuilt 2026-09-18 as a label on the chassis over a lit rail.",
  },
  {
    name: "segmented/selected option",
    where: "segmented.css .echo-segmented__option[aria-checked=true]",
    foreground: (t) => t.roles["primary-cap-ink"],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "alert-dialog/destructive confirm",
    where: "alert-dialog.css .echo-alert__confirm[data-destructive]",
    foreground: (t) => t.accentRamp[0],
    background: (t) => [
      [t.accentRamp[4], 0],
      [t.accentRamp[5], 1],
    ],
    kind: "enforced",
    target: AA_NORMAL,
    note: "The palest stop on the two deepest: the one label in the library that is not --echo-text. Declared as Banner's danger tone until Banner stopped painting it.",
  },

  /* ------------------------------------------------------ paper: printed */
  {
    name: "receipt/ink",
    where: "receipt.css .echo-receipt__paper",
    foreground: (t) => t.roles.surface,
    background: flat((t) => t.roles.text),
    kind: "enforced",
    target: AA_NORMAL,
    note: "Chassis-coloured ink on the paper colour. A receipt is read, so it is held to AA like any text.",
  },

  {
    name: "reflective screen/ink",
    where: "scope.css [data-echo-screen=reflective]: digits and labels printed on the paper glass",
    foreground: (t) => t.roles.surface,
    background: reflectiveGlass,
    kind: "enforced",
    target: AA_NORMAL,
  },
  {
    name: "reflective screen/dim ink",
    where: "scope.css [data-echo-screen=reflective]: the quieter labels, --echo-text-dim",
    foreground: (t) => mixOklab(t.roles.surface, mixOklab(t.roles.text, t.roles.surface, 0.93), 0.72),
    background: reflectiveGlass,
    kind: "enforced",
    target: AA_NORMAL,
  },

  /* ------------------------------------------------- engraved: decorative by design */
  {
    name: "engraved/neutral",
    where: "hardware-button.css [data-engraved] on a neutral cap",
    foreground: (t) => t.roles.seam,
    background: (t) => [
      [t.roles["cap-highlight"], 0],
      [t.roles.cap, 0.4],
      [t.roles.cap, 0.62],
      [t.roles["cap-shadow"], 1],
    ],
    kind: "decorative",
    target: 1.05,
    note:
      "Debossed type is SUPPOSED to be low-contrast — that is the physical effect. " +
      "Legitimate only where the label is not the only thing telling you what the " +
      "control does. HardwareButton warns in dev when it is put on a primary cap.",
  },
  {
    name: "engraved/primary",
    where: "hardware-button.css [data-engraved][data-variant=primary]",
    foreground: (t) => t.accentRamp[5],
    background: (t) => [
      [t.roles["primary-cap-top"], 0],
      [t.roles["primary-cap-mid"], 0.45],
      [t.roles["primary-cap-base"], 1],
    ],
    kind: "decorative",
    target: 1.05,
    note:
      "Worse since the cap was held to AA, not better: it moved toward accent-6 to carry the " +
      "normal label. Engraving a primary cap now buys almost no contrast at all, " +
      "which is the strongest argument for that warning rather than against it.",
  },
];

export interface NonTextPairing {
  name: string;
  where: string;
  /** The boundary or fill being perceived. */
  foreground: (theme: EchoTheme) => string;
  background: StopsOf;
  target: number;
  /**
   * Set when the pairing does NOT meet 1.4.11 on fill alone and relies on the
   * composited key-light rim instead. That concession is written down
   * where it is relied on rather than left implicit.
   */
  rimException?: string;
}

/**
 * WCAG 1.4.11 (non-text contrast): 3:1 for the visual boundary of a control.
 *
 * Echo's fills are nowhere near that — a cap is 1.71:1
 * against the page — and that the criterion is nonetheless arguably met,
 * because the 1.5px white rim composites to 3.30-3.44:1 and 1.4.11 allows any
 * visual means. That concession is real but thin, so each pairing that leans
 * on it has to SAY it leans on it.
 */
export const NON_TEXT_PAIRINGS: readonly NonTextPairing[] = [
  {
    name: "cap rim vs cap face",
    where: "hardware-button.css inset 0 1.5px 0 rgba(255,255,255,0.42)",
    // The rim is white at 42% over the cap highlight — composited, not a role.
    foreground: (t) => compositeWhite(t.roles["cap-highlight"], 0.42),
    background: flat((t) => t.roles.cap),
    target: AA_LARGE,
  },
  {
    name: "primary cap vs surface",
    where: "the primary button against the page ground",
    foreground: (t) => t.roles["primary-cap-mid"],
    background: flat((t) => t.roles.surface),
    target: AA_LARGE,
    rimException:
      "Fill alone is far below 3:1. The boundary is carried by the composited " +
      "key-light rim above plus the seam skirt and drop shadow.",
  },
  {
    name: "well vs surface",
    where: "recessed input against the chassis",
    foreground: (t) => t.roles.well,
    background: flat((t) => t.roles.surface),
    target: AA_LARGE,
    rimException:
      "1.25-1.29:1 on fill. The recess is read from the inset shadow, not the " +
      "value step.",
  },
  {
    name: "lit vs surface",
    where: "a lit LED, the current rail against the chassis",
    foreground: (t) => t.roles["accent-glow"],
    background: flat((t) => t.roles.surface),
    target: AA_LARGE,
  },
  {
    name: "focus ring vs the ground",
    where: "the ring recipes and every :focus-visible, drawn in accent-ink, against the page's ground",
    foreground: (t) => t.roles["accent-ink"],
    background: flat((t) => t.roles.well),
    target: AA_LARGE,
  },
  {
    name: "primary fill vs the ground",
    where: "progress cells, loader dots, a meter's fill against the page's ground (the well)",
    foreground: (t) => t.roles["primary-cap-top"],
    background: flat((t) => t.roles.well),
    target: AA_LARGE,
  },
];

/** Composites an opaque colour with white at `alpha`, in gamma-encoded sRGB. */
export function compositeWhite(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * alpha);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
