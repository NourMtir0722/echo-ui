import { z } from "zod";

export const tagProps = z.object({
  children: z.string().describe("The label text."),
  onRemove: z.function().optional().describe("Render a remove control. Omit for a static tag."),
  removeLabel: z
    .string()
    .optional()
    .describe("Accessible name for the remove control. Defaults to \"Remove\" plus the tag's text (\"Remove Loop\"); pass one when the content isn't text."),
});

export const meta = {
  name: "echo-tag",
  title: "Tag",
  description:
    "A label the user applied — a category, a person, a filter — optionally removable. Distinct from Badge, which reports state the system knows. The material says which is which: a Badge is printed onto the chassis, a Tag is a small plate that can be peeled off.",
  props: tagProps,
  examples: [
    { title: "Static", description: "A plain applied label.", code: "<Tag>Ambient</Tag>" },
    {
      title: "Removable",
      description: "Name the control per tag so a row of them is navigable.",
      code: '<Tag onRemove={() => drop("Ambient")}>Ambient</Tag>',
    },
  ],
  feel: "A small applied label; the removable kind has its own tiny key.",
  usage: {
    imports: "import { Tag } from \"@/echo/tag\";",
    code: [
      "<Tag onRemove={() => drop(\"Ambient\")}>",
      "  Ambient",
      "</Tag>",
    ].join("\n"),
  },
  composition: "Tag",
  a11y: [
    "With `onRemove`, the × is a real button named after the tag (“Remove Ambient”), so a row of tags doesn't read as a row of identical “Remove” buttons. Pass `removeLabel` when the tag's content isn't text.",
    "After a removal, move focus somewhere sensible — the next tag, or the input that adds tags.",
    "Keyboard: Tab reaches the ×; Enter or Space removes the tag.",
  ],
  motion: {
    tokens: ["--echo-duration-tick"],
    reducedMotion: "The remove key no longer moves when pressed.",
  },
  antiPatterns: [
    "Never use a Tag for system state — status, counts, and severity are Badge. A tag that the user cannot have applied is a badge wearing the wrong material.",
    'Never give a tag with non-text content (an icon, an avatar) a remove control without `removeLabel`. It falls back to "Remove", and five of those are indistinguishable in a screen reader\'s element list.',
    "Never make the whole tag clickable for removal — a body that deletes on click has no safe place to press, and the tag stops being selectable text.",
  ],
} as const;
