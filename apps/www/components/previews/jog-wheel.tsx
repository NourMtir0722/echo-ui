"use client";

/** The live preview on /docs/jog-wheel. */
import { JogWheel } from "@registry/echo/jog-wheel";
import { row } from "./shared/objects-row";

const timecode = (frames: number) => {
  const f = Math.abs(frames);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${frames < 0 ? "-" : ""}${two(Math.floor(f / 1500))}:${two(Math.floor(f / 25) % 60)}:${two(f % 25)}`;
};

function JogWheelPreview() {
  return (
    <div style={{ ...row, gap: 40, alignItems: "flex-start" }}>
      <JogWheel label="Position" size="lg" defaultValue={1812} formatValue={timecode} />
      <JogWheel label="Exposure" step={0.1} min={-3} max={3} defaultValue={0} formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} EV`} />
    </div>
  );
}

export default function Preview() {
  return <JogWheelPreview />;
}
