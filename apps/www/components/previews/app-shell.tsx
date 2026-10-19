"use client";

/** The live preview on /docs/app-shell. */
import { AppShell } from "@registry/echo/app-shell";
import { useState } from "react";

/** A shrunk-down frame, so the whole shape is visible inside a preview box. */
function AppShellPreview() {
  const [rail, setRail] = useState("Takes");
  const [side, setSide] = useState("Channel 1");
  const go = (set: (v: string) => void, v: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    set(v);
  };
  return (
    <div
      style={{
        height: 260,
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--echo-seam)",
      }}
    >
      {/* `embedded`: this shell lives inside the docs site's own shell, and a
          page gets one <main> and one skip target. The links are plain <a>s —
          AppShell's own link skin styles them, current page included. */}
      <AppShell
        embedded
        style={{ "--echo-shell-rail-h": "48px", "--echo-shell-side-w": "160px" } as React.CSSProperties}
      >
        <AppShell.Rail
          label="Preview"
          brand={<span style={{ fontWeight: 800, fontSize: 15, color: "var(--echo-text)" }}>Device</span>}
        >
          {["Takes", "Mix", "Export"].map((l) => (
            <a key={l} href="#" aria-current={rail === l ? "page" : undefined} onClick={go(setRail, l)}>
              {l}
            </a>
          ))}
        </AppShell.Rail>
        <AppShell.Sidebar label="Channels">
          {["Channel 1", "Channel 2", "Master"].map((c) => (
            <a key={c} href="#" aria-current={side === c ? "page" : undefined} onClick={go(setSide, c)}>
              {c}
            </a>
          ))}
        </AppShell.Sidebar>
        <AppShell.Content>
          <div style={{ padding: 20, color: "var(--echo-text-dim)", fontSize: 13.5, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--echo-text)" }}>
              {rail} · {side}
            </strong>
            <br />
            The rail spans both columns; the sidebar sticks under it and scrolls its own overflow.
            Below 900px the sidebar column is removed rather than stacked.
          </div>
        </AppShell.Content>
      </AppShell>
    </div>
  );
}

export default function Preview() {
  return <AppShellPreview />;
}
