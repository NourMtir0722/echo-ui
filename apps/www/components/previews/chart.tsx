"use client";

/** The live preview on /docs/chart. */
import { Chart } from "@registry/echo/chart";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useEffect,useRef,useState } from "react";
import { Controls } from "./shared/main-Controls";
import { powerCycle } from "./shared/main-powerCycle";

const LEVELS = [
  38, 44, 41, 52, 61, 58, 66, 71, 64, 59, 68, 74, 81, 77, 69, 62, 58, 63, 70, 76, 84, 79, 72, 66,
];

function ChartPreview() {
  const root = useRef<HTMLDivElement>(null);
  const [data, setData] = useState(LEVELS);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      setData((d) => {
        const last = d[d.length - 1] ?? 60;
        const next = Math.max(8, Math.min(98, last + (Math.random() - 0.5) * 26));
        return [...d.slice(1), Math.round(next)];
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [live]);
  return (
    <div ref={root} style={{ display: "grid", gap: 18 }}>
      <Chart data={data} min={0} max={100} label="Input level, last 60 seconds" caption="input" />
      <Chart data={data} variant="line" rows={9} min={0} max={100} label="Input level as a single trace" caption="trace" />
      <Controls>
        <HardwareButton size="sm" variant="primary" onClick={() => setLive((l) => !l)} aria-pressed={live}>
          {live ? "Stop signal" : "Play a signal"}
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => powerCycle(root.current, ".echo-chart")}>Power cycle</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <ChartPreview />;
}
