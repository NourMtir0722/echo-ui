import { z } from "zod";

export const creatureProps = z.object({
  mood: z
    .enum(["idle", "busy", "done", "error", "sleep"])
    .default("idle")
    .describe("What it's doing: idle watches, busy works, done hops, error is puzzled, sleep naps."),
  variant: z.enum(["vector", "dots"]).default("vector").describe("vector on the page; dots on a dot-matrix screen of its own."),
  character: z
    .object({
      viewBox: z.string(),
      body: z.union([z.string(), z.array(z.string())]),
      eyes: z.array(z.string()).optional(),
      pupils: z.array(z.string()).optional(),
      catchLights: z.array(z.tuple([z.number(), z.number()])).optional(),
      origin: z.tuple([z.number(), z.number()]),
      eyeLine: z.number(),
      dots: z.array(z.string()).optional(),
    })
    .optional()
    .describe("Who it is: path data for a body, the whites of its eyes and its pupils, and optionally rows of dots. Default: Echo."),
  size: z.number().optional().describe("Height in px. Default 96 for vector, 120 for dots."),
  label: z.string().optional().describe("An accessible name, only when no text nearby says what it shows."),
  accent: z.string().optional().describe("A colour of its own, as a hex: a family of creatures, one each."),
});

export const meta = {
  name: "echo-creature",
  title: "Creature",
  description:
    "A small companion that lives in the interface and only reports what's happening: idle, busy, done, an error, asleep. As a vector it breathes, drifts, blinks and watches the pointer, and a new mood carries on from wherever it is; as dots it lives on a screen and moves in steps. It's Echo by default; bring your own character as a few paths (a body, eye whites, pupils) or rows of text, and Echo supplies the materials so it relights with the theme.",
  props: creatureProps,
  examples: [
    {
      title: "An empty inbox",
      description: "Asleep in the empty state; the words say what's going on.",
      code: '<EmptyState\n  illustration={<Creature mood="sleep" />}\n  title="No messages yet"\n  description="When someone writes to you, it shows up here."\n/>',
    },
    {
      title: "On a screen",
      description: "The same creature in dots, busy while something syncs.",
      code: '<Creature variant="dots" mood="busy" />',
    },
    {
      title: "Your own character",
      description: "A body path and two eyes; the dots are drawn from them.",
      code: [
        "const blob: CreatureCharacter = {",
        '  viewBox: "0 0 100 100",',
        '  body: "M50 8C77 8 92 30 92 55S77 92 50 92 8 80 8 55 23 8 50 8z",',
        '  eyes: ["M34 40h10v16H34z", "M56 40h10v16H56z"],',
        '  pupils: ["M38 46h5v8h-5z", "M60 46h5v8h-5z"],',
        "  origin: [50, 80],",
        "  eyeLine: 48,",
        "};",
        "",
        'return <Creature character={blob} mood="done" />;',
      ].join("\n"),
    },
  ],
  feel: "A companion, not a mascot: small movements on slow springs, eyes that follow you, a hop when something works.",
  usage: {
    imports: 'import { Creature } from "@/echo/creature";',
    code: '<Creature mood="idle" />',
  },
  composition: "Creature\n  vector: the body, its eyes and pupils on a living rig\n  dots: a screen well with the dot matrix",
  a11y: [
    "Hidden from assistive technology by default: the text beside it says what's happening, and it only shows it.",
    "Give it `label` only when no nearby text says what it shows; it's then an image with that name.",
    "Under reduced motion it holds one pose per mood: no drift, no breath, no following the pointer, no hopping.",
    "Nothing it does flashes; the dots change a few times a second at most.",
    "In forced colors it's drawn as an outline in the system colours.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "One still pose per mood.",
  },
  antiPatterns: [
    "Never let the creature be the only sign of a state: an error needs its words, and the creature only looks puzzled beside them.",
    "Never put a creature on every screen: it's for the moments that are about nothing else (empty, waiting, done).",
    "Never colour your character's paths: Echo lights them from the theme, and a hardcoded colour breaks when the theme changes.",
  ],
} as const;
