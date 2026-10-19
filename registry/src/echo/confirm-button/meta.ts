import { z } from "zod";

export const confirmButtonProps = z.object({
  children: z.string().describe('The whole\'s label, e.g. "Delete project".'),
  onConfirm: z.function().describe("Called when the lit part is pressed."),
  confirmLabel: z.string().optional().describe('The lit part. Defaults to "Delete".'),
  cancelLabel: z.string().optional().describe('Defaults to "Cancel".'),
  confirmedLabel: z.string().optional().describe('What the whole says after confirming, e.g. "Deleted". Omit to go straight back.'),
  confirmedFor: z.number().optional().describe("How long the confirmed label stays, ms. Defaults to 2000."),
  icon: z.unknown().optional().describe("The whole's icon. Defaults to a bin."),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-confirm-button",
  title: "ConfirmButton",
  description:
    "A destructive action that asks for its second press where the hand already is. \"Delete\" divides into \"Cancel\" and a lit \"Delete\"; Delete confirms, and the parts fold into a button saying what happened, which flows back to its first label a moment later. A lighter answer than a dialog for an action on one thing.",
  props: confirmButtonProps,
  examples: [
    {
      title: "Delete, then say so",
      description: "The whole reads \"Deleted\" for a moment, then flows back to \"Delete project\".",
      code: '<ConfirmButton onConfirm={remove} confirmedLabel="Deleted">Delete project</ConfirmButton>',
    },
    {
      title: "Not only deleting",
      description: "Any action worth a second press.",
      code: '<ConfirmButton onConfirm={leave} confirmLabel="Leave" confirmedLabel="Left">Leave team</ConfirmButton>',
    },
  ],
  feel: "It asks \"are you sure?\" without taking you anywhere.",
  usage: {
    imports: 'import { ConfirmButton } from "@/echo/confirm-button";',
    code: '<ConfirmButton onConfirm={remove} confirmedLabel="Deleted">Delete project</ConfirmButton>',
  },
  composition: "ConfirmButton → Morph → HardwareButton",
  a11y: [
    "Cancel takes focus when the parts appear, so pressing Enter twice never confirms.",
    "\"Confirm delete\", \"Cancelled\" and the confirmed label are announced politely.",
    "Escape cancels.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The buttons swap in place: no drawn body.",
  },
  sound: ["A soft pop as the parts appear, a gulp as they fold back (inside a SoundProvider)."],
  antiPatterns: [
    "Never use it where the consequence needs explaining — that's AlertDialog, which has room for a sentence.",
    "Never use it for bulk actions on many things at once; name the count in an AlertDialog.",
  ],
} as const;
