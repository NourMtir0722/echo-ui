/**
 * echo-sound — Echo UI sound engine.
 *
 * Tokens are synth recipes (serializable data); SoundProvider owns the
 * AudioContext and the eight required behaviors; SynthBackend renders recipes
 * with zero deps and zero assets.
 */
export { sound, SOUND_NAMES } from "./sound";
export type { SoundRecipe, SoundName } from "./sound";
export { SynthBackend, jitterRecipe } from "./backend";
export type { SoundBackend, PlayContext } from "./backend";
export { haptic, HAPTIC_NAMES, HAPTIC_FOR_SOUND, vibrate } from "./haptics";
export type { HapticName } from "./haptics";
export { SoundProvider, useSound, useSoundOptional } from "./sound-provider";
export type { SoundProviderProps, SoundContextValue, PlayOptions } from "./sound-provider";
