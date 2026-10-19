"use client";

/** The live preview on /docs/calendar. */
import { Calendar } from "@registry/echo/calendar";
import { useState } from "react";

const BOOKED = ["2026-10-09", "2026-10-10", "2026-10-21"];

export default function Preview() {
  const [day, setDay] = useState("2026-10-14");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      <Calendar
        aria-label="Check-in"
        value={day}
        onValueChange={setDay}
        min="2026-10-01"
        max="2026-12-31"
        unavailable={(iso) => BOOKED.includes(iso)}
      />
      <Calendar size="sm" firstDayOfWeek={1} defaultValue="2026-09-28" />
    </div>
  );
}
