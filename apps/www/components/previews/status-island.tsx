"use client";

/** The live preview on /docs/status-island. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { StatusIsland } from "@registry/echo/status-island";
import { useEffect,useState } from "react";
import { stack } from "./shared/objects-stack";

function StatusIslandPreview() {
  const [p, setP] = useState(0.42);
  const [state, setState] = useState<"running" | "done" | "failed">("running");
  useEffect(() => {
    if (state !== "running") return;
    const id = window.setInterval(() => setP((x) => Math.min(1, +(x + 0.03).toFixed(2))), 400);
    return () => window.clearInterval(id);
  }, [state]);
  useEffect(() => {
    if (p >= 1 && state === "running") setState("done");
  }, [p, state]);
  const restart = () => {
    setP(0);
    setState("running");
  };
  const pages = Math.round(p * 28);
  return (
    <div style={{ ...stack, justifyItems: "center", width: "min(420px, 100%)", minHeight: 240 }}>
      <StatusIsland
        label={state === "done" ? "Saved" : state === "failed" ? "Stopped" : "Exporting"}
        title="Q3 report.pdf"
        progress={p}
        state={state}
        detail={
          state === "done"
            ? "Saved to Reports, 2.4 MB"
            : state === "failed"
              ? "Cancelled. Nothing was saved."
              : `${pages} of 28 pages, about ${Math.max(1, Math.round(((1 - p) * 28) / 3))} s left`
        }
        actions={
          state === "running" ? (
            <HardwareButton onClick={() => setState("failed")}>Cancel</HardwareButton>
          ) : (
            <HardwareButton onClick={restart}>Export again</HardwareButton>
          )
        }
      />
      <StatusIsland label="Recording" reading="04:59" />
    </div>
  );
}

export default function Preview() {
  return <StatusIslandPreview />;
}
