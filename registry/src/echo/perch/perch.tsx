"use client";

/**
 * Perch. A creature on the top edge of whatever you put in it (a Card, a
 * Panel, a Modal's body): sitting there watching, or hiding behind the edge
 * and peeking up when you come near it. It reacts through its mood, like
 * every Creature, and never covers what it sits on: the space it needs
 * above the edge is kept for it.
 *
 * Decorative: the creature is hidden from assistive technology, and what
 * you put in the Perch is read as it is.
 */
import type { CSSProperties, ReactNode } from "react";
import { Creature, type CreatureMood } from "../creature";
import type { CreatureCharacter } from "../creature";
import "./perch.css";

export interface PerchProps {
  /** What it sits on. */
  children: ReactNode;
  /** What it's doing. Default `idle`. */
  mood?: CreatureMood;
  /** Who it is. Default: Echo. */
  character?: CreatureCharacter;
  /** `sit` (default) on the edge; `peek` hides behind it and comes up when you're near. */
  behavior?: "sit" | "peek";
  /** Which end of the edge. Default `end`. */
  at?: "start" | "end";
  /** The creature's height in px. Default 56. */
  size?: number;
}

export function Perch({ children, mood = "idle", character, behavior = "sit", at = "end", size = 56 }: PerchProps) {
  // Its size, as a variable the stylesheet reads: the room kept above the edge.
  const style = { "--perch-size": `${size}px` } as CSSProperties;
  return (
    <div className="echo-perch" data-behavior={behavior} data-at={at} style={style}>
      <div className="echo-perch__ledge" aria-hidden="true">
        <span className="echo-perch__creature">
          <Creature mood={mood} character={character} size={size} />
        </span>
      </div>
      <div className="echo-perch__base">{children}</div>
    </div>
  );
}
