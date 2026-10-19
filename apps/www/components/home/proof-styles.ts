/**
 * The two looks the homepage's proof wears: one screen, Echo's own style and
 * Drafting Index.
 *
 * Both are the styles Echo publishes (registry/styles/), read from the same
 * files `style fit` and `style use` read: Echo molded in one plastic and lit
 * by one key light, and Drafting Index drawn in one black ink on white paper,
 * hollow until it's on. Both pass the slop police as they are. Only what a
 * style puts in a project is used here, its seed.
 *
 * Drafting Index's typefaces are self-hosted like the site's (style-fonts.ts),
 * so the build needs no network; Echo's own wears the site's.
 */
import type { EchoSeedInput } from "echo-ui-core/theme";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";

export type ProofKey = "echo" | "drafting-index";

export interface ProofStyle {
  key: ProofKey;
  title: string;
  /** What the style is, in a few words, for the frame's label. */
  what: string;
  seed: EchoSeedInput;
}

const seedOf = (name: ProofKey) => PUBLISHED_STYLES.find((s) => s.name === name)!.seed as EchoSeedInput;

export const PROOF_STYLES: readonly ProofStyle[] = [
  { key: "echo", title: "Echo", what: "Molded in one plastic, lit by one key light", seed: seedOf("echo") },
  { key: "drafting-index", title: "Drafting Index", what: "Drawn in one black ink on white paper", seed: seedOf("drafting-index") },
];

/**
 * How it works, step 3: "Rounder later is one line: `style set radius …`".
 * The story's first product wears Drafting Index, and the line has to make it
 * rounder than it already is.
 */
export const ROUNDER = 0.6;
