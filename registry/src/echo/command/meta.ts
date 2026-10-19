import { z } from "zod";

export const commandProps = z.object({
  groups: z
    .array(z.object({ label: z.string(), items: z.array(z.object({ id: z.string(), label: z.string() })) }))
    .describe("Grouped commands. Groups keep their order; items are filtered within them, and a group that empties is dropped."),
  open: z.boolean().optional().describe("Controlled open state."),
  onOpenChange: z.function().optional(),
  shortcut: z
    .string()
    .default("k")
    .describe("Global hotkey, with Cmd on Apple and Ctrl elsewhere. Pass null for no binding."),
  placeholder: z.string().default("Type a command…"),
  emptyMessage: z.unknown().describe("Shown when nothing matches. Say what would help, not just 'no results'."),
  onRun: z.function().optional().describe("Fired with the item that ran, after the palette closes."),
  container: z.unknown().optional().describe("Where the palette mounts; defaults to <body>. Pass an element inside a scoped theme so the palette wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-command",
  title: "Command",
  description:
    "The command palette as a dot-matrix readout: the query line is the LcdChip's recessed screen well, in the LCD voice, with an emissive caret and a scanline wash. Base UI Autocomplete for the input, filtering and listbox semantics; Base UI Dialog for the frame, because a palette is summoned to the middle of the screen rather than anchored to anything. Cmd/Ctrl+K by default; matches on hidden keywords as well as labels.",
  props: commandProps,
  examples: [
    {
      title: "A palette",
      description: "Grouped commands, each with an action. Cmd/Ctrl+K opens it.",
      code: [
        "<Command",
        "  groups={[",
        '    { label: "Navigate", items: [',
        '      { id: "docs", label: "Go to docs", hint: "G then D", run: () => router.push("/docs") },',
        "    ] },",
        '    { label: "Take", items: [',
        '      { id: "rec", label: "Start recording", keywords: ["arm", "capture"], run: record },',
        "    ] },",
        "  ]}",
        "/>",
      ].join("\n"),
    },
    {
      title: "Hidden keywords",
      description: "What people TYPE is rarely what the command is called.",
      code: 'const deleteTake: CommandItem = {\n  id: "delete",\n  label: "Delete take",\n  keywords: ["trash", "remove", "bin"],\n  run: del,\n};',
    },
    {
      title: "The app owns the hotkey",
      description: "shortcut={null} unbinds it; drive `open` yourself.",
      code: "<Command shortcut={null} open={open} onOpenChange={setOpen} groups={groups} />",
    },
  ],
  feel: "A dot-matrix command line that drops over the screen: type, arrow down, Enter.",
  usage: {
    imports: "import { Command } from \"@/echo/command\";",
    code: [
      "<Command",
      "  groups={[",
      "    {",
      "      label: \"Navigate\",",
      "      items: [{ id: \"docs\", label: \"Go to docs\", run: () => openDocs() }],",
      "    },",
      "  ]}",
      "/>",
    ].join("\n"),
  },
  composition: "Command",
  a11y: [
    "Opens with ⌘K on Apple devices and Ctrl+K elsewhere. `shortcut` changes the key; `shortcut={null}` unbinds it so your app can own it.",
    "A modal dialog: focus moves to the search input and stays inside until it closes. Escape closes it.",
    "Arrow keys move through the results and Enter runs the highlighted one; the input keeps focus throughout, as a combobox should.",
    "A `disabled` item stays listed but cannot run.",
  ],
  motion: {
    tokens: ["--echo-duration-swap", "--echo-duration-glitch"],
    reducedMotion: "The palette appears in place with a short fade instead of sliding in.",
  },
  sound: [
    "`transition` when it opens.",
    "`select` when an item runs.",
  ],
  antiPatterns: [
    "Never ship a palette as the ONLY way to reach something. It is an accelerator for people who already know the command exists; anything reachable only by typing its name is unreachable to everyone else.",
    "Do not put destructive commands in it without a confirm. A palette is optimised for Enter on the first highlighted row — which is exactly how someone erases their work by typing three letters and committing to muscle memory. Send those through an AlertDialog.",
    "Do not skip `keywords`. Users type the word for the thing, not the label you chose; a palette that only matches its own labels feels broken the first time someone searches 'trash' for 'Delete'.",
    "Do not render two palettes with the same shortcut on one page. Both will answer the keystroke. Pass shortcut={null} to all but one.",
    "Do not use it as a Select. It does not hold a value — it runs an action and forgets. If the choice should be remembered and shown, that is Select.",
  ],
} as const;
