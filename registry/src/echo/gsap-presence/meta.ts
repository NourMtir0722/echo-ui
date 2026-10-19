import { z } from "zod";

export const gsapPresenceProps = z.object({
  enter: z.string().default("bloom").describe("Motion token for the enter timing: it grows out of what opened it."),
  exit: z.string().default("summon").describe("Motion token for the exit timing."),
  animate: z
    .object({ enter: z.function(), exit: z.function() })
    .optional()
    .describe(
      "Take over the motion: enter(el, { trigger }) when the popup mounts, exit(el, done, { trigger }) when it closes — call done and it unmounts. Skipped under reduced motion for the plain fade.",
    ),
  defaultOpen: z.boolean().default(false).describe("Initial open state."),
  onOpened: z.function().optional().describe("Called once the enter animation has started."),
});

export const meta = {
  name: "use-gsap-presence",
  title: "useGsapPresence",
  description:
    "The GSAP exit bridge, implemented once and reused by every Base UI wrapper (Modal, Popover, Tooltip). Base UI can auto-detect a CSS transition before unmounting, but not a JS animation — so on close this hook asks Base UI to keep the node mounted, runs the GSAP exit, and calls unmount() itself when the tween finishes. It is Base-UI-agnostic: it only needs an actions object exposing unmount().",
  props: gsapPresenceProps,
  examples: [
    {
      title: "Wire a Base UI Root",
      description:
        "Spread the three controlled props; attach popupRef to the animated popup. The hook types its actions as the one method it calls (`unmount`), so narrow them to the Root's own Actions type at the call site.",
      code: "const p = useGsapPresence();\n<Dialog.Root\n  open={p.open}\n  onOpenChange={p.onOpenChange}\n  actionsRef={p.actionsRef as React.RefObject<Dialog.Root.Actions | null>}\n>\n  <Dialog.Popup ref={p.popupRef}>…</Dialog.Popup>\n</Dialog.Root>",
    },
    {
      title: "Different enter and exit",
      description: "Tokens name the timing at both ends.",
      code: 'const p = useGsapPresence({ enter: "summon", exit: "glitch" });',
    },
  ],
  feel: "A popup leaves the way it arrived, instead of vanishing mid-animation.",
  usage: {
    imports: [
      "import type { RefObject } from \"react\";",
      "import { Dialog } from \"@base-ui/react/dialog\";",
      "import { useGsapPresence } from \"echo-ui-core/presence\";",
    ].join("\n"),
    code: [
      "const p = useGsapPresence();",
      "return (",
      "  <Dialog.Root",
      "    open={p.open}",
      "    onOpenChange={p.onOpenChange}",
      "    actionsRef={p.actionsRef as RefObject<Dialog.Root.Actions | null>}",
      "  >",
      "    <Dialog.Portal>",
      "      <Dialog.Popup ref={p.popupRef}>…</Dialog.Popup>",
      "    </Dialog.Portal>",
      "  </Dialog.Root>",
      ");",
    ].join("\n"),
  },
  motion: {
    tokens: ["bloom", "summon"],
    reducedMotion: "Enter and exit follow the tokens' collapse — `bloom` and `summon` become a fade — and the node still unmounts when it ends.",
  },
  antiPatterns: [
    "Never rely on actionsRef alone to hold the element mounted — it does not. The exit only survives because onOpenChange calls details.preventUnmountOnClose(); drop that call and Base UI removes the node mid-tween.",
    "Never also put a CSS transition on the popup's transform or opacity. GSAP owns those properties here, and Base UI's transition auto-detection will race the tween. Transition the backdrop instead.",
    "Never use this with Base UI Select — its ChangeEventDetails has no preventUnmountOnClose, so there is nothing to hold the node. Select animates through [data-starting-style] / [data-ending-style] CSS instead.",
    "Never assert on role=\"dialog\" to test the exit — Base UI drops the role immediately on close while the node is still animating. Target the popup element's class.",
  ],
} as const;
