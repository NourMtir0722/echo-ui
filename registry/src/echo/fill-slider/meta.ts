import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const fillSliderProps = z.object({
  ...interopProps,
  label: z.string().describe("What it sets: engraved under the tube and its accessible name."),
  icon: z.unknown().optional().describe("A glyph at the foot of the tube, over the fill. Decorative."),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().optional().describe("Uncontrolled starting value; defaults to min."),
  onValueChange: z.function().optional().describe("Called with each step the fill reaches."),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  formatValue: z.function().optional().describe("How the value is said to assistive technology. Default: a percent of the range."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-fill-slider",
  title: "FillSlider",
  description:
    "The tall slider of a control centre: a tube in the chassis that fills with lit plastic from the bottom, like Meter's, and follows your finger anywhere on it. For brightness, volume, a level you set by eye. Base UI's slider, vertical, with every slider key; the top of the fill is the handle, so there's no knob to aim for.",
  props: fillSliderProps,
  examples: [
    {
      title: "Brightness and volume",
      description: "Two tubes side by side, as in a control centre.",
      code: '<Stack direction="row" gap={6}>\n  <FillSlider label="Brightness" icon={<SunIcon />} defaultValue={70} />\n  <FillSlider label="Volume" icon={<SpeakerIcon />} defaultValue={40} />\n</Stack>',
    },
    {
      title: "In your own units",
      description: "Said as you'd say it.",
      code: '<FillSlider label="Warmth" min={2700} max={6500} step={100} formatValue={(k: number) => `${k} kelvin`} />',
    },
  ],
  feel: "A tube of light you push up and down with a thumb.",
  usage: {
    imports: 'import { FillSlider } from "@/echo/fill-slider";',
    code: '<FillSlider label="Brightness" defaultValue={70} />',
  },
  composition: "FillSlider\n  the tube (Base UI slider, vertical): the fill, the glyph, the handle\n  the label",
  a11y: [
    "A vertical `slider` named by `label`, with the value said as a percent of the range, or as `formatValue` says it.",
    "Up and Right raise it, Down and Left lower it, Page Up/Down move a tenth, Home and End go to the ends.",
    "Dragging anywhere on the tube is a pointer extra: everything it does, the keys do.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "Nothing animates: the fill follows the value directly.",
  },
  sound: ["A tap at each step, inside a SoundProvider."],
  antiPatterns: [
    "Never use a FillSlider in a form row: it's tall on purpose; beside a field, use a Slider.",
    "Never leave out the icon when there are several side by side: the glyph is how people tell them apart at a glance.",
  ],
} as const;
