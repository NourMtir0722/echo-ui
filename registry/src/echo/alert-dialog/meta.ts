import { z } from "zod";

export const alertDialogProps = z.object({
  trigger: z.unknown().describe("Element or text that opens the dialog."),
  title: z.unknown().describe("The decision, phrased as a question."),
  description: z
    .unknown()
    .describe("What happens if they say yes. Required — a confirm without its consequence has already decided for the user."),
  children: z.unknown().describe("Extra detail between the description and the answers."),
  confirmLabel: z
    .string()
    .default("Confirm")
    .describe('Name the ACTION ("Erase", "Discard"), never "OK" — the label is the last thing read before it happens.'),
  cancelLabel: z.string().default("Cancel").describe("The answer that backs out, which has focus first. Default \"Cancel\"."),
  destructive: z
    .boolean()
    .default(true)
    .describe("Defaults TRUE: this component exists for the destructive case, so the dangerous spelling is not the quiet one."),
  onConfirm: z.function().optional().describe("Fired when the confirming answer is pressed."),
  onCancel: z.function().optional().describe("Called when the backing-out answer is pressed."),
  open: z.boolean().optional().describe("Controlled open state."),
  defaultOpen: z.boolean().optional(),
  onOpenChange: z.function().optional(),
  container: z.unknown().optional().describe("Where the dialog mounts; defaults to <body>. Pass an element inside a scoped theme so the dialog wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-alert-dialog",
  title: "AlertDialog",
  description:
    "A destructive confirm. Modal covers the structure; this is the semantics — role=alertdialog, a required description, and no dismissal by clicking away, so the question has to be answered. Its own sound: caution (the one rough waveform) on open, error on a destructive confirm. Severity reads as the deep end of the accent ramp, never an imported red.",
  props: alertDialogProps,
  examples: [
    {
      title: "Erase confirm",
      description: "Name the action in the button, state the consequence above it.",
      code: [
        "<AlertDialog",
        "  trigger={<HardwareButton>Erase takes</HardwareButton>}",
        '  title="Erase all takes?"',
        '  description="Twelve recordings will be removed. This cannot be undone."',
        '  confirmLabel="Erase"',
        "  onConfirm={erase}",
        "/>",
      ].join("\n"),
    },
    {
      title: "A serious but non-destructive decision",
      description: "destructive={false} keeps the modality and drops the heavy cap and the sound.",
      code: [
        "<AlertDialog",
        '  title="Publish to the public registry?"',
        '  description="Anyone will be able to install this item."',
        '  confirmLabel="Publish"',
        "  destructive={false}",
        "  onConfirm={publish}",
        "/>",
      ].join("\n"),
    },
  ],
  feel: "A warning that has to be answered: a rough buzz on arrival, and Cancel under your finger first. Both answers press like the library's keys, down onto their seam.",
  usage: {
    imports: [
      "import { AlertDialog } from \"@/echo/alert-dialog\";",
      "import { HardwareButton } from \"@/echo/hardware-button\";",
    ].join("\n"),
    code: [
      "<AlertDialog",
      "  trigger={<HardwareButton>Erase takes</HardwareButton>}",
      "  title=\"Erase all takes?\"",
      "  description=\"Twelve recordings will be removed. This cannot be undone.\"",
      "  confirmLabel=\"Erase\"",
      "  onConfirm={erase}",
      "/>",
    ].join("\n"),
  },
  composition: "AlertDialog",
  a11y: [
    "`role=\"alertdialog\"`, named by `title` and described by `description`, so a screen reader announces a decision, not a panel.",
    "Clicking outside does not dismiss it — it has to be answered.",
    "Cancel comes first in the tab order, so a reflexive Enter never confirms the destructive action.",
    "Focus is trapped while it is open and returns to the trigger afterwards.",
  ],
  motion: {
    tokens: ["--echo-duration-glide", "--echo-duration-swap"],
    reducedMotion: "It appears in place with a short fade, and its buttons no longer move when pressed.",
  },
  sound: [
    "`caution` when it opens.",
    "`error` when a destructive action is confirmed; nothing when a non-destructive one is.",
  ],
  antiPatterns: [
    'Never label the confirming answer "OK" or "Yes". By the time someone reads the button they have often stopped reading the prose — the label has to say what will happen.',
    "Do not use an AlertDialog for anything reversible. It blocks the whole screen and cannot be dismissed by clicking away; spend that interruption only on decisions that cannot be undone. For a reversible action, act and offer an undo in a Toast.",
    "Do not put the destructive answer first in the DOM. Cancel comes first so it is what Tab reaches and what a reflex Enter confirms.",
    "Never restate the title in the description. The title is the question; the description is the consequence. If the description only rephrases the question, the user has been told nothing.",
    "Do not import a red. Severity here is the deep end of the accent ramp so it survives a reseed — a hardcoded #d00 is the one thing that will not relight.",
  ],
} as const;
