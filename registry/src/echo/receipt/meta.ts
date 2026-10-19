import { z } from "zod";

const line = z.object({ label: z.unknown(), value: z.unknown() });

export const receiptProps = z.object({
  title: z.string().describe("Printed at the top, and the receipt's heading."),
  meta: z.string().optional().describe("A line under the title: a number, a date, a place."),
  lines: z.array(line).describe("What it lists, each with its value across a dotted leader."),
  total: line.optional().describe("The bottom line, printed bold under a rule."),
  footer: z.string().optional().describe("Printed at the very bottom: how it was paid, a thank-you, what to do next."),
  code: z.string().optional().describe("A reference printed as a barcode, with the code in text beneath it."),
  onTear: z.function().optional().describe("Shows a Tear off key; called once the paper has dropped away."),
  printKey: z.union([z.string(), z.number()]).optional().describe("Print it again whenever this changes. Mid-print, it starts over."),
  headingLevel: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3).describe("The heading's level."),
});

export const meta = {
  name: "echo-receipt",
  title: "Receipt",
  description:
    "The device prints: a summary feeds out of a slot in the chassis a line at a time, each with a small tick, in dark ink on the paper colour, and waits to be torn off. For order confirmations, payments, invoices, weekly recaps and the summary of what an automated run did. It prints when it arrives after the page has loaded; one that's there from the start is simply there.",
  props: receiptProps,
  examples: [
    {
      title: "Order confirmed",
      description: "Lines, a total, the order number as a barcode.",
      code: '<Receipt\n  title="North Street Coffee"\n  meta="Order 4821, 25 Sep 2026, 14:32"\n  lines={[\n    { label: "2 × Oat flat white", value: "9.00" },\n    { label: "1 × Almond croissant", value: "4.50" },\n  ]}\n  total={{ label: "Total", value: "$13.50" }}\n  code="4821"\n  footer="Paid by card ••4417. Thank you"\n/>',
    },
    {
      title: "What a run did",
      description: "The same paper for an automated job's summary.",
      code: '<Receipt\n  title="Run 12, done"\n  meta="3 min 41 s"\n  lines={[\n    { label: "Files changed", value: "4" },\n    { label: "Tests", value: "212 passed" },\n  ]}\n  footer="Nothing was published"\n/>',
    },
    {
      title: "Torn off",
      description: "A Tear off key; your handler runs once the paper has dropped.",
      code: '<Receipt title="Order 4821" lines={items} onTear={() => setShowing(false)} />',
    },
  ],
  feel: "A till's printer: the paper steps out of the slot with a soft tick per line, and tears away when you're done with it.",
  usage: {
    imports: 'import { Receipt } from "@/echo/receipt";',
    code: '<Receipt title="Order 4821" lines={[{ label: "Flat white", value: "4.50" }]} total={{ label: "Total", value: "$4.50" }} />',
  },
  composition: "Receipt\n  the slot\n  the paper: the heading, the lines (a description list), the total, a barcode, the footer\n  HardwareButton (Tear off)",
  a11y: [
    "A `section` named by its heading; the lines are a description list, each label with its value, and the total is the list's last pair.",
    "Everything printed is in the page from the start: the feed is drawing, so a screen reader never waits for it.",
    "The barcode is a picture and is hidden; the code is printed beneath it as text.",
    "The ink is held to AA contrast on the paper under every theme.",
    "Tearing it off is a button, and `onTear` runs once the paper has gone.",
    "Keyboard: Tab reaches the tear button; Enter or Space tears the paper off.",
  ],
  motion: {
    tokens: ["flood", "pop"],
    reducedMotion: "It's there at once; tearing it off fades it where it is.",
  },
  sound: ["A soft tick for each line that leaves the slot, and a tap as it's torn, inside a SoundProvider."],
  antiPatterns: [
    "Never make a Receipt the only record of something: it's a confirmation, and the order or the run belongs somewhere people can find again.",
    "Never print a receipt for a form that hasn't gone through: it means it's done.",
    "Never put controls on the paper: it's printed; the only thing you do with it is tear it off.",
  ],
} as const;
