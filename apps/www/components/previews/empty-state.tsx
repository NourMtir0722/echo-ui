"use client";

/** The live preview on /docs/empty-state. */
import { EmptyState } from "@registry/echo/empty-state";
import { HardwareButton } from "@registry/echo/hardware-button";

export default function Preview() {
  return (
    <div style={{ maxWidth: 420 }}>
      <EmptyState
        title="No recordings yet"
        description="Anything you capture on this device shows up here."
        action={<HardwareButton variant="primary">Start recording</HardwareButton>}
      />
    </div>
  );
}
