import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const filterTrayProps = z.object({
  ...interopProps,
  label: z.string().describe("What the pads filter: the tray's accessible name."),
  options: z
    .array(z.object({ value: z.string(), label: z.string(), icon: z.unknown(), accent: z.string().optional() }))
    .describe("The pads: a value, the name engraved under the pad (and its accessible name), its glyph, and optionally a colour of its own it lights in."),
  value: z.array(z.string()).optional().describe("The pads that are on (controlled)."),
  defaultValue: z.array(z.string()).optional(),
  onValueChange: z.function().optional().describe("Called with the pads that are on."),
  applied: z.boolean().optional().describe("Folded into the action (controlled)."),
  defaultApplied: z.boolean().default(false).describe("Whether the lit pads start folded into the action (uncontrolled). See applied."),
  onAppliedChange: z.function().optional().describe("Called when the pads fold in (true) or come back out (false). Clearing every pad unfolds it for good, and says so here."),
  actionLabel: z.string().default("Filter").describe("The action's word."),
  size: z.enum(["sm", "md", "lg"]).default("lg").describe("Height on the control scale for every pad."),
  disabled: z.boolean().default(false),
});

export const meta = {
  name: "echo-filter-tray",
  title: "FilterTray",
  description:
    "Chunky filter pads in one long well, with the action at its end. A pad that's on is a lit cap; the action carries the count. Apply, and the lit pads fold into the action (Morph) and it becomes one key saying how many are on, their names engraved on the tray's floor beside it; press it and they come back out. For the filter bar of a shop, a map or a feed.",
  props: filterTrayProps,
  examples: [
    {
      title: "Places nearby",
      description: "Four pads; the chosen ones fold into Filter.",
      code: '<FilterTray\n  label="Filters"\n  options={[\n    { value: "open", label: "Open now", icon: <ClockIcon /> },\n    { value: "rated", label: "Top rated", icon: <StarIcon /> },\n    { value: "near", label: "Nearby", icon: <PinIcon /> },\n  ]}\n  defaultValue={["open"]}\n/>',
    },
    {
      title: "A colour per pad",
      description: "Each pad lights in its own colour, derived and contrast-checked like your accent.",
      code: '<FilterTray\n  label="Filters"\n  options={[\n    { value: "open", label: "Open now", icon: <ClockIcon />, accent: "#DE3B74" },\n    { value: "rated", label: "Top rated", icon: <StarIcon />, accent: "#F2674E" },\n    { value: "near", label: "Nearby", icon: <PinIcon />, accent: "#3D8EF0" },\n  ]}\n/>',
    },
    {
      title: "Applied from your state",
      description: "Fold it in when results come back, and hear about it when someone reopens it.",
      code: '<FilterTray label="Filters" options={options} value={on} onValueChange={setOn} applied={applied} onAppliedChange={setApplied} />',
    },
  ],
  feel: "A row of backlit pads on a tray: press one and it lights; apply, and the lit ones run into the button like drops.",
  usage: {
    imports: 'import { FilterTray } from "@/echo/filter-tray";',
    code: '<FilterTray label="Filters" options={[{ value: "open", label: "Open now", icon: <ClockIcon /> }]} />',
  },
  composition: "FilterTray\n  Morph\n    HardwareButton (a pad, one per option)\n    HardwareButton (the action)",
  a11y: [
    "A `role=\"group\"` named by `label`. Each pad is a button named by its engraved label, with `aria-pressed` for whether it's on.",
    "The action says what it will do (\"Filter: 2 filters\"); once folded, the one key says what's on and that pressing it changes them.",
    "Folding in is announced politely: how many filters are on, and which.",
    "Escape on the folded key brings the pads back out.",
    "`name` submits every pad that's on with a form.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "The pads and the one key swap in place; nothing folds.",
  },
  sound: ["Each pad and the action click like every HardwareButton, inside a SoundProvider."],
  antiPatterns: [
    "Never give a pad a glyph without its label: the engraved name is what makes an icon a filter.",
    "Never use a FilterTray for one choice out of many: that's a Segmented, or a Select.",
    "Never put more pads in it than fit on one row at your narrowest width; a tray that wraps can't fold.",
  ],
} as const;
