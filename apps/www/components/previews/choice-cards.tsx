"use client";

/** The live preview on /docs/choice-cards. */
import { ChoiceCards } from "@registry/echo/choice-cards";

export default function Preview() {
  return (
    <div style={{ width: "100%" }}>
      <ChoiceCards
        label="Plan"
        defaultValue="team"
        options={[
          { value: "solo", title: "Solo", description: "One seat", extra: "$0" },
          { value: "team", title: "Team", description: "Up to 10 seats", extra: "$12 / seat" },
          { value: "studio", title: "Studio", description: "Unlimited seats", extra: "$240" },
        ]}
      />
    </div>
  );
}
