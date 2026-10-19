import { z } from "zod";

export const throwStackProps = z.object({
  children: z.unknown().describe("One child per card, top first."),
  label: z.string().describe('Names the stack, e.g. "Today".'),
  onChange: z.function().optional().describe("Called with the index (in children) of the new top card."),
});

export const meta = {
  name: "echo-throw-stack",
  title: "ThrowStack",
  description:
    "A stack of cards you can throw: drag the top one and flick it, and it keeps the speed you gave it, spins from where you held it (grabbed low, it swings the other way), flies off and tucks back in underneath. A short drag springs back. The cards are Echo Panels.",
  props: throwStackProps,
  examples: [
    {
      title: "A day",
      description: "Any content per card.",
      code: [
        '<ThrowStack label="Today">',
        "  <p>Stand-up at 9:30</p>",
        "  <p>Two hours, no calls</p>",
        "</ThrowStack>",
      ].join("\n"),
    },
  ],
  feel: "It keeps the speed you gave it.",
  usage: {
    imports: 'import { ThrowStack } from "@/echo/throw-stack";',
    code: ['<ThrowStack label="Cards">', "  {cards.map((c: { id: string; text: string }) => <p key={c.id}>{c.text}</p>)}", "</ThrowStack>"].join("\n"),
  },
  composition: "ThrowStack → Panel per card, stacked in one cell",
  a11y: [
    "A named group of cards; only the top card is focusable and visible to assistive tech.",
    "← and → throw the top card; focus moves to the new top card, and \"2 of 4\" is announced.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The cards cycle without flying.",
  },
  sound: ["A whoosh as a card is thrown, inside a SoundProvider."],
  antiPatterns: [
    "Never hide something the user must see in a card below the top: it's for browsing, not for required content.",
    "Never use it for more than a handful of cards: past that it's a list.",
  ],
} as const;
