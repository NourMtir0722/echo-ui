"use client";

/** The live preview on /docs/steps. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Steps } from "@registry/echo/steps";
import { useState } from "react";
import { row } from "./shared/main-row";

function StepsPreview() {
  const [current, setCurrent] = useState(1);
  const steps = ["Connect", "Calibrate", "Record", "Done"];
  return (
    <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 460 }}>
      <Steps label="Setup" current={current} steps={steps} />
      <div style={row}>
        <HardwareButton size="sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
          Back
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant="primary"
          onClick={() => setCurrent((c) => Math.min(steps.length, c + 1))}
        >
          Next
        </HardwareButton>
      </div>
    </div>
  );
}

export default function Preview() {
  return <StepsPreview />;
}
