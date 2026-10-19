import { z } from "zod";

export const addToBagProps = z.object({
  count: z.number().describe("How many are in the bag."),
  onAdd: z.function().describe("Add one. It runs at once; the badge shows it when the drop lands."),
  children: z.string().optional().describe('The button\'s label. Defaults to "Add to bag".'),
  countLabel: z.string().optional().describe('What the count is of, for the badge\'s name: "3 in bag". Defaults to "in bag".'),
  icon: z.unknown().optional().describe("The button's icon. Defaults to a plus."),
  disabled: z.boolean().optional(),
  size: z.enum(["sm", "md", "lg"]).optional().describe("Height of its cap on the control scale: sm 32px, md 44px, lg 60px, as a HardwareButton of that size. Defaults to the nearest SizeProvider's size."),
});

export const meta = {
  name: "echo-add-to-bag",
  title: "AddToBag",
  description:
    "Press it and a drop buds out of the button and lands in the count beside it, which swells and goes up — the eye follows the thing you added to where it went. A HardwareButton and a CountBadge, joined by useBudOff.",
  props: addToBagProps,
  examples: [
    {
      title: "A cart",
      description: "The count is yours; the button only adds.",
      code: '<AddToBag count={cart.length} onAdd={() => addToCart(item)} countLabel="in cart">Add to cart</AddToBag>',
    },
  ],
  feel: "What you added visibly goes into the bag.",
  usage: {
    imports: 'import { AddToBag } from "@/echo/add-to-bag";',
    code: "<AddToBag count={count} onAdd={() => setCount((n: number) => n + 1)} />",
  },
  composition: "AddToBag → HardwareButton + CountBadge, with useBudOff between them",
  a11y: [
    "The count is a CountBadge (role=status) that says its number with what it counts: \"3 in bag\".",
    "The drop is decoration and hidden from assistive tech; the badge is what's announced.",
    "Keyboard: Tab reaches it; Enter or Space adds one to the bag.",
  ],
  motion: {
    tokens: ["springs"],
    reducedMotion: "No drop: the count goes up at once.",
  },
  sound: ["The cap's own press, and a soft gulp as the drop lands (inside a SoundProvider)."],
  antiPatterns: ["Never delay the add itself until the drop lands: onAdd runs at once; only the count waits."],
} as const;
