"use client";

/** The live preview on /docs/lcd-chip. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { LcdChip } from "@registry/echo/lcd-chip";
import { useRef,useState } from "react";
import { Controls } from "./shared/main-Controls";
import { powerCycle } from "./shared/main-powerCycle";
import { row } from "./shared/main-row";

function LcdChipPreview() {
  const root = useRef<HTMLDivElement>(null);
  const [bpm, setBpm] = useState(128);
  return (
    <div ref={root} style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <LcdChip value="07:42" label="Uptime" />
        <LcdChip value={String(bpm)} label="BPM" />
        <LcdChip value="--" label="Signal" glow={false} />
      </div>
      <Controls>
        <HardwareButton size="sm" onClick={() => setBpm((b) => b - 1)}>Slower</HardwareButton>
        <HardwareButton size="sm" variant="primary" onClick={() => setBpm((b) => b + 1)}>Faster</HardwareButton>
        <HardwareButton size="sm" onClick={() => powerCycle(root.current, ".echo-lcd-chip")}>Power cycle</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <LcdChipPreview />;
}
