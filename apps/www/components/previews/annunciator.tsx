"use client";

/** The live preview on /docs/annunciator. */
import { Annunciator } from "@registry/echo/annunciator";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { stack } from "./shared/objects-stack";

function AnnunciatorPreview() {
  const [active, setActive] = useState<string[]>(["rec", "sync"]);
  const flip = (v: string) => setActive((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]));
  return (
    <div style={stack}>
      <Annunciator
        label="Status"
        marks={[
          { value: "rec", label: "Recording", mark: "REC" },
          { value: "sync", label: "Syncing", mark: "SYNC" },
          { value: "mute", label: "Muted", mark: "MUTE" },
          { value: "off", label: "Offline", mark: "OFFLINE" },
          { value: "lock", label: "Locked", mark: "LOCK" },
        ]}
        active={active}
      />
      <Controls>
        <HardwareButton size="sm" onClick={() => flip("mute")}>Mute</HardwareButton>
        <HardwareButton size="sm" onClick={() => flip("off")}>Go offline</HardwareButton>
        <HardwareButton size="sm" onClick={() => flip("rec")}>Record</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <AnnunciatorPreview />;
}
