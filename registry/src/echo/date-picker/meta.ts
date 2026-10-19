import { z } from "zod";
import { dateFieldProps } from "../date-field/meta";

export const datePickerProps = dateFieldProps.omit({ end: true }).extend({
  firstDayOfWeek: z.number().optional().describe("The week's first day on the calendar, 0 for Sunday to 6 for Saturday. Default: the locale's."),
  calendarLabel: z.string().optional().describe('The calendar key\'s name, and the popup\'s. Default "Choose from a calendar".'),
});

export const meta = {
  name: "echo-date-picker",
  title: "DatePicker",
  description:
    "A DateField with a calendar key in its well. Type the date, or open a Calendar under the field and choose it; the flaps turn over to the day you chose. The value is an ISO date.",
  props: datePickerProps,
  examples: [
    {
      title: "A date, typed or chosen",
      description: "The key opens the calendar; choosing a day closes it.",
      code: '<DatePicker label="Due" value={due} onValueChange={setDue} />',
    },
    {
      title: "With limits",
      description: "The field says a date outside them in words, and the calendar won't page past them.",
      code: '<DatePicker\n  label="Check-in"\n  min="2026-10-01"\n  max="2026-12-31"\n  unavailable={(iso) => booked.includes(iso)}\n  value={checkIn}\n  onValueChange={setCheckIn}\n/>',
    },
  ],
  feel: "The field you dial a date into, with a small screen that folds out under it when you'd rather look.",
  usage: {
    imports: 'import { DatePicker } from "@/echo/date-picker";',
    code: '<DatePicker label="Date" value={date} onValueChange={setDate} />',
  },
  composition: "DatePicker → DateField (the wheels) + a HardwareButton key in its well → Popover → Calendar",
  a11y: [
    "The field is DateField, with its wheels and keys; the calendar is Calendar, with its grid and keys.",
    "The calendar key is a named button (`calendarLabel`), and Alt+↓ on a wheel opens the calendar too.",
    "The calendar opens with focus on the chosen day, or today. Enter chooses and closes it; Escape closes it without choosing. Focus goes back to the key.",
    "The popup is named by `calendarLabel`, so a screen reader says what opened.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "The popup fades instead of growing, the month doesn't slide, and the flaps don't turn.",
  },
  sound: ["The popup's select click as it opens, the calendar's as a day is chosen, and the flaps' tick as they turn, inside a SoundProvider."],
  antiPatterns: [
    "Don't use it for a date that's always typed (a birthday nobody finds on a grid): DateField alone is quicker.",
    "Don't use two for a range: a date range picker is coming soon.",
  ],
} as const;
