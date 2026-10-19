import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const dateFieldProps = z.object({
  ...interopProps,
  label: z.string().optional().describe("Visible eyebrow label; also the name every wheel says before its own. A date field needs label, aria-label or aria-labelledby: leaving all three out is a type error."),
  value: z.string().optional().describe('Controlled value, an ISO date ("2026-09-28"), or "" for none.'),
  defaultValue: z.string().optional().describe("Uncontrolled initial value, an ISO date."),
  onValueChange: z.function().optional().describe('Fired with the ISO date once the wheels make a real one, and with "" when they stop making one.'),
  min: z.string().optional().describe("The earliest date, as ISO. The year wheel starts at its year; an earlier date is said to be, in words, under the field."),
  max: z.string().optional().describe("The latest date, as ISO. The year wheel ends at its year."),
  unavailable: z.function().optional().describe("Asked with each ISO date: true for one that can't be chosen (a weekend, a booked day). The field says so under it."),
  locale: z.string().optional().describe('Whose order and names, as a BCP 47 tag ("en-GB", "de"). Default: the browser\'s. Pass it from the request on a server-rendered page, so the first paint is already in the right order.'),
  size: z
    .enum(["sm", "md", "lg"])
    .default("md")
    .describe("Height on the control scale: sm 32px, md 44px, lg 60px, the same as a Field beside it. Defaults to the nearest SizeProvider's size."),
  end: z.unknown().optional().describe('In the well after the date: a small control, as a size="sm" iconOnly HardwareButton with its own name. DatePicker puts its calendar key here.'),
  description: z.unknown().optional().describe("Help text under the field, linked to it so a screen reader reads it after the name."),
  error: z.string().optional().describe("What's wrong, in words. While set, the field is invalid, and it wins over the field's own min, max and unavailable messages."),
  "aria-label": z.string().optional().describe("Used only when `label` is omitted; a visible label wins."),
  "aria-labelledby": z.string().optional().describe("Used only when `label` is omitted."),
  "aria-describedby": z.string().optional().describe("Ids of other text that describes the field, read after its own description and error."),
});

export const meta = {
  name: "echo-date-field",
  title: "DateField",
  description:
    "A date typed into wheels, day, month and year in the order the locale writes them, each a row of small flaps that turn over to the value. Field's recessed well and lit edge, on the same size scale. The value is an ISO date, so no time zone can move a day.",
  props: dateFieldProps,
  examples: [
    {
      title: "A date",
      description: "Tab lands on the first wheel; type the digits and it moves on by itself.",
      code: '<DateField label="Date of birth" name="birthday" />',
    },
    {
      title: "Controlled, with limits",
      description: "A date outside the limits is said in words under the field.",
      code: '<DateField\n  label="Start date"\n  value={start}\n  onValueChange={setStart}\n  min="2026-01-01"\n  max="2026-12-31"\n  description="Any day this year."\n/>',
    },
    {
      title: "In a locale",
      description: "The wheels follow the locale's order and its letters: TT.MM.JJJJ in German.",
      code: '<DateField label="Datum" locale="de" defaultValue="2026-09-28" />',
    },
  ],
  feel: "A date you dial in. Each digit you type turns a flap over with a dry tick, and the wheel hands you on to the next as soon as it's full. The wheel with focus is lit from under.",
  usage: {
    imports: 'import { DateField } from "@/echo/date-field";',
    code: '<DateField label="Date" value={date} onValueChange={setDate} />',
  },
  composition: "DateField → Field's frame (label, well, help, error) → a wheel per part (day, month, year) → flaps",
  a11y: [
    "The field is a group named by its label; each wheel is a spin button that says the field's name before its own (\"Date of birth, Day\"), so Tab can land on any of them.",
    "Type digits and a wheel moves on once no other digit could follow; ↑/↓ step it, Page Up and Page Down jump a week, a quarter or a decade, Home and End go to its ends, Backspace clears it.",
    "←/→, or a separator key (/ . - or a space), move between wheels; right-to-left, the arrows follow the reading direction.",
    "An empty wheel reads \"Empty\", and a month reads its name with its number (\"9, September\").",
    "On a phone each wheel opens the numeric keyboard, and a pasted ISO date fills every wheel.",
    "`description` and `error` are linked with `aria-describedby`; an error sets `aria-invalid` on every wheel, and is words plus a square pip, never colour alone.",
  ],
  motion: {
    tokens: ["--echo-duration-swap"],
    reducedMotion: "Flaps take their new digit without turning, and a new error doesn't shake the field; the lit bar under the focused wheel still fades in.",
  },
  sound: ["SplitFlap's dry tick when flaps turn, once however many turn together, inside a SoundProvider."],
  antiPatterns: [
    "Don't use it for a date and a time: it has no time wheels. A time field is coming soon.",
    "Don't parse its value with the Date constructor: an ISO date there is midnight UTC, which is the day before anywhere west of Greenwich. Keep the ISO string, or read it with `fromISO` from this item.",
    "Don't spread react-hook-form's register() on it: there's no text input for it to read. Use a Controller, and pass `value`, `onValueChange`, `onBlur` and `ref`; the ref is the first wheel, so an error can focus it.",
    "Don't use three Selects for a date: they can't be typed into, and a screen reader hears three unrelated lists.",
  ],
} as const;
