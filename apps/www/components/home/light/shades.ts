/**
 * The page's light, in shades of the theme's own colour, deep to glow, so
 * a blue theme gets a blue gradient and a purple one a purple one.
 *
 * Six steps in OKLCH, lightness rising evenly from a deep near the ground to
 * a pale glow, chroma fullest in the middle (where a colour is most
 * itself) and thinning toward both ends, as light does. Across them the hue
 * turns a little (`hueDrift`, degrees): deep shades lean one way, the glow
 * the other, which is what makes a gradient of one colour read as light
 * rather than as paint. The list always runs from the ground's side to the
 * core, so the shader takes the light back toward the ground by stepping back
 * along it.
 */
import { clampToGamut, hexToOklch, oklchToHex } from "echo-ui-core/theme";

/** [lightness, chroma, share of the hue drift] for each shade, from the ground's side to the core, on dark plastic. */
const ON_DARK: readonly [number, number, number][] = [
  [0.2, 0.07, -0.4],
  [0.31, 0.13, -0.2],
  [0.44, 0.18, 0],
  [0.57, 0.21, 0.3],
  [0.69, 0.17, 0.65],
  [0.84, 0.09, 1],
];

/**
 * On light plastic the light is colour coming into a pale page, the way Lovable's light mode is: from
 * the ground's own pale, deepening to the seed at its most vivid at the core. The ground's side still
 * comes first, so stepping back along the shades still goes toward the ground.
 */
const ON_LIGHT: readonly [number, number, number][] = [
  [0.95, 0.03, 1],
  [0.88, 0.07, 0.65],
  [0.79, 0.12, 0.3],
  [0.69, 0.17, 0],
  [0.6, 0.2, -0.2],
  [0.53, 0.2, -0.4],
];

/** Below this chroma a colour reads as grey, and its hue is noise. */
const GREY = 0.04;

/**
 * Six shades of the seed, from the ground's side to the light's core: deep to glow on a dark device, pale
 * to vivid on a light one. A colour with no hue lights in greys, the ink thinned: the shades' own chroma
 * on its noise would be a colour nobody chose.
 */
export function shades(accent: string, hueDrift: number, light = false): string[] {
  const { C: chroma, H: hue } = hexToOklch(accent);
  const grey = chroma < GREY || Number.isNaN(hue);
  return (light ? ON_LIGHT : ON_DARK).map(([L, C, share]) =>
    oklchToHex(clampToGamut(grey ? { L, C: 0, H: 0 } : { L, C, H: (((hue + share * hueDrift) % 360) + 360) % 360 })),
  );
}
