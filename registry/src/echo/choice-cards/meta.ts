import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const choiceCardsProps = z.object({
  ...interopProps,
  label: z.string().describe("The group's name, shown above it."),
  options: z
    .array(z.object({ value: z.string(), title: z.string(), description: z.unknown().optional(), extra: z.unknown().optional(), disabled: z.boolean().optional() }))
    .describe("One card each: a title, a line, and anything else (a price, a preview)."),
  multiple: z.boolean().default(false).describe("Several at once (checkboxes). Default one (radios)."),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
  onValueChange: z.function().optional(),
  name: z.string().optional().describe("Posted with a form."),
  minCardWidth: z.string().default("14rem").describe("How narrow a card may get before they wrap. Fewer cards than fit share the row."),
});

export const meta = {
  name: "echo-choice-cards",
  title: "ChoiceCards",
  description:
    "Choosing between things that need more than a word (a plan, a template, an account): each option is a card and the whole card is the choice. The chosen one lights a rail along its edge and its pip; nothing else changes colour. One choice is a radio group; multiple is a group of checkboxes. Built on Base UI RadioGroup and CheckboxGroup.",
  props: choiceCardsProps,
  examples: [
    {
      title: "Plans",
      description: "One of three, with prices.",
      code: '<ChoiceCards\n  label="Plan"\n  defaultValue="team"\n  options={[\n    { value: "solo", title: "Solo", description: "One seat", extra: "$0" },\n    { value: "team", title: "Team", description: "Up to 10 seats", extra: "$12 / seat" },\n    { value: "studio", title: "Studio", description: "Unlimited seats", extra: "$240" },\n  ]}\n/>',
    },
  ],
  feel: "A row of slabs you pick up by touching; the chosen one has a light running down its edge.",
  usage: {
    imports: 'import { ChoiceCards } from "@/echo/choice-cards";',
    code: '<ChoiceCards label="Template" options={templates} />',
  },
  composition: "ChoiceCards → Panels as Base UI Radio (or Checkbox) items in a group",
  a11y: [
    "One choice is a radio group: one tab stop, arrow keys move and choose. `multiple` is a group of checkboxes, each its own tab stop.",
    "Each card is named by all its text, title first.",
    "Chosen is shown by the rail and the mark, not colour alone; in forced colors, by a heavy system-highlight border.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-ease-pop"],
    reducedMotion: "The pip appears without dropping in; the card doesn't sink.",
  },
  sound: ["`select` on a choice, inside a SoundProvider."],
  antiPatterns: [
    "Never put a link or button inside a choice card: the whole card is already the control.",
    "Never use ChoiceCards for short labels: that's RadioGroup or Segmented.",
  ],
} as const;
