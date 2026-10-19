"use client";

import { useState } from "react";
import { Calendar } from "@registry/echo/calendar";

/**
 * A test fixture for Calendar: a month with its keys, limits that stop the
 * month keys, a booked day, a form, disabled and read-only, and Arabic on a
 * right-to-left page.
 * tests/calendar.spec.ts drives it, with the clock set to 28 September 2026.
 */
export default function CalendarChecks() {
  const [day, setDay] = useState("2026-09-28");
  const [checkIn, setCheckIn] = useState("");
  const [sent, setSent] = useState("");
  return (
    <main style={{ display: "grid", gap: 24, justifyItems: "start", padding: 24 }}>
      <section id="plain">
        <Calendar locale="en-GB" firstDayOfWeek={1} value={day} onValueChange={setDay} />
        <output id="plain-value">{day}</output>
      </section>

      <section id="limits">
        <Calendar
          aria-label="Check-in"
          locale="en-US"
          min="2026-10-05"
          max="2026-11-20"
          unavailable={(iso) => iso === "2026-10-09"}
          value={checkIn}
          onValueChange={setCheckIn}
          size="sm"
        />
        <output id="limits-value">{checkIn || "none"}</output>
      </section>

      <form
        id="form"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(String(new FormData(event.currentTarget).get("day") ?? ""));
        }}
      >
        <Calendar name="day" locale="en-US" defaultValue="2026-09-28" size="sm" />
        <button type="submit">Send</button>
        <output id="form-value">{sent || "not sent"}</output>
      </form>

      <section id="states">
        <Calendar aria-label="Locked" locale="en-US" defaultValue="2026-09-28" size="sm" disabled />
        <Calendar aria-label="Signed" locale="en-US" defaultValue="2026-09-28" size="sm" readOnly />
      </section>

      <section id="rtl" dir="rtl">
        <Calendar locale="ar-EG" defaultValue="2026-03-15" />
      </section>
    </main>
  );
}
