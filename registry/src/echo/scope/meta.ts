import { z } from "zod";

export const scopeProps = z.object({
  children: z.unknown().describe("What speaks with this vocabulary."),
  accent: z.string().optional().describe('A colour of its own for what\'s inside, as a hex: "#F2674E".'),
  seed: z
    .object({ chassis: z.string().optional(), paper: z.string().optional() })
    .optional()
    .describe("Your theme's chassis and paper, when they aren't Echo's defaults: the accent's caps and glow are checked against them."),
  molding: z.enum(["soft"]).optional().describe("soft: rounder, fuller caps with a pillow of light."),
});

export const meta = {
  name: "echo-scope",
  title: "Scope",
  description:
    "Part of the page speaking with its own vocabulary. accent gives what's inside a colour of its own for identity (a category, a filter pad, a person, a creature): the theme engine run on your colour, so its lit caps, glow and LEDs are derived and contrast-checked like your main accent, and every component inside picks them up. It's for telling things apart, never for state. molding=\"soft\" rounds the caps inside and fills them out with a pillow of light. It draws nothing and takes no space.",
  props: scopeProps,
  examples: [
    {
      title: "A colour per category",
      description: "Each project's key lights in its own colour.",
      code: '<Stack direction="row" gap={4}>\n  <Scope accent="#F2674E"><HardwareButton variant="primary">Design</HardwareButton></Scope>\n  <Scope accent="#3D8EF0"><HardwareButton variant="primary">Research</HardwareButton></Scope>\n  <Scope accent="#DE3B74"><HardwareButton variant="primary">Build</HardwareButton></Scope>\n</Stack>',
    },
    {
      title: "Soft plastic",
      description: "Puffier caps for a friendlier device.",
      code: '<Scope molding="soft">\n  <Keypad label="Amount" prefix="$" />\n</Scope>',
    },
    {
      title: "Your own theme",
      description: "Check the colour against your chassis and paper.",
      code: '<Scope accent="#DE3B74" seed={{ chassis: "#26222B", paper: "#F5EDE0" }}>\n  <Switch aria-label="Live" defaultChecked />\n</Scope>',
    },
  ],
  feel: "The same device in another colour, or molded softer: every part inside changes together.",
  usage: {
    imports: 'import { Scope } from "@/echo/scope";\nimport { HardwareButton } from "@/echo/hardware-button";',
    code: '<Scope accent="#F2674E">\n  <HardwareButton variant="primary">Design</HardwareButton>\n</Scope>',
  },
  composition: "Scope\n  anything",
  a11y: [
    "Its accent is the theme engine run on your colour, so text on a lit cap inside still clears AA, exactly as with your main accent.",
    "An accent tells things apart; it never carries a state on its own. Say the state in words, as everywhere in Echo.",
    "It adds no element anyone can reach and changes no roles or names inside it.",
  ],
  antiPatterns: [
    "Never use an accent to mean good, bad or warning: that's a second hue for state, and it fails anyone who can't see it. Accents are for identity.",
    "Never scope every part of a screen in a different colour: a few categories, a few pads. The page's own accent stays the one that means \"this\".",
    "Never pick an accent for its exact shade: the engine moves it until its caps and glow are readable, so a bright yellow comes out amber.",
  ],
} as const;
