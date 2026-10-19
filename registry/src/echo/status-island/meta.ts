import { z } from "zod";

export const statusIslandProps = z.object({
  label: z.string().describe('What\'s happening, in a word or two: the pill\'s label ("Exporting", "Recording").'),
  title: z.string().optional().describe('What it\'s happening to, heading the open island ("Q3 report.pdf").'),
  reading: z.string().optional().describe('The pill\'s readout ("42%", "04:59"). Default: progress as a percent.'),
  progress: z.number().min(0).max(1).optional().describe("How far along, 0–1: a row of lit cells in the open island."),
  detail: z.unknown().optional().describe("A line under the progress: what's left, where it went, what went wrong."),
  state: z
    .enum(["running", "paused", "done", "failed"])
    .default("running")
    .describe("running lights the socket; paused darkens it; done and failed are said out loud."),
  actions: z.unknown().optional().describe("What you can do about it: small HardwareButtons in the open island."),
  open: z.boolean().optional(),
  defaultOpen: z.boolean().default(false),
  onOpenChange: z.function().optional(),
  placement: z
    .enum(["inline", "top", "bottom"])
    .default("inline")
    .describe("inline sits where you put it; top and bottom float at the centre of that edge of the screen."),
});

export const meta = {
  name: "echo-status-island",
  title: "StatusIsland",
  description:
    "Work that runs in the background, kept in one small floating slab: at rest a pill with a lit socket and a readout; pressed, it blooms open the way every Echo panel arrives, wider first and then taller, into the detail and what you can do about it. It announces when the work starts, finishes or fails, never every percent. For uploads, exports, timers, recordings and anything \"writing…\".",
  props: statusIslandProps,
  examples: [
    {
      title: "An export",
      description: "The pill reads the percent; open, it shows the cells, what's left and a way to stop.",
      code: '<StatusIsland\n  label="Exporting"\n  title="Q3 report.pdf"\n  progress={0.42}\n  detail="12 of 28 pages, about 10 s left"\n  actions={<HardwareButton onClick={cancel}>Cancel</HardwareButton>}\n/>',
    },
    {
      title: "A timer, floating",
      description: "At the top of the screen, clear of the notch, over whatever is there.",
      code: '<StatusIsland placement="top" label="Timer" reading="04:59" />',
    },
    {
      title: "Finished",
      description: "Done is said once; the pill keeps saying so until you dismiss it.",
      code: '<StatusIsland label="Saved" title="Q3 report.pdf" state="done" detail="Saved to Reports" />',
    },
  ],
  feel: "A small lit pill that's quietly busy; touch it and it spreads open like a drop, then gathers back.",
  usage: {
    imports: 'import { StatusIsland } from "@/echo/status-island";',
    code: '<StatusIsland label="Uploading" title="Holiday.mov" progress={0.6} />',
  },
  composition: "StatusIsland\n  the pill (a button): StatusDot, the label, LcdChip\n  the detail: the title, Progress, the detail line, actions",
  a11y: [
    "The pill is a button with `aria-expanded`, controlling the detail, named by its label and reading (\"Exporting 42%\"); Escape closes it from anywhere inside and puts focus back on the pill.",
    "A `role=\"status\"` region says the work started, finished or failed, once each; progress is never read out as it climbs.",
    "The progress cells are a Progress named by the title.",
    "`top` and `bottom` keep clear of the screen's notch and home bar (the safe-area insets, which a phone reports once the page's viewport meta has `viewport-fit=cover`), and only the island itself takes the pointer, never the strip it floats in.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "It opens and closes at once, without growing.",
  },
  sound: ["A soft chirp as it opens, a tap as it closes; notify when the work is done and error when it fails, inside a SoundProvider."],
  antiPatterns: [
    "Never put the only copy of a result in a StatusIsland: it's a place to watch work, and the result belongs on the page.",
    "Never keep one showing when nothing is running; take it away once it's done and seen.",
    "Never stack several islands: put a second job's pill beside the first, or open the first to list both.",
  ],
} as const;
