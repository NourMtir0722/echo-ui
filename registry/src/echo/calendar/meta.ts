import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const calendarProps = z.object({
  ...interopProps,
  value: z.string().optional().describe('Controlled chosen date, an ISO date ("2026-09-28"), or "" for none.'),
  defaultValue: z.string().optional().describe("Uncontrolled initial date, as ISO."),
  onValueChange: z.function().optional().describe("Fired with the ISO date a person chooses."),
  min: z.string().optional().describe("The earliest date that can be chosen, as ISO. The previous-month key stops at its month."),
  max: z.string().optional().describe("The latest date that can be chosen, as ISO. The next-month key stops at its month."),
  unavailable: z.function().optional().describe("Asked with each ISO date: true for one that can't be chosen (a weekend, a booked day). It's struck through, and can still be reached by the keys."),
  locale: z.string().optional().describe("Whose month and weekday names, and which day starts the week, as a BCP 47 tag. Default: the browser's."),
  firstDayOfWeek: z.number().optional().describe("The week's first day, 0 for Sunday to 6 for Saturday. Default: the locale's."),
  defaultMonth: z.string().optional().describe("The month shown first, as any ISO date in it. Default: the chosen date's month, or this month."),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Each day's size on the control scale: sm 32px, md 44px (a finger's width), lg 60px. In a column too narrow for seven, the days shrink to fit it, and the weekdays go down to one letter; with bigger text, the days grow with it. Defaults to the nearest SizeProvider's size."),
  autoFocus: z.boolean().optional().describe("Put focus on the chosen day, or today, when it mounts: for a calendar that opens in a popup."),
  name: z.string().optional().describe("Puts the chosen ISO date in a form under this name."),
  disabled: z.boolean().optional().describe("Faded, and no day can be reached or chosen."),
  readOnly: z.boolean().optional().describe("The days can be looked through but not chosen."),
  "aria-label": z.string().optional().describe('What the calendar is for, when the month\'s name alone doesn\'t say ("Check-in").'),
  className: z.string().optional(),
});

export const meta = {
  name: "echo-calendar",
  title: "Calendar",
  description:
    "A month on a device screen. The days are its lit segments: the chosen day lit with the one lit accent, today on a lit rail, a day that can't be chosen struck through. Two keys page the months, and the month slides the way it went.",
  props: calendarProps,
  examples: [
    {
      title: "Choose a day",
      description: "One Tab stop; the arrows move the day, Enter chooses it.",
      code: "<Calendar value={day} onValueChange={setDay} />",
    },
    {
      title: "Limits and booked days",
      description: "The month keys stop at the limits, and a booked day is struck through.",
      code: '<Calendar\n  aria-label="Check-in"\n  min="2026-10-01"\n  max="2026-12-31"\n  unavailable={(iso) => booked.includes(iso)}\n  onValueChange={setCheckIn}\n/>',
    },
    {
      title: "Compact, Monday first",
      description: "The small size for a dense screen, with the week starting on Monday whatever the locale.",
      code: "<Calendar size=\"sm\" firstDayOfWeek={1} defaultValue=\"2026-09-28\" />",
    },
  ],
  feel: "A small screen that lights the day you choose. The month slides along as you page it, and every choice clicks.",
  usage: {
    imports: 'import { Calendar } from "@/echo/calendar";',
    code: "<Calendar value={day} onValueChange={setDay} />",
  },
  composition: "Calendar → a screen well → the month's name between two HardwareButton keys → a grid of days",
  a11y: [
    "A grid named by its month, with one Tab stop: the chosen day, or today. The month's name is said when it changes.",
    "←/→ move a day and ↑/↓ a week; Home and End go to the week's ends; Page Up and Page Down go a month, and with Shift a year. Moving past the month pages with you. Enter or Space chooses.",
    "Each day is named in full (\"Monday, September 28, 2026\"), the chosen one is selected, and today is the current date.",
    "A day that can't be chosen is struck through, not only dimmed, and says it's unavailable; the keys still reach it, so none is skipped.",
    "Right to left, ←/→ follow the reading direction and the month keys point the way the page reads.",
    "When the month keys stop at a limit, focus moves to the month's day rather than being lost.",
    "`required` and `readOnly` are said on the grid; `disabled` takes every day out of reach.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The next month appears in place instead of sliding in.",
  },
  sound: ["The select click when a day is chosen, and the month keys' own press, inside a SoundProvider."],
  antiPatterns: [
    "Don't use it where a date is typed faster than found (a birthday): use DateField, or DatePicker for both.",
    "Don't show two lit days for a range: a date range picker is coming soon.",
  ],
} as const;
