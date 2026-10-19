/**
 * The site's seeds, as plain data: the server half of theme-store.ts, which
 * is a client module. A server component that names a preset (the homepage's
 * opening colour) imports it from here.
 */
import type { EchoSeedInput } from "echo-ui-core/theme";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";

export interface Seed {
  accent: string;
  chassis: string;
  paper: string;
  /**
   * A style Echo publishes besides its own (registry/styles/), by name. Its
   * whole look (drawn or molded, corners, density, type) is worn under these
   * three colours. Unset, it's Echo's own style.
   */
  style?: string;
}

/**
 * The four seeds the site offers. Nawwara, Echo's purple, is the default and
 * the registry's own. The theme tests check the same four (`SHIPPED_SEEDS`).
 * They're Echo's own style's colours: dropped onto another style a colour
 * would undo it, so picking one wears Echo's style.
 */
export const SEED_PRESETS: readonly { name: string; seed: Seed }[] = [
  { name: "Nawwara", seed: { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA" } },
  { name: "Raspberry", seed: { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" } },
  { name: "Coral", seed: { accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" } },
  { name: "Sky", seed: { accent: "#3D8EF0", chassis: "#1F2330", paper: "#E9F0FA" } },
];

export const DEFAULT_SEED: Seed = SEED_PRESETS[0]!.seed;

/** The styles Echo publishes besides its own, each a whole look, worn as it is. */
export const STYLE_PRESETS: readonly { name: string; seed: Seed }[] = PUBLISHED_STYLES.filter((s) => s.name !== "echo").map((s) => ({
  name: s.title,
  seed: { accent: s.seed.accent!, chassis: s.seed.chassis!, paper: s.seed.paper!, style: s.name },
}));

/** Whether a name is a style Echo publishes besides its own. */
export const isStyleName = (name: unknown): name is string => typeof name === "string" && STYLE_PRESETS.some((p) => p.seed.style === name);

const COLOURS = ["accent", "chassis", "paper"] as const;

export const sameSeed = (a: Seed, b: Seed) =>
  COLOURS.every((k) => a[k].toLowerCase() === b[k].toLowerCase()) && (a.style ?? null) === (b.style ?? null);

/**
 * What the theme engine wears for a seed: the three colours, over the whole
 * look of the style it names. Never the `style` name itself, which isn't a
 * seed setting.
 */
export function lookOf(seed: Seed): EchoSeedInput {
  const colours = { accent: seed.accent, chassis: seed.chassis, paper: seed.paper };
  const style = seed.style ? PUBLISHED_STYLES.find((s) => s.name === seed.style) : undefined;
  return style ? ({ ...style.seed, ...colours } as EchoSeedInput) : colours;
}
