/**
 * Colour-vision simulation.
 *
 * Echo derives every semantic tone from ONE seed hue. That is a real design
 * position and it is what makes the library structurally immune to the classic
 * red/green failure — there is no red and no green to confuse. But a system
 * that has spent its hue has to buy differentiation with luminance, shape or
 * iconography instead, and until this file existed nothing could tell whether
 * it had. StatusDot's two states are ΔE 0.070 apart under protanopia: for a
 * protanope, two identical grey dots.
 *
 * Simulation is Viénot–Brettel–Mollon (1999), the standard dichromat model:
 * project linear-light RGB onto the plane of colours the missing cone cannot
 * distinguish. It is an approximation of a dichromat's experience, not a
 * medical claim — what it is good for is exactly this, comparing two colours
 * and asking whether a difference survives.
 */
import { parseHex, toHex, hexToOklch, deltaEOK } from "echo-ui-core/theme";
import { relativeLuminance } from "echo-ui-core/theme";

export type Vision = "normal" | "protan" | "deuteran" | "tritan" | "grayscale";

/** Every vision the sweeps run. */
export const VISIONS: readonly Vision[] = ["normal", "protan", "deuteran", "tritan", "grayscale"];

type Matrix = readonly [number, number, number, number, number, number, number, number, number];

const MATRICES: Record<"protan" | "deuteran" | "tritan", Matrix> = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteran: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

const toLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const toSrgb = (c: number): number =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const clamp01 = (c: number): number => Math.min(1, Math.max(0, c));

/** Returns `hex` as that vision would see it. */
export function simulate(hex: string, vision: Vision): string {
  if (vision === "normal") return hex;

  if (vision === "grayscale") {
    // WCAG relative luminance, so the grey matches the value the contrast
    // maths already works in.
    const y = toSrgb(clamp01(relativeLuminance(hex)));
    return toHex(y, y, y);
  }

  const { r, g, b } = parseHex(hex);
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const m = MATRICES[vision];
  return toHex(
    toSrgb(clamp01(m[0] * lr + m[1] * lg + m[2] * lb)),
    toSrgb(clamp01(m[3] * lr + m[4] * lg + m[5] * lb)),
    toSrgb(clamp01(m[6] * lr + m[7] * lg + m[8] * lb)),
  );
}

/**
 * Perceptual distance between two colours as `vision` sees them, in OKLab.
 *
 * The threshold the contrast checks use: **≈0.1 or below is
 * functionally the same colour**, and 0.15 is the floor a state difference has
 * to clear.
 */
export function deltaEUnder(a: string, b: string, vision: Vision): number {
  return deltaEOK(hexToOklch(simulate(a, vision)), hexToOklch(simulate(b, vision)));
}

/** The worst distance across every vision — the number that actually matters. */
export function worstDeltaE(a: string, b: string): { vision: Vision; deltaE: number } {
  return VISIONS.map((vision) => ({ vision, deltaE: deltaEUnder(a, b, vision) })).reduce((w, c) =>
    c.deltaE < w.deltaE ? c : w,
  );
}
