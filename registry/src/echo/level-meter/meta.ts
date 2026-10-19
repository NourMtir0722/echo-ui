import { z } from "zod";

export const levelMeterProps = z.object({
  label: z.string().describe("What it measures; the accessible name, and the visible label unless hideLabel."),
  level: z.number().describe("The level now, 0–1. Feed it as often as you like."),
  cells: z.number().default(16).describe("How many LED cells the meter has. Default 16."),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical").describe("vertical (the default) stands the cells in a column; horizontal lays them in a row."),
  peakHold: z.boolean().default(true).describe("Hold the highest cell reached for a moment before it drops."),
  hideLabel: z.boolean().default(false).describe("Keep the label for assistive tech only."),
});

export const meta = {
  name: "echo-level-meter",
  title: "LevelMeter",
  description:
    "A live level (a microphone, a mix bus) as LED cells with real ballistics: it rises at once, falls back slowly, and holds its peak for a moment. Feed it a level as often as you like; it draws on animation frames without re-rendering and stops once it has settled. For assistive tech a meter whose value is rounded to tenths and updated at most once a second.",
  props: levelMeterProps,
  examples: [
    {
      title: "A microphone",
      description: "Feed it the input level on every frame.",
      code: '<LevelMeter label="Input" level={micLevel} />',
    },
    {
      title: "A stereo pair",
      description: "Two meters, the second without its own label on screen.",
      code: '<Stack direction="row" gap={2}>\n  <LevelMeter label="Left" level={left} />\n  <LevelMeter label="Right" level={right} />\n</Stack>',
    },
  ],
  feel: "An instrument, not a chart: it jumps up with a loud sound and drifts down after it, with the last peak hanging on above.",
  usage: {
    imports: 'import { LevelMeter } from "@/echo/level-meter";',
    code: '<LevelMeter label="Input" level={level} />',
  },
  composition: "LevelMeter → a strip of LED cells (a role=\"meter\" element)",
  a11y: [
    "`role=\"meter\"` named by `label`; its value is rounded to tenths and updated at most once a second, so a screen reader isn't flooded.",
    "It's a reading, never a control: nothing to focus.",
    "If a level crossing a threshold matters (\"clipping\"), say it in words as well.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "It shows the level as it is: no slow fall, no held peak.",
  },
  antiPatterns: [
    "Never use a LevelMeter for a value that changes rarely: that's a Meter.",
    "Never colour the top cells red: the held peak is the warning; say \"clipping\" in words if it matters.",
  ],
} as const;
