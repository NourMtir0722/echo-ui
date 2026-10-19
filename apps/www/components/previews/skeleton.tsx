"use client";

/** The live preview on /docs/skeleton. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Skeleton } from "@registry/echo/skeleton";
import { useState } from "react";
import { Controls } from "./shared/main-Controls";

function SkeletonPreview() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 360 }}>
      {loaded ? (
        <div style={{ display: "grid", gap: 8, color: "var(--echo-text)", fontSize: 14, lineHeight: 1.5 }}>
          <strong>Session notes</strong>
          <span style={{ color: "var(--echo-text-dim)" }}>
            Second verse was flat on the high note. Retake after the break, with the room mic closer.
          </span>
        </div>
      ) : (
        <>
          <Skeleton lines={3} label="Loading article" />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton variant="circle" height={36} />
            <Skeleton width={160} />
          </div>
          <Skeleton variant="block" height={120} />
        </>
      )}
      <Controls>
        <HardwareButton size="sm" onClick={() => setLoaded((l) => !l)}>
          {loaded ? "Load again" : "Finish loading"}
        </HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <SkeletonPreview />;
}
