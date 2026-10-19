import { z } from "zod";

export const chartProps = z.object({
  data: z.array(z.number()).describe("The series, oldest first. Empty renders an unlit matrix."),
  label: z
    .string()
    .describe("What is being measured. Required — it is the accessible name, and a chart nobody can read is a decorative rectangle."),
  variant: z
    .enum(["bar", "line"])
    .default("bar")
    .describe("bar lights from the bottom up; line lights only the value's cell."),
  rows: z.number().default(7).describe("Matrix height in cells. More cells is finer, not smoother."),
  max: z.number().optional().describe("Scale ceiling. Defaults to the largest value present."),
  min: z.number().default(0).describe("Scale floor."),
  summary: z.string().optional().describe("Replaces the generated accessible description."),
  caption: z.string().optional().describe("Machine label under the matrix."),
});

export const meta = {
  name: "echo-chart",
  title: "Chart",
  description:
    "StatTile's dot-matrix language applied to a series: a column per sample, cells lit from the bottom, in the same recessed screen well LcdChip and Progress use. Values quantise to whole cells by construction — steppiness is the data model, not a style. No axes, no gridlines, no tooltips, no smoothing: it is a readout, not a charting library.",
  props: chartProps,
  examples: [
    {
      title: "Level over time",
      description: "The default bar matrix. Always name what it measures.",
      code: '<Chart data={levels} label="Input level, last 60 seconds" caption="input" />',
    },
    {
      title: "A single trace",
      description: "line lights only the value's cell per column.",
      code: '<Chart data={temps} variant="line" rows={9} label="Core temperature" />',
    },
    {
      title: "Fixed scale",
      description: "Pass max so the matrix does not rescale as data arrives.",
      code: '<Chart data={percent} min={0} max={100} label="Buffer fill" />',
    },
  ],
  feel: "A dot-matrix readout of recent values — a device's screen, not a charting library.",
  usage: {
    imports: "import { Chart } from \"@/echo/chart\";",
    code: "<Chart data={levels} label=\"Input level, last 60 seconds\" />",
  },
  composition: "Chart",
  a11y: [
    "One `role=\"img\"` named by `label` and a summary: how many samples, the range, and the last value.",
    "Pass `summary` to say what the shape means (“rising steadily”); the default only states the numbers.",
    "When the numbers themselves matter, put them in a Table as well — a picture of data is not the data.",
  ],
  antiPatterns: [
    "Do not use this when the values matter more than the shape. It quantises to whole cells, so a reader can see a trend and cannot read a number — put the number in an LcdChip or a StatTile beside it.",
    "Never omit `label`. Without it the matrix is an unnamed image, and the entire series is invisible to anyone not looking at the screen.",
    "Do not let the scale float when new samples arrive. Without `max`, the ceiling is the largest value present, so the whole chart rescales the moment a peak lands and the history appears to shrink — pass a fixed max for anything live.",
    "Do not reach for this when you need axes, hit-testing or tooltips. It is a device readout; a real chart is a different job and a different library.",
    "Do not animate the cells between values. A screen readout does not ease smoothly — it steps, which is why the quantisation lives in the data rather than in the CSS.",
  ],
} as const;
