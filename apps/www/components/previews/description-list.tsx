"use client";

/** The live preview on /docs/description-list. */
import { DescriptionList } from "@registry/echo/description-list";
import { row } from "./shared/objects-row";

function DescriptionListPreview() {
  return (
    <div style={{ ...row, alignItems: "flex-start", gap: 28 }}>
      <div style={{ width: "min(300px, 100%)" }}>
        <DescriptionList
          items={[
            { term: "Order", detail: "4821" },
            { term: "Placed", detail: "25 September 2026" },
            { term: "Ship to", detail: "12 North Street, Leeds" },
          ]}
        />
      </div>
      <div style={{ width: "min(240px, 100%)" }}>
        <DescriptionList
          variant="screen"
          layout="inline"
          items={[
            { term: "Battery", detail: "89%" },
            { term: "Sunrise", detail: "07:28" },
            { term: "Steps", detail: "6,954" },
            { term: "Rain", detail: "12%" },
          ]}
        />
      </div>
    </div>
  );
}

export default function Preview() {
  return <DescriptionListPreview />;
}
