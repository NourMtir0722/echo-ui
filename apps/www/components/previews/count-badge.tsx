"use client";

/** The live preview on /docs/count-badge. */
import { CountBadge } from "@registry/echo/count-badge";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";
import { caption } from "./shared/main-caption";
import { Controls } from "./shared/main-Controls";
import { row } from "./shared/main-row";

function CountBadgePreview() {
  const [count, setCount] = useState(3);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <CountBadge count={count} label="unread messages" />
        <CountBadge count={count * 12} label="pending takes" variant="neutral" />
        <CountBadge count={0} showZero label="errors" variant="neutral" />
        <span style={caption}>count={0} renders nothing without showZero</span>
      </div>
      <Controls>
        <HardwareButton size="sm" onClick={() => setCount((c) => Math.max(0, c - 1))}>−1</HardwareButton>
        <HardwareButton size="sm" variant="primary" onClick={() => setCount((c) => c + 1)}>+1</HardwareButton>
        <HardwareButton size="sm" onClick={() => setCount((c) => c + 10)}>+10</HardwareButton>
        <HardwareButton size="sm" onClick={() => setCount(0)}>Clear</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <CountBadgePreview />;
}
