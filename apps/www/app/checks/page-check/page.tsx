"use client";

import type { CSSProperties } from "react";
import { EchoCheck } from "echo-ui-core/check";
import { Field } from "@registry/echo/field";
import { HardwareButton } from "@registry/echo/hardware-button";
import { SideNav } from "@registry/echo/side-nav";
import { TabBar } from "@registry/echo/tab-bar";

/**
 * A test fixture for `<EchoCheck />`: one of each problem it finds, planted
 * beside Echo parts used properly, so tests/page-check.spec.ts can check that it
 * finds every plant and nothing else. The route has no SoundProvider, and
 * that is the setup plant.
 */
const dot = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="currentColor" />
  </svg>
);
/** The plants are raw elements painted with the theme, so each one is only the problem it's for. */
const themed: CSSProperties = { background: "var(--echo-cap)", color: "var(--echo-text)", border: 0, padding: "var(--echo-space-4)" };

export default function PageCheckFixture() {
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "grid", gap: "var(--echo-space-8)", maxWidth: 560 }}>
      <EchoCheck overlay />
      <h1>Page check fixture</h1>

      {/* Used properly: nothing to find. */}
      <HardwareButton>Clean</HardwareButton>
      <Field label="Email" error="Enter an email address, like ada@example.com." defaultValue="nope" />
      {/* Disabled: its label and help belong to an inactive control, which WCAG 1.4.3 exempts. */}
      <Field label="Account ID" defaultValue="EC-0042" description="Set when the account was made." disabled />
      <HardwareButton engraved icon={dot}>
        Keyed
      </HardwareButton>
      {/* Text over a drawing: its styles can't say what's behind it, so it isn't measured. On its
          ancestors' ground alone it would be 1:1; the drawing under it makes it readable. */}
      <div style={{ position: "relative", background: "var(--echo-text)", padding: "var(--echo-space-4)" }}>
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect width="100%" height="100%" fill="var(--echo-well)" />
        </svg>
        <p style={{ position: "relative", margin: 0, color: "var(--echo-text)" }}>Over a drawing</p>
      </div>

      {/* name */}
      <button id="plant-unnamed" type="button" style={themed}>
        {dot}
      </button>
      <input id="plant-unlabelled" style={themed} />

      {/* contrast: a theme colour, on a ground it wasn't made for */}
      <p id="plant-contrast" style={{ color: "var(--echo-seam)" }}>
        Too faint to read on the well.
      </p>

      {/* contrast: an engraved label with nothing else saying what the cap does */}
      <HardwareButton engraved>Hold</HardwareButton>

      {/* colour */}
      <div id="plant-colour" style={{ background: "#ff0000", width: 40, height: 40 }} />

      {/* screen rule 2: two lit caps in one decision */}
      <form id="plant-form" onSubmit={(event) => event.preventDefault()} style={{ display: "flex", gap: "var(--echo-space-4)" }}>
        <HardwareButton variant="primary" type="submit">
          Save
        </HardwareButton>
        <HardwareButton variant="primary" type="button">
          Send
        </HardwareButton>
      </form>

      {/* screen rule 3: "you are here", twice */}
      <SideNav label="Main" current="/home" groups={[{ items: [{ label: "Home", href: "/home" }, { label: "Inbox", href: "/inbox" }] }]} />
      <TabBar
        label="Tabs"
        fixed={false}
        current="/home"
        items={[
          { label: "Home", href: "/home", icon: dot },
          { label: "Inbox", href: "/inbox", icon: dot },
        ]}
      />

      {/* screen rule 9: invalid, with no words */}
      <input id="plant-invalid" aria-label="Code" aria-invalid="true" style={themed} />
    </main>
  );
}
