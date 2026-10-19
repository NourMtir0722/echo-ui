export const meta = {
  name: "echo-accordion",
  title: "Accordion",
  description:
    "Base UI Accordion (keyboard, a11y, height measurement) skinned as molded device panels that expand. Click sound on toggle; height animates via CSS. Compound API.",
  props: null,
  /**
   * Accordion is a pure passthrough, so there is no schema to walk — see propsNote.
   */
  propsNote:
    "Compound API with no props of its own. `<Accordion>` takes Base UI `Accordion.Root`'s props — note `multiple` (Base UI 1.x), not `openMultiple` — and `Accordion.Item` / `Accordion.Trigger` / `Accordion.Panel` take theirs. Echo adds the skin and the click sound without narrowing the API, so a table here would only restate Base UI's.",
  examples: [
    {
      title: "Basic",
      description: "Items with a trigger and a panel each.",
      code: [
        "<Accordion multiple={false}>",
        '  <Accordion.Item value="a">',
        "    <Accordion.Trigger>Signal</Accordion.Trigger>",
        "    <Accordion.Panel>…</Accordion.Panel>",
        "  </Accordion.Item>",
        "</Accordion>",
      ].join("\n"),
    },
  ],
  feel: "Ruled rows that fold open under their heading with a soft tap.",
  usage: {
    imports: "import { Accordion } from \"@/echo/accordion\";",
    code: [
      "<Accordion>",
      "  <Accordion.Item value=\"signal\">",
      "    <Accordion.Trigger>Signal</Accordion.Trigger>",
      "    <Accordion.Panel>Input gain, routing and monitoring.</Accordion.Panel>",
      "  </Accordion.Item>",
      "</Accordion>",
    ].join("\n"),
  },
  composition: "Accordion\n  Accordion.Item\n    Accordion.Trigger\n    Accordion.Panel",
  a11y: [
    "Base UI Accordion: each trigger is a button inside a heading, with `aria-expanded` and `aria-controls` pointing at its panel.",
    "Enter or Space opens and closes; arrow keys move between triggers.",
    "One panel open at a time by default; pass `multiple` to allow several.",
  ],
  motion: {
    tokens: ["--echo-duration-pop", "--echo-duration-sweep"],
    reducedMotion: "The panel opens and closes at once, the chevron turns without a spring, and the contents appear without rising.",
  },
  sound: [
    "`tap` when a panel opens or closes.",
  ],
  antiPatterns: [
    "Do not animate the panel with a soft ease on pixel/LCD content inside — the panel height is glass-smooth, but LCD children stay steppy.",
    "The prop is `multiple` (Base UI 1.x), NOT `openMultiple` (the old RC name) — a wrong name silently falls through to the DOM and React warns. Default is multiple={false}, one panel open at a time; pass multiple to allow several.",
  ],
} as const;
