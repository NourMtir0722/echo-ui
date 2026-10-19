import { z } from "zod";

export const saveButtonProps = z.object({
  onSave: z.function().describe("Runs on press. Return a promise to hold the busy state until it settles; if it rejects, the button comes back and says so."),
  children: z.string().optional().describe('The idle label. Defaults to "Save".'),
  savingLabel: z.string().optional().describe('Said while saving, and the busy cap\'s name. Defaults to "Saving".'),
  savedLabel: z.string().optional().describe('Defaults to "Saved".'),
  errorLabel: z.string().optional().describe('Said if onSave rejects. Defaults to "Couldn\'t save".'),
  savedFor: z.number().optional().describe("How long Saved stays, ms. Defaults to 1800."),
  disabled: z.boolean().optional(),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-save-button",
  title: "SaveButton",
  description:
    "The button becomes its own progress, then its own answer: Save narrows into a busy cap while your save runs, widens into a lit Saved, and flows back. One HardwareButton changing shape in a Morph — no dots swapped in, no width jump.",
  props: saveButtonProps,
  examples: [
    {
      title: "Save to a server",
      description: "The busy cap holds until the promise settles.",
      code: '<SaveButton onSave={() => fetch("/api/draft", { method: "POST", body: draft })} />',
    },
    {
      title: "Other words",
      description: "Any action with an in-between and an answer.",
      code: '<SaveButton onSave={publish} savingLabel="Publishing" savedLabel="Published">Publish</SaveButton>',
    },
  ],
  feel: "You see it working, then you see it done, in the same place your finger is.",
  usage: {
    imports: 'import { SaveButton } from "@/echo/save-button";',
    code: "<SaveButton onSave={save} />",
  },
  composition: "SaveButton → Morph → HardwareButton (loading while busy)",
  a11y: [
    "Saving, Saved and a failure are announced politely.",
    "The busy cap is HardwareButton's loading state: named \"Saving\", aria-busy, and it can't be pressed twice.",
    "Focus waits on the busy cap and comes back to Save when it returns.",
    "Keyboard: Tab reaches it; Enter or Space saves, and a second press while it's saving does nothing.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The states swap in place: no drawn body.",
  },
  sound: ["The cap's own press (HardwareButton)."],
  antiPatterns: [
    "Never use it for a save that happens without asking (autosave): show that with a status line, not a button that moves by itself.",
    "Never leave it busy forever: if the save can hang, time it out and reject.",
  ],
} as const;
