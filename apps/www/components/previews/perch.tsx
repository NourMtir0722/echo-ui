"use client";

/** The live preview on /docs/perch. */
import { Card } from "@registry/echo/card";
import { Perch } from "@registry/echo/perch";
import { row } from "./shared/objects-row";

function PerchPreview() {
  return (
    <div style={{ ...row, gap: 28, alignItems: "flex-start" }}>
      <div style={{ width: "min(300px, 100%)" }}>
        <Perch>
          <Card title="Welcome" description="Three steps and you're set up." />
        </Perch>
      </div>
      <div style={{ width: "min(300px, 100%)" }}>
        <Perch behavior="peek" at="start" mood="done">
          <Card title="Tip" description="Hover or tab into this card." />
        </Perch>
      </div>
    </div>
  );
}

export default function Preview() {
  return <PerchPreview />;
}
