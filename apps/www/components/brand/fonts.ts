/**
 * The site's typefaces, chosen from a side-by-side specimen of five
 * open-source systems against the rounded wordmark (see the note in
 * site-theme.ts for the measurements).
 *
 *   Red Hat Display → headlines and marketing display (replaces Fraunces)
 *   Red Hat Text    → UI, body and the uppercase machine labels
 *   Red Hat Mono    → code, readouts, anything with digits to compare
 *   Fredoka         → the WORDMARK only — it is the logo, not a text face
 *   VT323           → the device's dot-matrix screen only — a rendering
 *                     material, like the scanlines over it, not a voice
 *
 * One designed superfamily does every job a reader actually reads, which is
 * what the old mix (a system sans, a system mono, a wonky serif, a script and
 * a rounded display face on one page) could not: they were five voices that
 * had never met.
 *
 * Site-only. The REGISTRY keeps system stacks as its default font roles
 * (type-contract.test.ts: a consumer's install must need no network). The site
 * names these through the theme's font roles — the same seam a consumer uses.
 */
import localFont from "next/font/local";

/*
 * Loaded from their @fontsource packages, not from Google at build time: the
 * build must not depend on a network. Same faces, latin subset.
 *
 * next/font/local names a face after the const it is assigned to ("text",
 * "wordmark"), so each one declares its real family name: a computed style
 * then says which face it is, and a fallback can't pass for it.
 */
const display = localFont({
  declarations: [{ prop: "font-family", value: '"Red Hat Display"' }],
  src: "../../node_modules/@fontsource-variable/red-hat-display/files/red-hat-display-latin-wght-normal.woff2",
  weight: "300 900",
  variable: "--site-font-display",
  display: "swap",
});
const text = localFont({
  declarations: [{ prop: "font-family", value: '"Red Hat Text"' }],
  src: "../../node_modules/@fontsource-variable/red-hat-text/files/red-hat-text-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--site-font-text",
  display: "swap",
});
const mono = localFont({
  declarations: [{ prop: "font-family", value: '"Red Hat Mono"' }],
  src: "../../node_modules/@fontsource-variable/red-hat-mono/files/red-hat-mono-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--site-font-mono",
  display: "swap",
  preload: false,
});
const wordmark = localFont({
  declarations: [{ prop: "font-family", value: '"Fredoka"' }],
  src: "../../node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff2",
  weight: "600",
  variable: "--brand-font-display",
  display: "swap",
});
const lcd = localFont({
  declarations: [{ prop: "font-family", value: '"VT323"' }],
  src: "../../node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff2",
  weight: "400",
  variable: "--brand-font-lcd",
  display: "swap",
  preload: false,
});

/*
 * Only the faces the first paint uses are preloaded: the headline, the text and
 * the wordmark. The code face and the screen's dot matrix load when they're used
 * (display: swap); preloaded, they downloaded ahead of the stylesheets the first
 * paint waits for, and on a throttled connection the hero painted past its
 * 2,500ms budget.
 */

/** Put on <html>: every page reads the site faces through these variables. */
export const siteFonts = [display.variable, text.variable, mono.variable, wordmark.variable, lcd.variable].join(" ");
