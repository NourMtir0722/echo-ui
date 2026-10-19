"use client";

import { useState } from "react";
import { DatePicker } from "@registry/echo/date-picker";

/**
 * A test fixture for DatePicker: typed or chosen on the calendar, the popup
 * opened by its key and by Alt+↓, and a disabled one.
 * tests/date-picker.spec.ts drives it, with the clock set to 28 September 2026.
 */
export default function DatePickerChecks() {
  const [due, setDue] = useState("2026-10-14");
  return (
    <main style={{ display: "grid", gap: 24, maxWidth: 360, padding: 24, paddingBlockEnd: 480 }}>
      <section id="picker">
        <DatePicker
          label="Due"
          locale="en-US"
          value={due}
          onValueChange={setDue}
          min="2026-10-01"
          max="2026-12-31"
          unavailable={(iso) => iso === "2026-10-21"}
        />
        <output id="picker-value">{due || "none"}</output>
      </section>

      <section id="off">
        <DatePicker label="Locked" locale="en-US" defaultValue="2026-10-14" disabled />
      </section>
    </main>
  );
}
