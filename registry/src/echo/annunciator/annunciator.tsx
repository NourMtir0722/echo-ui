/**
 * Annunciator. The row of fixed marks printed on a device's screen glass
 * (REC, SYNC, MUTE, a battery), each dark until what it names is happening,
 * then lit. Every mark is always there, so the eye learns where each one sits
 * and reads the row at a glance: a status bar, a media player, a recorder.
 *
 * A mark is a short word in the screen's face, or a glyph with its name. For
 * assistive technology the row says, in words, which are on.
 */
import type { ReactNode } from "react";
import "../scope/scope.css";
import "./annunciator.css";

export interface AnnunciatorMark {
  value: string;
  /** What it means, in words: "Syncing", "Offline". Said when it's on. */
  label: string;
  /** Printed on the glass: a short word ("REC") or a glyph. Default: `label`. */
  mark?: ReactNode;
}

export interface AnnunciatorProps {
  /** What the row reports on: its accessible name ("Status"). */
  label: string;
  /** Every mark the screen has, in order. */
  marks: readonly AnnunciatorMark[];
  /** The ones lit now. */
  active: readonly string[];
  /** Announce changes as they happen. For a row that's watched, not glanced at. */
  live?: boolean;
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

export function Annunciator({ label, marks, active, live = false, screen = "emissive" }: AnnunciatorProps) {
  const on = marks.filter((m) => active.includes(m.value));
  return (
    <div className="echo-annunciator" role="group" aria-label={label}>
      <span className="echo-annunciator__glass" aria-hidden="true" data-echo-screen={screen === "reflective" ? "reflective" : undefined}>
        {marks.map((m) => (
          <span key={m.value} className="echo-annunciator__mark" data-on={active.includes(m.value) || undefined}>
            {m.mark ?? m.label}
          </span>
        ))}
      </span>
      <span className="echo-annunciator__said" aria-live={live ? "polite" : undefined}>
        {on.length ? on.map((m) => m.label).join(", ") : "Nothing on"}
      </span>
    </div>
  );
}
