"use client";

/** The live preview on /docs/theme. */
import { caption } from "./shared/main-caption";
import { row } from "./shared/main-row";

function ThemePreview() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={row}>
        {(["surface", "cap", "well", "accent", "lcd", "text"] as const).map((role) => (
          <figure key={role} style={{ margin: 0 }}>
            <div
              style={{
                width: 64,
                height: 44,
                borderRadius: 8,
                border: "1px solid var(--echo-seam)",
                background: `var(--echo-${role})`,
              }}
            />
            <figcaption style={{ ...caption, marginTop: 4 }}>{role}</figcaption>
          </figure>
        ))}
      </div>
      {/* The ramp scales to its column: 7 fixed 44px swatches measured 308 in
          the 284px docs preview and pushed the page open. */}
      <div style={{ display: "flex", width: "100%" }}>
        {/* Painted from the variables, not from a JS mirror: the ramp shown is
            the one the site is wearing, whatever seed the visitor chose. */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              maxWidth: 44,
              height: 26,
              background: `var(--echo-accent-${i + 1})`,
              borderRadius: i === 0 ? "6px 0 0 6px" : i === 6 ? "0 6px 6px 0" : undefined,
            }}
          />
        ))}
      </div>
      <p style={caption}>
        One seed in, the whole device relights. Try it live on the{" "}
        <a href="/generator" style={{ color: "var(--site-link, var(--echo-accent-highlight))" }}>
          theme generator
        </a>
        .
      </p>
    </div>
  );
}

export default function Preview() {
  return <ThemePreview />;
}
