import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const rangeSliderProps = z.object({
  ...interopProps,
  label: z.string().describe('What the span is ("Price"); the knobs are named "Price, minimum" and "Price, maximum".'),
  value: z.tuple([z.number(), z.number()]).optional().describe("Controlled [low, high]."),
  defaultValue: z.tuple([z.number(), z.number()]).default([25, 75]),
  onValueChange: z.function().optional().describe("Called with [low, high]."),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  minGap: z.number().default(1).describe("How many steps the knobs keep between them; they never cross."),
  size: z.enum(["sm", "md"]).default("md").describe("As Slider: md is the fader, sm for dense rows."),
  disabled: z.boolean().default(false),
  formatValue: z.function().optional().describe('How a value reads for assistive tech ("$40").'),
});

export const meta = {
  name: "echo-range-slider",
  title: "RangeSlider",
  description:
    "Two knobs on one rail for a span (a price range, a time window), with the rail lit between them. Slider's rail and knobs, with Slider's mass: the value moves at once and each knob catches up on a spring. They never cross; minGap keeps them apart. Each knob is its own slider for assistive tech, named from label.",
  props: rangeSliderProps,
  examples: [
    {
      title: "Price",
      description: "Knobs that read as money.",
      code: '<RangeSlider label="Price" defaultValue={[20, 80]} max={200} step={5} formatValue={(v: number) => `$${v}`} />',
    },
  ],
  feel: "Two molded knobs on one lit rail, each with the weight of the Slider's.",
  usage: {
    imports: 'import { RangeSlider } from "@/echo/range-slider";',
    code: '<RangeSlider label="Hours" min={0} max={24} defaultValue={[9, 17]} />',
  },
  composition: "RangeSlider → one rail with two Slider knobs (Base UI Slider with two thumbs)",
  a11y: [
    "Two sliders, \"{label}, minimum\" and \"{label}, maximum\", each with arrow keys, Page Up/Down, Home and End.",
    "The knobs can't cross, so neither key path can make the span inverted.",
    "`formatValue` sets each knob's `aria-valuetext`, so \"$40\" is read, not \"40\".",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The knobs sit at their values without catching up.",
  },
  sound: ["`tap` per step, inside a SoundProvider."],
  antiPatterns: [
    "Never use a RangeSlider where exact values matter more than the feel of the span: give two NumberFields.",
  ],
} as const;
