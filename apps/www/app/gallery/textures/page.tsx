"use client";

/**
 * Texture gallery: LcdChip, the texture
 * overlays, GrainField, and the live ShaderField — rendered for axe + visual
 * regression. The ShaderField section is deliberately excluded from visual
 * baselines: it is an animated GPU surface and would be flaky as a snapshot.
 */
import { LcdChip } from "@registry/echo/lcd-chip";
import { Dither, Noise, Halftone, Scanlines, GrainField, Textured } from "@registry/echo/textures";
import { ShaderField } from "@registry/echo/shader-field";
import { Panel } from "@registry/echo/panel";
import { siteTheme } from "@/components/site/site-theme";
import type { ReactNode } from "react";

const mono = "var(--echo-font-mono)";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
        {title}
      </h2>
      <div
        data-testid={id}
        style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", padding: 20, borderRadius: 16, background: "var(--echo-surface)" }}
      >
        {children}
      </div>
    </section>
  );
}

/** A swatch with a positioned ancestor, so an overlay has something to fill. */
function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: "relative",
          width: 150, maxWidth: "100%", flexShrink: 0,
          height: 96,
          borderRadius: 12,
          overflow: "hidden",
          background: "linear-gradient(150deg, var(--echo-accent-3), var(--echo-accent-6))",
        }}
      >
        {children}
      </div>
      <figcaption style={{ fontFamily: mono, fontSize: 11, color: "var(--echo-text-dim)", marginTop: 6 }}>{label}</figcaption>
    </figure>
  );
}

export default function TexturesGallery() {
  return (
    <>
      <div className="echo-gallery" style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Textures</h1>

        <Section id="lcd-chips" title="LcdChip">
          <LcdChip value="07:42" label="Uptime" />
          <LcdChip value="128" label="BPM" />
          <LcdChip value="--" label="Signal" glow={false} />
          <Panel variant="screen">
            <LcdChip value="A♯" label="Key" />
          </Panel>
        </Section>

        <Section id="overlays" title="Overlays">
          <Swatch label="none">
            <span />
          </Swatch>
          <Swatch label="Dither">
            <Dither />
          </Swatch>
          <Swatch label="Noise">
            <Noise opacity={0.3} grain="coarse" />
          </Swatch>
          <Swatch label="Halftone">
            <Halftone />
          </Swatch>
          <Swatch label="Scanlines">
            <Scanlines />
          </Swatch>
        </Section>

        <Section id="textured" title="Textured">
          <Textured style={{ borderRadius: 12, overflow: "hidden" }}>
            <Panel style={{ width: 260, maxWidth: "100%", color: "var(--echo-text)", fontSize: 13 }}>
              A panel under the default treatment — grain plus a dither pass.
            </Panel>
          </Textured>
        </Section>

        <Section id="grain-fields" title="GrainField">
          <GrainField style={{ width: 300, maxWidth: "100%", height: 150, borderRadius: 14 }}>
            <div style={{ padding: 20, fontFamily: mono, fontSize: 13 }}>
              accent
            </div>
          </GrainField>
          <GrainField tone="chassis" style={{ width: 300, maxWidth: "100%", height: 150, borderRadius: 14 }}>
            <div style={{ padding: 20, fontFamily: mono, fontSize: 13, color: "var(--echo-text)" }}>
              chassis
            </div>
          </GrainField>
        </Section>

        <Section id="shader-fields" title="ShaderField">
          <div style={{ width: 300, maxWidth: "100%", height: 170, borderRadius: 14, overflow: "hidden" }}>
            <ShaderField />
          </div>
          <div style={{ width: 300, maxWidth: "100%", height: 170, borderRadius: 14, overflow: "hidden" }}>
            <ShaderField theme={siteTheme({ accent: "#F2674E" }).values} />
          </div>
        </Section>
      </div>
    </>
  );
}
