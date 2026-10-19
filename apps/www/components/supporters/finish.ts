/**
 * What each Echo on the island is made of. Value is material, not colour:
 * everyone wears the brand's blue, each a shade of their own, and how they
 * support shows in the finish.
 *   - one-time: satin, a soft sheen;
 *   - monthly: the landing's glaze, a clear glossy coat;
 *   - founding: pearl, pale and glossy, with a soft play of colour;
 *   - Noor: Echo itself, the brand's glaze.
 *
 * Pure: no three.js, so the crowd under the support panel can take the same
 * blues without loading a 3D engine.
 */
import { hexToOklch, oklchToHex } from "@/components/home/echo3d/palette";
import { random } from "@/components/home/echo3d/pile";
import type { Skin } from "@/components/home/echo3d/skins";

type Who = { id: string; plan: "maker" | "monthly" | "once"; founding?: boolean };

export type Finish = "satin" | "glaze" | "pearl";

export function finishOf(p: Who): Finish {
  return p.plan === "once" ? "satin" : p.founding ? "pearl" : "glaze";
}

const COAT: Record<Finish, Pick<Skin, "roughness" | "coatRoughness" | "iridescence" | "rimAmt" | "glow">> = {
  satin: { roughness: 0.6, coatRoughness: 0.42, iridescence: 0, rimAmt: 0.45, glow: 0.05 },
  glaze: { roughness: 0.34, coatRoughness: 0.05, iridescence: 0.08, rimAmt: 0.7, glow: 0.12 },
  pearl: { roughness: 0.2, coatRoughness: 0.02, iridescence: 0.5, rimAmt: 0.95, glow: 0.18 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A shade of the brand's blue of this person's own: a small turn of hue and value, never out of the family. */
function shade(seed: string, id: string, finish: Finish) {
  const rnd = random([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
  const [L, C, h] = hexToOklch(seed);
  const hue = h + (rnd() * 2 - 1) * 14;
  // Pearl is pale and soft; satin and glaze stay in the blue's own body.
  const l = finish === "pearl" ? 0.86 + rnd() * 0.04 : clamp(L + (rnd() * 2 - 1) * 0.07, 0.48, 0.78);
  const c = finish === "pearl" ? C * 0.32 : C * (0.82 + rnd() * 0.2);
  return {
    a: oklchToHex([clamp(l + 0.12, 0, 0.97), c * 0.85, hue - 4]),
    b: oklchToHex([l, c, hue]),
    c: oklchToHex([clamp(l - 0.18, 0.2, 1), c * 1.05, hue + 6]),
  };
}

/** A person's skin: the brand's glaze for Noor; for a supporter, their own shade of the blue in their finish. */
export function skinOf(p: Who, accent: string, brand: Skin): Skin {
  if (p.plan === "maker") return brand;
  const finish = finishOf(p);
  return { ...brand, ...shade(accent, p.id, finish), ...COAT[finish], rim: finish === "pearl" ? "#ffffff" : brand.rim };
}

/** Pearl's play of colour kept to the blue-violet end: wider, the film turns the printed pupils green. */
export const thinFilm = (p: Who): [number, number] => (p.plan !== "maker" && finishOf(p) === "pearl" ? [140, 230] : [100, 400]);

/** A person's own blue, as one colour: their dot in the index, and what stands in until their photograph is ready. */
export function blueOf(p: Who, accent: string) {
  return p.plan === "maker" ? accent : shade(accent, p.id, finishOf(p)).b;
}
