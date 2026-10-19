import { z } from "zod";

export const progressProps = z.object({
  value: z.number().min(0).max(1).default(0.5).describe("Fraction filled, 0..1."),
  cells: z.number().int().positive().default(14).describe("Number of LED cells."),
  "aria-label": z.string().optional().describe("What is filling up (\"Upload\", \"Battery\"). This or aria-labelledby is required: leaving both out is a type error."),
  "aria-labelledby": z.string().optional().describe("Id of a visible label, instead of aria-label."),
});

export const meta = {
  name: "echo-progress",
  title: "Progress",
  description:
    "A discrete LED cell meter in a recessed strip — filled cells are lit accent LEDs with a bloom. Steppy by construction; consumes var(--echo-*).",
  props: progressProps,
  examples: [
    {
      title: "Upload meter",
      description: "Value is a 0..1 fraction.",
      code: '<Progress value={0.65} aria-label="Upload progress" />',
    },
  ],
  feel: "A segmented meter that fills cell by cell, like an LED bar graph.",
  usage: {
    imports: "import { Progress } from \"@/echo/progress\";",
    code: "<Progress value={0.65} aria-label=\"Upload progress\" />",
  },
  composition: "Progress",
  a11y: [
    "`role=\"progressbar\"` with `aria-valuenow` from 0 to 100; `value` is a fraction from 0 to 1.",
    "Name it with `aria-label` — the cells carry no text.",
    "It does not announce each change. For a long task, say when it finishes somewhere that does (a Toast or a live Banner).",
  ],
  antiPatterns: [
    "Never tween the fill smoothly — LEDs snap on cell by cell (steppy motion), they don't slide.",
    "Never use it as a slider; it is read-only output. For input, use Slider.",
  ],
} as const;
