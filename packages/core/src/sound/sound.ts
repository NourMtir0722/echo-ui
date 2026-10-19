/**
 * Echo sound tokens. Tokens ARE synth recipes — serializable
 * data, no audio files. Taxonomy adapted from snd.dev's research (taxonomy
 * only; nothing from snd-lib is bundled or depended on).
 *
 * Aesthetic target: dry, short, hardware. Square/triangle bias. No reverb, no
 * musical softness. Values here are starting points — final recipes are tuned
 * by ear on the audition page (apps/www/audition).
 *
 * Pure data: no window/AudioContext access (SSR-safe).
 */

/** A single synth recipe. `freq` may be an array for a steppy arpeggio. */
export interface SoundRecipe {
  /** Oscillator waveform. */
  wave: OscillatorType;
  /** Frequency in Hz, or a sequence of steps played in order. */
  freq: number | number[];
  /** Amplitude decay time in seconds (note length). */
  decay: number;
  /** Peak gain of this recipe, 0..1 (scaled again by the master gain). */
  gain: number;
  /** Optional pitch glide in Hz across the note (negative bends down). */
  bend?: number;
}

export const sound = {
  tap: { wave: "square", freq: 2200, decay: 0.03, gain: 0.08 },
  press: { wave: "square", freq: 1800, decay: 0.04, gain: 0.12, bend: -400 },
  release: { wave: "square", freq: 1400, decay: 0.03, gain: 0.08 },
  select: { wave: "triangle", freq: 1100, decay: 0.05, gain: 0.1 },
  transition: { wave: "sine", freq: 700, decay: 0.08, gain: 0.08, bend: 250 },
  notify: { wave: "sine", freq: [660, 990], decay: 0.15, gain: 0.15 },
  caution: { wave: "sawtooth", freq: 330, decay: 0.18, gain: 0.14 },
  error: { wave: "sawtooth", freq: 220, decay: 0.2, gain: 0.15, bend: -60 },
  celebrate: { wave: "square", freq: [523, 659, 784], decay: 0.25, gain: 0.14 },
} as const satisfies Record<string, SoundRecipe>;

export type SoundName = keyof typeof sound;

export const SOUND_NAMES = Object.keys(sound) as SoundName[];
