import { z } from "zod";

export const morphProps = z.object({
  children: z
    .unknown()
    .describe("Your HardwareButtons, in whatever state you render. When they change, the old ones flow into the new."),
  feel: z
    .enum(["cell", "mercury", "cut"])
    .optional()
    .describe("How it moves: cell (default) pinches evenly and each half swells round; mercury is short, quick and jiggles; cut is a clean cut, then the caps slide."),
  align: z.enum(["center", "start", "end"]).optional().describe("Which edge stays put while the buttons change."),
  onEscape: z.function().optional().describe("Called on Escape inside it, e.g. to fold back."),
  status: z.string().optional().describe("Said politely when it changes: what the new state means."),
  label: z.string().optional().describe("Names the buttons as a group."),
});

export const meta = {
  name: "echo-morph",
  title: "Morph",
  description:
    "Wrap your own HardwareButtons and render whatever state you like: when the buttons inside change, the old ones flow into the new ones as one liquid body. One becoming several divides at the waist, several becoming one folds, and the same number move and resize in place. At rest there is nothing but your buttons; the body is drawn only while the shape changes, in the cap's own material. Give a button data-morph=\"name\" and it is the same button in every state that has that name; filled caps (HardwareButton fill) are drawn as levels.",
  props: morphProps,
  examples: [
    {
      title: "Done, and its way back",
      description: "One button becomes two. The lit cap reports the state, so it can't be pressed.",
      code: [
        "<Morph onEscape={() => setDone(false)}>",
        "  {done ? (",
        "    <>",
        '      <HardwareButton variant="primary" disabled>Done</HardwareButton>',
        "      <HardwareButton onClick={() => setDone(false)}>Undo</HardwareButton>",
        "    </>",
        "  ) : (",
        "    <HardwareButton onClick={() => setDone(true)}>Mark as done</HardwareButton>",
        "  )}",
        "</Morph>",
      ].join("\n"),
    },
    {
      title: "A label that changes",
      description: "The same button with a new label flows to its new width instead of jumping.",
      code: [
        "<Morph>",
        "  <HardwareButton onClick={save}>{saved ? \"Saved\" : \"Save changes\"}</HardwareButton>",
        "</Morph>",
      ].join("\n"),
    },
    {
      title: "The same button across states",
      description: "Named alike, the duration you pick is the cap the others run into.",
      code: [
        "<Morph>",
        "  {running ? (",
        '    <HardwareButton data-morph="30s" fill={left / total} onClick={pause}>{clock}</HardwareButton>',
        "  ) : (",
        "    <>",
        '      <HardwareButton data-morph="10s" onClick={() => start(10)}>10s</HardwareButton>',
        '      <HardwareButton data-morph="30s" onClick={() => start(30)}>30s</HardwareButton>',
        "    </>",
        "  )}",
        "</Morph>",
      ].join("\n"),
    },
    {
      title: "No liquid",
      description: "The same change with the cut feel, for a quieter screen.",
      code: [
        '<Morph feel="cut">',
        "  {asking ? (",
        "    <>",
        "      <HardwareButton onClick={no}>No</HardwareButton>",
        '      <HardwareButton variant="primary" onClick={yes}>Yes</HardwareButton>',
        "    </>",
        "  ) : (",
        "    <HardwareButton onClick={ask}>Answer</HardwareButton>",
        "  )}",
        "</Morph>",
      ].join("\n"),
    },
  ],
  feel: "A button that comes apart in your hand into the buttons you need next, and flows back together.",
  usage: {
    imports: ['import { Morph } from "@/echo/morph";', 'import { HardwareButton } from "@/echo/hardware-button";'].join("\n"),
    code: [
      "<Morph>",
      "  {open ? (",
      "    <>",
      "      <HardwareButton onClick={keep}>Keep</HardwareButton>",
      '      <HardwareButton variant="primary" onClick={discard}>Discard</HardwareButton>',
      "    </>",
      "  ) : (",
      "    <HardwareButton onClick={() => setOpen(true)}>Close draft</HardwareButton>",
      "  )}",
      "</Morph>",
    ].join("\n"),
  },
  composition: "Morph → your HardwareButtons, with echo-ui-core's MorphSurface drawn only while they change",
  a11y: [
    "Every cap is your own HardwareButton, with its own name, state and handlers; Morph adds none.",
    "If focus was on a button that went away, it moves to the first new button that can take it, so a keyboard user lands on the next choice.",
    "Escape inside it calls `onEscape`.",
    "Pass `status` to say what the new state means; it's announced politely.",
    "Reduced motion, forced colors and a row that wraps onto more than one line swap the buttons in place.",
  ],
  motion: {
    tokens: ["morphFeels.cell", "morphFeels.mercury", "morphFeels.cut"],
    reducedMotion: "The buttons swap in place: no drawn body.",
  },
  sound: [
    "Each cap's own press and release (HardwareButton).",
    "A soft pop when a neck snaps and a gulp when two caps fuse, inside a SoundProvider.",
  ],
  antiPatterns: [
    "Never divide into more than about four buttons: past that it's a menu, and Menu reads better.",
    "Never make a lit cap a button that does nothing — disable it and say so, as DoneButton does.",
    "Never make both buttons of a destructive choice primary: one lit cap is the one to press on purpose.",
    "Never put anything but a row of HardwareButtons inside: the body is drawn from their caps.",
  ],
} as const;
