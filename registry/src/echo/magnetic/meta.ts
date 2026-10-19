import { z } from "zod";

export const magneticProps = z.object({
  children: z.unknown().describe("HardwareButtons, usually icon-only ones in a row."),
  radius: z.number().optional().describe("How far away a button starts to feel the hand, px. Defaults to 130."),
  strength: z.number().optional().describe("How far it leans, as a share of the distance to the hand. Defaults to 0.4."),
});

export const meta = {
  name: "echo-magnetic",
  title: "Magnetic",
  description:
    "The HardwareButtons inside it feel your hand before you touch them: each leans toward the pointer and comes up a little, the nearest most, and springs home when you move away. It moves the button as a whole, never the cap, so pressing still presses.",
  props: magneticProps,
  examples: [
    {
      title: "A dock",
      description: "Icon-only caps in a row.",
      code: [
        "<Magnetic>",
        '  <HardwareButton iconOnly aria-label="Home" icon={homeIcon} />',
        '  <HardwareButton iconOnly aria-label="Search" icon={searchIcon} />',
        "</Magnetic>",
      ].join("\n"),
    },
  ],
  feel: "It answers before you touch it.",
  usage: {
    imports: ['import { Magnetic } from "@/echo/magnetic";', 'import { HardwareButton } from "@/echo/hardware-button";'].join("\n"),
    code: [
      "<Magnetic>",
      "  <HardwareButton iconOnly aria-label=\"Record\" icon={micIcon} />",
      "</Magnetic>",
    ].join("\n"),
  },
  composition: "Magnetic → your HardwareButtons, moved as a whole (translate, scale)",
  a11y: [
    "It changes nothing about the buttons but where they are: names, roles and focus are theirs.",
    "Pointer only — touch has no hover — and nothing leans under reduced motion.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "Nothing leans.",
  },
  sound: ["None of its own; each cap's press is its own."],
  antiPatterns: [
    "Never put text buttons in a dense form inside it: a target that moves is harder to hit.",
    "Never set a radius so large that buttons lean while the hand is going somewhere else.",
  ],
} as const;
