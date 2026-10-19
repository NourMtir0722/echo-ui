"use client";

/** The live preview on /docs/led-key. */
import { LedKey } from "@registry/echo/led-key";
import { useState } from "react";
import { row } from "./shared/main-row";

function LedKeyPreview() {
  const [armed, setArmed] = useState(true);
  return (
    <div style={row}>
      <LedKey lit={armed} aria-pressed={armed} onClick={() => setArmed((on) => !on)}>
        Arm
      </LedKey>
      <LedKey lit litLabel="Recording">Rec</LedKey>
      <LedKey>Snooze +5</LedKey>
      <LedKey disabled>Locked</LedKey>
    </div>
  );
}

export default function Preview() {
  return <LedKeyPreview />;
}
