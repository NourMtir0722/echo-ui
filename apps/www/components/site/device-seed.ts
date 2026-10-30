/**
 * The site's seed on the other device: the same accent, in light plastic or
 * dark. Echo decides the device by the chassis, so switching is a new chassis
 * and a paper that reads on it, in the chassis's own hue. A preset switched to
 * light and back comes back exactly; any other seed gets a dark counterpart
 * in its own hue.
 */
import { clampToGamut, devicePolarity, hexToOklch, oklchToHex } from "echo-ui-core/theme";
import { SEED_PRESETS, sameSeed, type Seed } from "./seeds";

const hex = (L: number, C: number, H: number) => oklchToHex(clampToGamut({ L, C, H }));

/**
 * The seed on a light device: a pale chassis and a dark ink, both leaning
 * toward the accent's hue, so the plastic and the colour lit on it are one
 * temperature (Coral's dark chassis is pink, and a pink body under an orange
 * accent clashed). The chassis is light enough that its ground, a step
 * darker, still reads as a light page. A grey accent has no hue to give, so
 * the dark chassis gives its own.
 */
export function lightSeedOf(seed: Seed): Seed {
  const accent = hexToOklch(seed.accent);
  const H = accent.C < 0.02 ? hexToOklch(seed.chassis).H : accent.H;
  return { accent: seed.accent, chassis: hex(0.955, 0.012, H), paper: hex(0.23, 0.03, H) };
}

/** The seed on a dark device: the preset it came from, or a dark chassis and a pale paper in its hue. */
export function darkSeedOf(seed: Seed): Seed {
  const preset = SEED_PRESETS.find((p) => sameSeed(lightSeedOf(p.seed), seed));
  if (preset) return preset.seed;
  const chassis = hexToOklch(seed.chassis);
  return { accent: seed.accent, chassis: hex(0.26, Math.min(chassis.C + 0.01, 0.03), chassis.H), paper: hex(0.94, Math.min(chassis.C, 0.02), chassis.H) };
}

export const isLightSeed = (seed: Seed) => devicePolarity(seed.chassis) === "light";

/**
 * A style on the device it isn't on: its body and its paper change places, so
 * it's the same drawing on the other ground. An accent that is the style's ink
 * turns with the ink; a colour of the style's own stays.
 */
const turnedOver = (seed: Seed): Seed => ({
  ...seed,
  accent: seed.accent.toLowerCase() === seed.paper.toLowerCase() ? seed.chassis : seed.accent,
  chassis: seed.paper,
  paper: seed.chassis,
});

/**
 * The same seed on the device it isn't on. The key is about the device and
 * nothing else: a style stays that style, turned over, and only the Styles
 * page leaves it.
 */
export const otherDevice = (seed: Seed): Seed => {
  if (seed.style) return turnedOver(seed);
  return isLightSeed(seed) ? darkSeedOf(seed) : lightSeedOf(seed);
};

/**
 * A colour picked while the site is on a device: the same pick, on that
 * device. The key chose the device, so a swatch changes the colour and
 * leaves the plastic alone. A pick that is already light, or a style (which
 * opens on its own device), is worn as it is.
 */
export const onDevice = (pick: Seed, current: Seed): Seed =>
  !pick.style && isLightSeed(current) && !isLightSeed(pick) ? lightSeedOf(pick) : pick;
