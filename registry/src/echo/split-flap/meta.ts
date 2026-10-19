import { z } from "zod";

export const splitFlapProps = z.object({
  value: z.union([z.number(), z.string()]).describe("What it shows. Numbers pad with zeros to `length`; text with spaces."),
  length: z.number().optional().describe("How many flaps. Defaults to the value's own length."),
  label: z.string().optional().describe('What the value is, for its name: "Visitors" reads "Visitors 1024".'),
  live: z.boolean().optional().describe("Announce changes politely."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("How big each flap is: sm 44px tall, md (the default) 64px, lg 84px."),
});

export const meta = {
  name: "echo-split-flap",
  title: "SplitFlap",
  description:
    "A readout that turns over like a departures board: each character flips through the ones between where it is and where it's going, flap by flap — fast when it's far, slowest on the last one — and each flap ticks. The flaps are the neutral cap's plastic in a recessed well.",
  props: splitFlapProps,
  examples: [
    {
      title: "A count",
      description: "Pads to four digits.",
      code: '<SplitFlap value={visitors} length={4} label="Visitors" live />',
    },
    {
      title: "Words",
      description: "Letters turn through the alphabet.",
      code: '<SplitFlap value="BOARDING" length={8} />',
    },
  ],
  feel: "A mechanism you can hear: every flap between here and there.",
  usage: {
    imports: 'import { SplitFlap } from "@/echo/split-flap";',
    code: "<SplitFlap value={count} length={4} />",
  },
  composition: "SplitFlap → a well of flaps, each two halves and two turning leaves",
  a11y: [
    "The flaps are one image named by the value (and `label`), so it's read once, not letter by letter.",
    "`live` announces changes politely, from outside the image where it can be heard.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "It jumps to the value.",
  },
  sound: ["A short tick per flap, inside a SoundProvider."],
  antiPatterns: [
    "Never use it for a value that changes many times a second: it can't keep up, by design.",
    "Never use it for the only copy of important text: it's slow to read on purpose.",
  ],
} as const;
