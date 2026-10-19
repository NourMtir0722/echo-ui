"use client";

/** The live preview on /docs/date-field. */
import { DateField } from "@registry/echo/date-field";
import { useState } from "react";

function LimitedPreview() {
  const [start, setStart] = useState("2026-09-28");
  return (
    <DateField
      label="Start date"
      value={start}
      onValueChange={setStart}
      min="2026-01-01"
      max="2026-12-31"
      description="Any day this year."
    />
  );
}

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 320 }}>
      <DateField label="Date of birth" />
      <LimitedPreview />
      <DateField label="Datum" locale="de" defaultValue="2026-09-28" size="sm" />
    </div>
  );
}
