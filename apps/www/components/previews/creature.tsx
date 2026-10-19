"use client";

/** The live preview on /docs/creature. */
import { DOKI,DOKI_ORANGE } from "@/components/doki";
import { Creature,type CreatureMood } from "@registry/echo/creature";
import { EmptyState } from "@registry/echo/empty-state";
import { Segmented } from "@registry/echo/segmented";
import { useState } from "react";
import { row } from "./shared/objects-row";
import { stack } from "./shared/objects-stack";

const MOOD_LIST: CreatureMood[] = ["idle", "busy", "done", "error", "sleep"];

const MOOD_COPY: Record<CreatureMood, [string, string]> = {
  idle: ["All caught up", "Nothing needs you right now."],
  busy: ["Syncing 3 files", "You can keep working while this runs."],
  done: ["Synced", "Everything is up to date."],
  error: ["Couldn't reach the server", "Check your connection, then try again."],
  sleep: ["No messages yet", "When someone writes to you, it shows up here."],
};

function CreaturePreview() {
  const [i, setI] = useState(0);
  const mood = MOOD_LIST[i]!;
  return (
    <div style={{ ...stack, width: "100%" }}>
      <Segmented options={["Idle", "Busy", "Done", "Error", "Sleep"]} value={i} onValueChange={setI} aria-label="Mood" />
      <div style={{ ...row, alignItems: "center", gap: 28 }}>
        <EmptyState illustration={<Creature mood={mood} />} title={MOOD_COPY[mood][0]} description={MOOD_COPY[mood][1]} />
        <Creature variant="dots" mood={mood} />
      </div>
      <div style={{ ...row, alignItems: "center", gap: 28 }}>
        <Creature character={DOKI} accent={DOKI_ORANGE} mood={mood} size={88} />
        <Creature character={DOKI} accent={DOKI_ORANGE} variant="dots" mood={mood} size={100} />
        <span style={{ fontSize: 13, color: "var(--echo-text-dim)", maxWidth: 260 }}>
          Someone else&rsquo;s character: Doki, from Noor&rsquo;s other brand, is one body path and two eyes, in
          its own orange. The dots are drawn from the same paths.
        </span>
      </div>
    </div>
  );
}

export default function Preview() {
  return <CreaturePreview />;
}
