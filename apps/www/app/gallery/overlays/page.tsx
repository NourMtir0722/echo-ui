"use client";

/**
 * Overlays gallery: every floating surface composed on
 * one page for axe + behavior tests — Popover and Tooltip on the useGsapPresence
 * bridge, plus Menu, Sheet and AlertDialog.
 */
import { useState } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Popover } from "@registry/echo/popover";
import { Tooltip } from "@registry/echo/tooltip";
import { Menu, ContextMenu } from "@registry/echo/menu";
import { Sheet } from "@registry/echo/sheet";
import { AlertDialog } from "@registry/echo/alert-dialog";

const mono = "var(--echo-font-mono)";

const label: React.CSSProperties = {
  fontFamily: "var(--echo-font-machine)",
  fontSize: 13,
  color: "var(--echo-text-dim)",
  textTransform: "uppercase",
  letterSpacing: 2,
};

export default function OverlaysGallery() {
  const [grid, setGrid] = useState(true);
  const [quality, setQuality] = useState("high");
  const [erased, setErased] = useState(false);

  return (
    <SoundProvider>
      <div className="echo-gallery" style={{ maxWidth: 720, margin: "0 auto", padding: "5rem 1.5rem 12rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Overlays</h1>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
            Popover
          </h2>
          <div data-testid="popover-row" style={{ display: "flex", gap: 16 }}>
            <Popover
              trigger={<HardwareButton data-testid="open-popover">Details</HardwareButton>}
              title="Channel 3"
              side="bottom"
            >
              <p data-testid="popover-body">
                Anchored, dismissable, focus-managed by Base UI — molded and summoned by Echo.
              </p>
            </Popover>
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
            Tooltip
          </h2>
          <div data-testid="tooltip-row" style={{ display: "flex", gap: 16 }}>
            <Tooltip trigger={<HardwareButton data-testid="tooltip-trigger">Hover me</HardwareButton>} delay={0}>
              Record the channel
            </Tooltip>
          </div>
        </section>
        <section style={{ marginTop: 48 }}>
          <h2 style={label}>Menu</h2>
          <div data-testid="menu-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Menu>
              <Menu.Trigger data-testid="open-menu">Actions</Menu.Trigger>
              <Menu.Content>
                <Menu.Item data-testid="menu-rename">Rename take</Menu.Item>
                <Menu.Item>Duplicate</Menu.Item>
                <Menu.Separator />
                <Menu.CheckboxItem
                  checked={grid}
                  onCheckedChange={setGrid}
                  data-testid="menu-grid"
                >
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
                  <Menu.SubmenuTrigger data-testid="menu-submenu">Send to</Menu.SubmenuTrigger>
                  <Menu.Content side="right" sideOffset={4}>
                    <Menu.Item data-testid="menu-submenu-item">Master bus</Menu.Item>
                    <Menu.Item>Headphones</Menu.Item>
                  </Menu.Content>
                </Menu.Submenu>
              </Menu.Content>
            </Menu>

            <ContextMenu>
              <ContextMenu.Trigger
                data-testid="context-target"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 190,
                  height: 40,
                  borderRadius: 12,
                  border: "1px dashed var(--echo-seam)",
                  background: "var(--echo-lcd)",
                  color: "var(--echo-text-dim)",
                  fontFamily: mono,
                  fontSize: 12,
                }}
              >
                right-click this track
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item data-testid="context-split">Split at playhead</ContextMenu.Item>
                <ContextMenu.Item disabled>Freeze (needs a bounce)</ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu>
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 style={label}>Sheet</h2>
          <div data-testid="sheet-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {(["right", "left", "bottom"] as const).map((side) => (
              <Sheet key={side} side={side}>
                <Sheet.Trigger data-testid={`open-sheet-${side}`}>From the {side}</Sheet.Trigger>
                <Sheet.Content
                  title={`Channels (${side})`}
                  description="Swipe it away, or press Escape."
                >
                  <p style={{ color: "var(--echo-text-dim)", fontSize: 13.5, lineHeight: 1.55 }}>
                    The backdrop tracks the swipe, so dragging the panel back brings the room back
                    with it.
                  </p>
                </Sheet.Content>
              </Sheet>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <h2 style={label}>AlertDialog</h2>
          <div data-testid="alert-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <AlertDialog
              trigger={<HardwareButton data-testid="open-alert">Erase takes</HardwareButton>}
              title="Erase all takes?"
              description="Twelve recordings will be removed from this device. This cannot be undone."
              confirmLabel="Erase"
              onConfirm={() => setErased(true)}
            />
            <AlertDialog
              trigger={<HardwareButton data-testid="open-alert-safe">Publish</HardwareButton>}
              title="Publish to the public registry?"
              description="Anyone will be able to install this item."
              confirmLabel="Publish"
              destructive={false}
            />
            <output data-testid="erased" style={{ fontFamily: mono, color: "var(--echo-text-dim)", alignSelf: "center" }}>
              {erased ? "erased" : "idle"}
            </output>
          </div>
        </section>
      </div>
    </SoundProvider>
  );
}
