import { z } from "zod";

export const toastProps = z.object({
  title: z.string().describe("Headline of the notification."),
  body: z.string().optional().describe("Secondary line."),
  tone: z
    .enum(["info", "active"])
    .default("info")
    .describe(
      "Echo's one status vocabulary, the subset a toast slab can express. active lights the LED accent — for something happening, not decoration. info is the plain slab.",
    ),
});

export const meta = {
  name: "echo-toast",
  title: "Toast",
  description:
    "A raised glass notification slab with a status LED, and the toaster that announces it. Mount <Toaster> once around the app and call toast() from useToast(): the toaster's live region is on the page before anything is said, so every toast is announced. Built on Base UI's Toast. Consumes var(--echo-*).",
  props: toastProps,
  examples: [
    {
      title: "Announce something",
      description: "Mount the toaster once, then raise toasts from anywhere inside it.",
      code: 'function SaveButton() {\n  const toast = useToast();\n  return <HardwareButton onClick={() => toast({ title: "Saved", body: "Draft stored locally" })}>Save</HardwareButton>;\n}\n\n<Toaster>\n  <SaveButton />\n</Toaster>',
    },
    {
      title: "Something is live",
      description: "`active` lights the LED, for an event that is happening.",
      code: 'toast({ title: "Recording", tone: "active", timeout: 0 })',
    },
    { title: "The slab alone", description: "For showing one on a page. It announces nothing.", code: '<Toast title="Saved" body="Draft stored locally" />' },
  ],
  feel: "A glass slab with a status LED that confirms, quietly, that something happened. Toasts pile like a stack of cards and fan out under your hand; flick one away and it leaves at the speed you threw it, turning from where you held it. Its dismiss key presses a pixel down like the library's keys.",
  usage: {
    imports: "import { Toaster, useToast } from \"@/echo/toast\";",
    code: "// Once, around the app:\nfunction App({ children }: { children: React.ReactNode }) {\n  return <Toaster>{children}</Toaster>;\n}\n\n// Anywhere inside it:\nfunction SaveButton() {\n  const toast = useToast();\n  return <button onClick={() => toast({ title: \"Saved\" })}>Save</button>;\n}",
  },
  composition: "Toaster → toasts from useToast()",
  a11y: [
    "The toaster is a live region named “Notifications”, on the page before any toast, so each toast is announced when it arrives. A status created together with its text often isn't, which is why the slab alone announces nothing.",
    "Toasts are polite by default. `priority: \"high\"` interrupts; keep it for what can't wait.",
    "Each toast has a “Dismiss notification” button. Toasts stay 6 seconds by default; for anything people must act on, use `timeout: 0` or don't use a toast.",
    "The pile fans into a column when the pointer is on it or focus is in it (F6 moves focus there), and the timers pause while it's open, so every toast and its dismiss button can be read and reached. A flick is a pointer extra: the dismiss button does the same.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The pile and the column jump into place, nothing turns, and a flicked toast fades where it was let go.",
  },
  antiPatterns: [
    "Don't mount a second toaster for each screen; one around the app announces everything.",
    "Never put the only copy of something important in a toast. It leaves; give people a way to find it again.",
    "Never keep an `active` toast on screen after the event ends; the LED means live, not important.",
  ],
} as const;
