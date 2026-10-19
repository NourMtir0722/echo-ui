"use client";

/** The live preview on /docs/shortcut-map. */
import { ShortcutMap } from "@registry/echo/shortcut-map";

function ShortcutMapPreview() {
  return (
    <div style={{ width: "min(640px, 100%)" }}>
      <ShortcutMap
        shortcuts={[
          { keys: ["Cmd", "K"], label: "Search everything" },
          { keys: ["C"], label: "New issue" },
          { keys: ["Cmd", "Enter"], label: "Send" },
          { keys: ["Shift", "Tab"], label: "Previous field" },
          { keys: ["Esc"], label: "Close" },
          { keys: ["?"], label: "Show shortcuts" },
        ]}
      />
    </div>
  );
}

export default function Preview() {
  return <ShortcutMapPreview />;
}
