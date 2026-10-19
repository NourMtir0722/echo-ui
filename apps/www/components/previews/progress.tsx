"use client";

/** The live preview on /docs/progress. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Progress } from "@registry/echo/progress";
import { useEffect,useRef,useState } from "react";
import { Controls } from "./shared/main-Controls";
import { powerCycle } from "./shared/main-powerCycle";

function ProgressPreview() {
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0.65);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setValue((v) => {
        if (v >= 1) {
          setRunning(false);
          return 1;
        }
        return Math.min(1, v + 0.05);
      });
    }, 160);
    return () => window.clearInterval(id);
  }, [running]);
  return (
    <div ref={root} style={{ display: "grid", gap: 16, maxWidth: 320 }}>
      <Progress value={value} aria-label="Upload progress" />
      <Progress value={0.2} cells={8} aria-label="Battery" />
      <Controls>
        <HardwareButton
          size="sm"
          variant="primary"
          onClick={() => {
            setValue(0);
            setRunning(true);
          }}
        >
          Upload
        </HardwareButton>
        <HardwareButton size="sm" onClick={() => setValue((v) => Math.max(0, v - 0.1))}>−10%</HardwareButton>
        <HardwareButton size="sm" onClick={() => setValue((v) => Math.min(1, v + 0.1))}>+10%</HardwareButton>
        <HardwareButton size="sm" onClick={() => powerCycle(root.current, ".echo-progress")}>Power cycle</HardwareButton>
      </Controls>
    </div>
  );
}

export default function Preview() {
  return <ProgressPreview />;
}
