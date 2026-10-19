"use client";

/** The live preview on /docs/field. */
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";

function SearchFieldPreview() {
  const [q, setQ] = useState("tape saturation");
  return (
    <Field
      aria-label="Search presets"
      value={q}
      onValueChange={setQ}
      start={
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
      }
      end={
        q ? (
          <HardwareButton
            size="sm"
            variant="ghost"
            iconOnly
            aria-label="Clear search"
            onClick={() => setQ("")}
            icon={
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
          />
        ) : null
      }
    />
  );
}

export default function Preview() {
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 320 }}>
      <Field label="Device name" defaultValue="Echo One" />
      <Field label="Serial" defaultValue="EC-0042-XR" mono />
      <SearchFieldPreview />
      <Field
        label="Email"
        type="email"
        defaultValue="ada@"
        description="We only use it to send the session link."
        error="Enter an email address, like ada@example.com."
      />
    </div>
  );
}
