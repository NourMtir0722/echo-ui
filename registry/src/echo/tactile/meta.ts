/**
 * Per-component meta for the useTactile hook.
 */
import { z } from "zod";

const phase = z.object({
  motion: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().describe("Motion token name or raw GSAP vars."),
  sound: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().describe("Sound token name or raw recipe."),
  haptic: z
    .union([z.enum(["tick", "success", "warn", "error"]), z.literal(false)])
    .optional()
    .describe("A haptic for the phase. By default its sound brings the one it carries (`select` a tick, `error` an error); name another, or false for none. With no sound, it plays on its own."),
});

export const tactileConfig = z
  .object({
    press: phase.optional().describe("As it goes down: on pointer down, or Space or Enter."),
    release: phase.optional().describe("As it comes back up: on letting go, or when the pointer leaves or focus moves away mid-press."),
    hover: phase.optional().describe("When a pointer comes over it."),
    leave: phase.optional().describe("When the pointer leaves it."),
    focus: phase.optional().describe("When it takes focus."),
    blur: phase.optional().describe("When focus leaves it."),
    activate: phase.optional().describe("When it's activated: a click, which a keyboard's Enter or Space also makes."),
  })
  .describe("Per-interaction-phase binding of motion, sound and haptics.");

export const meta = {
  name: "use-tactile",
  title: "useTactile",
  description:
    "Binds motion (GSAP), sound and haptics per interaction phase. Returns { ref, handlers } to spread onto an element. Pointer and keyboard feel identical; motion collapses under prefers-reduced-motion. The same entry exports the physics Echo's own parts move on: createSpring for anything the hand can redirect, useCapPhysics for a cap that presses like Echo's keys, and the liquid cap and morph engine under Morph.",
  props: tactileConfig,
  examples: [
    {
      title: "Tactile button",
      description: "The canonical press/release pairing.",
      code: [
        'const { ref, handlers } = useTactile({',
        '  press:   { motion: "press", sound: "press" },',
        '  release: { motion: "pop",   sound: "release" },',
        "});",
        "return <button ref={ref} {...handlers}>Record</button>;",
      ].join("\n"),
    },
    {
      title: "A buzz with the choice",
      description: "On a phone, a phase can buzz: select's tick comes with its sound; name one for a phase that has no sound.",
      code: [
        'useTactile({',
        '  activate: { sound: "select" },',
        '  release:  { haptic: "tick" },',
        "});",
      ].join("\n"),
    },
    {
      title: "Escape hatch",
      description: "Pass raw GSAP vars / recipe objects instead of token names for full control.",
      code: 'useTactile({ press: { motion: { rotation: -3, duration: 0.1 } } });',
    },
    {
      title: "A spring you can redirect",
      description:
        "createSpring carries its velocity: sent somewhere else mid-flight, it bends toward the new target instead of starting again from rest. The presets are `springs` in echo-ui-core/motion.",
      code: [
        "const x = createSpring(0, springs.snappy, (v) => knob.style.setProperty(\"--x\", `${v}px`));",
        "x.to(120);",
        "// Sent back mid-flight, it keeps its momentum.",
        "x.to(-40);",
        "// Let go of a flick: start from the pointer's speed.",
        "x.to(0, { velocity: 900 });",
      ].join("\n"),
    },
    {
      title: "A cap that presses like Echo's keys",
      description:
        "useCapPhysics: it lifts and leans toward the pointer, clicks as it lands on its seam, loads while held and snaps home. HardwareButton is built on it.",
      code: [
        "const { ref, handlers } = useCapPhysics<HTMLButtonElement>({ tilt: 4, sound: true });",
        "return <button ref={ref} {...handlers}>Arm</button>;",
      ].join("\n"),
    },
    {
      title: "A spring under reduced motion",
      description: "createSpring doesn't read the preference; jump with set instead of travelling with to.",
      code: [
        "const reduced = useReducedMotion();",
        "if (reduced) x.set(120);",
        "else x.to(120);",
      ].join("\n"),
    },
  ],
  feel: "One hook makes a custom control press, spring back and click. For a molded cap that should press like Echo's own keys, with the detent and the clicks on the mechanism, use useCapPhysics.",
  usage: {
    imports: "import { useTactile } from \"echo-ui-core/tactile\";",
    code: [
      "const { ref, handlers } = useTactile<HTMLButtonElement>({",
      "  press: { motion: \"press\", sound: \"press\" },",
      "  release: { motion: \"pop\", sound: \"release\" },",
      "});",
      "return <button ref={ref} {...handlers}>Record</button>;",
    ].join("\n"),
  },
  motion: {
    tokens: ["press", "pop"],
    reducedMotion: "Motion follows each token's own collapse; sound follows the SoundProvider, which mutes under reduced motion by default.",
  },
  sound: [
    "Whatever each phase names — typically `press` on the way down and `release` on the way up. Space and Enter play the same as a pointer.",
  ],
  a11y: [
    "Keyboard: Space and Enter press and release the element the same way a pointer does; a held key doesn't repeat the press.",
    "It adds feel, not semantics: spread its handlers onto a real button (or give the element a role and a name).",
  ],
  antiPatterns: [
    "Do not re-implement keyboard handling on top of useTactile — Space/Enter parity is built in.",
    "Do not put a smooth material ease on pixel/LCD elements — use motion.glitch (steppy).",
    "Do not gate sound on reduced-motion here; the SoundProvider already couples them.",
    "Never hand-roll a spring, or a requestAnimationFrame ease, for a part the hand can move or redirect: a tween restarts from rest when retargeted, createSpring keeps its momentum.",
    "Never call a spring's `to` under reduced motion: createSpring doesn't read the preference, so `set` the value there (useReducedMotion says when).",
  ],
} as const;
