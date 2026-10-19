"use client";

/** The live preview on /docs/week-strip. */
import { WeekStrip } from "@registry/echo/week-strip";
import { useState } from "react";
import { stack } from "./shared/objects-stack";

function WeekStripPreview() {
  const [day, setDay] = useState("2026-09-25");
  return (
    <div style={{ ...stack, width: "min(460px, 100%)", justifyItems: "stretch" }}>
      <WeekStrip label="Day" value={day} onValueChange={setDay} today="2026-09-25" marked={["2026-09-22", "2026-09-24", "2026-09-26", "2026-10-01"]} />
      <p style={{ margin: 0, fontSize: 13, color: "var(--echo-text-dim)" }}>Chosen: {day}</p>
    </div>
  );
}

export default function Preview() {
  return <WeekStripPreview />;
}
