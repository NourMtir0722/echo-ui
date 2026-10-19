"use client";

/** The live preview on /docs/range-slider. */
import { RangeSlider } from "@registry/echo/range-slider";

export default function Preview() {
  return (
    <div style={{ width: "min(360px, 100%)" }}>
      <RangeSlider label="Price" defaultValue={[40, 140]} max={200} step={5} formatValue={(v) => `$${v}`} />
    </div>
  );
}
