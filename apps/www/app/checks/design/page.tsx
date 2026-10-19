import type { CSSProperties, ReactNode } from "react";
import { Card } from "@registry/echo/card";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Item } from "@registry/echo/item";
import { Grid, Stack } from "@registry/echo/layout";

/**
 * A test fixture for the design tests: one of each problem they find, planted
 * beside Echo parts used properly, so tests/page-tests.spec.ts can check
 * that they find every plant, with its numbers, and nothing else.
 */
const surface: CSSProperties = { background: "var(--echo-surface)", color: "var(--echo-text)", padding: "var(--echo-space-7)" };
const linkStyle: CSSProperties = { color: "var(--echo-text)", display: "inline-flex", gap: 6, alignItems: "center" };

function Icon({ size = 16, stroke = 2, filled = false }: { size?: number; stroke?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={stroke}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function Plant({ id, children, style }: { id: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section id={id} style={{ display: "grid", gap: "var(--echo-space-4)", ...style }}>
      {children}
    </section>
  );
}

export default function DesignTestsFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-10)", maxWidth: 960 }}>
      <h1>Design tests fixture</h1>

      {/* Used properly: nothing to find. */}
      <Grid as="ul" minItemWidth="14rem" gap={8}>
        {["Close", "Plan", "Raise"].map((name, i) => (
          <li key={name}>
            <Card title={name} description="Flat monthly fee" footer={<HardwareButton variant="neutral">Ask about {name}</HardwareButton>}>
              <Stack as="ul" gap={0} aria-label={`What ${name} includes`}>
                {["The monthly close by day five", "A thirteen-week cash forecast", "Board pack"].slice(0, i + 1).map((f) => (
                  <Item key={f} as="li" size="sm" title={f} />
                ))}
              </Stack>
            </Card>
          </li>
        ))}
      </Grid>
      <nav aria-label="Well made" style={{ display: "flex", gap: "var(--echo-space-6)" }}>
        {["Inbox", "Drafts", "Sent"].map((n) => (
          <a key={n} href={`#${n}`} style={linkStyle}>
            <Icon />
            {n}
          </a>
        ))}
      </nav>

      {/* alignment: text cut off */}
      <p id="plant-cut" style={{ width: 160, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        Billed monthly in advance, stop with thirty days&apos; notice
      </p>

      {/* alignment: three cards side by side, their keys at three heights */}
      <div id="plant-row" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--echo-space-6)" }}>
        {[1, 2, 3].map((lines) => (
          <div key={lines} className="plant-plan" style={{ ...surface, display: "flex", flexDirection: "column", gap: "var(--echo-space-4)" }}>
            {Array.from({ length: lines }, (_, i) => (
              <p key={i} style={{ margin: 0 }}>
                Line {i + 1} of what the plan includes.
              </p>
            ))}
            <div>
              <HardwareButton variant="neutral">Choose {lines}</HardwareButton>
            </div>
          </div>
        ))}
      </div>

      {/* alignment: a lone key at the far end of a column that starts at the left */}
      <div id="plant-edge" style={{ ...surface, display: "grid", gap: "var(--echo-space-4)", maxWidth: 420 }}>
        <h2 style={{ margin: 0 }}>Book a call</h2>
        <p style={{ margin: 0 }}>Thirty minutes, your numbers, and a straight answer about fit.</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <HardwareButton>Book it</HardwareButton>
        </div>
      </div>

      {/* alignment: two items in a grid of four columns */}
      <div id="plant-empty" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, maxWidth: 640 }}>
        <p style={{ margin: 0 }}>We handle the close.</p>
        <p style={{ margin: 0 }}>You handle the hires.</p>
      </div>

      {/* depth: a key that glows at rest */}
      <button
        id="plant-glow"
        type="button"
        style={{ justifySelf: "start", border: 0, padding: "var(--echo-space-4) var(--echo-space-7)", background: "var(--echo-cap)", color: "var(--echo-text)", boxShadow: "0 0 14px color-mix(in oklch, var(--echo-accent-glow) 70%, transparent)" }}
      >
        Glowing
      </button>

      {/* depth: a raised panel on a raised panel */}
      <div style={{ ...surface, boxShadow: "var(--echo-shadow-panel)" }}>
        <div id="plant-stack" style={{ ...surface, boxShadow: "var(--echo-shadow-panel)", width: 240, height: 80 }}>
          Inner panel
        </div>
      </div>

      {/* corners: three tiles of one kind, one with another corner */}
      <Plant id="plant-kind" style={{ gridTemplateColumns: "repeat(3, 120px)" }}>
        {[12, 12, 4].map((r, i) => (
          <div key={i} style={{ ...surface, borderRadius: r, height: 60 }}>
            Tile
          </div>
        ))}
      </Plant>

      {/* corners: a corner 4px inside another, as round as the outer one */}
      <div style={{ background: "var(--echo-surface)", borderRadius: 20, padding: 4, width: 280 }}>
        <div id="plant-nested" style={{ background: "var(--echo-cap)", color: "var(--echo-text)", borderRadius: 20, padding: "var(--echo-space-6)" }}>
          Nested
        </div>
      </div>

      {/* icons: one bigger than the rest */}
      <nav id="plant-size" aria-label="Sizes" style={{ display: "flex", gap: "var(--echo-space-6)" }}>
        {[16, 16, 24].map((size, i) => (
          <a key={i} href={`#size-${i}`} style={linkStyle}>
            <Icon size={size} />
            Size {i + 1}
          </a>
        ))}
      </nav>

      {/* icons: one drawn heavier than the rest */}
      <ul id="plant-stroke" aria-label="Strokes" style={{ display: "flex", gap: "var(--echo-space-6)", listStyle: "none", margin: 0, padding: 0 }}>
        {[2, 2, 3.5].map((stroke, i) => (
          <li key={i} style={linkStyle}>
            <Icon stroke={stroke} />
            Stroke {i + 1}
          </li>
        ))}
      </ul>

      {/* icons: one filled beside outlined ones */}
      <ul id="plant-style" aria-label="Styles" style={{ display: "flex", gap: "var(--echo-space-6)", listStyle: "none", margin: 0, padding: 0 }}>
        {[false, false, true].map((filled, i) => (
          <li key={i} style={linkStyle}>
            <Icon filled={filled} />
            Style {i + 1}
          </li>
        ))}
      </ul>
    </main>
  );
}
