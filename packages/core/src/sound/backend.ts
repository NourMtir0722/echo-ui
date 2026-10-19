/**
 * Sound backends. The default SynthBackend renders recipes
 * with the WebAudio API — zero assets, zero deps. A SampleBackend (user kit
 * manifests) can be added later behind this same interface WITHOUT API changes,
 * so the interface is designed now and only Synth is implemented.
 *
 * No module-scope AudioContext access — the context is always injected by the
 * provider (SSR-safe).
 */
import type { SoundRecipe } from "./sound";

export interface PlayContext {
  /** Live AudioContext, created lazily by the provider on first gesture. */
  ctx: AudioContext;
  /** Node to route into (the provider's master-gain node). */
  destination: AudioNode;
  /** Optional start time; defaults to ctx.currentTime. */
  when?: number;
}

export interface SoundBackend {
  readonly name: string;
  play(recipe: SoundRecipe, ctx: PlayContext): void;
}

/** Variation jitter: ±3% frequency, ±10% gain, per play — kills repetition fatigue. */
export function jitterRecipe(recipe: SoundRecipe, rng: () => number = Math.random): SoundRecipe {
  const jitterFreq = (f: number) => f * (1 + (rng() * 2 - 1) * 0.03);
  return {
    ...recipe,
    freq: Array.isArray(recipe.freq) ? recipe.freq.map(jitterFreq) : jitterFreq(recipe.freq),
    gain: recipe.gain * (1 + (rng() * 2 - 1) * 0.1),
  };
}

const EPS = 0.0001;

export class SynthBackend implements SoundBackend {
  readonly name = "synth";

  play(recipe: SoundRecipe, { ctx, destination, when }: PlayContext): void {
    const start = when ?? ctx.currentTime;
    const steps = Array.isArray(recipe.freq) ? recipe.freq : [recipe.freq];
    const stepDur = recipe.decay;

    steps.forEach((freq, i) => {
      const t0 = start + i * stepDur;
      this.playStep(ctx, destination, recipe, freq, t0);
    });
  }

  private playStep(
    ctx: AudioContext,
    destination: AudioNode,
    recipe: SoundRecipe,
    freq: number,
    t0: number,
  ): void {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = recipe.wave;
    osc.connect(env);
    env.connect(destination);

    // Pitch: optional linear glide across the note.
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (recipe.bend) {
      osc.frequency.linearRampToValueAtTime(Math.max(1, freq + recipe.bend), t0 + recipe.decay);
    }

    // Amplitude: fast attack, decay to silence (exponential — dry hardware).
    const peak = Math.max(EPS, recipe.gain);
    env.gain.setValueAtTime(EPS, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.003);
    env.gain.exponentialRampToValueAtTime(EPS, t0 + recipe.decay);

    osc.start(t0);
    osc.stop(t0 + recipe.decay + 0.02);
    // Let the nodes GC after they finish.
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }
}
