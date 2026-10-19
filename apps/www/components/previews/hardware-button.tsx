"use client";

/** The live preview on /docs/hardware-button. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { PlayIcon } from "./shared/main-PlayIcon";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      {/* The one action a screen is built around: its press lands in the body. */}
      <HardwareButton variant="primary" impact>Record</HardwareButton>
      <HardwareButton>Neutral</HardwareButton>
      <HardwareButton variant="ghost">Ghost</HardwareButton>
      <HardwareButton iconOnly aria-label="Play" icon={<PlayIcon />} />
      {/* Engraving belongs on the neutral cap, not the primary one. */}
      <HardwareButton engraved size="lg" caption="rec">
        Hold
      </HardwareButton>
      <HardwareButton loading>Saving</HardwareButton>
      <HardwareButton disabled>Disabled</HardwareButton>
    </div>
  );
}
