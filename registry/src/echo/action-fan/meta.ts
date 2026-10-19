import { z } from "zod";

export const actionFanProps = z.object({
  children: z.string().describe('The whole\'s label, e.g. "Share".'),
  icon: z.unknown().optional().describe("The whole's icon (a ReactNode), before its label."),
  actions: z
    .array(z.object({ label: z.string(), icon: z.unknown().optional(), onSelect: z.function() }))
    .describe("The choices, in reading order. Two to four."),
  closeLabel: z.string().optional().describe('Accessible name of the × that folds the fan. Defaults to "Close".'),
  open: z.boolean().optional(),
  onOpenChange: z.function().optional(),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-action-fan",
  title: "ActionFan",
  description:
    "One action opens into its choices, which bud from it one after another; the × folds them back. Choosing one does it and folds the fan. For two to four choices that belong to one verb — share, export, add.",
  props: actionFanProps,
  examples: [
    {
      title: "Share",
      description: "Three ways to do one thing.",
      code: [
        "<ActionFan",
        "  actions={[",
        '    { label: "Link", onSelect: copyLink },',
        '    { label: "Email", onSelect: email },',
        '    { label: "Embed", onSelect: embed },',
        "  ]}",
        ">",
        "  Share",
        "</ActionFan>",
      ].join("\n"),
    },
  ],
  feel: "The choices grow out of the thing you pressed.",
  usage: {
    imports: 'import { ActionFan } from "@/echo/action-fan";',
    code: '<ActionFan actions={[{ label: "PNG", onSelect: png }, { label: "SVG", onSelect: svg }]}>Export</ActionFan>',
  },
  composition: "ActionFan → Morph → HardwareButton",
  a11y: [
    "The first choice takes focus when the fan opens; Escape or × folds it and focus returns to the whole.",
    "The × is an icon-only HardwareButton named by `closeLabel`.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The choices appear in place: no drawn body.",
  },
  sound: ["A soft pop as each choice comes free (inside a SoundProvider)."],
  antiPatterns: [
    "Never fan more than four choices — use a Menu.",
    "Never mix unrelated actions in one fan: every choice should finish the same sentence as the whole.",
  ],
} as const;
