"use client";

/** The live preview on /docs/segment-display. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { SegmentDisplay } from "@registry/echo/segment-display";
import { Switch } from "@registry/echo/switch";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { row } from "./shared/objects-row";
import { stack } from "./shared/objects-stack";

function SegmentDisplayPreview() {
  const [station, setStation] = useState(88.5);
  const [queue, setQueue] = useState(7);
  const [ghost, setGhost] = useState(true);
  return (
    <div style={stack}>
      <SegmentDisplay label="Frequency" value={station.toFixed(1)} digits={4} unit="MHz" size="lg" ghost={ghost} />
      <div style={row}>
        <SegmentDisplay label="Time left" value="04:59" ghost={ghost} glow={false} />
        <SegmentDisplay label="Queue" value={String(queue)} digits={3} roll ghost={ghost} />
        <SegmentDisplay label="Status" value="Err" size="sm" ghost={ghost} glow={false} />
      </div>
      <Controls>
        <HardwareButton size="sm" onClick={() => setStation((s) => Math.max(87.5, +(s - 0.1).toFixed(1)))}>
          Tune down
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => setStation((s) => Math.min(108, +(s + 0.1).toFixed(1)))}>
          Tune up
        </HardwareButton>
        <HardwareButton size="sm" variant="primary" onClick={() => setQueue((q) => (q + 13) % 1000)}>
          Add 13
        </HardwareButton>
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--echo-text-dim)" }}>
          <Switch checked={ghost} onCheckedChange={setGhost} aria-labelledby="ghost-label" />
          <span id="ghost-label">Ghost segments</span>
        </span>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <SegmentDisplayPreview />;
}
