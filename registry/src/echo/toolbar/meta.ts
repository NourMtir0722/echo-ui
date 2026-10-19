import { z } from "zod";

export const toolbarProps = z.object({
  children: z.unknown().describe("Toolbar: ToolbarButtons, Toggles, ToggleGroups, ToolbarGroups and ToolbarSeparators. ButtonGroup: HardwareButtons."),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal").describe("Toolbar: which way the arrow keys move."),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height on the control scale for everything inside. Toolbar defaults to sm; ButtonGroup to the nearest SizeProvider's size."),
  "aria-label": z.string().optional().describe("The name: every Toolbar and ButtonGroup needs aria-label or aria-labelledby (a type error otherwise)."),
  "aria-labelledby": z.string().optional(),
});

export const meta = {
  name: "echo-toolbar",
  title: "Toolbar",
  description:
    "Several caps sharing one long well, like keys on one bar. ButtonGroup is the look alone: HardwareButtons that belong together, each its own tab stop. Toolbar adds a toolbar's behaviour: one tab stop for the whole bar and the arrow keys between its controls (Base UI Toolbar), sm controls by default, ToolbarGroup to keep a few in their own well, ToolbarSeparator between groups. Toggles and ToggleGroups inside join its arrow-key order by themselves.",
  props: toolbarProps,
  examples: [
    {
      title: "An editor toolbar",
      description: "One tab stop; arrows move between the controls.",
      code: [
        '<Toolbar aria-label="Formatting">',
        '  <ToggleGroup aria-label="Style" multiple>',
        '    <Toggle value="bold" aria-label="Bold" icon={<BoldIcon />} />',
        '    <Toggle value="italic" aria-label="Italic" icon={<ItalicIcon />} />',
        "  </ToggleGroup>",
        "  <ToolbarSeparator />",
        "  <ToolbarButton>Undo</ToolbarButton>",
        "  <ToolbarButton>Redo</ToolbarButton>",
        "</Toolbar>",
      ].join("\n"),
    },
    {
      title: "Buttons that belong together",
      description: "One well; each still its own tab stop.",
      code: '<ButtonGroup aria-label="Steps">\n  <HardwareButton>Back</HardwareButton>\n  <HardwareButton variant="primary">Next</HardwareButton>\n</ButtonGroup>',
    },
  ],
  feel: "A bar of keys: the caps sit side by side on one floor and press on their own.",
  usage: {
    imports: 'import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ButtonGroup } from "@/echo/toolbar";',
    code: '<Toolbar aria-label="Actions">\n  <ToolbarButton>Save</ToolbarButton>\n</Toolbar>',
  },
  composition: "Toolbar → Base UI Toolbar with HardwareButtons (ToolbarButton), Toggles and groups in wells; ButtonGroup → one well of HardwareButtons",
  a11y: [
    "A Toolbar is `role=\"toolbar\"` with a name and one tab stop: arrow keys move between its controls, Home and End jump to the ends.",
    "A ButtonGroup is `role=\"group\"` with a name; each button keeps its own tab stop.",
    "ToolbarSeparator is a real separator, oriented with the bar.",
    "A toolbar that runs out of room wraps rather than hiding controls.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "Nothing of its own; each control follows its own reduced-motion rules.",
  },
  antiPatterns: [
    "Never put a Field or other text input in a Toolbar: arrow keys can't both edit text and move along the bar.",
    "Don't use a ButtonGroup for a choice: that's Segmented or a ToggleGroup.",
  ],
} as const;
