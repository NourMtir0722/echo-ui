export const meta = {
  name: "echo-tabs",
  title: "Tabs",
  description:
    "Base UI Tabs (roving focus, arrow-key nav, a11y) marked with the library's one \"you are here\": a 2px lit rail slides under the open tab, over a hairline baseline. Labels stay on the chassis. sound.select on change. Compound API.",
  props: null,
  /**
   * Tabs is a pure passthrough, so there is no schema to walk — see propsNote.
   */
  propsNote:
    "Compound API with one prop of its own: `size` on `Tabs.List` (`sm` 32, `md` 44, `lg` 60px, the control heights; defaults to the surrounding `SizeProvider`, else `md`; on a touch screen `sm` grows to 44px). Otherwise `<Tabs>` takes Base UI `Tabs.Root`'s props (`value`, `defaultValue`, `onValueChange`, `orientation`), and `Tabs.List` / `Tabs.Tab` / `Tabs.Panel` take theirs — `Tabs.Tab` and `Tabs.Panel` are paired by `value`. Echo adds the skin and the select sound without narrowing the API, so a table here would only restate Base UI's.",
  examples: [
    {
      title: "Basic",
      description: "List of tabs + matching panels.",
      code: [
        '<Tabs defaultValue="a">',
        "  <Tabs.List>",
        '    <Tabs.Tab value="a">Meter</Tabs.Tab>',
        '    <Tabs.Tab value="b">Log</Tabs.Tab>',
        "  </Tabs.List>",
        '  <Tabs.Panel value="a">…</Tabs.Panel>',
        '  <Tabs.Panel value="b">…</Tabs.Panel>',
        "</Tabs>",
      ].join("\n"),
    },
    {
      title: "Sizes",
      description: "`sm` for a card's or a panel's own views, `lg` for the tabs a whole page is built around.",
      code: [
        '<Tabs defaultValue="day">',
        '  <Tabs.List size="sm" aria-label="Chart range">',
        '    <Tabs.Tab value="day">Day</Tabs.Tab>',
        '    <Tabs.Tab value="week">Week</Tabs.Tab>',
        "  </Tabs.List>",
        "</Tabs>",
      ].join("\n"),
    },
  ],
  feel: "Picking a tab slides a thin lit rail under its label with a soft click; the other labels stay quiet on the chassis.",
  usage: {
    imports: 'import { Tabs } from "@/echo/tabs";',
    code: [
      '<Tabs defaultValue="meter">',
      '  <Tabs.List aria-label="Track view">',
      '    <Tabs.Tab value="meter">Meter</Tabs.Tab>',
      '    <Tabs.Tab value="log">Log</Tabs.Tab>',
      "  </Tabs.List>",
      '  <Tabs.Panel value="meter">Levels</Tabs.Panel>',
      '  <Tabs.Panel value="log">History</Tabs.Panel>',
      "</Tabs>",
    ].join("\n"),
  },
  composition: "Tabs\n  Tabs.List\n    Tabs.Tab\n  Tabs.Panel",
  a11y: [
    "Renders the ARIA tabs pattern: `Tabs.List` is a `tablist`, each `Tabs.Tab` a `tab` with `aria-selected`, each `Tabs.Panel` a `tabpanel` labelled by its tab.",
    "Arrow keys move focus between tabs and wrap at the ends; Enter or Space opens the focused tab. Pass `activateOnFocus` to `Tabs.List` to open tabs as focus moves.",
    "Name the list: `aria-label` on `Tabs.List`, or `aria-labelledby` pointing at a visible heading.",
    "The open tab is marked by a lit rail and full-strength label text, not by colour alone.",
  ],
  motion: {
    tokens: ["--echo-duration-sweep", "--echo-duration-swap"],
    reducedMotion: "The rail jumps to the new tab instead of sliding.",
  },
  sound: ["`select` when the open tab changes. Silent without a `SoundProvider`."],
  antiPatterns: [
    "Every Tabs.Tab needs a matching Tabs.Panel with the same value.",
    "Do not put many tabs in a segmented control — it is for a few peer views, not navigation.",
  ],
} as const;
