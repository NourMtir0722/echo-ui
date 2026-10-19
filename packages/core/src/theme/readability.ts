/**
 * What a theme's colours are like to read, past the WCAG 2 ratio the
 * guardrails hold: small text in APCA, the edge a cap needs to stand off what
 * it sits on, and both as people with colour blindness see them.
 *
 * A theme can pass AA everywhere and still hurt to read: a
 * lit blue label on black passed at 5.3:1 and read at APCA Lc 36, and a
 * button on a Panel had no edge at all. The engine fixes what it can (lit
 * text is lifted, a near-black body steps its caps further); this says what's
 * left, so `style check` can say it before any screen is built.
 */
import { APCA_SMALL_TEXT, apcaContrast, contrastRatio } from "./contrast";
import { hexToOklch, parseHex, toHex } from "./oklch";

/** Under this, small text is hard to read for anyone: APCA's floor for text at all. */
export const APCA_FLOOR = 45;
/** A dark device's cap against its body, and its lit rim against the cap. */
export const CAP_OFF_BODY = 1.35;
export const RIM_OFF_CAP = 1.43;

export type ColourBlindness = "protanopia" | "deuteranopia" | "tritanopia";

/**
 * Machado, Oliveira and Fernandes (2009), full severity, on linear RGB: the
 * same matrices the theme item's own sweeps use (registry/src/echo/theme/cvd.ts),
 * here so the engine can say it without the registry.
 */
const SIMULATION: Record<ColourBlindness, readonly (readonly [number, number, number])[]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

/** A colour as someone with this colour blindness sees it. */
export function simulate(hex: string, kind: ColourBlindness): string {
  const { r, g, b } = parseHex(hex);
  const rgb = [toLinear(r), toLinear(g), toLinear(b)];
  const [x, y, z] = SIMULATION[kind].map((row) => toSrgb(row[0] * rgb[0]! + row[1] * rgb[1]! + row[2] * rgb[2]!));
  return toHex(x!, y!, z!);
}

export interface ReadabilityNote {
  /** What it's about: small text, a cap's edge, or colour blindness. */
  kind: "text" | "edge" | "colour-blind";
  /** `fail`: hard to read for anyone. `note`: under what reads comfortably. */
  level: "fail" | "note";
  message: string;
}

/** Where each text role is read, by the grounds it sits on. */
const TEXT_ON: readonly [role: string, grounds: readonly string[], what: string][] = [
  ["text", ["surface", "cap", "well"], "text"],
  ["text-dim", ["surface", "cap", "well"], "dim text"],
  ["accent-ink", ["lcd", "surface", "cap", "well"], "lit text"],
  ["primary-cap-ink", ["primary-cap-top", "primary-cap-mid"], "the main button's label"],
];

/** The readability of a theme's roles: what's under APCA's floor, under comfortable, or has no edge. */
export function readability(roles: Record<string, string>, polarity: "light" | "dark"): ReadabilityNote[] {
  const notes: ReadabilityNote[] = [];
  const say = (kind: ReadabilityNote["kind"], lc: number, message: string) => {
    if (lc < APCA_FLOOR) notes.push({ kind, level: "fail", message });
    else if (lc < APCA_SMALL_TEXT) notes.push({ kind, level: "note", message });
  };

  for (const [role, grounds, what] of TEXT_ON) {
    const fg = roles[role];
    if (!fg) continue;
    const measured = grounds.filter((g) => roles[g]).map((g) => ({ g, lc: apcaContrast(fg, roles[g]!) }));
    const worst = measured.sort((a, b) => a.lc - b.lc)[0];
    if (!worst) continue;
    say("text", worst.lc, `${what} (${fg}) reads at APCA Lc ${Math.round(worst.lc)} on the ${worst.g === "lcd" ? "screen" : worst.g} (${roles[worst.g]}); small text reads well from ${APCA_SMALL_TEXT}.`);
  }

  if (polarity === "dark" && roles.cap && roles.surface && roles["cap-highlight"]) {
    const body = contrastRatio(roles.cap, roles.surface);
    const rim = contrastRatio(roles["cap-highlight"], roles.cap);
    if (body < CAP_OFF_BODY) notes.push({ kind: "edge", level: "fail", message: `a cap (${roles.cap}) stands off the body (${roles.surface}) at ${body.toFixed(2)}:1: a button on a Panel has no edge.` });
    if (rim < RIM_OFF_CAP) notes.push({ kind: "edge", level: "fail", message: `a cap's lit rim (${roles["cap-highlight"]}) stands off the cap at ${rim.toFixed(2)}:1: the bevel doesn't show.` });
  }

  for (const kind of Object.keys(SIMULATION) as ColourBlindness[]) {
    const ink = roles["accent-ink"];
    const screen = roles.lcd;
    if (ink && screen) {
      const lc = apcaContrast(simulate(ink, kind), simulate(screen, kind));
      say("colour-blind", lc, `with ${kind}, lit text on the screen reads at APCA Lc ${Math.round(lc)}.`);
    }
    const lit = roles["primary-cap-mid"];
    const body = roles.surface;
    if (lit && body) {
      const a = hexToOklch(simulate(lit, kind));
      const b = hexToOklch(simulate(body, kind));
      const distance = Math.hypot(a.L - b.L, a.C - b.C);
      if (distance < 0.1) {
        notes.push({ kind: "colour-blind", level: "note", message: `with ${kind}, the lit cap and the body look alike: "on" has to be said in words and shape, as Echo's parts do.` });
      }
    }
  }
  return notes;
}
