"use client";

/** The live preview on /docs/level-meter. */
import { Stack } from "@registry/echo/layout";
import { LevelMeter } from "@registry/echo/level-meter";
import { Toggle } from "@registry/echo/toggle";
import { useEffect,useState } from "react";

function LevelMeterPreview() {
  const [level, setLevel] = useState([0.3, 0.25]);
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!on) {
      setLevel([0, 0]);
      return;
    }
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.12;
      const beat = Math.max(0, Math.sin(t * 2.1)) ** 6;
      setLevel([0.35 + 0.25 * Math.sin(t) + 0.35 * beat, 0.32 + 0.22 * Math.sin(t + 0.8) + 0.4 * beat]);
    }, 60);
    return () => window.clearInterval(id);
  }, [on]);
  return (
    <Stack direction="row" gap={8} align="end">
      <LevelMeter label="Left" level={level[0]!} />
      <LevelMeter label="Right" level={level[1]!} />
      <Toggle pressed={on} onPressedChange={setOn}>
        Signal
      </Toggle>
    </Stack>
  );
}

export default function Preview() {
  return <LevelMeterPreview />;
}
