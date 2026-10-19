import { z } from "zod";
import { textInteropProps } from "../../agent/interop";

export const tagsInputProps = z.object({
  ...textInteropProps,
  label: z.string().describe("The visible label and the input's accessible name."),
  value: z.array(z.string()).optional(),
  defaultValue: z.array(z.string()).default([]),
  onValueChange: z.function().optional(),
  normalize: z.function().optional().describe("Turn typed text into a tag, or reject it by returning null: trim, lower-case, validate an address."),
  max: z.number().optional().describe("The most tags it takes."),
  placeholder: z.string().optional(),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Height on the control scale."),
});

export const meta = {
  name: "echo-tags-input",
  title: "TagsInput",
  description:
    "Free-form tags typed into Field's well: addresses, keywords, labels. Enter or a comma turns the text into a tag that buds into the well; Backspace in an empty input takes the last back; a paste with commas becomes several. For a fixed list to choose from, use Combobox with multiple.",
  props: tagsInputProps,
  examples: [
    {
      title: "Invite by email",
      description: "normalize lower-cases and rejects what isn't an address.",
      code: '<TagsInput\n  label="Invite"\n  placeholder="name@example.com"\n  normalize={(t: string) => (/^\\S+@\\S+\\.\\S+$/.test(t.trim()) ? t.trim().toLowerCase() : null)}\n/>',
    },
    {
      title: "Keywords",
      description: "Posted with a form, one value per tag.",
      code: '<TagsInput label="Keywords" name="keywords" defaultValue={["analog", "tape"]} max={8} />',
    },
  ],
  feel: "You type and commit, and each word buds out of the line into its own tag.",
  usage: {
    imports: 'import { TagsInput } from "@/echo/tags-input";',
    code: '<TagsInput label="Keywords" />',
  },
  composition: "TagsInput → a label, Field's well with a list of Tags and an input",
  a11y: [
    "The input is named by the visible label and described by how to add and remove.",
    "The tags are a named list; each × is a button that says what it removes.",
    "Additions and removals are announced politely.",
    "With `name`, each tag is posted as its own form value.",
    "Keyboard: Enter or a comma adds what's typed as a tag; Backspace in the empty input takes the last tag back; Tab reaches each ×.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-ease-pop"],
    reducedMotion: "Tags appear without budding.",
  },
  sound: ["`tap` when a tag is added, inside a SoundProvider."],
  antiPatterns: [
    "Never use it when the values come from a known list: that's Combobox with multiple.",
    "Never accept anything without normalize when the tags must be valid (addresses, IDs).",
  ],
} as const;
