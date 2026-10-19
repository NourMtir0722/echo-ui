"use client";

/** The live preview on /docs/slider. */
import { Slider } from "@registry/echo/slider";
import { useState } from "react";
import { caption } from "./shared/main-caption";

function SliderPreview() {
  const [value, setValue] = useState(0.4);
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
      <Slider value={value} onValueChange={setValue} min={0} max={1} step={0.01} aria-label="Level" />
      <span style={caption}>{Math.round(value * 100)}%</span>
      <Slider size="sm" defaultValue={30} aria-label="Send (small)" />
      <span style={caption}>size=&quot;sm&quot; — for dense rows</span>
    </div>
  );
}

export default function Preview() {
  return <SliderPreview />;
}
