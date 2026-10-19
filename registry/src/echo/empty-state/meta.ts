import { z } from "zod";

export const emptyStateProps = z.object({
  title: z.string().describe("What is not here, stated plainly."),
  description: z.string().optional().describe("Why, or what to expect."),
  icon: z.string().optional().describe("Decorative mark above the title: a small line icon, drawn quiet."),
  illustration: z.unknown().optional().describe("A picture above the title at its own size, in full colour: a Creature, an illustration. Takes the icon's place."),
  action: z.string().optional().describe("The way forward — usually one HardwareButton."),
});

export const meta = {
  name: "echo-empty-state",
  title: "EmptyState",
  description:
    "Nothing here, and what to do about it. Rendered as a quiet recess: the screen is on and working, there is simply nothing in it yet. The action slot is part of the API on purpose — an empty state without a way forward is a dead end.",
  props: emptyStateProps,
  examples: [
    {
      title: "First run",
      description: "Name the thing and offer the one action that fixes it.",
      code: '<EmptyState\n  title="No recordings yet"\n  description="Anything you capture on this device shows up here."\n  action={<HardwareButton variant="primary">Start recording</HardwareButton>}\n/>',
    },
    {
      title: "Filtered to nothing",
      description: "The way forward is undoing the filter, not creating data.",
      code: '<EmptyState title="No matches" description="No takes match this tag." action={<HardwareButton>Clear filters</HardwareButton>} />',
    },
    {
      title: "With a creature",
      description: "An illustration keeps its own size and colour; here the creature naps because there's nothing to do.",
      code: '<EmptyState illustration={<Creature mood="sleep" />} title="No messages yet" description="When someone writes to you, it shows up here." />',
    },
  ],
  feel: "A dark, quiet screen that says what will appear here, and how to make it appear.",
  usage: {
    imports: [
      "import { EmptyState } from \"@/echo/empty-state\";",
      "import { HardwareButton } from \"@/echo/hardware-button\";",
    ].join("\n"),
    code: [
      "<EmptyState",
      "  title=\"No recordings yet\"",
      "  description=\"Anything you capture on this device shows up here.\"",
      "  action={<HardwareButton variant=\"primary\">Start recording</HardwareButton>}",
      "/>",
    ].join("\n"),
  },
  composition: "EmptyState",
  a11y: [
    "The title is a paragraph, not a heading. If the empty region should be reachable by heading navigation, put it under one of your own.",
    "`icon` is decorative and `aria-hidden`; the title and description carry the meaning.",
    "When the state appears after an action (a search with no results), announce it — for example with a Toast — since focus stays where it was.",
  ],
  antiPatterns: [
    "Never ship an empty state with no action. If there is genuinely nothing the user can do, say why in the description — an unexplained blank reads as a bug.",
    "Never use it for a failure. A request that errored is a Banner with a retry; an empty state means the query worked and the answer was nothing.",
    'Never write the title as an apology ("Oops, nothing here!"). Say what is not there; the user is not owed a mood.',
    "Never use it while data is still loading — that is Skeleton. Showing \"nothing here\" before the fetch resolves tells the user something false.",
  ],
} as const;
