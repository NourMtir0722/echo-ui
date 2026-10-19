import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const jogWheelProps = z.object({
  ...interopProps,
  label: z.string().describe("What it moves: the label under it, and the accessible name."),
  value: z.number().optional().describe("Controlled value."),
  defaultValue: z.number().optional().describe("Uncontrolled starting value; defaults to min, or 0."),
  onValueChange: z.function().optional().describe("Called with every step it moves."),
  step: z.number().default(1),
  min: z.number().optional().describe("An optional end. Without one it turns forever."),
  max: z.number().optional().describe("An optional end. Without one it turns forever."),
  formatValue: z.function().optional().describe('How the value reads, under the wheel and to assistive tech ("00:01:12.08").'),
  size: z.enum(["md", "lg"]).default("md").describe("96 or 128px across."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-jog-wheel",
  title: "JogWheel",
  description:
    "A knob with no ends: turn it and it moves a value by steps, as far as you like, like a video editor's jog wheel. Turn slowly for a step per click; spin it and the steps grow with the speed, so a long way is a quick flick. Knob's own cap, well and pointer, larger, with a ring engraved on the cap to see it turn. A spin button for assistive tech: arrows step, Shift or Page Up/Down take ten.",
  props: jogWheelProps,
  examples: [
    {
      title: "Scrub a clip",
      description: "Frames, read as a timecode.",
      code: '<JogWheel label="Position" formatValue={(f: number) => timecode(f)} />',
    },
    {
      title: "Fine adjustment",
      description: "Tenths, between two ends.",
      code: '<JogWheel label="Exposure" step={0.1} min={-3} max={3} defaultValue={0} formatValue={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)} EV`} />',
    },
  ],
  feel: "A heavy wheel with a notch under your finger: slow clicks for precision, a spin to travel.",
  usage: {
    imports: 'import { JogWheel } from "@/echo/jog-wheel";',
    code: '<JogWheel label="Position" />',
  },
  composition: "JogWheel\n  Knob's well and cap (a role=\"spinbutton\" element), with an engraved ring and a finger dimple",
  a11y: [
    "`role=\"spinbutton\"` named by `label`, with `aria-valuenow` and `formatValue`'s reading as `aria-valuetext`; `min` and `max` when it has ends.",
    "Arrow keys step, Shift with an arrow or Page Up/Down take ten, and Home and End go to the ends when there are ends.",
    "The wheel only turns it once it has focus, so scrolling a page never catches on it. It turns as far as you scrolled, either axis: a mouse wheel's click is a notch, a trackpad's small moves add up to one.",
    "Dragging turns it by the angle round the centre; over the hub, where a hair's move is a quarter turn, it waits for the hand to leave.",
    "Turning it by hand is a pointer extra: everything it does, the keys do.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The cap turns straight to where it's going; no settle.",
  },
  sound: ["A short click at every step, inside a SoundProvider."],
  antiPatterns: [
    "Never use a JogWheel for a value with a sensible range: that's a Knob or a Slider, which show where the value sits.",
    "Never leave out formatValue for anything but a plain count: a jog wheel usually moves time or position.",
  ],
} as const;
