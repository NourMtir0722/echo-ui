"use client";

import { useState } from "react";
import { SoundProvider, useSound } from "echo-ui-core/sound";

function Press() {
  const { play, setMuted } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(false);
        play("press");
      }}
    >
      Press
    </button>
  );
}

/** A SoundProvider that comes and goes, as one inside a page does when the page changes. */
export function SoundRemount() {
  const [on, setOn] = useState(false);
  return (
    <main>
      <button type="button" onClick={() => setOn((v) => !v)}>
        {on ? "Unmount sound" : "Mount sound"}
      </button>
      {on ? (
        <SoundProvider defaultMuted={false}>
          <Press />
        </SoundProvider>
      ) : null}
    </main>
  );
}
