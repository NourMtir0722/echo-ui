import { z } from "zod";

export const timerProps = z.object({
  durations: z
    .array(z.object({ label: z.string(), ms: z.number() }))
    .optional()
    .describe("What it opens into. Defaults to 10s, 30s and 1m. Keep to three or four."),
  onDone: z.function().optional().describe("Called when the time is up."),
  children: z.string().optional().describe('The closed label. Defaults to "Timer".'),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-timer",
  title: "Timer",
  description:
    "A timer that is one button. It opens into its durations; the others run into the one you pick, which fills with the primary plastic and drains as the time runs, then rings three times and folds back. Press the running cap to pause; × or Escape folds it.",
  props: timerProps,
  examples: [
    {
      title: "Your own durations",
      description: "A tea timer.",
      code: '<Timer durations={[{ label: "3m", ms: 180_000 }, { label: "4m", ms: 240_000 }, { label: "5m", ms: 300_000 }]} onDone={notify}>Tea</Timer>',
    },
  ],
  feel: "The time you chose is a level in the button, and you watch it drain.",
  usage: {
    imports: 'import { Timer } from "@/echo/timer";',
    code: "<Timer onDone={() => setBreak(true)} />",
  },
  composition: "Timer → Morph → HardwareButton (the running cap uses `fill`)",
  a11y: [
    "The durations are a named group; the first takes focus as it opens.",
    "The running cap says what pressing it does and how long is left: \"Pause timer, 0:09 left\".",
    "The duration picked, pause, resume and \"Time's up\" are announced politely.",
    "Escape folds it at any point.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The states swap in place; the level still drains, as information.",
  },
  sound: ["Each cap's own press, and the notify chime three times when the time is up (inside a SoundProvider)."],
  antiPatterns: [
    "Never use it for a countdown the user didn't start: that's a Progress with a label.",
    "Never offer more than four durations: past that it's a picker, and NumberField reads better.",
  ],
} as const;
