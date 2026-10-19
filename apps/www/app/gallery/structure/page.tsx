"use client";

/**
 * Structure gallery: Tabs + Accordion, for axe +
 * keyboard tests.
 */
import { SoundProvider } from "echo-ui-core/sound";
import { Tabs } from "@registry/echo/tabs";
import { Accordion } from "@registry/echo/accordion";

const label: React.CSSProperties = { fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2, margin: 0 };

export default function StructureGallery() {
  return (
    <SoundProvider>
      <div className="echo-gallery" style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem 6rem", display: "grid", gap: 36 }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Structure</h1>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={label}>Tabs</h2>
          <div data-testid="tabs">
            <Tabs defaultValue="meter">
              <Tabs.List>
                <Tabs.Tab value="meter" data-testid="tab-meter">Meter</Tabs.Tab>
                <Tabs.Tab value="log" data-testid="tab-log">Log</Tabs.Tab>
                <Tabs.Tab value="config">Config</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="meter">
                <span data-testid="panel-meter">Signal meter — live readout.</span>
              </Tabs.Panel>
              <Tabs.Panel value="log">
                <span data-testid="panel-log">Event log — recent activity.</span>
              </Tabs.Panel>
              <Tabs.Panel value="config">Config — device settings.</Tabs.Panel>
            </Tabs>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={label}>Accordion</h2>
          <div data-testid="accordion" style={{ maxWidth: 460 }}>
            <Accordion multiple={false}>
              <Accordion.Item value="a">
                <Accordion.Trigger data-testid="acc-trigger">Signal</Accordion.Trigger>
                <Accordion.Panel>
                  <span data-testid="acc-panel">The one saturated color is the aura; everything else is lit material.</span>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="b">
                <Accordion.Trigger>Power</Accordion.Trigger>
                <Accordion.Panel>Battery, sleep, and the snooze key live here.</Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </div>
        </section>
      </div>
    </SoundProvider>
  );
}
