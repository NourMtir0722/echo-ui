import { z } from "zod";

export const scrollAreaProps = z.object({
  children: z.unknown().describe("What scrolls."),
  maxHeight: z.string().optional().describe('The most it may be before it scrolls, as a CSS length ("20rem", "60vh").'),
  orientation: z.enum(["vertical", "horizontal", "both"]).default("vertical").describe("Which way it scrolls: vertical (the default), horizontal or both."),
  "aria-label": z.string().optional().describe("Its name. A ScrollArea takes focus so a keyboard can scroll it, so it needs aria-label or aria-labelledby: leaving both out is a type error."),
  "aria-labelledby": z.string().optional(),
});

export const meta = {
  name: "echo-scroll-area",
  title: "ScrollArea",
  description:
    "A region that scrolls inside itself, with the scrollbar in the device's material: a thin groove and a molded thumb that fattens under the hand, and shade at an edge wherever the content continues. Native scrolling (wheel, touch, keyboard, find-in-page) is untouched. Built on Base UI ScrollArea.",
  props: scrollAreaProps,
  examples: [
    {
      title: "A long list",
      description: "Scrolls past 20rem; the bottom edge shades while there's more.",
      code: '<ScrollArea aria-label="Members" maxHeight="20rem">{members}</ScrollArea>',
    },
    {
      title: "Sideways",
      description: "A row of cards that scrolls horizontally.",
      code: '<ScrollArea aria-label="Presets" orientation="horizontal">{presets}</ScrollArea>',
    },
  ],
  feel: "A groove cut into the surface with a small molded thumb riding in it; where the list goes on, the edge sinks into shade.",
  usage: {
    imports: 'import { ScrollArea } from "@/echo/scroll-area";',
    code: '<ScrollArea aria-label="Log" maxHeight="16rem">{lines}</ScrollArea>',
  },
  composition: "ScrollArea → a named, focusable viewport and a groove with a thumb (Base UI ScrollArea)",
  a11y: [
    "The viewport is a named region that takes focus, so arrow keys, Page Up/Down and Space scroll it.",
    "Scrolling is native: wheel, touch, keyboard and find-in-page all work.",
    "The bar is a pointer extra; nothing is reachable only by dragging it.",
  ],
  motion: {
    tokens: ["--echo-duration-swap", "--echo-duration-tick"],
    reducedMotion: "The bar wakes and fattens without easing.",
  },
  antiPatterns: [
    "Never nest one vertical ScrollArea in another: the wheel gets stuck in whichever is under it.",
    "Never put a whole page in one: the page already scrolls.",
  ],
} as const;
