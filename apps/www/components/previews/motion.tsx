"use client";

/** The live preview on /docs/motion. */
import { motion,MOTION_NAMES } from "echo-ui-core/motion";
import { mono } from "./shared/main-mono";

function MotionPreview() {
  return (
    /*
      A declared scroll region, not a wrapped table. These are token
      names, durations and easing curves — breaking `back.out(2)` across two
      lines makes it unreadable, so the honest answer for tabular data that
      does not fit is to let it scroll, which is also what the Table component
      does. `tabIndex` keeps it reachable from the keyboard.
    */
    <div style={{ overflowX: "auto" }} tabIndex={0}>
    <table style={{ borderCollapse: "collapse", fontFamily: mono, fontSize: 13, width: "100%" }}>
      <thead>
        <tr style={{ color: "var(--echo-text-dim)", textAlign: "left" }}>
          <th style={cell}>token</th>
          <th style={cell}>duration</th>
          <th style={cell}>ease</th>
          <th style={cell}>reduced</th>
        </tr>
      </thead>
      <tbody>
        {MOTION_NAMES.map((name) => {
          const t = motion[name];
          const reduced = "reduced" in t ? t.reduced : "none";
          return (
            <tr key={name} style={{ color: "var(--echo-text-dim)" }}>
              <td style={{ ...cell, color: "var(--echo-text)" }}>{name}</td>
              <td style={cell}>{"duration" in t && t.duration ? `${t.duration}ms` : "—"}</td>
              <td style={cell}>{t.ease}</td>
              <td style={cell}>{typeof reduced === "string" ? reduced : "fade"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "6px 12px 6px 0",
  borderBottom: "1px solid var(--echo-seam)",
  whiteSpace: "nowrap",
};

export default function Preview() {
  return <MotionPreview />;
}
