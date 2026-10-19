"use client";

/**
 * The tactile demo. A single test button wired with
 * useTactile — it must feel identical via pointer and keyboard, and collapse
 * its motion under prefers-reduced-motion.
 */
import { SoundProvider } from "echo-ui-core/sound";
import { useTactile } from "echo-ui-core/tactile";
import "echo-ui-core/theme/material.css";

const mono = "var(--echo-font-mono)";

export default function TactilePage() {
  return (
    <SoundProvider>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1 style={{ fontFamily: mono, fontSize: "1.5rem" }}>useTactile</h1>
        <p style={{ color: "var(--echo-text-dim)", lineHeight: 1.5 }}>
          Press with the mouse, then tab to the button and press{" "}
          <kbd style={{ color: "var(--echo-accent)" }}>Space</kbd> — identical feel. Turn on OS reduced motion
          and the push collapses to nothing (sound follows the provider).
        </p>
        <div style={{ display: "flex", gap: 20, marginTop: 40, alignItems: "center" }}>
          <TactileButton />
          <span style={{ color: "var(--echo-text-dim)", fontFamily: mono, fontSize: 13 }}>
            press · release
          </span>
        </div>
      </div>
    </SoundProvider>
  );
}

function TactileButton() {
  const { ref, handlers } = useTactile<HTMLButtonElement>({
    press: { motion: "press", sound: "press" },
    release: { motion: "pop", sound: "release" },
  });

  return (
    <button
      ref={ref}
      {...handlers}
      data-testid="tactile-button"
      className="echo-button-cap"
      style={{
        border: 0,
        width: 96,
        height: 64,
        borderRadius: 16,
        color: "var(--echo-text)",
        fontFamily: mono,
        fontSize: 20,
        cursor: "pointer",
        willChange: "transform",
      }}
    >
      ●
    </button>
  );
}
