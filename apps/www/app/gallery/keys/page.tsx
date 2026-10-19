"use client";

/**
 * Keys & plates gallery: LedKey and EngravedPlate —
 * two static components, generalized from the first Echo device's
 * SnoozeKey and OwedTag. Rendered for axe, keyboard, and
 * visual-regression.
 */
import { useState, type ReactNode } from "react";
import { SoundProvider } from "echo-ui-core/sound";
import { LedKey } from "@registry/echo/led-key";
import { EngravedPlate } from "@registry/echo/engraved-plate";
import { siteTheme } from "@/components/site/site-theme";

const coralTheme = siteTheme({ accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" }, { selector: ".coral-device" }).css;
const mono = "var(--echo-font-mono)";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
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

export default function KeysGallery() {
  const [armed, setArmed] = useState(false);
  return (
    <SoundProvider>
      <style>{coralTheme}</style>
      <div className="echo-gallery" style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <h1 style={{ fontFamily: "var(--site-font-display), var(--echo-font-sans)", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Keys &amp; plates</h1>

        <Section id="led-keys" title="LedKey">
          <LedKey>Snooze +5</LedKey>
          <LedKey lit litLabel="Recording">Rec</LedKey>
          <LedKey disabled>Locked</LedKey>
        </Section>

        {/* A key that toggles ITS OWN state says so with aria-pressed; litLabel
            is for an LED reporting something else the device is doing. */}
        <Section id="led-key-latch" title="Latching">
          <LedKey lit={armed} aria-pressed={armed} onClick={() => setArmed((on) => !on)}>
            Arm
          </LedKey>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--echo-text-dim)" }}>
            state: {armed ? "armed" : "idle"}
          </span>
        </Section>

        <Section id="plates" title="EngravedPlate">
          <EngravedPlate>Owed 4</EngravedPlate>
          <EngravedPlate tilt={-5}>Model 002</EngravedPlate>
          <EngravedPlate rivets={false}>Serial 4417</EngravedPlate>
        </Section>

        {/* The plate's engraving is derived, so it has to survive a reseed. */}
        {/* The reseed is the panel's, not the heading's: the heading sits on the page, and reads it. */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: "var(--echo-font-machine)", fontSize: 12, fontWeight: 700, color: "var(--echo-text-dim)", textTransform: "uppercase", letterSpacing: 2 }}>
            Coral reseed
          </h2>
          <div
            className="coral-device"
            data-testid="coral"
            style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", padding: 20, borderRadius: 16, background: "var(--echo-surface)" }}
          >
            <LedKey lit litLabel="Monitoring">Monitor</LedKey>
            <EngravedPlate tilt={-3}>Owed 4</EngravedPlate>
          </div>
        </section>
      </div>
    </SoundProvider>
  );
}
