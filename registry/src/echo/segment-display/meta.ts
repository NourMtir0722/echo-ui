import { z } from "zod";

export const segmentDisplayProps = z.object({
  value: z.union([z.string(), z.number()]).describe("The reading: digits, a minus, a dot, a colon, and the letters a segment face can draw."),
  label: z.string().describe("What it reads: the accessible name, and engraved over a screen display."),
  unit: z.string().optional().describe('Engraved after the digits: "MHz", "kg".'),
  digits: z.number().int().nonnegative().default(0).describe("At least this many digit cells; a shorter reading is padded on the left, and a minus stays in front of padding zeros (-05)."),
  pad: z.enum(["0", " "]).default("0").describe('What fills the padding: dim zeros, the way a counter shows them, or blanks (" ").'),
  ghost: z.boolean().default(true).describe("Draw the segments a reading doesn't light, faintly, as a real display shows them."),
  glow: z.boolean().default(true).describe("Lit in the accent; false lights it cream, for a value that isn't live."),
  roll: z.boolean().default(false).describe("A new reading rolls to its digits, each stepping through the ones in between."),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Digit height: 24, 40 or 64px."),
  variant: z.enum(["screen", "flush"]).default("screen").describe("screen sits in its own dark well; flush is the digits alone, for a screen you already have."),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("emissive: a dark screen that glows. reflective: the paper-coloured glass of a pocket calculator, printed in ink."),
});

export const meta = {
  name: "echo-segment-display",
  title: "SegmentDisplay",
  description:
    "A seven-segment readout drawn the way a real one looks: the segments a reading doesn't light stay faintly visible under the glass, and zeros that only pad a reading out print dim instead of vanishing. For the one number a screen is about: a frequency, a clock, an amount, a counter.",
  props: segmentDisplayProps,
  examples: [
    {
      title: "Frequency",
      description: "Four digits wide, so 88.5 shows a dim leading zero.",
      code: '<SegmentDisplay label="Frequency" value="88.5" digits={4} unit="MHz" size="lg" />',
    },
    {
      title: "Clock",
      description: "A colon is its own narrow cell.",
      code: '<SegmentDisplay label="Time left" value="04:59" />',
    },
    {
      title: "Counting",
      description: "Each new reading rolls through the digits in between.",
      code: '<SegmentDisplay label="Queue" value={String(queue)} digits={3} roll />',
    },
    {
      title: "Inside your own screen",
      description: "flush drops the well, for a readout that shares a screen with other parts.",
      code: '<Card variant="screen" title="Room">\n  <SegmentDisplay variant="flush" label="Temperature" value="21.5" unit="°C" />\n</Card>',
    },
    {
      title: "Reflective glass",
      description: "The paper glass of a pocket calculator: printed in ink, nothing glowing.",
      code: '<SegmentDisplay label="Total" value="1284.50" screen="reflective" />',
    },
  ],
  feel: "A lit panel meter: the dark segments are always there under the glass, and only the reading glows.",
  usage: {
    imports: 'import { SegmentDisplay } from "@/echo/segment-display";',
    code: '<SegmentDisplay label="Frequency" value="88.5" digits={4} unit="MHz" />',
  },
  composition: "SegmentDisplay",
  a11y: [
    "`role=\"group\"` named by `label`, and the reading said once, as it is, with its unit: \"88.5 MHz\", never the padded \"088.5\".",
    "The digit face is drawing, hidden from assistive technology; so are the dark segments and the padding.",
    "In forced colors the lit segments draw in the system text colour, padding in its grey, and the dark segments go.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "With roll, a new reading appears at once instead of stepping through the digits in between.",
  },
  antiPatterns: [
    "Never use a SegmentDisplay for words: a seven-segment face draws digits and a few letters; anything else is a blank cell.",
    "Never pad with digits to make a number look bigger: padding is for a face whose width is fixed (a four-digit frequency, a six-digit counter).",
    "Never light every display on a screen: glow the one being watched, and set the rest to glow={false}.",
  ],
} as const;
