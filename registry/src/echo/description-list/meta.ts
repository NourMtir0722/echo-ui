import { z } from "zod";

export const descriptionListProps = z.object({
  items: z
    .array(z.object({ term: z.unknown(), detail: z.unknown(), icon: z.unknown().optional() }))
    .describe("Each thing and its value, with an optional glyph before the term."),
  variant: z.enum(["plain", "screen"]).default("plain").describe("plain on the page; screen on a dark screen, values in the readout face."),
  layout: z.enum(["stacked", "inline"]).default("stacked").describe("stacked puts each value under its term; inline sets them side by side."),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("With variant=\"screen\": emissive (dark, glowing) or reflective (paper-coloured glass, printed in ink)."),
});

export const meta = {
  name: "echo-description-list",
  title: "DescriptionList",
  description:
    "Things and their values: order details, account settings, a device's specs, a system's status at a glance. plain sets the terms as machine labels over their values, with the one separator between rows; screen puts the whole list on a dark screen with the values in the readout face, like the glance list on a phone's home screen.",
  props: descriptionListProps,
  examples: [
    {
      title: "Order details",
      description: "Terms over values, rows separated by the seam.",
      code: '<DescriptionList\n  items={[\n    { term: "Order", detail: "4821" },\n    { term: "Placed", detail: "25 September 2026" },\n    { term: "Ship to", detail: "12 North Street, Leeds" },\n  ]}\n/>',
    },
    {
      title: "At a glance",
      description: "On a screen, side by side: the status column of a home screen widget.",
      code: '<DescriptionList\n  variant="screen"\n  layout="inline"\n  items={[\n    { term: "Battery", detail: "89%" },\n    { term: "Sunrise", detail: "07:28" },\n    { term: "Steps", detail: "6,954" },\n  ]}\n/>',
    },
  ],
  feel: "A spec sheet stamped on the device, or its status screen.",
  usage: {
    imports: 'import { DescriptionList } from "@/echo/description-list";',
    code: '<DescriptionList items={[{ term: "Plan", detail: "Team" }]} />',
  },
  composition: "DescriptionList\n  a row per item: the term (with its glyph) and its detail",
  a11y: [
    "A real `dl`: each term and its value are read together, and a screen reader can list the terms.",
    "The glyph before a term is hidden; the term says what it is.",
    "On the screen the values keep the readout face's tabular digits, so a column of numbers doesn't shift.",
  ],
  antiPatterns: [
    "Never use a DescriptionList for a list of things that aren't pairs: that's a list of Items.",
    "Never put controls in the details: it's for reading; settings that change belong in a form.",
    "Never light the values: a screen full of lit numbers is noise; light the one that matters somewhere else.",
  ],
} as const;
