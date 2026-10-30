/**
 * The typefaces of the styles Echo publishes (registry/styles/), beside Echo's
 * own, which wears the site's faces (brand/fonts.ts).
 *
 * Ink Instrument: IBM Plex Mono for figures and data, at the weights Echo's
 * type scale uses (400, 600, 700); its sentences and legends are the system's
 * Arial and Arial Narrow, which need nothing here. Loaded the way the site's
 * own faces are: from their @fontsource packages, so the build needs no
 * network, each named after its real family, which is the name the style's
 * seed asks for. Nothing preloads them: a face downloads only where something
 * wears the style. A test fails if a published style names a family that is
 * neither declared here nor the system's, since a fallback face would pass
 * for it.
 */
import localFont from "next/font/local";

const plexMono = localFont({
  declarations: [{ prop: "font-family", value: '"IBM Plex Mono"' }],
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--style-font-plex-mono",
  display: "swap",
  preload: false,
});

/** Put where a published style is worn, so every face it names is declared there. */
export const styleFonts = plexMono.variable;
