import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const weekStripProps = z.object({
  ...interopProps,
  label: z.string().describe('What the day is for: the group\'s accessible name ("Delivery day").'),
  value: z.string().optional().describe("The chosen day, as an ISO date (controlled)."),
  defaultValue: z.string().optional().describe("The day chosen to begin with. Default: today."),
  onValueChange: z.function().optional().describe("Called with the ISO date of the day chosen."),
  today: z.string().optional().describe("Today, which carries the lit rail."),
  marked: z.array(z.string()).optional().describe("Days with something on them: each gets a pip."),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1).describe("The first day of the week: 1 Monday, 0 Sunday."),
  locale: z.string().default("en").describe("The language days are named in."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-week-strip",
  title: "WeekStrip",
  description:
    "A week you tap through, the way the top of a phone's calendar works: seven days in a Segmented, each with its weekday and date, the chosen one lit, the light travelling there as a drop. Today carries a lit rail; a day with something on it has a pip. The keys at either end go a week back or forward, keeping the weekday.",
  props: weekStripProps,
  examples: [
    {
      title: "Pick a day",
      description: "Today lit by its rail, days with bookings marked.",
      code: '<WeekStrip label="Day" today="2026-09-25" marked={["2026-09-22", "2026-09-26"]} />',
    },
    {
      title: "Controlled",
      description: "The chosen day in your state; the arrows move a week at a time.",
      code: '<WeekStrip label="Delivery day" value={day} onValueChange={setDay} today={today} />',
    },
  ],
  feel: "The top of a calendar app: tap a day and the light rolls over to it.",
  usage: {
    imports: 'import { WeekStrip } from "@/echo/week-strip";',
    code: '<WeekStrip label="Day" today="2026-09-25" />',
  },
  composition: "WeekStrip\n  HardwareButton (week before)\n  Segmented (the seven days)\n  HardwareButton (week after)",
  a11y: [
    "A group named by `label`, holding a radio group of days; each day is named with its full date, and says \"today\" and \"has events\" when it is and has.",
    "Arrow keys move between days, Home and End go to the first and last; the week keys are named with the week they go to.",
    "Worked in UTC from ISO dates, so the days are the same on the server and in every browser.",
    "`name` submits the chosen day with a form.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The light moves straight to the chosen day, as Segmented's does.",
  },
  sound: ["The select click as a day is chosen, and each week key's press, inside a SoundProvider."],
  antiPatterns: [
    "Never use a WeekStrip to pick a date far away: it moves a week at a time; for any date, use a date field.",
    "Never leave out today when there is one: without the rail, the strip doesn't say where now is.",
  ],
} as const;
