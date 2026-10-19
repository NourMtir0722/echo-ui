import { z } from "zod";

export const annunciatorProps = z.object({
  label: z.string().describe('What the row reports on: its accessible name ("Status").'),
  marks: z
    .array(z.object({ value: z.string(), label: z.string(), mark: z.unknown().optional() }))
    .describe("Every mark the screen has, in order: its value, what it means in words, and what's printed (a short word or a glyph)."),
  active: z.array(z.string()).describe("The ones lit now."),
  live: z.boolean().default(false).describe("Announce changes as they happen. For a row that's watched, not glanced at."),
  screen: z.enum(["emissive", "reflective"]).default("emissive").describe("The glass: emissive (dark, the lit word glowing) or reflective (paper-coloured, the lit word printed in ink)."),
});

export const meta = {
  name: "echo-annunciator",
  title: "Annunciator",
  description:
    "The row of fixed marks printed on a device's screen glass (REC, SYNC, MUTE, a battery), each dark until what it names is happening, then lit. Every mark is always there, so the eye learns where each sits and reads the row at a glance: a status bar, a media player, a recorder. Screen readers hear which are on, in words.",
  props: annunciatorProps,
  examples: [
    {
      title: "A recorder's status",
      description: "Four marks, two lit.",
      code: '<Annunciator\n  label="Status"\n  marks={[\n    { value: "rec", label: "Recording", mark: "REC" },\n    { value: "sync", label: "Syncing", mark: "SYNC" },\n    { value: "mute", label: "Muted", mark: "MUTE" },\n    { value: "off", label: "Offline", mark: "OFFLINE" },\n  ]}\n  active={["rec", "sync"]}\n/>',
    },
    {
      title: "Watched",
      description: "Say each change as it happens.",
      code: '<Annunciator label="Connection" marks={marks} active={active} live />',
    },
  ],
  feel: "The little printed words on a stereo's display that light up when they're true.",
  usage: {
    imports: 'import { Annunciator } from "@/echo/annunciator";',
    code: '<Annunciator label="Status" marks={[{ value: "rec", label: "Recording", mark: "REC" }]} active={["rec"]} />',
  },
  composition: "Annunciator\n  the glass: a mark for each state, lit or dark",
  a11y: [
    "A group named by `label` that says which marks are on, in words (\"Recording, Syncing\"), or that nothing is.",
    "The printed marks are drawing, hidden from assistive technology; each mark's `label` is what's said.",
    "With `live`, changes are announced politely as they happen.",
    "On and off differ by being lit, and in forced colors by the system text colour against grey, never by hue.",
  ],
  antiPatterns: [
    "Never use an Annunciator for something people act on: it reports; a control that changes it goes beside it.",
    "Never add and remove marks as states come and go: every mark stays, so its place means something.",
    "Never write sentences on the glass: a word or a glyph; the label says the rest.",
  ],
} as const;
