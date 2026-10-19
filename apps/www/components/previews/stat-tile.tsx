"use client";

/** The live preview on /docs/stat-tile. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { StatTile } from "@registry/echo/stat-tile";
import { useRef,useState } from "react";
import { Controls } from "./shared/main-Controls";
import { powerCycle } from "./shared/main-powerCycle";
import { row } from "./shared/main-row";

function StatTilePreview() {
  const root = useRef<HTMLDivElement>(null);
  const [latency, setLatency] = useState(42);
  const [sessions, setSessions] = useState(128);
  return (
    <div ref={root} style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <StatTile value={String(latency)} unit="ms" label="Latency" />
        <StatTile value={String(sessions)} label="Sessions" glow={false} />
      </div>
      <Controls>
        <HardwareButton
          size="sm"
          variant="primary"
          onClick={() => {
            setLatency(18 + Math.round(Math.random() * 60));
            setSessions((n) => n + 1);
          }}
        >
          New reading
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => powerCycle(root.current, ".echo-stat-tile")}>
          Power cycle
        </HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <StatTilePreview />;
}
