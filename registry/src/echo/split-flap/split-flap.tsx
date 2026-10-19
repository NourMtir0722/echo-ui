"use client";

/**
 * SplitFlap. A readout that turns over like a departures board: each
 * character flips through the ones between where it is and where it's going,
 * flap by flap — fast when it's far, slowest on the last one — and each flap
 * ticks. The flaps are the neutral cap's plastic, in a recessed well.
 *
 * It says its value once, as text (role="img" with the value as its name);
 * pass `live` to have changes announced.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { CHARS, DIGITS, turn, turnMs, turnsLeft } from "../roll";
import "./split-flap.css";

export interface SplitFlapProps {
  /** What it shows. Numbers pad with zeros to `length`; text with spaces. */
  value: number | string;
  /** How many flaps. Defaults to the value's own length. */
  length?: number;
  /** What the value is, for its name: "Visitors" reads "Visitors 1024". */
  label?: string;
  /** Announce changes politely. */
  live?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const FLAP: SoundRecipe = { wave: "square", freq: 2600, decay: 0.012, gain: 0.05 };

/** The drum each flap turns through, in order (shared with useRoll). */
export { CHARS, DIGITS };

function Flap({ target, drum }: { target: string; drum: string }) {
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;
  const reduced = useReducedMotion();
  const [cur, setCur] = useState(target);
  const [next, setNext] = useState(target);
  const top = useRef<HTMLSpanElement>(null);
  const bottom = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (busy.current || cur === target) return;
    // A flap only turns forward, and one that isn't on the drum starts from
    // its first character.
    const from = drum.includes(cur) ? cur : drum[0]!;
    if (reduced || !drum.includes(target)) {
      setCur(target);
      setNext(target);
      return;
    }
    busy.current = true;
    const n = turn(from, target, drum);
    setNext(n);
    // Far to go, it flips faster; the last flap lands slowest.
    const ms = turnMs(turnsLeft(from, target, drum));
    const id = requestAnimationFrame(() => {
      top.current?.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], {
        duration: ms,
        easing: "ease-in",
        fill: "forwards",
      });
      const b = bottom.current?.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }], {
        duration: ms * 1.3,
        delay: ms,
        easing: "cubic-bezier(.3,1.6,.6,1)",
        fill: "forwards",
      });
      play.current?.(FLAP);
      const done = () => {
        busy.current = false;
        setCur(n);
      };
      if (b) b.onfinish = done;
      else done();
    });
    return () => {
      cancelAnimationFrame(id);
      busy.current = false;
    };
  }, [cur, target, drum, reduced]);

  const face = (c: string) => <b>{c === " " ? " " : c}</b>;
  return (
    <span className="echo-split-flap__flap">
      <span className="echo-split-flap__half" data-half="top">{face(next)}</span>
      <span className="echo-split-flap__half" data-half="bottom">{face(cur)}</span>
      <span key={`t${cur}`} ref={top} className="echo-split-flap__half echo-split-flap__leaf" data-half="top">
        {face(cur)}
      </span>
      <span
        key={`b${cur}`}
        ref={bottom}
        className="echo-split-flap__half echo-split-flap__leaf"
        data-half="bottom"
        style={{ transform: "rotateX(90deg)" }}
      >
        {face(next)}
      </span>
    </span>
  );
}

export function SplitFlap({ value, length, label, live, size = "md", className }: SplitFlapProps) {
  const numeric = typeof value === "number";
  const raw = numeric ? String(Math.max(0, Math.floor(value))) : value.toUpperCase();
  const n = length ?? raw.length;
  const text = numeric ? raw.padStart(n, "0").slice(-n) : raw.padEnd(n, " ").slice(0, n);
  const drum = numeric ? DIGITS : CHARS;
  const name = label ? `${label} ${String(value)}` : String(value);
  // The flaps are one image named by the value; a live region (outside it,
  // where it can be heard) says changes if asked.
  return (
    <span className={["echo-split-flap", className].filter(Boolean).join(" ")} data-size={size}>
      <span className="echo-split-flap__face" role="img" aria-label={name}>
        {text.split("").map((c, i) => (
          <Flap key={i} target={c} drum={drum} />
        ))}
      </span>
      {live ? (
        <span className="echo-split-flap__live" aria-live="polite">
          {name}
        </span>
      ) : null}
    </span>
  );
}
