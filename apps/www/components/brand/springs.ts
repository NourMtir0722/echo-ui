/**
 * Springs for the brand art, in closed form.
 *
 * Tuned the way `echo-ui-core`'s createSpring is — a perceptual duration and a
 * bounce; ζ = 1 − bounce, ω = 2π / duration, mass 1 — so a brand spring and a
 * component spring with the same numbers move alike. createSpring integrates
 * frame by frame for parts a hand redirects; these solve the same spring from
 * rest at any instant, for scripted motion that must scrub, replay and test.
 */
const TAU = Math.PI * 2;

export interface SpringCfg {
  /** Perceptual duration, seconds. */
  duration: number;
  /** 0 = no overshoot; 0.15 snappy; 0.3 bouncy. */
  bounce: number;
}

/** Where a spring released from 0 toward 1 is, `t` seconds later. */
export function springAt(t: number, { duration, bounce }: SpringCfg): number {
  if (t <= 0) return 0;
  const w = TAU / duration;
  const z = 1 - bounce;
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/** When the spring has come within 0.2% of its target and stays there. */
export function springSettle(cfg: SpringCfg): number {
  const step = 1 / 240;
  let last = 0;
  for (let t = 0; t < 10; t += step) if (Math.abs(1 - springAt(t, cfg)) > 0.002) last = t;
  return last + step;
}

/** A GSAP ease that follows the spring over `span` seconds and lands exactly on 1. */
export function springEase(cfg: SpringCfg, span = springSettle(cfg)): (p: number) => number {
  return (p) => (p >= 1 ? 1 : springAt(p * span, cfg));
}

/** A GSAP tween's duration and ease for a spring: it follows it and lands exactly. */
export function sprung(cfg: SpringCfg): { duration: number; ease: (p: number) => number } {
  const span = springSettle(cfg);
  return { duration: span, ease: springEase(cfg, span) };
}
