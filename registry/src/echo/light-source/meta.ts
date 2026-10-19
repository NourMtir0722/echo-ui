import { z } from "zod";

export const lightSourceProps = z.object({
  children: z.unknown().describe("HardwareButtons (and anything else); the caps are what it lights."),
  reach: z.number().optional().describe("How far a shadow can fall, px. Defaults to 13."),
});

export const meta = {
  name: "echo-light-source",
  title: "LightSource",
  description:
    "Your pointer becomes the light the caps inside it are lit by: each HardwareButton's shine turns toward it and its shadow falls away from it, the nearest most. When the pointer leaves, the light drifts back to the room's key light. It lights what you put in it and adds nothing of its own.",
  props: lightSourceProps,
  examples: [
    {
      title: "A keypad",
      description: "Any HardwareButtons inside.",
      code: [
        "<LightSource>",
        "  {keys.map((k: string) => (",
        '    <HardwareButton key={k} size="sm" iconOnly aria-label={k} icon={<b>{k}</b>} />',
        "  ))}",
        "</LightSource>",
      ].join("\n"),
    },
  ],
  feel: "Your hand is the light the surface is lit by.",
  usage: {
    imports: ['import { LightSource } from "@/echo/light-source";', 'import { HardwareButton } from "@/echo/hardware-button";'].join("\n"),
    code: [
      "<LightSource>",
      "  <HardwareButton>Play</HardwareButton>",
      "  <HardwareButton>Stop</HardwareButton>",
      "</LightSource>",
    ].join("\n"),
  },
  composition: "LightSource → your HardwareButtons, through their light offset (--hw-light-x/-y) and a shine",
  a11y: [
    "Pure light: it changes no names, roles or focus, and the caps keep their contrast.",
    "In forced colors the glow and shine are dropped.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The light jumps to the pointer instead of gliding.",
  },
  sound: ["None of its own."],
  antiPatterns: ["Never put it around a whole page: one lit group is a moment; everything lit is noise."],
} as const;
