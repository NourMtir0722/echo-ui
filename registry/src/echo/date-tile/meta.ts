import { z } from "zod";

export const dateTileProps = z.object({
  date: z.string().describe('The day, as an ISO date: "2026-09-25".'),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("sm for a list row, md for a card, lg as a widget."),
  roll: z.boolean().default(false).describe("A new date turns over to its day instead of swapping it."),
  locale: z.string().default("en").describe("The language the weekday and month are engraved in."),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("The tile's screen: emissive (dark, glowing) or reflective (paper-coloured, printed in ink)."),
});

export const meta = {
  name: "echo-date-tile",
  title: "DateTile",
  description:
    "The page of a desk calendar: the weekday and month engraved small on a raised tile, the day huge on the screen set into it. Change the date and the day turns over to the new one. sm sits in a list row (an event, a booking, an invoice due), md on a card, lg on its own. One date for assistive tech, said in full.",
  props: dateTileProps,
  examples: [
    { title: "On a card", description: "The day at a glance.", code: '<DateTile date="2026-09-25" />' },
    {
      title: "In a list row",
      description: "Small, as an Item's media.",
      code: '<Item title="Design review" description="14:00, Room 3" media={<DateTile date="2026-09-29" size="sm" />} />',
    },
    { title: "Turning over", description: "A new date rolls to its day.", code: "<DateTile date={day} size=\"lg\" roll />" },
  ],
  feel: "A tear-off desk calendar: the day is the big thing, and it turns over when the page does.",
  usage: {
    imports: 'import { DateTile } from "@/echo/date-tile";',
    code: '<DateTile date="2026-09-25" />',
  },
  composition: "DateTile\n  the weekday and month, engraved\n  SegmentDisplay (the day)",
  a11y: [
    "A `time` element with the ISO date as `dateTime`, read as one full date (\"Friday, September 25, 2026\").",
    "The engraved weekday and month and the lit day are drawing, hidden from assistive technology.",
    "Worked in UTC from the ISO date, so the day is the same on the server and in every browser, whatever their time zones.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "With roll, the new day appears at once.",
  },
  antiPatterns: [
    "Never pass a Date built from the local clock: pass the ISO date you mean, or the day can differ between the server and the browser.",
    "Never use a DateTile for a date and time; it's a day. Put the time beside it.",
  ],
} as const;
