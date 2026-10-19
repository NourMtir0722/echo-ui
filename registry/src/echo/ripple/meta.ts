import { z } from "zod";

export const rippleProps = z.object({
  children: z.unknown().optional().describe("Controls or content on the surface; a key press on one sends a wave from it."),
  spacing: z.number().optional().describe("Distance between dots, px. Defaults to 16."),
  onRipple: z.function().optional().describe("Called when a wave is sent, with how hard (0–1)."),
});

export const meta = {
  name: "echo-ripple",
  title: "Ripple",
  description:
    "A surface of dots that answers a press like water: a wave runs out from where you pressed, and pressing longer presses deeper and sends a bigger one. The dots dip under the pointer as it passes. Put controls on it; a key press on one of them sends a wave from it too. It's Panel's pressable wave with the dots always out; to make an ordinary Panel give like this, use <Panel pressable>.",
  props: rippleProps,
  examples: [
    {
      title: "Behind a call to action",
      description: "The button is the control; the surface answers it.",
      code: ["<Ripple>", '  <HardwareButton variant="primary">Start</HardwareButton>', "</Ripple>"].join("\n"),
    },
  ],
  feel: "The surface itself is pliable.",
  usage: {
    imports: ['import { Ripple } from "@/echo/ripple";', 'import { HardwareButton } from "@/echo/hardware-button";'].join("\n"),
    code: ["<Ripple>", "  <HardwareButton>Press</HardwareButton>", "</Ripple>"].join("\n"),
  },
  composition: "Ripple → a canvas of dots under your content, waved by Panel's useRippleSurface",
  a11y: [
    "The dots are decoration, hidden from assistive tech; what's on the surface keeps its own names and focus.",
    "Keyboard presses on controls on it send waves too.",
    "In forced colors the dots are dropped.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The dots stay still.",
  },
  sound: ["A soft thud when you press the surface itself, deeper for a longer press, inside a SoundProvider. A control on it makes its own sound instead."],
  antiPatterns: ["Never put body text on it: moving dots behind words make them harder to read."],
} as const;
