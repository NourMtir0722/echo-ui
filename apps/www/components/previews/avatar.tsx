"use client";

/** The live preview on /docs/avatar. */
import { Avatar } from "@registry/echo/avatar";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";
import { Controls } from "./shared/main-Controls";
import { row } from "./shared/main-row";

function AvatarPreview() {
  const [live, setLive] = useState(true);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <Avatar name="Ada Lovelace" size="sm" />
        <Avatar name="Ada Lovelace" status={live ? "live" : "idle"} />
        <Avatar name="Grace Hopper" size="lg" status={live ? "live" : "idle"} />
        <Avatar name="Alan Turing" size="lg" status="idle" />
        <Avatar name="Echo One, studio unit" initials="E1" size="lg" />
        <Avatar name="Broken Fallback" src="data:image/png;base64,AAAA" size="lg" />
      </div>
      <Controls>
        <HardwareButton size="sm" onClick={() => setLive((l) => !l)} aria-pressed={live}>
          {live ? "Go idle" : "Go live"}
        </HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <AvatarPreview />;
}
