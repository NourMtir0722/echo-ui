import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const keypadProps = z.object({
  ...interopProps,
  label: z.string().describe("What is being entered: the machine label on the screen, and the pad's accessible name."),
  mode: z
    .enum(["amount", "pin", "digits"])
    .default("amount")
    .describe("amount fills from the right; pin shows a lit socket per digit, never the digits; digits shows a code."),
  value: z.string().optional().describe('Controlled value: "12.40" for an amount, the digits for a PIN or a code. An amount is read as a number, so "12.4", "12" and String(12.4) all work.'),
  defaultValue: z.string().optional(),
  onValueChange: z.function().optional().describe("Called with the new value after every key."),
  onComplete: z.function().optional().describe("Called once a PIN or a code has all its digits."),
  maxLength: z.number().int().positive().optional().describe("Most digits it takes: an amount's including decimals (default 6), a PIN's length (default 4), a code's (default 12)."),
  decimals: z.number().int().nonnegative().default(2).describe("An amount's decimal places."),
  prefix: z.string().optional().describe('Engraved before the reading: "$", "€".'),
  unit: z.string().optional().describe("Engraved after the reading, and said with it."),
  action: z.unknown().optional().describe("The way forward under the keys, usually one HardwareButton."),
  disabled: z.boolean().default(false),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("The entry screen's glass: emissive (dark, glowing) or reflective (paper-coloured, printed in ink)."),
});

export const meta = {
  name: "echo-keypad",
  title: "Keypad",
  description:
    "A payment terminal's keys under its screen. An amount fills from the right the way a till does (1, 2, 4, 0 reads 12.40) with its unused digits dim; a PIN lights a socket per digit and never shows them; a code shows its digits in cells. Type on a real keyboard and the key on screen goes down with your finger. It replaces the phone's own keyboard, so none pops up over it.",
  props: keypadProps,
  examples: [
    {
      title: "Send money",
      description: "An amount, with the action under the keys.",
      code: '<Keypad\n  label="Amount"\n  prefix="$"\n  value={amount}\n  onValueChange={setAmount}\n  action={<HardwareButton variant="primary" size="lg" fullWidth disabled={!amount}>Send</HardwareButton>}\n/>',
    },
    {
      title: "Unlock",
      description: "Four digits, called back once they're all in.",
      code: '<Keypad label="Passcode" mode="pin" onComplete={(pin: string) => unlock(pin)} />',
    },
    {
      title: "A code",
      description: "Six digits in their cells; the empty ones show only their dark segments.",
      code: '<Keypad label="Verification code" mode="digits" maxLength={6} />',
    },
  ],
  feel: "A card terminal: big keys that go down under your finger with a click, and a lit reading that fills in from the right.",
  usage: {
    imports: 'import { Keypad } from "@/echo/keypad";',
    code: '<Keypad label="Amount" prefix="$" defaultValue="12.40" />',
  },
  composition: "Keypad\n  the screen: SegmentDisplay (an amount or a code) or StatusDots (a PIN)\n  twelve HardwareButtons\n  action",
  a11y: [
    "A `role=\"group\"` named by `label`; every key is a button named by its digit, and the delete key is named \"Delete\".",
    "One Tab stop: arrow keys move between keys, Home and End go to the first and last. Digits and Backspace type wherever focus is on the pad.",
    "Focus given to the pad itself (a form library's setFocus, the ref) goes on to the key you were last on.",
    "The reading is announced politely after each key. A PIN is announced as how many digits are in (\"2 of 4 digits entered\"), never the digits.",
    "`disabled` and `readOnly` stop every key; `name` submits the value with a form.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "Keys go down and up without their travel, as every HardwareButton does.",
  },
  sound: ["Every key clicks as it goes down and as it comes back, whether pressed or typed, inside a SoundProvider."],
  antiPatterns: [
    "Never use a Keypad for free text or a form a keyboard does better: it's for digits entered by thumb (money, a PIN, a code).",
    "Never announce or show a PIN's digits: mode=\"pin\" exists so they stay hidden.",
    "Never put the submit button anywhere but action: under the keys is where a thumb goes next.",
  ],
} as const;
