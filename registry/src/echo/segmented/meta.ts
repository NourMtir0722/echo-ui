import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const segmentedProps = z.object({
  ...interopProps,
  options: z
    .array(z.union([z.string(), z.object({ label: z.string(), content: z.unknown().optional(), disabled: z.boolean().optional() })]))
    .describe("Segment labels, in order. Short — a segment is a cap, not a sentence. Pass `{ label, disabled: true }` to switch one segment off, or `{ label, content }` to show more than a word (a day and its date) while `label` stays its name."),
  value: z.number().optional().describe("Selected INDEX (controlled), not the label."),
  defaultValue: z.number().default(0).describe("Selected index for the uncontrolled case."),
  onValueChange: z.function().optional().describe("Fired with the newly selected index."),
  disabled: z.boolean().optional().describe("Disables every segment. For one, see `options`."),
  "aria-label": z.string().optional().describe("Names the radiogroup. This or aria-labelledby is required: leaving both out is a type error."),
  "aria-labelledby": z.string().optional().describe("Id of the visible label, when there is one."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a HardwareButton or Field of that size, so they line up in a row. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-segmented",
  title: "Segmented",
  description:
    "A hardware segmented selector — molded uppercase segments in a recessed well, the active one on the lit primary cap. A radiogroup value selector (roving focus, arrow-key select, select sound), distinct from Tabs which switches content panels. Composes var(--echo-*).",
  props: segmentedProps,
  examples: [
    {
      title: "One segment off",
      description: "A disabled segment is skipped by the arrow keys.",
      code: '<Segmented aria-label="Output" options={["Line", { label: "Optical", disabled: true }, "Phones"]} />',
    },
    { title: "Basic", description: "Uncontrolled, first option selected.", code: '<Segmented aria-label="Mode" options={["Focus", "Break", "Rest"]} />' },
    { title: "Controlled", description: "Drive the index from state.", code: "<Segmented aria-label=\"Mode\" options={modes} value={i} onValueChange={setI} />" },
    {
      title: "More than a word in a segment",
      description: "`content` shows a day and its date; `label` stays the segment's name, which is what a screen reader says.",
      code: '<Segmented\n  aria-label="Day"\n  options={days.map((d: { name: string; short: string; date: number }) => ({ label: d.name, content: <><span>{d.short}</span> <span>{d.date}</span></> }))}\n/>',
    },
  ],
  feel: "A row of molded keys where exactly one stays pressed in.",
  usage: {
    imports: "import { Segmented } from \"@/echo/segmented\";",
    code: "<Segmented aria-label=\"Mode\" options={[\"Focus\", \"Break\", \"Rest\"]} />",
  },
  composition: "Segmented",
  a11y: [
    "A `radiogroup` of `radio` options with `aria-checked`.",
    "Arrow keys move the selection and follow the reading direction (right-to-left needs Base UI's `DirectionProvider`); Home and End jump to the first and last enabled segment. Disabled segments are skipped.",
    "Built on Base UI's RadioGroup: with no segment selected (or `value` out of range), the first enabled one still takes the tab stop.",
    "Name the group with `aria-label` or `aria-labelledby` — the segments' own labels do not say what they choose between.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The pressed segment changes without a transition.",
  },
  sound: [
    "`select` when the choice changes.",
  ],
  antiPatterns: [
    "Give the group an accessible name (aria-label / aria-labelledby) — the segments carry no group text.",
    "Use Tabs, not Segmented, when each choice reveals a different panel of content.",
  ],
} as const;
