import { z } from "zod";

export const rollProps = z.object({
  drum: z.string().optional().describe("The characters in order, each one a step. Defaults to the digits."),
  enabled: z.boolean().optional().describe("Roll at all. false swaps the value outright. Default true."),
  onTurn: z.function().optional().describe("Called on every step, for a tick."),
});

export const meta = {
  name: "echo-roll",
  title: "useRoll",
  description:
    "A readout that rolls to a new value instead of swapping it: each digit steps through the ones in between, all together, fast when it's far and slowest on the last step. It's the drum SplitFlap turns on, and what roll does on LcdChip, StatTile and NumberField. useRoll(text, options) returns the text to draw, which is in between values while it rolls, so draw it aria-hidden and give the real value to assistive technology.",
  props: rollProps,
  examples: [
    {
      title: "A count",
      description: "Draw what it returns; say the real value.",
      code: [
        "const shown = useRoll(String(count));",
        '<span aria-hidden="true">{shown}</span>',
      ].join("\n"),
    },
    {
      title: "Letters",
      description: "Any drum: here a departures board's.",
      code: 'const shown = useRoll(gate, { drum: CHARS });',
    },
  ],
  feel: "Numbers that travel to their value, so you can see how far it moved and which way.",
  usage: {
    imports: 'import { useRoll } from "@/echo/roll";',
    code: 'const shown = useRoll(String(count));',
  },
  composition: "useRoll → the text to draw, one step at a time",
  a11y: [
    "What it returns is in between values while it rolls: draw it aria-hidden and give the real value to assistive technology, the way LcdChip, StatTile and NumberField do.",
    "It never announces anything by itself.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "It returns the value itself: no steps.",
  },
  antiPatterns: [
    "Never roll a value that changes many times a second: each step is 55–120ms, so it falls behind by design.",
    "Never roll text the user is typing: it's theirs, and it should appear as typed.",
  ],
} as const;
