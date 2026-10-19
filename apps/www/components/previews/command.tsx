"use client";

/** The live preview on /docs/command. */
import { Command } from "@registry/echo/command";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Kbd } from "@registry/echo/kbd";
import { useState } from "react";
import { row } from "./shared/main-row";

/**
 * The palette needs a trigger on the page, because its own trigger is a global
 * keystroke — and a doc preview that only responds to Cmd+K reads as broken.
 */
function CommandPreview() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={row}>
        <HardwareButton onClick={() => setOpen(true)}>Open palette</HardwareButton>
        <span style={{ fontFamily: "var(--echo-font-mono)", fontSize: 12, color: "var(--echo-text-dim)" }}>
          or press <Kbd>⌘</Kbd> <Kbd>K</Kbd>
        </span>
      </div>
      {last && (
        <span style={{ fontFamily: "var(--echo-font-mono)", fontSize: 12, color: "var(--echo-text-dim)" }}>
          ran: {last}
        </span>
      )}
      <Command
        open={open}
        onOpenChange={setOpen}
        onRun={(item) => setLast(item.label)}
        groups={[
          {
            label: "Navigate",
            items: [
              { id: "docs", label: "Go to docs", hint: "G D", keywords: ["components", "reference"] },
              { id: "themes", label: "Open theme generator", hint: "G T", keywords: ["color", "seed"] },
              { id: "sound", label: "Open sound audition", hint: "G S", keywords: ["audio", "bench"] },
            ],
          },
          {
            label: "Take",
            items: [
              { id: "rec", label: "Start recording", hint: "R", keywords: ["arm", "capture"] },
              { id: "dup", label: "Duplicate take", keywords: ["copy"] },
              { id: "del", label: "Delete take", keywords: ["trash", "remove", "bin"] },
              { id: "frozen", label: "Freeze track", hint: "needs a bounce", disabled: true },
            ],
          },
        ]}
      />
    </div>
  );
}

export default function Preview() {
  return <CommandPreview />;
}
