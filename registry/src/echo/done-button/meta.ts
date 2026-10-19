import { z } from "zod";

export const doneButtonProps = z.object({
  done: z.boolean().describe("Done (divided) or not (whole)."),
  onDoneChange: z.function().describe("Called with true when the whole is pressed, false when Undo is."),
  children: z.string().optional().describe('The whole\'s label. Defaults to "Mark as done".'),
  doneLabel: z.string().optional().describe('The lit half. Defaults to "Done".'),
  undoLabel: z.string().optional().describe('Defaults to "Undo".'),
  doneStatus: z.string().optional().describe('Announced when it becomes done. Defaults to "Marked as done".'),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-done-button",
  title: "DoneButton",
  description:
    "\"Mark as done\" divides into a lit \"Done\" and an \"Undo\". The state and its way back sit where the hand already is; Undo folds them back into the whole.",
  props: doneButtonProps,
  examples: [
    {
      title: "A task",
      description: "Controlled, so the list owns the state.",
      code: "<DoneButton done={task.done} onDoneChange={(done) => update(task.id, { done })} />",
    },
    {
      title: "Other words",
      description: "Any state with a way back: read, resolved, approved.",
      code: '<DoneButton done={read} onDoneChange={setRead} doneLabel="Read" doneStatus="Marked as read">Mark as read</DoneButton>',
    },
  ],
  feel: "The button becomes the answer and its own undo.",
  usage: {
    imports: 'import { DoneButton } from "@/echo/done-button";',
    code: "<DoneButton done={done} onDoneChange={setDone} />",
  },
  composition: "DoneButton → Morph → HardwareButton",
  a11y: [
    "The lit \"Done\" cap is disabled — it reports the state, it doesn't act — so Undo is the only control while it's done, and it takes focus as the halves appear.",
    "\"Marked as done\" is announced politely (`doneStatus`).",
    "Escape, or Undo, folds it back and returns focus to the whole.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The buttons swap in place: no drawn body.",
  },
  sound: ["A soft pop as the halves part, a gulp as they fuse (inside a SoundProvider)."],
  antiPatterns: [
    "Never use it for something that can't be undone — that's ConfirmButton.",
    "Never leave `done` uncontrolled in a list; the row owns the state.",
  ],
} as const;
