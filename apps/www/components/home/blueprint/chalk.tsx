/**
 * Chalk on a blueprint: lines with a hand's small wobble, a slightly rough
 * edge and a soft glow, drawn on as the board comes into view; arrowheads as
 * two quick strokes; and the small sketches beside each label.
 *
 * Every line is SVG in the board's own coordinates (1200 × 800), normalised
 * to a length of 1 (`pathLength`), so `--draw` (0 to 1) draws it from its
 * start to its end.
 */
import type { CSSProperties } from "react";

/** The board, in its own units. */
export const BOARD = { w: 1200, h: 800 } as const;

/** A seeded random, so a line wobbles the same way on every visit. */
function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

type Pt = [number, number];

/** A cubic from a to b through two controls, sampled and nudged sideways a little, as a hand draws it. */
export function handLine(a: Pt, c1: Pt, c2: Pt, b: Pt, seed = 1, wobble = 1.6): string {
  const r = rand(seed);
  const N = 22;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x = mt * mt * mt * a[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * b[0];
    const y = mt * mt * mt * a[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * b[1];
    // Steadier at the ends, where a hand starts and lands.
    const k = Math.sin(Math.PI * t) * wobble;
    pts.push([x + (r() - 0.5) * k, y + (r() - 0.5) * k]);
  }
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const q1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const q2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${q1[0].toFixed(1)} ${q1[1].toFixed(1)} ${q2[0].toFixed(1)} ${q2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** An arrowhead at `tip`, pointing along the direction it came from: two short strokes. */
export function head(tip: Pt, from: Pt, size = 16): string {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const w1 = a + Math.PI - 0.5;
  const w2 = a + Math.PI + 0.45;
  const p1: Pt = [tip[0] + Math.cos(w1) * size, tip[1] + Math.sin(w1) * size];
  const p2: Pt = [tip[0] + Math.cos(w2) * size * 0.9, tip[1] + Math.sin(w2) * size * 0.9];
  return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
}

/** The board's filters: a rough chalk edge, and the soft glow chalk has on blue. */
export function ChalkDefs() {
  return (
    <defs>
      <filter id="bp-chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feGaussianBlur in="rough" stdDeviation="3.2" result="glow" />
        <feComponentTransfer in="glow" result="halo">
          <feFuncA type="linear" slope="0.55" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="rough" />
        </feMerge>
      </filter>
    </defs>
  );
}

/** One chalk stroke that draws itself between `from` and `to` of the board's progress. */
export function Stroke({ d, from, to, width = 2.6, dashed = false, faint = false }: { d: string; from: number; to: number; width?: number; dashed?: boolean; faint?: boolean }) {
  return (
    <path
      className="bp__stroke"
      d={d}
      pathLength={1}
      data-dashed={dashed ? "" : undefined}
      style={{ "--from": from, "--to": to, strokeWidth: width, opacity: faint ? 0.55 : undefined } as CSSProperties}
    />
  );
}

/** Small sketches, in a 48-unit box, stroked. */
export const SKETCHES: Record<string, string[]> = {
  // A chat: the plugin in ChatGPT.
  bubble: ["M8 10h30a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H22l-9 7v-7H8a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6z", "M14 23h.5M23 23h.5M32 23h.5"],
  // A puzzle piece: a plugin, in Claude.
  piece: ["M6 14h10c-3-6 1-10 5-10s8 4 5 10h10v10c6-3 10 1 10 5s-4 8-10 5v10H26c3 6-1 9-5 9s-8-3-5-9H6z"],
  // A plug and its socket: the MCP server.
  plug: ["M14 6v10M26 6v10", "M9 16h22v8a11 11 0 0 1-22 0z", "M20 35v9", "M34 30h8M34 38h8"],
  // A terminal: the CLI.
  terminal: ["M4 8h40v32H4z", "M4 15h40", "M11 23l7 5-7 5", "M22 34h10"],
  // An open book: the skills.
  book: ["M24 12c-6-4-13-5-20-4v28c7-1 14 0 20 4 6-4 13-5 20-4V8c-7-1-14 0-20 4z", "M24 12v28"],
  // A tick in a ring: the check.
  check: ["M24 4a20 20 0 1 0 .1 0", "M14 25l7 7 13-14"],
};

export function Sketch({ name, x, y, size = 48, from, to }: { name: string; x: number; y: number; size?: number; from: number; to: number }) {
  const s = size / 48;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {SKETCHES[name]!.map((d, i) => (
        <Stroke key={i} d={d} from={from + i * 0.02} to={to + i * 0.02} width={2.4 / s} />
      ))}
    </g>
  );
}
