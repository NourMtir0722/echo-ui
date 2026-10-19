import { Card } from "@registry/echo/card";
import { ChoiceCards } from "@registry/echo/choice-cards";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Item } from "@registry/echo/item";
import { Grid, Stack } from "@registry/echo/layout";

/**
 * A test fixture for a row of cards, the way an agent built a pricing page:
 * Cards in the list items of a Grid, with bodies of different lengths, a
 * footer action each, and features as Items long enough to need a second
 * line; and two cards, and two choices, in a row with room for three.
 * tests/card-row.spec.ts drives it.
 */
const TIERS = [
  { name: "Close", features: ["Monthly close by day five"] },
  {
    name: "Plan",
    features: ["Everything in Close", "A thirteen-week cash forecast, rebuilt every Monday from the bank feed", "Board pack"],
  },
  {
    name: "Raise",
    features: [
      "Everything in Plan",
      "A data room your investors can read without a call, kept current through the round",
      "Model and narrative for the raise",
      "Investor updates",
    ],
  },
];

export default function CardRowFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-10)", maxWidth: 1080 }}>
      <h1>Card row fixture</h1>
      <div id="tiers">
        <Grid as="ul" minItemWidth="16rem" gap={8}>
          {TIERS.map((tier) => (
            <li key={tier.name}>
              <Card title={tier.name} description="Flat monthly fee" footer={<HardwareButton variant="neutral">Ask about {tier.name}</HardwareButton>}>
                <Stack as="ul" gap={0} aria-label={`What ${tier.name} includes`}>
                  {tier.features.map((line) => (
                    <Item key={line} as="li" size="sm" title={line} />
                  ))}
                </Stack>
              </Card>
            </li>
          ))}
        </Grid>
      </div>
      <div id="pair">
        <Grid minItemWidth="16rem" gap={8}>
          <Card title="We handle">The close, the forecast, the board pack.</Card>
          <Card title="You handle">Telling us about hires and contracts.</Card>
        </Grid>
      </div>
      <div id="choices">
        <ChoiceCards
          label="Billing"
          defaultValue="monthly"
          options={[
            { value: "monthly", title: "Monthly", description: "Stop with 30 days' notice" },
            { value: "annual", title: "Annual", description: "Two months free" },
          ]}
        />
      </div>
      <div id="wide" style={{ maxWidth: 360 }}>
        <Card title="One action" footer={<HardwareButton fullWidth>Book a call</HardwareButton>}>
          Thirty minutes, your numbers.
        </Card>
      </div>
      <div id="truncated" style={{ maxWidth: 240 }}>
        <Item truncate title="quarterly-board-pack-final-v3-reviewed.pdf" description="Uploaded by the controller on Monday" />
      </div>
    </main>
  );
}
