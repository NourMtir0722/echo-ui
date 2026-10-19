"use client";

/**
 * Creature. A small companion that lives in the interface and only ever
 * reports what's happening: idle, busy, done, an error, asleep. Echo by
 * default; your own with one prop.
 *
 * Two forms, by where it lives:
 * - `vector` is the lit, glossy creature, on the page or a card. It breathes,
 *   drifts, blinks and watches the pointer; its moods are directions on the
 *   same springs, so changing one carries on from wherever it is.
 * - `dots` is the same creature on a dot-matrix screen, moving in steps the
 *   way pixels do.
 *
 * Bring your own character (see character.ts): a body path, the whites of
 * its eyes and its pupils, or rows of text for the dots. Echo supplies the
 * materials, so any character relights with the theme.
 *
 * Decorative by default. Where it carries meaning, the words beside it say
 * so; give it a `label` only when nothing else does.
 */
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { useReducedMotionRef } from "echo-ui-core/tactile";
import { echo, type CreatureCharacter } from "./character";
import { createRig, stillPose, type Rig, type RigMood } from "./rig";
import { gridOf, look, mark, place, screenFor, shut, MARKS, type Dot } from "./dots";
import { rasterize } from "./rasterize";
import { Scope } from "../scope";
import "./creature.css";

export type CreatureMood = "idle" | "busy" | "done" | "error" | "sleep";

export interface CreatureProps {
  /** What it's doing: `idle` (default) watches, `busy` works, `done` hops, `error` is puzzled, `sleep` naps. */
  mood?: CreatureMood;
  /** `vector` (default) on the page; `dots` on a dot-matrix screen of its own. */
  variant?: "vector" | "dots";
  /** Who it is. Default: Echo. */
  character?: CreatureCharacter;
  /** Height in px. Default 96 for `vector`, 120 for `dots`. */
  size?: number;
  /** An accessible name, only when no text nearby says what it shows. */
  label?: string;
  /** A colour of its own, as a hex: a family of creatures, one each (a Scope). */
  accent?: string;
}

const MOODS: Record<CreatureMood, RigMood> = {
  idle: { drift: 2.2, sway: 1.8, pace: 1, lean: 2, breath: 0.03, breathPeriod: 8, lids: 1, look: "follow", blink: [2.6, 6.5] },
  busy: { drift: 1.4, sway: 1.2, pace: 2.4, lean: 0.8, breath: 0.045, breathPeriod: 2.6, lids: 1, look: "follow", blink: [1.8, 4] },
  done: { drift: 0.8, sway: 0.6, pace: 1, lean: 1.4, breath: 0.03, breathPeriod: 6, lids: 1, look: "rest", rest: [0, -0.25], blink: [3, 6] },
  error: { drift: 0.3, sway: 0.3, pace: 0.6, lean: 0, breath: 0.02, breathPeriod: 8, lids: 0.72, look: "rest", rest: [-0.7, 0.55], blink: [5, 9] },
  sleep: { drift: 0.6, sway: 0.5, pace: 0.4, lean: 0, breath: 0.06, breathPeriod: 12, lids: 0.06, look: "rest", rest: [0, 0.3], blink: null },
};

const list = (d: string | readonly string[] | undefined) => (d === undefined ? [] : typeof d === "string" ? [d] : d);

export function Creature({ accent, ...props }: CreatureProps) {
  return accent ? (
    <Scope accent={accent}>
      <Drawn {...props} />
    </Scope>
  ) : (
    <Drawn {...props} />
  );
}

function Drawn({ mood = "idle", variant = "vector", character = echo, size, label }: Omit<CreatureProps, "accent">) {
  const name = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  const height = size ?? (variant === "dots" ? 120 : 96);
  const [, , vw = 1, vh = 1] = character.viewBox.split(/[\s,]+/).map(Number);
  // Its size and the drawing's proportions, as variables the stylesheet reads.
  const style = { "--creature-size": `${height}px`, "--creature-ratio": (vw / vh).toFixed(4) } as CSSProperties;
  return variant === "dots" ? (
    <div className="echo-creature" data-variant="dots" style={style} {...name}>
      <DotCreature mood={mood} character={character} />
    </div>
  ) : (
    <div className="echo-creature" data-variant="vector" style={style} {...name}>
      <VectorCreature mood={mood} character={character} />
    </div>
  );
}

/* ---------------------------------------------------------------- vector */

function VectorCreature({ mood, character }: { mood: CreatureMood; character: CreatureCharacter }) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotionRef();
  const wrap = useRef<SVGSVGElement>(null);
  const drift = useRef<SVGGElement>(null);
  const breath = useRef<SVGGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const pupils = useRef<SVGGElement>(null);
  const rig = useRef<Rig | null>(null);
  const drawnFor = useRef(character);
  const eye = [character.origin[0], character.eyeLine] as const;

  // The rig lives as long as the creature does.
  useEffect(
    () => () => {
      rig.current?.destroy();
      rig.current = null;
    },
    [],
  );

  // A new mood is a new direction from wherever it is, never a restart.
  useEffect(() => {
    const next = MOODS[mood];
    const els = { drift: drift.current, breath: breath.current, lids: lids.current, pupils: pupils.current };
    const box = wrap.current?.parentElement;
    if (!box || !els.drift || !els.breath || !els.lids || !els.pupils) return;
    if (reduced.current) {
      stillPose({ drift: els.drift, breath: els.breath, lids: els.lids, pupils: els.pupils }, { eye, mood: next });
      return;
    }
    // Someone else now: their origin and eyes are elsewhere, so a new rig.
    if (rig.current && drawnFor.current !== character) {
      rig.current.destroy();
      rig.current = null;
    }
    drawnFor.current = character;
    if (!rig.current) {
      rig.current = createRig(
        { wrap: box, drift: els.drift, breath: els.breath, lids: els.lids, pupils: els.pupils },
        { origin: character.origin, eye, mood: next },
      );
    } else rig.current.set(next);
    if (mood === "done") rig.current.hop(2);
    if (mood === "error") rig.current.shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, character]);

  const body = list(character.body);
  return (
    <svg ref={wrap} className="echo-creature__svg" viewBox={character.viewBox} focusable="false">
      <defs>
        <radialGradient id={`${uid}-body`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" className="echo-creature__light" />
          <stop offset="40%" className="echo-creature__mid" />
          <stop offset="100%" className="echo-creature__deep" />
        </radialGradient>
        <radialGradient id={`${uid}-gloss`} cx="34%" cy="22%" r="36%">
          <stop offset="0%" className="echo-creature__gloss-in" />
          <stop offset="100%" className="echo-creature__gloss-out" />
        </radialGradient>
      </defs>
      <g ref={drift}>
        <g ref={breath}>
          {body.map((d, i) => (
            <path key={`b${i}`} d={d} fill={`url(#${uid}-body)`} />
          ))}
          {body.map((d, i) => (
            <path key={`g${i}`} d={d} fill={`url(#${uid}-gloss)`} />
          ))}
          {body.map((d, i) => (
            <path key={`r${i}`} d={d} className="echo-creature__rim" />
          ))}
          <g ref={lids}>
            {(character.eyes ?? []).map((d, i) => (
              <path key={i} d={d} className="echo-creature__eye" />
            ))}
            <g ref={pupils}>
              {(character.pupils ?? []).map((d, i) => (
                <path key={i} d={d} className="echo-creature__pupil" />
              ))}
              {(character.catchLights ?? []).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={0.55} className="echo-creature__catch" />
              ))}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ dots */

const TICK = 150;
const HOP = [0, -1, -2, -2, -1, 0, 0, -1, -2, -1, 0];
const SHAKE = [0, 1, -1, 1, -1, 1, 0];

/** One frame of a mood, `t` ticks in. */
function frame(mood: CreatureMood, rows: readonly string[], t: number, walk: { x: number; dir: 1 | -1 }): { dots: Dot[]; cols: number; rows: number } {
  const open = gridOf(rows);
  const { cols, rows: height } = screenFor(open);
  const w = open[0]?.length ?? 0;
  const home = Math.floor((cols - w) / 2);
  const ground = height - open.length - 1;
  const blinking = t % 26 === 0;
  let pose: typeof open;
  let x = home;
  let y = ground;
  const extra: Dot[] = [];
  if (mood === "idle") {
    pose = blinking ? shut(open) : open;
  } else if (mood === "busy") {
    if (t > 0) {
      walk.x += walk.dir;
      if (walk.x <= 1 || walk.x >= cols - w - 1) walk.dir = walk.dir === 1 ? -1 : 1;
    }
    x = walk.x;
    y = ground - (t % 2);
    pose = look(open, walk.dir);
  } else if (mood === "done") {
    y = ground + (t < HOP.length ? HOP[t]! : 0);
    pose = t >= HOP.length && blinking ? shut(open) : open;
    if (t < HOP.length && t % 2 === 1) {
      extra.push(...mark(MARKS.spark, home - 4, 1, cols, height), ...mark(MARKS.spark, home + w + 1, 2, cols, height));
    }
  } else if (mood === "error") {
    x = home + (t < SHAKE.length ? SHAKE[t]! : 0);
    pose = look(open, -1);
    if (t % 4 !== 3) extra.push(...mark(MARKS.question, home + w + 1, 0, cols, height));
  } else {
    pose = shut(open);
    const rise = Math.floor(t / 4) % 3;
    extra.push(...mark(MARKS.z, home + w, 2 - rise, cols, height));
  }
  return { dots: [...place(pose, x, y, cols, height), ...extra], cols, rows: height };
}

/** Where a frame stands still, for reduced motion: the mood's pose, its mark, no movement. */
function still(mood: CreatureMood, rows: readonly string[]) {
  return frame(mood === "busy" ? "idle" : mood, rows, mood === "done" ? HOP.length : mood === "idle" ? 1 : 2, { x: 0, dir: 1 });
}

function DotCreature({ mood, character }: { mood: CreatureMood; character: CreatureCharacter }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionRef();

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const rows = character.dots ?? rasterize(character, 20);
    const inks = () => {
      const css = getComputedStyle(el);
      const forced = window.matchMedia?.("(forced-colors: active)").matches;
      return {
        body: forced ? "CanvasText" : css.getPropertyValue("--echo-accent-glow").trim() || "CanvasText",
        eye: forced ? "CanvasText" : css.getPropertyValue("--echo-text").trim() || "CanvasText",
        ghost: css.getPropertyValue("--echo-text").trim() || "CanvasText",
        glow: forced ? "transparent" : css.getPropertyValue("--echo-lcd-glow").trim() || "transparent",
      };
    };
    const P = 10;
    const draw = (f: ReturnType<typeof frame>) => {
      if (el.width !== f.cols * P) el.width = f.cols * P;
      if (el.height !== f.rows * P) el.height = f.rows * P;
      const ink = inks();
      ctx.clearRect(0, 0, el.width, el.height);
      // The dark dots under the glass, then the lit ones.
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = ink.ghost;
      for (let y = 0; y < f.rows; y++) for (let x = 0; x < f.cols; x++) ctx.fillRect(x * P + 1.5, y * P + 1.5, P - 3, P - 3);
      ctx.globalAlpha = 1;
      for (const d of f.dots) {
        ctx.fillStyle = d.ink === "body" ? ink.body : ink.eye;
        ctx.shadowColor = d.ink === "body" ? ink.glow : "transparent";
        ctx.shadowBlur = d.ink === "body" ? 6 : 0;
        ctx.fillRect(d.x * P + 1.5, d.y * P + 1.5, P - 3, P - 3);
      }
      ctx.shadowBlur = 0;
    };
    if (reduced.current) {
      draw(still(mood, rows));
      return;
    }
    let t = 0;
    const walk = { x: 0, dir: 1 as 1 | -1 };
    const first = frame(mood, rows, 0, walk);
    walk.x = Math.floor((first.cols - (gridOf(rows)[0]?.length ?? 0)) / 2);
    let visible = true;
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    seen.observe(el);
    draw(frame(mood, rows, t, walk));
    const id = window.setInterval(() => {
      if (!visible) return;
      t++;
      draw(frame(mood, rows, t, walk));
    }, TICK);
    return () => {
      window.clearInterval(id);
      seen.disconnect();
    };
  }, [mood, character, reduced]);

  return (
    <span className="echo-creature__screen">
      <canvas ref={canvas} className="echo-creature__dots" />
    </span>
  );
}
