/**
 * A real spring, for parts the hand can redirect mid-flight.
 *
 * A tween knows where it started and where it ends; retarget it and it starts
 * over from rest, so a knob sent left and then right halts, then leaves. A
 * spring carries position AND velocity: retarget it and it bends toward the new
 * target with the momentum it already has, which is what makes a thing feel
 * like it has mass. Hand it the pointer's velocity on release and a flicked
 * part keeps going the way it was thrown.
 *
 * Tuned the way Apple tunes springs: a perceptual `duration` (how long it
 * takes to get there, roughly) and a `bounce` (0 settles without overshoot,
 * 0.3 is playful). stiffness = (2π / duration)², damping = 4π(1 − bounce) /
 * duration, mass 1.
 *
 * Driven by GSAP's ticker, so it shares one frame loop with every tween.
 */
import gsap from "gsap";

export interface SpringConfig {
  /** Perceptual duration, seconds. */
  duration: number;
  /** 0 = no overshoot; 0.15 snappy; 0.3 bouncy. */
  bounce: number;
}

export interface Spring {
  /** Current position. */
  readonly value: number;
  /** Current velocity, units per second. */
  readonly velocity: number;
  /** Still travelling (false once it has settled on its target). */
  readonly moving: boolean;
  /** Where it is heading. */
  readonly target: number;
  /** Head for `target`, keeping current momentum (or starting with `velocity`). */
  to(target: number, options?: { config?: SpringConfig; velocity?: number }): void;
  /** Jump there, at rest. */
  set(value: number): void;
  /** Move the position without touching momentum (the layout moved under it). */
  shift(by: number): void;
  stop(): void;
}

export function createSpring(
  initial: number,
  config: SpringConfig,
  onUpdate: (value: number, velocity: number) => void,
): Spring {
  let x = initial;
  let v = 0;
  let target = initial;
  let cfg = config;
  let running = false;

  const step = (_time: number, deltaMs: number) => {
    const stiffness = (2 * Math.PI / cfg.duration) ** 2;
    const damping = (4 * Math.PI * (1 - cfg.bounce)) / cfg.duration;
    // Small fixed substeps keep a stiff spring stable on a slow frame.
    let remaining = Math.min(deltaMs, 64) / 1000;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      const force = -stiffness * (x - target) - damping * v;
      v += force * dt;
      x += v * dt;
      remaining -= dt;
    }
    if (Math.abs(v) < 0.02 && Math.abs(x - target) < 0.02) {
      x = target;
      v = 0;
      halt();
    }
    onUpdate(x, v);
  };

  const run = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(step);
  };
  const halt = () => {
    if (!running) return;
    running = false;
    gsap.ticker.remove(step);
  };

  return {
    get value() {
      return x;
    },
    get velocity() {
      return v;
    },
    get moving() {
      return running;
    },
    get target() {
      return target;
    },
    to(next, options = {}) {
      target = next;
      if (options.config) cfg = options.config;
      if (options.velocity !== undefined) v = options.velocity;
      run();
    },
    set(value) {
      x = target = value;
      v = 0;
      halt();
      onUpdate(x, v);
    },
    shift(by) {
      x += by;
      run();
    },
    stop: halt,
  };
}

/**
 * Rubber-banding past an end: the further you pull, the less it gives. The
 * curve iOS uses for scroll views; `dimension` is how far it could ever go.
 */
export function rubberband(distance: number, dimension: number, constant = 0.55): number {
  const sign = Math.sign(distance);
  const d = Math.abs(distance);
  return sign * (1 - 1 / ((d * constant) / dimension + 1)) * dimension;
}
