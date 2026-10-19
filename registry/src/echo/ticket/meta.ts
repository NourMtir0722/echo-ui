import { z } from "zod";

export const ticketProps = z.object({
  title: z.string().describe("What it's for, printed large, and the ticket's heading."),
  subtitle: z.string().optional().describe("Where, or who it's from."),
  details: z.array(z.object({ label: z.string(), value: z.unknown() })).optional().describe("The facts on the main part: a date, a door, a seat."),
  code: z.string().describe("The code on the stub, as a barcode and in text."),
  stubLabel: z.string().optional().describe('Printed on the stub over its code: "Admit one", "Boarding".'),
  used: z.boolean().optional().describe("Torn off (controlled)."),
  defaultUsed: z.boolean().default(false).describe("Whether the stub starts torn off (uncontrolled). See used."),
  onUse: z.function().optional().describe("Called once the stub has dropped away. With it, the ticket shows a key to use it."),
  useLabel: z.string().default("Use ticket").describe("The key's word."),
  headingLevel: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3).describe("The heading's level."),
});

export const meta = {
  name: "echo-ticket",
  title: "Ticket",
  description:
    "A paper pass: what it's for on the main part, the code on a stub across a perforation. Use it and the stub tears off along the perforation and drops away, leaving the torn edge and \"Used\". For event tickets, boarding passes, coupons, invites and gift cards. The same paper and ink as Receipt; on a narrow screen the stub goes under the main part.",
  props: ticketProps,
  examples: [
    {
      title: "An event",
      description: "The details, and a stub to tear at the door.",
      code: '<Ticket\n  title="Night Session"\n  subtitle="Warehouse 9, Leeds"\n  details={[\n    { label: "Date", value: "Sat 3 Oct" },\n    { label: "Doors", value: "19:30" },\n    { label: "Entry", value: "B" },\n  ]}\n  code="NS-3010-0412"\n  stubLabel="Admit one"\n  onUse={checkIn}\n/>',
    },
    {
      title: "Already used",
      description: "The stub's gone; the ticket says so.",
      code: '<Ticket title="Coffee on us" code="FREE-7731" defaultUsed />',
    },
  ],
  feel: "A cinema ticket: the stub tears off along its holes when you go in.",
  usage: {
    imports: 'import { Ticket } from "@/echo/ticket";',
    code: '<Ticket title="Night Session" code="NS-3010-0412" />',
  },
  composition: "Ticket\n  the main part: the heading, the subtitle, the details (a description list)\n  the perforation\n  the stub: its label, a barcode, the code\n  HardwareButton (use it, with onUse)",
  a11y: [
    "A `section` named by its heading; the details are a description list, each label read with its value.",
    "The barcode is a picture and is hidden; the code is printed beneath it as text.",
    "Using it is a button, and a used ticket says \"Used\" in text where the stub was.",
    "The ink is the same as Receipt's, held to AA contrast on the paper under every theme.",
    "Keyboard: Tab reaches the button that uses it; Enter or Space uses the ticket.",
  ],
  motion: {
    tokens: ["flood", "pop"],
    reducedMotion: "The stub fades where it is instead of dropping away.",
  },
  sound: ["A tap as the stub tears, inside a SoundProvider."],
  antiPatterns: [
    "Never make the barcode the only copy of the code: people read codes out and type them in.",
    "Never offer to use a ticket that can't be used yet: disable it, or leave out onUse and say when it opens.",
  ],
} as const;
