"use client";

/**
 * Sound and motion, built in: the motion buttons. The section's title, the
 * sound switch, and eight of the motion components on one panel at their real
 * size, every one live and lit, each named (a link to its page) with its
 * component as the tag. The one you point at, tab to, or that's nearest the
 * middle of the window is awake: Echo stands on it, and the line under the
 * panel says what it does. One screen for all eight, where a row each took
 * three.
 */
import { useRef } from "react";
import { useSound } from "echo-ui-core/sound";
import { Switch } from "@registry/echo/switch";
import { BigTitle } from "@/components/home/BigTitle";
import { Deferred, MotionRowDemo } from "@/components/home/Deferred";
import { GuideStop } from "@/components/home/Guide";
import { useAwake } from "@/components/home/awake";
import type { MotionRowKey } from "@/components/home/stages";

/* --- the list ----------------------------------------------------------------- */

const ROWS: { key: MotionRowKey; name: string; line: string; tag: string }[] = [
  {
    key: "morph",
    name: "Follow",
    line: "The button you pressed flows into the next ones: Following, and Notify me beside it.",
    tag: "Morph",
  },
  {
    key: "action-fan",
    name: "Share",
    line: "Link, Email and Embed bud out of the button, and fold back into it.",
    tag: "ActionFan",
  },
  {
    key: "add-to-bag",
    name: "Add to cart",
    line: "A drop leaves the button and lands in the count, so you see what you added.",
    tag: "AddToBag",
  },
  {
    key: "magnetic",
    name: "Magnetic dock",
    line: "The buttons lean toward your hand before you touch them. The nearest leans most.",
    tag: "Magnetic",
  },
  {
    key: "save-button",
    name: "Save",
    line: "The button becomes its own progress, then its answer, then itself again.",
    tag: "SaveButton",
  },
  {
    key: "hold-button",
    name: "Hold to delete",
    line: "Hold it and colour pours in under your finger. Let go early and it drains away.",
    tag: "HoldButton",
  },
  {
    key: "voice-note",
    name: "Voice note",
    line: "The microphone opens into Stop and your take. Stop, and the take becomes a note that fills as it plays.",
    tag: "VoiceNote",
  },
  {
    key: "roll",
    name: "Rolling numbers",
    line: "Change the floor and every digit rolls through the numbers in between, like a lift's display.",
    tag: "useRoll",
  },
];

/** Sound for the whole page, the visitor's to turn on: Echo never plays a sound nobody asked for. */
function SoundKey() {
  const { muted, setMuted } = useSound();
  return (
    <span className="wins__sound">
      <label className="wins__sound-label">
        <Switch
          aria-label="Sound"
          checked={!muted}
          onCheckedChange={(on) => setMuted(!on)}
        />
        <span aria-hidden="true">Sound</span>
      </label>
      <span className="wins__sound-hint">
        {muted ? "Turn it on to hear each press" : "On: press any of them"}
      </span>
    </span>
  );
}

export function MotionList() {
  const list = useRef<HTMLOListElement>(null);
  const { awake, wake } = useAwake(list, ":scope > li");

  return (
    <section
      className="sec wins"
      aria-labelledby="wins-h"
      data-guide-section=""
    >
      {/* The title alone: the panel shows the rest (one line a stop). */}
      <BigTitle id="wins-h" title="Motion buttons" />

      {/* Keys, panel and line are one stop the page comes to rest on, whole (snap.ts). */}
      <div className="wins__stage" data-snap="">
        <div className="wins__keys" data-reveal="">
          <SoundKey />
          <a className="wins__all" href="/motion">
            Every motion component
          </a>
        </div>

        <ol ref={list} className="wins__list" data-reveal="">
          {ROWS.map((row, i) => (
            <li key={row.key} className="wins__cell" {...wake(i)}>
              {awake === i && <GuideStop className="wins__stop" />}
              <Deferred className="wins__demo" margin={500}>
                <MotionRowDemo which={row.key} />
              </Deferred>
              <p className="wins__label">
                <a className="wins__name" href={`/docs/${row.key}`}>
                  {row.name}
                </a>
                <code className="wins__tag">{row.tag}</code>
                <span className="wins__sr">{row.line}</span>
              </p>
            </li>
          ))}
        </ol>
        {/* What the one you're on does, in a line (each cell carries its own line for a screen reader). */}
        <p className="wins__now" aria-hidden="true">
          <strong>{ROWS[awake]!.name}.</strong> {ROWS[awake]!.line}
        </p>
      </div>
    </section>
  );
}
