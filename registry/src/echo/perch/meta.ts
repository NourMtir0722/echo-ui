import { z } from "zod";

export const perchProps = z.object({
  children: z.unknown().describe("What it sits on: a Card, a Panel, a Modal's body."),
  mood: z.enum(["idle", "busy", "done", "error", "sleep"]).default("idle").describe("What it's doing."),
  character: z.unknown().optional().describe("Who it is: a Creature character. Default: Echo."),
  behavior: z.enum(["sit", "peek"]).default("sit").describe("sit on the edge; peek hides behind it and comes up when you're near."),
  at: z.enum(["start", "end"]).default("end").describe("Which end of the edge."),
  size: z.number().default(56).describe("The creature's height in px."),
});

export const meta = {
  name: "echo-perch",
  title: "Perch",
  description:
    "A creature on the top edge of whatever you put in it: sitting there watching, or hiding behind the edge and peeking up when you come near. It reacts through its mood like every Creature, and never covers what it sits on: the space it needs above the edge is kept for it. For onboarding, an empty state's card, a success moment, a product's assistant.",
  props: perchProps,
  examples: [
    {
      title: "On a card",
      description: "Echo sits on the corner, watching the pointer.",
      code: '<Perch>\n  <Card title="Welcome" description="Three steps and you\'re set up." />\n</Perch>',
    },
    {
      title: "Peeking",
      description: "Out of sight until you're near the card.",
      code: '<Perch behavior="peek" at="start">\n  <Card title="Tip" description="Press ? for every shortcut." />\n</Perch>',
    },
    {
      title: "Pleased",
      description: "A hop when the work is done.",
      code: '<Perch mood="done">\n  <Card title="All set" description="Your workspace is ready." />\n</Perch>',
    },
  ],
  feel: "A small companion sitting on the edge of the card, looking at what you're doing.",
  usage: {
    imports: 'import { Perch } from "@/echo/perch";\nimport { Card } from "@/echo/card";',
    code: '<Perch>\n  <Card title="Welcome" />\n</Perch>',
  },
  composition: "Perch\n  Creature, on the ledge\n  what it sits on",
  a11y: [
    "The creature is hidden from assistive technology; what's in the Perch is read as it is.",
    "It never covers content: the room it needs above the edge is kept for it, and it takes no pointer.",
    "Peeking comes up on hover and when focus is inside, so keyboard users see it too.",
    "Under reduced motion it holds one pose, and a peeking creature appears without rising.",
  ],
  motion: {
    tokens: ["springs", "pop"],
    reducedMotion: "One still pose; a peek appears at once.",
  },
  antiPatterns: [
    "Never perch a creature on every card: one, on the card a moment is about.",
    "Never let the creature carry a message: the card says it, the creature only looks the part.",
  ],
} as const;
