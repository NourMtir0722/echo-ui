import { z } from "zod";

export const cardProps = z.object({
  title: z.unknown().describe("The card's name. With href or onClick it is also the link or button."),
  description: z.unknown().optional().describe("A line under the title."),
  action: z.unknown().optional().describe("One control at the header's end: a menu, a toggle, a small button."),
  media: z.unknown().optional().describe("An image, chart or preview across the top, flush to the edges."),
  children: z.unknown().optional().describe("The body."),
  footer: z.unknown().optional().describe("Actions along the bottom, from the content's start edge; their controls default to sm. One action across the whole footer is a fullWidth key."),
  variant: z.enum(["raised", "screen"]).default("raised").describe("raised plastic, or a screen well for a readout."),
  size: z.enum(["sm", "md", "lg"]).default("md").describe("Padding and gaps: sm for dense dashboards, lg for a feature."),
  href: z.string().optional().describe("The whole card goes here."),
  onClick: z.function().optional().describe("The whole card does this."),
  headingLevel: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3).describe("The title's heading level."),
});

export const meta = {
  name: "echo-card",
  title: "Card",
  description:
    "A Panel with an anatomy, so every card is spaced the same way: media flush to the edges, a header (title, description, one action), a body, and a footer whose controls are sm, pinned to the bottom so a row of cards lines its actions up. A Card alone in a list item fills it, so a Grid of cards as a list is one height a row. With href or onClick the whole card is pressable: the title becomes the link or button stretched over the card, it presses a pixel into the surface and sends Panel's ripple, and its own action and footer controls stay separate targets. Closed: slots are props, spacing is size.",
  props: cardProps,
  examples: [
    {
      title: "A settings card",
      description: "Title, description, body and footer actions.",
      code: [
        '<Card',
        '  title="Backups"',
        '  description="Nightly, kept for 30 days."',
        '  footer={<HardwareButton>Restore</HardwareButton>}',
        '>',
        "  Last backup 02:14.",
        "</Card>",
      ].join("\n"),
    },
    {
      title: "A card that goes somewhere",
      description: "The whole card is the link; the title is its name.",
      code: '<Card title="Getting started" description="Install and theme in five minutes." href="/docs/installation" />',
    },
    {
      title: "A row of plans",
      description: "In a list, every card is the row's height and the actions line up.",
      code: [
        '<Grid as="ul" minItemWidth="16rem">',
        "  {plans.map((plan: { name: string; price: string; features: string[] }) => (",
        "    <li key={plan.name}>",
        "      <Card title={plan.name} description={plan.price} footer={<HardwareButton fullWidth>Choose {plan.name}</HardwareButton>}>",
        '        <Stack as="ul" gap={0}>{plan.features.map((f: string) => <Item key={f} as="li" size="sm" title={f} />)}</Stack>',
        "      </Card>",
        "    </li>",
        "  ))}",
        "</Grid>",
      ].join("\n"),
    },
    {
      title: "A readout",
      description: "The screen variant, for numbers.",
      code: '<Card variant="screen" size="sm" title="Latency"><StatTile value="42" unit="ms" label="p95" /></Card>',
    },
  ],
  feel: "A molded slab you can set things on. A card that goes somewhere lifts toward the light as you reach for it and sinks a pixel as you press, sending a wave out from your finger.",
  usage: {
    imports: 'import { Card } from "@/echo/card";',
    code: '<Card title="Backups" description="Nightly">{body}</Card>',
  },
  composition: "Card → Panel material; header, body, footer (SizeProvider sm); stretched title link when interactive",
  a11y: [
    "The title is a real heading (h3 by default; `headingLevel` changes it).",
    "An interactive card is one link or button named by its title, with one focus ring around the whole card; a screen reader doesn't hear the card twice.",
    "The action and footer controls stay separate targets with their own names, above the stretched link.",
    "The ripple is decoration, hidden from assistive tech and still under reduced motion.",
    "Keyboard: an interactive card is one Tab stop; Enter follows its link (Enter or Space presses it when it's a button), and its action and footer controls are Tab stops of their own.",
  ],
  motion: {
    tokens: ["--echo-duration-tick", "--echo-duration-swap"],
    reducedMotion: "An interactive card doesn't sink or ripple; it still lights its focus ring.",
  },
  sound: ["`tap` when an interactive card is pressed, inside a SoundProvider."],
  antiPatterns: [
    "Never put a second link in an interactive card's body: the card is already one, and a screen reader hears the card as its title.",
    "Never make every card on a screen interactive and give them all actions too: pick one way in.",
    "Don't nest a Card in a Card; use a divider or an Item list inside.",
  ],
} as const;
