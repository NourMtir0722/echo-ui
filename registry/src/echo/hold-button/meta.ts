import { z } from "zod";

export const holdButtonProps = z.object({
  children: z.unknown().describe('What it does: "Delete project".'),
  onConfirm: z.function().describe("Called once, when the hold completes (or the armed second press lands)."),
  duration: z.number().default(1200).describe("How long to hold, ms."),
  doneLabel: z.string().default("Done").describe("What it says once done, for a moment."),
  armedLabel: z.string().default("Press again to confirm").describe("What it says when a single press (from assistive tech) arms it."),
  variant: z.enum(["primary", "neutral"]).default("neutral").describe("primary for the one main action, neutral (the default) for the rest, as on HardwareButton."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its cap on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  icon: z.unknown().optional().describe("A leading icon (a ReactNode)."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-hold-button",
  title: "HoldButton",
  description:
    "Confirm by holding: the primary plastic fills the cap while you press, drains if you let go early, and the action happens when it's full. For the moments a second tap would be too easy. Space and Enter hold it too; a single press that can't hold (assistive tech) arms it instead, and a second press confirms. ConfirmButton is the two-press alternative.",
  props: holdButtonProps,
  examples: [
    {
      title: "End for everyone",
      description: "Hold until the cap is full.",
      code: '<HoldButton variant="primary" onConfirm={endCall}>End for everyone</HoldButton>',
    },
  ],
  feel: "You lean on it and it fills under your finger; let go and it drains away, as if nothing happened.",
  usage: {
    imports: 'import { HoldButton } from "@/echo/hold-button";',
    code: '<HoldButton onConfirm={remove}>Delete project</HoldButton>',
  },
  composition: "HoldButton → a HardwareButton whose fill is the hold",
  a11y: [
    "A real button. Space and Enter hold it like a pointer; a held key is one hold.",
    "Assistive tech that can only click arms it: it says \"Press again to confirm\" (announced), and the next press within five seconds confirms.",
    "The label says what happens, and the result (\"Done\") is announced.",
    "Nothing is ever confirmed by a single tap.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The fill still shows the hold: it's the progress, not decoration.",
  },
  sound: ["The cap's own press, and a rising note when it's done, inside a SoundProvider."],
  antiPatterns: [
    "Never use a HoldButton for a routine action: holding is a cost, keep it for what's hard to undo.",
    "Never mix HoldButton and ConfirmButton in one product: pick one way to confirm.",
  ],
} as const;
