"use client";

/** The live preview on /docs/tuner. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Tuner } from "@registry/echo/tuner";
import { useState } from "react";
import { Controls } from "./shared/objects-Controls";
import { stack } from "./shared/objects-stack";

function TunerPreview() {
  const [weight, setWeight] = useState(72.5);
  return (
    <div style={{ ...stack, width: "min(440px, 100%)", justifyItems: "stretch" }}>
      <Tuner label="Weight" unit="kg" min={30} max={150} step={0.5} value={weight} onValueChange={setWeight} />
      <Tuner label="Frequency" unit="MHz" min={87.5} max={108} step={0.1} defaultValue={88.5} />
      <Controls>
        <HardwareButton size="sm" onClick={() => setWeight(60)}>60 kg</HardwareButton>
        <HardwareButton size="sm" onClick={() => setWeight(95)}>95 kg</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <TunerPreview />;
}
