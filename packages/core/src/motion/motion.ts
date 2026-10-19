/**
 * Echo motion tokens. Carried over from the reference
 * src/tokens/motion.ts UNCHANGED (duration in ms, ease = GSAP ease strings),
 * plus each token gains an optional `reduced` field describing how it collapses
 * under prefers-reduced-motion.
 *
 * Rule of thumb: glass and light move SMOOTHLY; pixel things move SNAPPY or
 * STEPPY. Never put a soft material ease on a pixel element.
 *
 * Pure data: no window/GSAP access at module scope (SSR-safe).
 */

/**
 * How a token behaves under `prefers-reduced-motion: reduce`:
 * - "none"        → skip the transform entirely (the collapse default).
 * - { opacity }   → collapse to an opacity-only fade over `duration` ms.
 */
export type MotionReduced = "none" | { opacity: true; duration?: number };

export interface MotionToken {
  /** Duration in ms. Omitted for scrub-driven tokens (e.g. drain). */
  duration?: number;
  /** GSAP ease string. */
  ease: string;
  /** Looping idle animation. */
  loop?: boolean;
  /** prefers-reduced-motion behavior. Defaults to "none" when omitted. */
  reduced?: MotionReduced;
}

export const motion = {
  press: { duration: 90, ease: "back.out(2)", reduced: "none" }, // button push
  pop: { duration: 400, ease: "back.out(2.5)", reduced: "none" }, // chip/confetti appear
  summon: { duration: 300, ease: "power2.out", reduced: { opacity: true } }, // glass panel appears
  breath: { duration: 4000, ease: "sine.inOut", loop: true, reduced: "none" }, // healthy idle
  settle: { duration: 600, ease: "power1.inOut", reduced: "none" }, // slowing as it wilts
  glitch: { duration: 80, ease: "steps(3)", reduced: "none" }, // corrupt slice — NO smoothing
  flood: { duration: 700, ease: "power3.inOut", reduced: { opacity: true } }, // sunset takeover
  drain: { ease: "linear", reduced: "none" }, // hourly wilt — scrubbed by the clock

  /*
   * Physics. The hand acts, the material answers: these time a part that has
   * weight — lifted toward the light, dragged, dropped somewhere new.
   */
  lift: { duration: 280, ease: "back.out(3)", reduced: "none" }, // hover: the part rises to meet you
  follow: { duration: 180, ease: "power3.out", reduced: "none" }, // a part trailing the pointer
  travel: { duration: 560, ease: "back.out(1.6)", reduced: "none" }, // a part landing somewhere new
  squash: { duration: 110, ease: "power2.out", reduced: "none" }, // grabbed: the part gives under the finger
  rebound: { duration: 700, ease: "elastic.out(1.1, 0.45)", reduced: "none" }, // let go: it springs back
  light: { duration: 450, ease: "power2.out", reduced: "none" }, // a highlight tracking the pointer
  boot: { duration: 520, ease: "steps(6)", reduced: { opacity: true, duration: 160 } }, // a readout powering on
  bloom: { duration: 460, ease: "back.out(1.5)", reduced: { opacity: true } }, // a popup growing out of what opened it
  island: { duration: 600, ease: "elastic.out(1, 0.75)", reduced: { opacity: true } }, // a pill swelling into a panel
} as const satisfies Record<string, MotionToken>;

export type MotionName = keyof typeof motion;

/**
 * Springs, for parts the hand can redirect (see tactile/spring). Two numbers,
 * the way Apple tunes them: a perceptual duration in seconds, and a bounce
 * from 0 (settles without overshoot) to about 0.3 (playful).
 */
export const springs = {
  track: { duration: 0.12, bounce: 0 }, // glued to the hand while dragging
  smooth: { duration: 0.45, bounce: 0 }, // arrives without overshoot
  snappy: { duration: 0.38, bounce: 0.15 }, // a selection moving over
  bouncy: { duration: 0.5, bounce: 0.3 }, // thrown, and landing with life
} as const;

export type SpringName = keyof typeof springs;

export const MOTION_NAMES = Object.keys(motion) as MotionName[];
