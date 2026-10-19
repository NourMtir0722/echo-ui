"use client";

/** The live preview on /docs/date-picker. */
import { DatePicker } from "@registry/echo/date-picker";
import { useState } from "react";

const BOOKED = ["2026-10-09", "2026-10-10", "2026-10-21"];

export default function Preview() {
  const [due, setDue] = useState("2026-10-14");
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 320 }}>
      <DatePicker
        label="Check-in"
        value={due}
        onValueChange={setDue}
        min="2026-10-01"
        max="2026-12-31"
        unavailable={(iso) => BOOKED.includes(iso)}
      />
    </div>
  );
}
