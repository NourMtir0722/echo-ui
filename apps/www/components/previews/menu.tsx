"use client";

/** The live preview on /docs/menu. */
import { ContextMenu,Menu } from "@registry/echo/menu";
import { useState } from "react";
import { row } from "./shared/main-row";

/* ------------------------------------------------------------------ table */

/**
 * Menu needs state to show the lit dot doing its job, and it is the one place
 * the right-click variant can be demonstrated at all.
 */
function MenuPreview() {
  const [grid, setGrid] = useState(true);
  const [quality, setQuality] = useState("high");

  return (
    <div style={row}>
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Rename take</Menu.Item>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Separator />
          <Menu.CheckboxItem checked={grid} onCheckedChange={setGrid}>
            Snap to grid
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Group>
            <Menu.GroupLabel>Bounce quality</Menu.GroupLabel>
            <Menu.RadioGroup value={quality} onValueChange={(v) => setQuality(v as string)}>
              <Menu.RadioItem value="high">High</Menu.RadioItem>
              <Menu.RadioItem value="draft">Draft</Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Group>
          <Menu.Separator />
          <Menu.Submenu>
            <Menu.SubmenuTrigger>Send to</Menu.SubmenuTrigger>
            <Menu.Content side="right" sideOffset={4}>
              <Menu.Item>Master bus</Menu.Item>
              <Menu.Item>Headphones</Menu.Item>
            </Menu.Content>
          </Menu.Submenu>
        </Menu.Content>
      </Menu>

      <ContextMenu>
        <ContextMenu.Trigger
          style={{
            display: "grid",
            placeItems: "center",
            width: 190,
            height: 40,
            borderRadius: 12,
            border: "1px dashed var(--echo-seam)",
            background: "var(--echo-lcd)",
            color: "var(--echo-text-dim)",
            fontFamily: "var(--echo-font-mono)",
            fontSize: 12,
          }}
        >
          right-click this track
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Split at playhead</ContextMenu.Item>
          <ContextMenu.Item>Reverse</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item disabled>Freeze (needs a bounce)</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    </div>
  );
}

export default function Preview() {
  return <MenuPreview />;
}
