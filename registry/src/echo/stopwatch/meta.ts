import { z } from "zod";

export const stopwatchProps = z.object({
  onLap: z.function().optional().describe("Called on every lap, with its number and the time, ms."),
  onReset: z.function().optional().describe("Called on reset, with the time it had reached, ms."),
  feel: z.enum(["cell", "mercury", "cut"]).optional().describe("How it moves: cell (the default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its caps on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change: center (the default), start or end."),
});

export const meta = {
  name: "echo-stopwatch",
  title: "Stopwatch",
  description:
    "Start becomes the running time (lit) and a Lap button beside it; each lap is a drop that leaves Lap and lands in the lap count. Pause dims the time and Lap flows into Reset, which folds everything back into Start.",
  props: stopwatchProps,
  examples: [
    {
      title: "Keep the laps",
      description: "The component counts them; you keep the times.",
      code: "<Stopwatch onLap={(n, ms) => setLaps((l: number[]) => [...l, ms])} />",
    },
  ],
  feel: "Every lap visibly goes somewhere.",
  usage: {
    imports: 'import { Stopwatch } from "@/echo/stopwatch";',
    code: "<Stopwatch />",
  },
  composition: "Stopwatch → Morph → HardwareButton ×2, CountBadge, useBudOff",
  a11y: [
    "The time cap says what pressing it does: \"Pause stopwatch\" / \"Resume stopwatch\".",
    "Each lap and its time, pausing and resetting are announced politely; the lap count is a status.",
    "The time is written straight into the cap, so nothing re-renders while it runs.",
    "Keyboard: Tab moves through the time cap, Lap and Reset; Enter or Space presses each.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The states swap in place and laps count without a drop.",
  },
  sound: ["Each cap's own press, and a soft gulp as a lap lands (inside a SoundProvider)."],
  antiPatterns: ["Never use it to show elapsed time the user didn't start: that's a readout, not a control."],
} as const;
