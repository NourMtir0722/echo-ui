import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const checkboxGroupProps = z.object({
  ...interopProps,
  label: z.string().describe("The group's name, shown above it."),
  options: z
    .array(z.object({ value: z.string(), label: z.string(), description: z.unknown().optional(), disabled: z.boolean().optional() }))
    .describe("One checkbox each: its words, and a line under them."),
  value: z.array(z.string()).optional(),
  defaultValue: z.array(z.string()).optional(),
  onValueChange: z.function().optional(),
  parent: z.string().optional().describe("A checkbox above the rest that checks or clears them all, and shows a dash when only some are on."),
  name: z.string().optional().describe("Posted with a form, one value per checked box."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-checkbox-group",
  title: "CheckboxGroup",
  description:
    "A named set of checkboxes sharing one value, the list of what's checked. Each option is a row, the checkbox and its words, the whole row a target. parent adds a checkbox that checks or clears them all and shows a dash when only some are on. Built on Base UI CheckboxGroup with Echo's Checkbox.",
  props: checkboxGroupProps,
  examples: [
    {
      title: "Notifications",
      description: "With a parent that sets them all.",
      code: '<CheckboxGroup\n  label="Email me about"\n  parent="Everything"\n  options={[\n    { value: "mentions", label: "Mentions" },\n    { value: "replies", label: "Replies" },\n    { value: "digest", label: "Weekly digest", description: "Mondays, 9am" },\n  ]}\n  defaultValue={["mentions"]}\n/>',
    },
  ],
  feel: "A column of small keys that latch with a drawn tick, each with its words beside it.",
  usage: {
    imports: 'import { CheckboxGroup } from "@/echo/checkbox-group";',
    code: '<CheckboxGroup label="Show" options={options} />',
  },
  composition: "CheckboxGroup → a named group of Checkbox rows (Base UI CheckboxGroup)",
  a11y: [
    "A group named by its visible label; each checkbox is named by its row's words.",
    "The whole row toggles its box; Space toggles a focused box.",
    "The parent checkbox is `mixed` (a dash) while only some are checked.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The tick appears without being drawn.",
  },
  sound: ["Each checkbox's `select`, inside a SoundProvider."],
  antiPatterns: [
    "Never use a CheckboxGroup where only one can be chosen: that's RadioGroup.",
    "Never leave a parent without saying what it covers (\"Everything\", \"All channels\").",
  ],
} as const;
