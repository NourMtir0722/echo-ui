/**
 * Texture tiles, for the grain law: "nothing in Echo is ever a flat fill".
 *
 * Every tile is a self-contained SVG data-URI generated here at module load —
 * no network, no binary assets, nothing to copy alongside the component when
 * `echo-ui add` installs it. Pure functions over numbers: no browser globals at
 * module scope, so this is SSR-safe.
 */

/**
 * Recursive Bayer threshold matrix, side `n` (a power of two). Returns each of
 * the values 0..n²-1 exactly once, arranged so that thresholding against it
 * produces ordered dither rather than clumping.
 */
export function bayer(n: number): number[][] {
  if (n === 1) return [[0]];
  if (n < 1 || (n & (n - 1)) !== 0) {
    throw new RangeError(`bayer(n): n must be a power of two, got ${n}`);
  }
  const half = bayer(n / 2);
  const s = n / 2;
  const m: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const v = half[y]![x]! * 4;
      m[y]![x] = v + 0;
      m[y]![x + s] = v + 2;
      m[y + s]![x] = v + 3;
      m[y + s]![x + s] = v + 1;
    }
  }
  return m;
}

const svgUri = (body: string, w: number, h: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`,
  )}`;

/**
 * An ordered-dither tile: one cell per matrix entry, each filled at
 * `opacity = threshold / n²`. `tone` picks the ink — dark ink deepens a
 * surface, light ink lifts it.
 */
export function ditherUri(n = 8, tone: "dark" | "light" = "dark"): string {
  const m = bayer(n);
  const px = 2; // device px per cell
  const ink = tone === "dark" ? "0,0,0" : "255,255,255";
  let rects = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = (m[y]![x]! / (n * n)).toFixed(3);
      rects += `<rect x='${x * px}' y='${y * px}' width='${px}' height='${px}' fill='rgba(${ink},${a})'/>`;
    }
  }
  const size = n * px;
  return svgUri(rects, size, size);
}

/** Fractal-noise (film-grain) tile. Higher frequency = finer grain. */
export function noiseUri(baseFrequency: number, octaves: number): string {
  return svgUri(
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/>`,
    160,
    160,
  );
}

export const ditherTile = {
  dark: ditherUri(8, "dark"),
  light: ditherUri(8, "light"),
} as const;

export const noiseTile = {
  /** Surface grain — the whisper that keeps a panel from reading as flat fill. */
  fine: noiseUri(0.9, 2),
  /** Marketing grain — the airbrushed spray on a brand field. */
  coarse: noiseUri(0.55, 3),
} as const;
