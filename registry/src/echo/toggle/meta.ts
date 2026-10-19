import { z } from "zod";
import { interopProps } from "../../agent/interop";

export const toggleProps = z.object({
  ...interopProps,
  children: z.unknown().optional().describe("Toggle: the legend, when it has words."),
  icon: z.unknown().optional().describe("Toggle: an icon; icon-only toggles need aria-label (a type error otherwise)."),
  pressed: z.boolean().optional().describe("Toggle: on (controlled)."),
  defaultPressed: z.boolean().optional().describe("Toggle: on to begin with."),
  onPressedChange: z.function().optional().describe("Toggle: called with the new state."),
  value: z.unknown().optional().describe("Toggle: its value inside a ToggleGroup. ToggleGroup: the values that are on (string[])."),
  defaultValue: z.array(z.string()).optional().describe("ToggleGroup: the values on to begin with."),
  onValueChange: z.function().optional().describe("ToggleGroup: called with the values that are on."),
  multiple: z.boolean().default(false).describe("ToggleGroup: any number can be on; without it, at most one."),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal").describe("ToggleGroup: which way the arrow keys move."),
  disabled: z.boolean().default(false),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Height on the control scale; a group sets it for every Toggle inside. Defaults to the nearest SizeProvider's size."),
  "aria-label": z.string().optional().describe("The name: required on an icon-only Toggle and on every ToggleGroup (or aria-labelledby)."),
  "aria-labelledby": z.string().optional(),
});

export const meta = {
  name: "echo-toggle",
  title: "Toggle",
  description:
    "The quiet key of a toolbar: bold, italic, grid or list, a filter. On is the cap held down in its well, not a light (that's LedKey). ToggleGroup puts Toggles in one long well with arrow-key focus: multiple lets any number be on, without it at most one. For exactly one of a few, always one, use Segmented. Built on Base UI Toggle and ToggleGroup.",
  props: toggleProps,
  examples: [
    {
      title: "Formatting",
      description: "Any number on at once.",
      code: [
        '<ToggleGroup aria-label="Text style" multiple>',
        '  <Toggle value="bold" aria-label="Bold" icon={<BoldIcon />} />',
        '  <Toggle value="italic" aria-label="Italic" icon={<ItalicIcon />} />',
        "</ToggleGroup>",
      ].join("\n"),
    },
    {
      title: "One view at a time",
      description: "At most one; pressing the one that's on turns it off.",
      code: [
        '<ToggleGroup aria-label="View" defaultValue={["grid"]}>',
        '  <Toggle value="grid">Grid</Toggle>',
        '  <Toggle value="list">List</Toggle>',
        "</ToggleGroup>",
      ].join("\n"),
    },
    {
      title: "On its own",
      description: "A single latching key.",
      code: '<Toggle defaultPressed>Loop</Toggle>',
    },
  ],
  feel: "A latching key: press it on and the cap goes down and stays down in its well; press it again and it springs back up.",
  usage: {
    imports: 'import { Toggle, ToggleGroup } from "@/echo/toggle";',
    code: '<Toggle aria-label="Mute" icon={<MuteIcon />} />',
  },
  composition: "Toggle → a cap in a well (Base UI Toggle); ToggleGroup → one well of Toggles (Base UI ToggleGroup)",
  a11y: [
    "Each Toggle is a button with `aria-pressed`; Space and Enter press it.",
    "A ToggleGroup is one tab stop: arrow keys move between its Toggles (following reading direction), Home and End jump to the ends.",
    "On is shown twice over: the cap sits down, and its legend goes from dim to full text. In forced colors, on is a system highlight.",
    "An icon-only Toggle without aria-label is a type error; so is a ToggleGroup without a name.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-ease-pop"],
    reducedMotion: "The cap goes down and up without travelling.",
  },
  sound: ["`tap` as it latches or releases, inside a SoundProvider."],
  antiPatterns: [
    "Never use a Toggle for an action that doesn't stay on: that's a HardwareButton.",
    "Never put an LED on a Toggle: a row of lit keys breaks the one-accent rule; the latched cap is the state.",
    "Don't use a single-choice ToggleGroup where one option must always be chosen: that's Segmented.",
  ],
} as const;
