"use client";

/**
 * Controls gallery — a faithful reproduction of the first Echo device's
 * "Switches & sliders" showcase: the device
 * material language of recessed wells + molded caps, with the one lit
 * accent for the active/on state.
 *
 * Reference exports map 1:1 onto the registry: Field → Field, Toggle → Switch
 * (identical control), Slider → Slider, Segmented → Segmented. Checkbox + Select
 * round out the form-control kit below the reproduction.
 */
import { SoundProvider } from "echo-ui-core/sound";
import { Switch } from "@registry/echo/switch";
import { Slider } from "@registry/echo/slider";
import { Segmented } from "@registry/echo/segmented";
import { Field } from "@registry/echo/field";
import { Checkbox } from "@registry/echo/checkbox";
import { Select } from "@registry/echo/select";
import { RadioGroup } from "@registry/echo/radio-group";
import { NumberField } from "@registry/echo/number-field";
import { Textarea } from "@registry/echo/textarea";
import { Command } from "@registry/echo/command";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useState } from "react";

const grotesk = "var(--echo-font-sans)";
const mono = "var(--echo-font-mono)";

const eyebrow: React.CSSProperties = {
  overflowWrap: "anywhere",
  fontFamily: "var(--echo-font-machine)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--echo-text-dim)",
};
const sectionLabel = eyebrow;
const caption: React.CSSProperties = { fontFamily: grotesk, fontSize: 15, color: "var(--echo-text-dim)", maxWidth: 520 };
const rowLabel: React.CSSProperties = { fontFamily: grotesk, fontSize: 15, color: "var(--echo-text)" };
const controlRow: React.CSSProperties = { display: "flex", gap: 14, alignItems: "center" };

export default function ControlsGallery() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [ran, setRan] = useState("none");

  return (
    <SoundProvider>
      <div style={{ minHeight: "100vh", background: "var(--echo-well)", padding: "4rem 1.5rem 8rem" }}>
        <div className="echo-gallery" style={{ maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 56 }}>
          <header style={{ display: "grid", gap: 16 }}>
            <span style={eyebrow}>Components</span>
            <h1 style={{ fontFamily: grotesk, fontSize: 52, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.02em", color: "var(--echo-text)", margin: 0 }}>
              Switches &amp; sliders
            </h1>
            <p style={{ ...caption, fontSize: 18, maxWidth: 620 }}>
              Physical controls: a molded knob in a recessed track. On/active is the one accent-lit
              state; everything else is honest plastic.
            </p>
          </header>

          {/* TOGGLE — reference Toggle == registry Switch */}
          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Toggle</span>
            <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
              <div style={controlRow}>
                <Switch defaultChecked aria-labelledby="lbl-watching" />
                <span id="lbl-watching" style={rowLabel}>Watching</span>
              </div>
              <div style={controlRow}>
                <Switch aria-labelledby="lbl-dnd" />
                <span id="lbl-dnd" style={rowLabel}>Do not disturb</span>
              </div>
            </div>
          </section>

          {/* SLIDER / FADER */}
          <section style={{ display: "grid", gap: 22 }}>
            <span style={sectionLabel}>Slider / Fader</span>
            <div style={{ display: "grid", gap: 22, maxWidth: 380 }}>
              <Slider aria-label="Level" defaultValue={70} />
              <Slider aria-label="Balance" defaultValue={35} />
              <Slider size="sm" aria-label="Send" defaultValue={55} />
            </div>
            <p style={caption}>
              Drag the molded fader — the filled rail is lit from inside. <code>size=&quot;sm&quot;</code> is the
              dense-row slider: a thinner rail and a smaller knob.
            </p>
          </section>

          {/* SEGMENTED SELECTOR */}
          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Segmented selector</span>
            <Segmented aria-label="Session mode" options={["Focus", "Break", "Rest"]} defaultValue={0} />
          </section>

          {/* INPUT / FIELD */}
          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Input / Field</span>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ width: "min(288px, 100%)" }}>
                <Field label="Label" placeholder="Type here…" />
              </div>
              <div style={{ width: "min(288px, 100%)" }}>
                <Field label="Session code" placeholder="000-000" mono />
              </div>
            </div>
          </section>

          {/* Remaining form controls in the kit */}
          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Checkbox</span>
            <div style={controlRow}>
              <Checkbox aria-labelledby="lbl-agree" />
              <span id="lbl-agree" style={rowLabel}>I agree to the terms</span>
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Select</span>
            <Select
              aria-label="Session length"
              defaultValue="25"
              options={[
                { value: "25", label: "25 minutes" },
                { value: "50", label: "50 minutes" },
                { value: "90", label: "90 minutes" },
              ]}
            />
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>RadioGroup</span>
            <RadioGroup defaultValue="line" aria-label="Output routing">
              <RadioGroup.Item value="line">Line out</RadioGroup.Item>
              <RadioGroup.Item value="phones">Headphones</RadioGroup.Item>
              <RadioGroup.Item value="both">Both</RadioGroup.Item>
            </RadioGroup>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>NumberField</span>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <NumberField label="Tempo" defaultValue={120} min={40} max={240} />
              <NumberField label="Gain" defaultValue={0} min={-24} max={24} smallStep={0.1} />
            </div>
          </section>
          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Textarea</span>
            <div data-testid="textarea-row" style={{ display: "grid", gap: 20, maxWidth: 460 }}>
              <Textarea
                label="Session note"
                data-testid="autosizing"
                placeholder="What happened in this take?"
              />
              <Textarea
                label="Log"
                data-testid="capped"
                mono
                maxRows={3}
                defaultValue={"00:00 armed\n00:07 take 1\n00:41 take 2\n01:12 take 3\n01:58 take 4"}
              />
              <Textarea label="Fixed" data-testid="fixed" autosize={false} rows={2} />
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <span style={sectionLabel}>Command</span>
            <div data-testid="command-row" style={controlRow}>
              <HardwareButton data-testid="open-palette" onClick={() => setPaletteOpen(true)}>
                Open palette
              </HardwareButton>
              <output data-testid="ran" style={{ fontFamily: mono, fontSize: 13, color: "var(--echo-text-dim)" }}>
                {ran}
              </output>
            </div>
            <Command
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              onRun={(item) => setRan(item.id)}
              groups={[
                {
                  label: "Navigate",
                  items: [
                    { id: "docs", label: "Go to docs", hint: "G D", keywords: ["components"] },
                    { id: "themes", label: "Open theme generator", hint: "G T", keywords: ["color", "seed"] },
                  ],
                },
                {
                  label: "Take",
                  items: [
                    { id: "rec", label: "Start recording", hint: "R", keywords: ["arm"] },
                    { id: "del", label: "Delete take", keywords: ["trash", "remove"] },
                    { id: "frozen", label: "Freeze track", hint: "needs a bounce", disabled: true },
                  ],
                },
              ]}
            />
          </section>
        </div>
      </div>
    </SoundProvider>
  );
}
