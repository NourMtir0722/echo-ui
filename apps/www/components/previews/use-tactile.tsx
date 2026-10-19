"use client";

/** The live preview on /docs/use-tactile. */
import { useTactile } from "echo-ui-core/tactile";
import { caption } from "./shared/main-caption";
import { mono } from "./shared/main-mono";
import { row } from "./shared/main-row";

function TactilePreview() {
  const { ref, handlers } = useTactile<HTMLButtonElement>({
    press: { motion: "press", sound: "press" },
    release: { motion: "pop", sound: "release" },
  });
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={row}>
        <button
          ref={ref}
          {...handlers}
          type="button"
          className="echo-button-cap"
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: 0,
            color: "var(--echo-text)",
            fontFamily: mono,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Press me
        </button>
      </div>
      <p style={caption}>
        Pointer and keyboard feel identical — tab to it and hit Space. Reduced motion collapses the
        push; the sound follows the provider.
      </p>
    </div>
  );
}

export default function Preview() {
  return <TactilePreview />;
}
