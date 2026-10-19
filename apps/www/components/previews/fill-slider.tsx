"use client";

/** The live preview on /docs/fill-slider. */
import { FillSlider } from "@registry/echo/fill-slider";
import { useState } from "react";
import { glyph } from "./shared/objects-glyph";
import { row } from "./shared/objects-row";
import { SUN } from "./shared/objects-SUN";

const SPEAKER = glyph("M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13");

function FillSliderPreview() {
  const [brightness, setBrightness] = useState(70);
  return (
    <div style={{ ...row, gap: 24, alignItems: "flex-end" }}>
      <FillSlider label="Brightness" icon={SUN} value={brightness} onValueChange={setBrightness} />
      <FillSlider label="Volume" icon={SPEAKER} defaultValue={40} />
      <span style={{ fontSize: 13, color: "var(--echo-text-dim)" }}>Brightness {brightness}%</span>
    </div>
  );
}

export default function Preview() {
  return <FillSliderPreview />;
}
