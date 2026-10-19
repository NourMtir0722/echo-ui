import { SEED_PRESETS, type Seed } from "@/components/site/seeds";

/**
 * The colour the homepage opens on until the visitor picks one: Sky. The
 * rest of the site opens on Echo's purple. The page's own
 * theme is scoped so any choice wins over it (theme-boot.ts).
 */
export const LANDING_SEED: Seed = SEED_PRESETS.find((p) => p.name === "Sky")!.seed;
