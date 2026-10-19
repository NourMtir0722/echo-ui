/**
 * A seed as a link: `/generator?accent=8b6fe8&chassis=232130&paper=efebfa`,
 * or a style Echo publishes, `/generator?style=drafting-index`.
 *
 * Plain hex without the "#", which would start the URL's fragment, so a link
 * survives being pasted anywhere and reads as what it is. A link that names
 * only some of the three takes the rest from the default seed, or from the
 * style it names, so a hand-typed `?accent=3d8ef0` works too. A link with a
 * colour that isn't one, or a style Echo doesn't publish, is ignored whole:
 * half of somebody's theme is not their theme.
 */
import { DEFAULT_SEED, STYLE_PRESETS, type Seed } from "./seeds";

const ROLES = ["accent", "chassis", "paper"] as const;
const HEX = /^#?([0-9a-f]{6})$/i;

/** The seed a query string names, or null when it names none (or names a broken one). */
export function seedFromSearch(search: string): Seed | null {
  const params = new URLSearchParams(search);
  const style = params.get("style");
  const base = style === null ? undefined : STYLE_PRESETS.find((p) => p.seed.style === style.trim());
  if (style !== null && !base) return null;
  const seed: Seed = { ...(base?.seed ?? DEFAULT_SEED) };
  let named = !!base;
  for (const role of ROLES) {
    const raw = params.get(role);
    if (raw === null) continue;
    const hex = HEX.exec(raw.trim());
    if (!hex) return null;
    seed[role] = `#${hex[1]!.toUpperCase()}`;
    named = true;
  }
  return named ? seed : null;
}

/** The generator link that opens on `seed`. */
export function seedLink(origin: string, seed: Seed): string {
  const params = new URLSearchParams();
  if (seed.style) params.set("style", seed.style);
  for (const role of ROLES) params.set(role, seed[role].replace(/^#/, "").toLowerCase());
  return `${origin}/generator?${params}`;
}
