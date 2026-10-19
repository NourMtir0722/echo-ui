"use client";

/** The live preview on /docs/sheet. */
import { Sheet } from "@registry/echo/sheet";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Sheet>
        <Sheet.Trigger>Channels</Sheet.Trigger>
        <Sheet.Content title="Channels" description="Pick an input to monitor.">
          <p style={{ color: "var(--echo-text-dim)", fontSize: 13.5, lineHeight: 1.55 }}>
            Swipe it away, or press Escape. The backdrop tracks the swipe, so dragging it back
            brings the room back with it.
          </p>
        </Sheet.Content>
      </Sheet>
      <Sheet side="left">
        <Sheet.Trigger>From the left</Sheet.Trigger>
        <Sheet.Content title="Navigate" description="Where a mobile nav lives.">
          <p style={{ color: "var(--echo-text-dim)", fontSize: 13.5 }}>Same panel, other edge.</p>
        </Sheet.Content>
      </Sheet>
      <Sheet side="bottom">
        <Sheet.Trigger>From the bottom</Sheet.Trigger>
        <Sheet.Content title="Export" description="One-handed, on a phone.">
          <p style={{ color: "var(--echo-text-dim)", fontSize: 13.5 }}>Swipes down to dismiss.</p>
        </Sheet.Content>
      </Sheet>
    </div>
  );
}
