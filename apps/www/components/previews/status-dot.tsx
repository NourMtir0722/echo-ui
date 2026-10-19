"use client";

/** The live preview on /docs/status-dot. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { StatusDot } from "@registry/echo/status-dot";
import { useState } from "react";
import { Controls } from "./shared/main-Controls";
import { Labeled } from "./shared/main-Labeled";
import { row } from "./shared/main-row";

function StatusDotPreview() {
  const [recording, setRecording] = useState(true);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <Labeled label={recording ? "recording" : "idle"}>
          <StatusDot on={recording} decorative />
        </Labeled>
        <StatusDot on={false} label="Offline" />
      </div>
      <Controls>
        <HardwareButton size="sm" variant="primary" onClick={() => setRecording((r) => !r)} aria-pressed={recording}>
          {recording ? "Stop" : "Record"}
        </HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <StatusDotPreview />;
}
