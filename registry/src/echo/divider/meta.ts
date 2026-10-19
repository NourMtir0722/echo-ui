import { z } from "zod";

export const dividerProps = z.object({
  orientation: z
    .enum(["horizontal", "vertical"])
    .default("horizontal")
    .describe("Sets both the seam direction and aria-orientation."),
});

export const meta = {
  name: "echo-divider",
  title: "Divider",
  description: "A panel seam — a hairline with a faint light lip. Horizontal or vertical; role=separator.",
  props: dividerProps,
  examples: [
    { title: "Horizontal", description: "Between stacked sections.", code: "<Divider />" },
    { title: "Vertical", description: "Between inline items (needs a flex parent).", code: '<Divider orientation="vertical" />' },
  ],
  feel: "The one seam in the library: a dark groove with a faint lit lip.",
  usage: {
    imports: "import { Divider } from \"@/echo/divider\";",
    code: "<Divider />",
  },
  composition: "Divider",
  a11y: [
    "`role=\"separator\"` with `aria-orientation`, so it marks a real boundary between groups.",
    "For a purely visual rule inside one group, use CSS instead — a separator a screen reader announces should separate something.",
  ],
  antiPatterns: ["Vertical dividers need a parent with a defined height (e.g. a flex row) or they collapse."],
} as const;
