/**
 * Relights the brand for a seed, as `--brand-*` CSS variables.
 *
 * The brand was drawn once, on the raspberry seed (`BRAND_REFERENCE`,
 * `BRAND_DRAWN_ON`). For any other seed, Echo's purple default included, each
 * colour is moved by how far that seed is from the one it was drawn on, in
 * OKLCH:
 *   - the creature follows the ACCENT: hue rotated by the accent's hue shift,
 *     chroma scaled by its chroma ratio, lightness moved by its lightness
 *     shift — so on Coral the body IS coral, not a darkened brown. The
 *     lightness stops where the creature would stop reading: a seed as light
 *     as its eye whites would hide them, one as dark as the screen would hide
 *     the creature, so white lights a pale grey creature and black a
 *     dark grey one;
 *   - the aura ramps and the glitch follow the accent's hue and chroma but
 *     keep the lightness they were drawn with: the hero sets fixed white text
 *     on them, and the lavender and peach auras stay the same distance round
 *     the wheel from the body as they are now;
 *   - the neutral grounds follow the CHASSIS and cream follows the PAPER, as
 *     an OKLab offset rather than a hue turn — near-greys have no dependable
 *     hue, but a lavender-tinted paper still tints cream lavender.
 *
 * On the raspberry seed every shift is zero and the reference hexes are
 * emitted as-is, pixel-identical to the brand as drawn.
 */
import { defaultSeed } from "echo-ui-core/theme";
import { clampToGamut, contrastRatio, hexToOklch, oklchToHex, type OKLCH } from "echo-ui-core/theme";
import { BRAND_DRAWN_ON, BRAND_REFERENCE } from "./tokens";

interface BrandSeed {
  accent?: string;
  chassis?: string;
  paper?: string;
}

/** Below this chroma a colour has no dependable hue to rotate or scale by. */
const GREY = 0.02;

/** The eye whites against the body. The four shipped seeds sit between 2.57:1 and 3.52:1. */
const EYES_ON_BODY = 2.5;
/** The body against the screen's ink: WCAG 2.2's 3:1 for the parts of a graphic. */
const BODY_ON_INK = 3;

/** For saturated colours: turn the hue, scale the chroma, move lightness by `dL`. */
function relighter(from: string, to: string, { dL, maxChroma }: { dL: number; maxChroma: number }) {
  const a = hexToOklch(from);
  const b = hexToOklch(to);
  const dH = a.C < GREY || b.C < GREY ? 0 : b.H - a.H;
  const kC = a.C < GREY ? 1 : Math.min(b.C / a.C, maxChroma);
  return (hex: string) => {
    const c = hexToOklch(hex);
    const out: OKLCH = {
      L: Math.min(1, Math.max(0, c.L + dL)),
      C: c.C * kC,
      H: (((c.H + dH) % 360) + 360) % 360,
    };
    return oklchToHex(clampToGamut(out));
  };
}

/** For near-neutrals: add the seed's OKLab offset (lightness and both colour axes). */
function offsetter(from: string, to: string) {
  const a = hexToOklch(from);
  const b = hexToOklch(to);
  const lab = ({ C, H }: OKLCH) => [C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)] as const;
  const [fa, fb] = lab(a);
  const [ta, tb] = lab(b);
  return (hex: string) => {
    const c = hexToOklch(hex);
    const [ca, cb] = lab(c);
    const x = ca + ta - fa;
    const y = cb + tb - fb;
    const out: OKLCH = {
      L: Math.min(1, Math.max(0, c.L + b.L - a.L)),
      C: Math.hypot(x, y),
      H: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
    };
    return oklchToHex(clampToGamut(out));
  };
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** How far a search for the creature's lightness steps before it bisects. */
const SHIFT_STEP = 0.01;

/**
 * The creature's lightness shift: the accent's own, unless that would take the
 * body past the eyes or into the screen. Then the nearest shift, lighter or
 * darker, at which both still read.
 *
 * Both ways, because which way helps depends on the screen. A dark
 * screen wants a lighter body, until the eye whites stop reading; a light
 * device's screen is pale, so the body has to go darker. Searching upward only
 * ran into white on a light device and stopped there. Stepping outward finds
 * the nearest shift that reads, and bisecting the last step finds its edge.
 */
function creatureShift(accent: string, ink: string): number {
  const from = BRAND_DRAWN_ON.accent;
  const body = (dL: number) => relighter(from, accent, { dL, maxChroma: 1.25 })(BRAND_REFERENCE.creature.body);
  const reads = (dL: number) =>
    contrastRatio(BRAND_REFERENCE.creature.eye, body(dL)) >= EYES_ON_BODY && contrastRatio(body(dL), ink) >= BODY_ON_INK;

  const wanted = hexToOklch(accent).L - hexToOklch(from).L;
  if (reads(wanted)) return wanted;
  for (let k = 1; k * SHIFT_STEP <= 2; k++) {
    for (const sign of [1, -1]) {
      const at = wanted + sign * k * SHIFT_STEP;
      if (at < -1 || at > 1 || !reads(at)) continue;
      // `fail` is the step before, which didn't read; `pass` reads. Bisect to the edge.
      let fail = at - sign * SHIFT_STEP;
      let pass = at;
      for (let i = 0; i < 24; i++) {
        const mid = (fail + pass) / 2;
        if (reads(mid)) pass = mid;
        else fail = mid;
      }
      return pass;
    }
  }
  // Nothing reads (a seed no body can serve): the accent's own lightness.
  return wanted;
}

/** The `--brand-*` declarations for a seed, one per line. */
export function renderBrandVars(seed: BrandSeed = {}): string[] {
  const accent = seed.accent ?? defaultSeed.accent;
  const chassis = seed.chassis ?? defaultSeed.chassis;
  const paper = seed.paper ?? defaultSeed.paper;
  const keep = (hex: string) => hex;

  const from = BRAND_DRAWN_ON;
  const { creature, neutral, aura, glitch } = BRAND_REFERENCE;
  const sameAccent = same(accent, from.accent);
  const byChassis = same(chassis, from.chassis) ? keep : offsetter(from.chassis, chassis);
  const byPaper = same(paper, from.paper) ? keep : offsetter(from.paper, paper);
  // The drawing as drawn, unless its own screen can't show it (a light device's can't).
  const shift = creatureShift(accent, byChassis(neutral.ink));
  const byBody = sameAccent && shift === 0 ? keep : relighter(from.accent, accent, { dL: shift, maxChroma: 1.25 });
  const byAccent = sameAccent ? keep : relighter(from.accent, accent, { dL: 0, maxChroma: 1.25 });

  const lines: [string, string][] = [
    ["body", byBody(creature.body)],
    ["live-pink", byBody(creature.livePink)],
    ["aura", byBody(creature.aura)],
    ["body-light", byBody(creature.bodyLight)],
    ["body-deep", byBody(creature.bodyDeep)],
    ["glitch-pink", byAccent(glitch.pink)],
    ["glitch-cyan", byAccent(glitch.cyan)],
    ["void", byChassis(neutral.void)],
    ["ink", byChassis(neutral.ink)],
    ["graphite", byChassis(neutral.graphite)],
    ["slate", byChassis(neutral.slate)],
    ["cream", byPaper(neutral.cream)],
  ];
  for (const name of ["raspberry", "lavender", "peach"] as const) {
    aura[name].forEach((hex, i) => lines.push([`${name}-${i + 1}`, byAccent(hex)]));
  }
  return lines.map(([name, value]) => `  --brand-${name}: ${value};`);
}
