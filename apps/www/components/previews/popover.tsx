"use client";

/** The live preview on /docs/popover. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Popover } from "@registry/echo/popover";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Popover trigger={<HardwareButton>Details</HardwareButton>} title="Signal">
        <p style={{ color: "var(--echo-text-dim)", margin: 0 }}>
          Anchored, dismissible, and focus-managed by Base UI.
        </p>
      </Popover>
    </div>
  );
}
