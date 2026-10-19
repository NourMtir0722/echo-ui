import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const comboboxProps = z.object({
  ...textInteropProps,
  label: z.string().describe("The visible label and the input's accessible name."),
  options: z.array(z.object({ value: z.string(), label: z.string() })).describe("What can be chosen."),
  multiple: z.boolean().default(false).describe("Several at once, each kept as a tag in the well."),
  value: z.union([z.string(), z.array(z.string()), z.null()]).optional().describe("Chosen value (single) or values (multiple), controlled."),
  defaultValue: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  onValueChange: z.function().optional().describe("Called with the value (or null when cleared), or the values when multiple."),
  creatable: z.boolean().default(false).describe("Offer to add what was typed when nothing matches; it's chosen at once."),
  onCreate: z.function().optional().describe("Hears the label of an option made with creatable."),
  placeholder: z.string().optional(),
  emptyText: z.unknown().optional().describe('What the list says when nothing matches. Default "No matches".'),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Height on the control scale. Defaults to the nearest SizeProvider's size."),
  container: z.unknown().optional().describe("Where the list mounts; defaults to <body>."),
});

export const meta = {
  name: "echo-combobox",
  title: "Combobox",
  description:
    "A Select you can type into, for a list long enough to search: people, countries, labels. Field's well holds the text; the list drops in Select's plastic with the same flowing highlight. multiple keeps each choice as a tag that buds into the well; creatable offers to add what was typed. Built on Base UI Combobox, which owns filtering, the listbox and every announcement.",
  props: comboboxProps,
  examples: [
    {
      title: "Pick one",
      description: "Type to narrow a long list.",
      code: '<Combobox label="Country" options={countries} placeholder="Start typing" />',
    },
    {
      title: "Several, as tags",
      description: "Backspace or a tag's × takes one out.",
      code: '<Combobox label="Assignees" options={people} multiple defaultValue={["ada"]} />',
    },
    {
      title: "Labels you can add to",
      description: "Nothing matches? Create it.",
      code: '<Combobox label="Labels" options={labels} multiple creatable onCreate={(label: string) => save(label)} />',
    },
  ],
  feel: "Field's well that answers as you type; each thing you choose buds out of the text line as a tag.",
  usage: {
    imports: 'import { Combobox } from "@/echo/combobox";',
    code: '<Combobox label="Country" options={countries} />',
  },
  composition: "Combobox → a label, Field's well (input, tags, chevron cap) and Select's popup (Base UI Combobox)",
  a11y: [
    "The input is a combobox named by its visible label; the list is a listbox, and the active option follows the arrow keys.",
    "Enter chooses, Escape closes; typing filters and the number of matches is announced.",
    "Chosen tags are named, told \"Press Backspace or Delete to remove\", and reachable with Left Arrow from the start of the input; each × is a named button.",
    "The chevron is a named button that opens the list without typing.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-ease-pop"],
    reducedMotion: "Tags appear without budding; the list opens without unrolling.",
  },
  sound: ["`select` when a value is chosen, inside a SoundProvider."],
  antiPatterns: [
    "Never use a Combobox for a handful of options: that's Select, or Segmented for two to four.",
    "Never use it for free text: that's Field, or TagsInput for free-form tags.",
  ],
} as const;
