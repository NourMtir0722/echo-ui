/**
 * createEchoTheme, with the site's typefaces.
 *
 * Every page on the site builds a theme (the root, each gallery, the doc
 * pages, the reseedable homepage, the generator's scoped preview), and
 * createEchoTheme emits all four font roles every time — so a single call
 * left on the bare engine would put that page back on system fonts. Routing
 * every call through here is what keeps "the site's typeface" one decision.
 *
 * Why Red Hat (specimen of five systems, 2026-09-18): the wordmark's O is a
 * circle (Fredoka's O measures 0.96 wide-to-tall) and so is the flower it
 * becomes. Red Hat Text's O measures 1.00 — DM Sans 0.97, Figtree 0.99, Rubik
 * 0.86, Space Grotesk 0.79. Of the round ones, only Red Hat ships a Mono drawn
 * as part of the same family AND tabular figures in the text face (DM Sans
 * set 1111 narrower than 0000 — fatal for readouts). One family, round like
 * the logo, with digits that line up.
 */
import { createEchoTheme, ensureContrast, hexToOklch, oklchToHex, type EchoTheme } from "echo-ui-core/theme";
import { renderBrandVars } from "@/components/brand/brand-theme";
import { renderFamilyVars } from "@/components/site/family";

type Seed = Parameters<typeof createEchoTheme>[0];
type Options = Parameters<typeof createEchoTheme>[1];

const text = "var(--site-font-text), ui-sans-serif, system-ui, sans-serif";
const mono = "var(--site-font-mono), ui-monospace, SFMono-Regular, Menlo, monospace";

export const SITE_FONTS = {
  fontSans: text,
  fontMachine: text,
  fontMono: mono,
  fontLcd: mono,
} as const;

/**
 * The theme also carries the brand's `--brand-*` variables and the landing's
 * `--family-*` colours, both derived from the same seed (brand-theme.ts,
 * family.ts): every call relights the creature, the mark, the auras and the
 * page's vivid colours along with the components, so there is no second
 * place to forget.
 */
export function siteTheme(seed?: Seed, options?: Options) {
  const theme = createEchoTheme({ ...SITE_FONTS, ...(seed ?? {}) }, options);
  const selector = options?.selector ?? ":root";
  // A drawn look in one ink has no hue to make a colour family from: its family is the ink and greys.
  const r = theme.values.roles;
  const inked = seed?.render === "drawn" && hexToOklch(r.accent).C < 0.04 ? { ink: r.text, paper: r.surface } : undefined;
  const vars = [...renderBrandVars(seed ?? {}), ...renderFamilyVars(seed?.accent, inked), ...renderLightSiteVars(theme.values)];
  const brand = `${selector} {\n${vars.join("\n")}\n}\n`;
  return { ...theme, css: theme.css + brand };
}

/** A sheet of paper's shadow on a light device: contact, falloff, lift, in the device's own cast ink. */
const PAPER_SHADOW = [
  [0.5, 0.5, 55],
  [3, 5, 22],
  [16, 24, 14],
]
  .map(([y, blur, a]) => `drop-shadow(0 ${y}px ${blur}px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) calc(${a}% * var(--echo-shade, 1)), transparent))`)
  .join(" ");

/**
 * The site's own colours on a light device: links and the code palette.
 *
 * The docs' code sits on the screen colour, and its palette was drawn for a
 * screen that's always dark: every token at OKLCH lightness 0.8 or above. A
 * light device's screens are paper glass, where those read at 1.1-1.5:1. So a
 * light seed gets the same hues, deep, each pushed to AA on the screen and the
 * panel by the engine's own solver; a dark seed gets nothing here, and the
 * stylesheet's own values stand (component-doc.css).
 */
function renderLightSiteVars(values: EchoTheme): string[] {
  if (values.polarity !== "light") return [];
  const r = values.roles;
  const fit = (hex: string) => [r.lcd, r.surface].reduce((colour, ground) => ensureContrast(colour, ground, 4.5).color, hex);
  const accent = hexToOklch(r.accent);
  const code: Record<string, string> = {
    keyword: oklchToHex({ L: Math.min(accent.L, 0.45), C: Math.max(accent.C, 0.09), H: accent.H }),
    string: oklchToHex({ L: 0.46, C: 0.1, H: 160 }),
    class: oklchToHex({ L: 0.46, C: 0.1, H: 235 }),
    entity: oklchToHex({ L: 0.46, C: 0.1, H: 235 }),
    property: oklchToHex({ L: 0.48, C: 0.1, H: 60 }),
    sign: oklchToHex({ L: 0.44, C: 0.02, H: 280 }),
    comment: oklchToHex({ L: 0.44, C: 0.02, H: 280 }),
  };
  return [
    // Links print in the accent's ink, which the theme holds to AA on every ground of a light body.
    `  --site-link: ${r["accent-ink"]};`,
    // Daylight doesn't glow: the hero's pool of light under the device goes, and its shadow stays,
    // and what its screen lights up is printed in the accent's ink, with no halo.
    `  --site-aura: 0;`,
    `  --site-lit: ${r["accent-ink"]};`,
    // Paper lies flat in daylight: a crisp edge where it meets what's under it, a short soft falloff,
    // and only a faint lift, not the long cast a card floating over dark plastic needs (journey.css).
    `  --site-paper-shadow: ${PAPER_SHADOW};`,
    ...Object.entries(code).map(([token, hex]) => `  --site-sh-${token}: ${fit(hex)};`),
  ];
}
