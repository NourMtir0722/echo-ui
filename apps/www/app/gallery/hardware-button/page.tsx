"use client";

/**
 * HardwareButton gallery. Renders every variant, size,
 * and state for axe, keyboard-nav, and visual-regression tests, plus a rethemed
 * section proving the plastic recolors while the pressed sound stays put.
 */
import { useState, type ReactNode } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { HardwareButton } from "@registry/echo/hardware-button";
import { siteTheme } from "@/components/site/site-theme";

const coralTheme = siteTheme({ accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" }, { selector: ".coral-device" }).css;
const mono = "var(--echo-font-mono)";

function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 3l9 5-9 5z" />
    </svg>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
        {title}
      </h2>
      <div
        data-testid={id}
        style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", padding: 20, borderRadius: 16, background: "var(--echo-surface)" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function HardwareButtonGallery() {
  const [count, setCount] = useState(0);
  return (
    <SoundProvider>
      <style>{coralTheme}</style>
      <div className="echo-gallery" style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>HardwareButton</h1>

        <Section id="variants" title="Variants">
          {/* Record is the one action this device is built around: its press lands in the body. */}
          <HardwareButton variant="primary" impact>Record</HardwareButton>
          <HardwareButton variant="neutral">Neutral</HardwareButton>
          <HardwareButton variant="ghost">Ghost</HardwareButton>
        </Section>

        <Section id="sizes" title="Sizes">
          <HardwareButton size="sm">Small</HardwareButton>
          <HardwareButton size="md">Medium</HardwareButton>
          <HardwareButton size="lg">Large</HardwareButton>
        </Section>

        <Section id="states" title="States">
          <HardwareButton>Default</HardwareButton>
          <HardwareButton disabled>Disabled</HardwareButton>
          <HardwareButton loading>Loading</HardwareButton>
          <HardwareButton variant="primary" disabled>
            Primary off
          </HardwareButton>
        </Section>

        <Section id="icons" title="Icons">
          <HardwareButton icon={<PlayIcon />}>Play</HardwareButton>
          <HardwareButton trailingIcon={<PlayIcon />}>Next</HardwareButton>
          <HardwareButton iconOnly aria-label="Play track" icon={<PlayIcon />} />
          <HardwareButton variant="primary" iconOnly aria-label="Record clip" icon={<PlayIcon />} />
        </Section>

        <Section id="engraved" title="Engraved">
          <HardwareButton engraved size="lg" caption="talk">
            Hold
          </HardwareButton>
          {/*
            Deliberately NOT `engraved`. Debossed type measures
            ~1.05-1.3:1 over the primary gradient, so the section shows the
            treatment on the cap it works on, beside the cap it does not.
          */}
          {/*
            `caption="armed"`, not `"rec"`: a caption says something
            the label cannot. "rec" under "Record" is a shorter spelling of the
            label, which is the thing the rule exists to stop.
          */}
          <HardwareButton size="lg" variant="primary" caption="armed">
            Record
          </HardwareButton>
        </Section>

        <Section id="themed-coral" title="Rethemed (coral) — plastic recolors, sound unchanged">
          <div className="coral-device" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <HardwareButton variant="primary">Record</HardwareButton>
            <HardwareButton variant="neutral">Neutral</HardwareButton>
          </div>
        </Section>

        <Section id="keyboard" title="Keyboard activation">
          <HardwareButton data-testid="counter-btn" onClick={() => setCount((c) => c + 1)}>
            Count
          </HardwareButton>
          <output data-testid="count" style={{ fontFamily: mono, color: "var(--echo-text)", fontSize: 20 }}>
            {count}
          </output>
        </Section>
      </div>
    </SoundProvider>
  );
}
