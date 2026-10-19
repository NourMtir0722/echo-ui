"use client";

/** The live preview on /docs/pull-to-refresh. */
import { Item } from "@registry/echo/item";
import { Stack } from "@registry/echo/layout";
import { PullToRefresh } from "@registry/echo/pull-to-refresh";
import { useState } from "react";

/**
 * A template is a whole SCREEN, so its doc preview is the real thing inside a
 * bounded, scrollable frame — not a reduced stand-in. The frame is the only
 * thing the docs add; `echo-docpreview` relaxes the screen's own full-viewport
 * height so it does not push the doc page open.
 */
function PullToRefreshPreview() {
  const [updated, setUpdated] = useState(0);
  const rows = ["Review onboarding copy", "Reply to the Figma thread", "Book the planning room", "Check the billing export", "Draft the release notes", "Send the Q4 survey"];
  return (
    <div style={{ height: 320, width: "min(100%, 380px)", borderRadius: 16, overflow: "hidden", background: "var(--echo-well)" }}>
      <PullToRefresh
        label="tasks"
        onRefresh={async () => {
          await new Promise((r) => setTimeout(r, 1000));
          setUpdated((n) => n + 1);
        }}
      >
        <Stack as="ul" gap={0}>
          {rows.map((r, i) => (
            <Item as="li" key={r} title={r} description={i === 0 && updated ? `Updated ${updated === 1 ? "once" : `${updated} times`}` : "Today"} />
          ))}
        </Stack>
      </PullToRefresh>
    </div>
  );
}

export default function Preview() {
  return <PullToRefreshPreview />;
}
