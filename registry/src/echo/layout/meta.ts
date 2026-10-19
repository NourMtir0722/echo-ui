import { z } from "zod";

const step = z.number().int().min(0).max(12);

export const layoutProps = z.object({
  direction: z.enum(["column", "row"]).default("column").describe("Stack: a column or a row."),
  gap: step.optional().describe("Space between items, a step on the space scale (6 is 12px, 8 is 16px). Stack defaults to 6, Grid to 8."),
  align: z.enum(["start", "center", "end", "stretch", "baseline"]).optional().describe("Cross-axis alignment. Stack: stretch for a column, center for a row."),
  justify: z.enum(["start", "center", "end", "between"]).default("start").describe("Stack: main-axis distribution."),
  wrap: z.boolean().default(true).describe("Stack: a row wraps when it runs out of room."),
  minItemWidth: z.string().optional().describe('Grid: the narrowest a column may be ("16rem"); as many columns as fit, never wider than the screen. Fewer items than fit share the row: two cards never sit in three columns.'),
  columns: z.number().optional().describe("Grid: a fixed number of equal columns."),
  as: z.enum(["div", "section", "ul", "ol", "nav", "header", "footer"]).default("div").describe("The element; a ul or ol drops its bullets."),
  "aria-label": z.string().optional().describe("A name, when `as` gives it a role worth naming (a nav, a section)."),
  "aria-labelledby": z.string().optional(),
});

export const meta = {
  name: "echo-layout",
  title: "Stack & Grid",
  description:
    "The two layouts a screen is made of, with gaps on the space scale: Stack is a column or a wrapping row, Grid is as many columns as fit (minItemWidth) or a fixed number. Closed: a gap is a step, not a length, so two cards laid out by two people are spaced the same way.",
  props: layoutProps,
  examples: [
    {
      title: "A form column",
      description: "Fields spaced by one step.",
      code: '<Stack gap={8}>\n  <Field label="Name" />\n  <Field label="Email" />\n</Stack>',
    },
    {
      title: "A row of actions",
      description: "Wraps on a narrow screen instead of pushing it sideways.",
      code: '<Stack direction="row" gap={4} justify="end">\n  <HardwareButton>Cancel</HardwareButton>\n  <HardwareButton variant="primary">Save</HardwareButton>\n</Stack>',
    },
    {
      title: "A card grid",
      description: "As many columns as fit, one on a phone.",
      code: '<Grid minItemWidth="16rem" as="ul">{cards}</Grid>',
    },
  ],
  feel: "Nothing of its own: the rhythm between things, the same everywhere.",
  usage: {
    imports: 'import { Stack, Grid } from "@/echo/layout";',
    code: '<Stack gap={6}>{children}</Stack>',
  },
  composition: "Stack → flex; Grid → grid",
  a11y: [
    "No role of its own; `as` gives it one when the grouping means something (a `ul` of cards, a `nav`).",
    "Order on screen is the order in the source, so reading and tab order follow what's seen.",
  ],
  antiPatterns: [
    "Never use a Grid for a table of data: that's a Table, which a screen reader can navigate by row and column.",
    "Never reverse visual order with layout: tab order would stop matching what's seen.",
  ],
} as const;
