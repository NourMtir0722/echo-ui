"use client";

/**
 * A cross-section of the Echo device for the theme generator — the roles, the
 * ramp, and a bench of the controls people actually check a seed on: every
 * lit state (Switch on, Checkbox ticked, Slider fill, the Segmented and Tabs
 * selection, Progress cells) and two popups, so a seed is judged on the parts
 * it has to survive rather than on buttons alone.
 */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Modal } from "@registry/echo/modal";
import { Switch } from "@registry/echo/switch";
import { Checkbox } from "@registry/echo/checkbox";
import { Slider } from "@registry/echo/slider";
import { Segmented } from "@registry/echo/segmented";
import { Select } from "@registry/echo/select";
import { Progress } from "@registry/echo/progress";
import { Tabs } from "@registry/echo/tabs";

const mono = "var(--echo-font-mono)";
const label: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--echo-text-dim)",
};

function Swatch({ role }: { role: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4, justifyItems: "center" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: `var(--echo-${role})`,
          // Drawn, a swatch the colour of the paper is outlined in the ink; molded, the line is 0px.
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 var(--echo-line-width, 0px) var(--echo-line, transparent)",
        }}
      />
      <span style={{ ...label, fontSize: 9 }}>{role}</span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 3l9 5-9 5z" />
    </svg>
  );
}

export function DeviceShowcase() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 28 }}>
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
        <span style={label}>Semantic roles</span>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["surface", "cap", "cap-highlight", "well", "accent", "accent-glow", "lcd", "text"].map(
            (r) => (
              <Swatch key={r} role={r} />
            ),
          )}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
        <span style={label}>Accent ramp</span>
        {/* A width of its own: sized to its content, seven empty stops came out 0px wide. */}
        <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", width: 7 * 40, maxWidth: "100%" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={{ flex: "1 1 40px", minWidth: 0, height: 28, background: `var(--echo-accent-${i})` }} />
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
        <span style={label}>Hardware buttons</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <HardwareButton variant="primary">Record</HardwareButton>
          <HardwareButton variant="neutral">Neutral</HardwareButton>
          <HardwareButton variant="ghost">Ghost</HardwareButton>
          <HardwareButton iconOnly aria-label="Play" icon={<PlayIcon />} />
          <HardwareButton loading>Saving</HardwareButton>
          {/* Engraving belongs on the neutral cap, not the primary one. */}
          <HardwareButton engraved size="lg" caption="rec">
            Hold
          </HardwareButton>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
        <span style={label}>Controls</span>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <Switch aria-label="Monitor" defaultChecked />
          <Switch aria-label="Loop" />
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--echo-text)" }}>
            <Checkbox defaultChecked aria-labelledby="showcase-armed" /> <span id="showcase-armed">Armed</span>
          </label>
          <Segmented aria-label="Mode" options={["Focus", "Break", "Rest"]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, maxWidth: 360 }}>
          <Slider defaultValue={60} aria-label="Level" />
          <Progress value={0.65} aria-label="Render progress" />
          <Select
            aria-label="Sample rate"
            defaultValue="48"
            options={[
              { value: "44", label: "44.1 kHz" },
              { value: "48", label: "48 kHz" },
              { value: "96", label: "96 kHz" },
            ]}
          />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
        <span style={label}>Tabs</span>
        <Tabs defaultValue="meter">
          <Tabs.List>
            <Tabs.Tab value="meter">Meter</Tabs.Tab>
            <Tabs.Tab value="log">Log</Tabs.Tab>
            <Tabs.Tab value="routing">Routing</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="meter">Input peaking at −3 dB.</Tabs.Panel>
          <Tabs.Panel value="log">Three takes today.</Tabs.Panel>
          <Tabs.Panel value="routing">Mic 1 → bus A.</Tabs.Panel>
        </Tabs>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
        <span style={label}>Modal</span>
        <div>
          <Modal
            trigger={<HardwareButton>Open dialog</HardwareButton>}
            title="Device Settings"
            description="Everything here relights with the seed."
            footer={<HardwareButton variant="primary">Save</HardwareButton>}
          >
            <p style={{ color: "var(--echo-text-dim)" }}>
              Base UI behavior, Echo skin. The panel is a molded chassis surface behind glass.
            </p>
          </Modal>
        </div>
      </section>
    </div>
  );
}
