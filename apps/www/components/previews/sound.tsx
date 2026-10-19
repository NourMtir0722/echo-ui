"use client";

/** The live preview on /docs/sound. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Switch } from "@registry/echo/switch";
import { SOUND_NAMES,useSound } from "echo-ui-core/sound";
import { caption } from "./shared/main-caption";
import { Labeled } from "./shared/main-Labeled";
import { row } from "./shared/main-row";

function SoundPreview() {
  const { play, muted, setMuted } = useSound();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={row}>
        {SOUND_NAMES.map((name) => (
          <HardwareButton key={name} size="sm" onClick={() => play(name)}>
            {name}
          </HardwareButton>
        ))}
      </div>
      <Labeled label={muted ? "muted" : "audible"}>
        <Switch checked={!muted} onCheckedChange={(on) => setMuted(!on)} aria-label="Sound on" />
      </Labeled>
      <p style={caption}>
        Recipes are data, synthesised on a WebAudio graph — no audio files ship. Tune them by ear on
        the <a href="/audition" style={{ color: "var(--site-link, var(--echo-accent-highlight))" }}>audition bench</a>.
      </p>
    </div>
  );
}

export default function Preview() {
  return <SoundPreview />;
}
