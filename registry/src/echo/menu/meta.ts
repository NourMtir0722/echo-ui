import { z } from "zod";

/**
 * Only what ECHO adds. The root, items, groups and submenus are Base UI's
 * Menu unchanged, so tabulating them here would restate Base UI's docs and go
 * stale against them — the same call made for Tabs and Accordion. What Echo
 * contributes is `Menu.Content`, which collapses Base UI's Portal → Positioner
 * → Popup triple and takes the placement props on itself.
 */
export const menuProps = z.object({
  "Content.side": z
    .enum(["top", "right", "bottom", "left"])
    .default("bottom")
    .describe("Preferred side of the trigger. Flips automatically when there is no room."),
  "Content.align": z
    .enum(["start", "center", "end"])
    .default("start")
    .describe("Alignment along that side. A menu hangs off its trigger, so start is the default."),
  "Content.sideOffset": z.number().default(8).describe("Gap between trigger and panel, in px."),
  "Content.container": z.unknown().optional().describe("Where the panel mounts; defaults to <body>. Pass an element inside a scoped theme so the panel wears that theme, not the :root one."),
});

export const meta = {
  name: "echo-menu",
  title: "Menu",
  description:
    "Base UI Menu (typeahead, roving focus, submenu timing, checkbox/radio item semantics) skinned as an Echo floating panel — the Select's molded cap trigger and the same lit dot for what is on. Two sounds: transition when the panel arrives, select when an item commits. Exports ContextMenu from the same item for the right-click case. Compound API.",
  props: menuProps,
  examples: [
    {
      title: "Dropdown",
      description: "Content wraps Base UI's Portal, Positioner and Popup in one.",
      code: [
        "<Menu>",
        "  <Menu.Trigger>Actions</Menu.Trigger>",
        "  <Menu.Content>",
        "    <Menu.Item onClick={rename}>Rename</Menu.Item>",
        "    <Menu.Item onClick={duplicate}>Duplicate</Menu.Item>",
        "    <Menu.Separator />",
        "    <Menu.Item onClick={archive}>Archive</Menu.Item>",
        "  </Menu.Content>",
        "</Menu>",
      ].join("\n"),
    },
    {
      title: "Your own trigger",
      description: "render swaps the default cap for any component, keeping the menu wiring.",
      code: '<Menu.Trigger render={<HardwareButton>Actions</HardwareButton>} />',
    },
    {
      title: "Checkable items",
      description: "The lit dot marks what is on — the same indicator Select uses.",
      code: [
        "<Menu.CheckboxItem checked={grid} onCheckedChange={setGrid}>",
        "  Show grid",
        "</Menu.CheckboxItem>",
      ].join("\n"),
    },
    {
      title: "Right-click menu",
      description: "Same panel, same items; the Trigger is the region, not a button.",
      code: [
        "<ContextMenu>",
        '  <ContextMenu.Trigger className="track">…</ContextMenu.Trigger>',
        "  <ContextMenu.Content>",
        "    <ContextMenu.Item onClick={split}>Split at playhead</ContextMenu.Item>",
        "  </ContextMenu.Content>",
        "</ContextMenu>",
      ].join("\n"),
    },
  ],
  feel: "A short list that drops from its button, which presses like the library's keys; each choice clicks like a key.",
  usage: {
    imports: "import { Menu } from \"@/echo/menu\";",
    code: [
      "<Menu>",
      "  <Menu.Trigger>Actions</Menu.Trigger>",
      "  <Menu.Content>",
      "    <Menu.Item onClick={rename}>Rename</Menu.Item>",
      "    <Menu.Separator />",
      "    <Menu.Item onClick={archive}>Archive</Menu.Item>",
      "  </Menu.Content>",
      "</Menu>",
    ].join("\n"),
  },
  composition: "Menu\n  Menu.Trigger\n  Menu.Content\n    Menu.Item\n    Menu.LinkItem\n    Menu.CheckboxItem\n    Menu.RadioGroup\n      Menu.RadioItem\n    Menu.Group\n      Menu.GroupLabel\n    Menu.Separator\n    Menu.SubmenuTrigger\nContextMenu\n  ContextMenu.Content",
  a11y: [
    "Base UI Menu: the trigger is a button with `aria-haspopup`; the list is a `menu` of `menuitem`s, with `menuitemcheckbox` and `menuitemradio` for the marked items.",
    "Arrow keys move through items, typing jumps to a match, Enter or Space activates, Escape closes and returns focus to the trigger.",
    "`ContextMenu` opens on right-click and on long-press; give the same actions another way in too, since neither is discoverable.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-duration-swap"],
    reducedMotion: "The list appears with a short fade and does not slide, and the button does not travel when pressed.",
  },
  sound: [
    "`transition` when it opens.",
    "`select` when an item is chosen.",
  ],
  antiPatterns: [
    "Do not use a Menu as navigation for a whole site — it hides every destination behind a press. A menu is for ACTIONS on the thing you already have; a nav is a list you can see.",
    "Never put the destructive action adjacent to the routine one in the same group. Separate it, or better, send it through an AlertDialog — a menu item fires on the first click, with no second chance.",
    "Do not reach for a Menu when the choice sets a value — that is Select, which reports the current value in its trigger. A Menu trigger says what it does, not what is chosen.",
    "Do not nest more than one submenu level. Base UI will happily render it; a person will not find it.",
  ],
} as const;
