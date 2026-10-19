/**
 * Which motion and sound tokens an item actually uses, read back out of its
 * meta.ts.
 *
 * A meta writes them for a reader — motion as `--echo-duration-*` tokens,
 * sound as a sentence with the token in backticks — and both the `/e/` build
 * and the docs' meaning map need them as plain names. Reading them in one
 * place means the map on the site and the `motion`/`sound` arrays a published
 * item carries are the same fact, not two readings of the same prose.
 *
 * Every name is checked against core's real token names, so one that no longer
 * exists cannot reach the public format or the page.
 */
import { MOTION_NAMES, springs, type MotionName } from "echo-ui-core/motion";
import { morphFeels } from "echo-ui-core/tactile";
import { DURATION_SCALE, EASE_SCALE } from "echo-ui-core/theme";
import { SOUND_NAMES, type SoundName } from "echo-ui-core/sound";

export function motionNames(meta: unknown): MotionName[] {
  const tokens = (meta as { motion?: { tokens?: readonly string[] } } | undefined)?.motion?.tokens ?? [];
  const known = new Set<string>(MOTION_NAMES);
  const found = tokens.map((t) => t.replace(/^--echo-(duration|ease)-/, ""));
  return [...new Set(found.filter((name): name is MotionName => known.has(name)))];
}

export function soundNames(meta: unknown): SoundName[] {
  const lines = (meta as { sound?: readonly string[] } | undefined)?.sound ?? [];
  const known = new Set<string>(SOUND_NAMES);
  const found = [...lines.join(" ").matchAll(/`([a-z]+)`/g)].map((m) => m[1]!);
  return [...new Set(found.filter((name): name is SoundName => known.has(name)))];
}

/**
 * Every name a component's `motion.tokens` may use, by family: the GSAP
 * tokens, the spring presets, the morph feels, and the CSS duration and ease
 * steps. The catalog lists all of them, so get_tokens can answer for any name
 * a get_component record shows.
 */
export const MOTION_VOCABULARY = {
  motion: [...MOTION_NAMES],
  springs: Object.keys(springs),
  morphFeels: Object.keys(morphFeels),
  durations: Object.keys(DURATION_SCALE).map((step) => `--echo-duration-${step}`),
  eases: Object.keys(EASE_SCALE).map((step) => `--echo-ease-${step}`),
};

/**
 * Is this a name the vocabulary has? `springs` names the family (a part on
 * createSpring); `springs.<preset>` and `morphFeels.<feel>` name one member.
 */
export function isMotionVocabulary(name: string): boolean {
  const v = MOTION_VOCABULARY;
  const [family, member] = name.split(".");
  if (family === "springs") return member === undefined || v.springs.includes(member);
  if (family === "morphFeels") return member !== undefined && v.morphFeels.includes(member);
  return [...v.motion, ...v.durations, ...v.eases].includes(name);
}
