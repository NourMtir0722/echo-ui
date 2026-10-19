import { z } from "zod";

export const motionProps = z.object({
  duration: z.number().optional().describe("Duration in ms. Omitted for scrub-driven tokens."),
  ease: z.string().describe("GSAP ease string."),
  loop: z.boolean().optional().describe("Looping idle animation."),
  reduced: z
    .union([z.literal("none"), z.object({ opacity: z.literal(true), duration: z.number().optional() })])
    .optional()
    .describe('How the token collapses under prefers-reduced-motion. Defaults to "none".'),
});

export const meta = {
  name: "echo-motion",
  title: "Motion tokens",
  description:
    "Named motion tokens carrying duration, GSAP ease, and an explicit reduced-motion collapse, plus four springs (track, smooth, snappy, bouncy) for parts the hand can redirect mid-flight. The rulebook is one line — glass and light move SMOOTHLY (summon, flood, settle, bloom); pixel things move SNAPPY or STEPPY (press, pop, glitch, boot). The physics tokens (lift, follow, travel, squash, rebound, light, island) time a part that has weight. Pure data with no window or GSAP access at module scope, so it is safe to import anywhere.",
  props: motionProps,
  examples: [
    {
      title: "Drive a tween",
      description: "Tokens are data; you pass them to GSAP yourself.",
      code: 'const t = motion.summon;\ngsap.to(el, { opacity: 1, duration: t.duration / 1000, ease: t.ease });',
    },
    {
      title: "Through useTactile",
      description: "The usual path — the token names the gesture, the hook resolves it.",
      code: 'const { ref, handlers } = useTactile({ press: { motion: "press" }, release: { motion: "pop" } });',
    },
    {
      title: "Honour the collapse",
      description: "Every token declares what it becomes under reduced motion; never ignore it.",
      code: 'const t = motion.summon;\nconst vars = reduced && t.reduced !== "none" ? { opacity: 1 } : { opacity: 1, scale: 1 };',
    },
  ],
  feel: "Glass moves smooth, pixels move steppy: panels ease into place, screen readouts tick over in steps.",
  usage: {
    imports: [
      "import gsap from \"gsap\";",
      "import { motion } from \"echo-ui-core/motion\";",
    ].join("\n"),
    code: [
      "const t = motion.summon;",
      "gsap.to(panel, { opacity: 1, duration: t.duration / 1000, ease: t.ease });",
    ].join("\n"),
  },
  motion: {
    tokens: ["press", "pop", "summon", "breath", "settle", "glitch", "flood", "drain", "lift", "follow", "travel", "squash", "rebound", "light", "boot", "bloom", "island"],
    reducedMotion: "Each token declares its own collapse: `summon`, `flood`, `bloom` and `island` fade in place, `boot` fades quickly; every other token stops moving. Springs are skipped: the part jumps to where it is going.",
  },
  antiPatterns: [
    "Never put a soft material ease on a pixel element — an LCD or dot-matrix surface takes glitch (steps), never summon or settle. This is the single most legible motion mistake in the system.",
    "Never invent a duration inline. If a gesture needs timing the tokens do not cover, add a token and document it; scattered magic numbers are how a motion system dies.",
    "Never animate a token's transform under prefers-reduced-motion — read `reduced` and collapse to the fade (or to nothing) as the token instructs.",
    "Never use `drain` with a duration — it is scrub-driven, timed by the clock that owns it, which is why it ships no duration at all.",
  ],
} as const;
