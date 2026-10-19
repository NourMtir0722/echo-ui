"use client";

/**
 * <Creature> — the canonical Echo as a lit, glossy object, with the composed
 * behaviour vocabulary from the first Echo's EchoGlossy: breathe,
 * wander + sway, look (tracks the cursor, glances around when idle), blink,
 * and rest (sleepy, drooped lids). Small amplitudes, slow springs — a
 * companion, not a bouncy mascot. The silhouette, eye shapes and colours never
 * change.
 *
 * The motion is ./rig: built once, so a change of mood carries on from
 * wherever Echo is — lids droop over most of a second and the breath slows
 * into rest; waking is a perk and a double blink (a mood change used
 * to snap Echo back to centre).
 *
 * Differences from the original, all deliberate:
 * - gradient ids come from useId. The original hardcoded `id="echoBody"`, so
 *   two creatures on one page shared (or lost) each other's gloss;
 * - reduced motion is one composed frame: eyes at their mood, nothing looping,
 *   no cursor chase;
 * - it is decorative by default (aria-hidden). Where it carries meaning — the
 *   device screen's state — the text beside it says so.
 */
import { useEffect, useId, useRef } from "react";
import { creature } from "./tokens";
import { BODY, EYE_CATCH, EYE_CY, EYE_WHITE_L, EYE_WHITE_R, PUPIL_L, PUPIL_R, VIEWBOX } from "./paths";
import { createRig, stillPose, type Rig, type RigMood } from "./rig";

/** Sway / breath pivot, near the body's low centre. */
const ORIGIN = [129, 38] as const;
const EYE = [129, EYE_CY] as const;

export type Mood = "watching" | "resting";

function moodFor(mood: Mood, interactive: boolean, breathe: boolean): RigMood {
  const resting = mood === "resting";
  // Logo mode: facing forward, still but for the breath.
  if (!interactive) {
    return {
      drift: 0,
      sway: 0,
      pace: 1,
      lean: 0,
      breath: breathe ? (resting ? 0.05 : 0.03) : 0,
      breathPeriod: resting ? 12 : 8,
      lids: resting ? 0.52 : 1,
      look: "rest",
      blink: null,
    };
  }
  return resting
    ? {
        drift: 1,
        sway: 0.7,
        pace: 0.55,
        lean: 0.8,
        breath: breathe ? 0.05 : 0,
        breathPeriod: 12,
        lids: 0.52,
        // Resting eyes are lazy: they don't chase, they settle a little low.
        look: "rest",
        rest: [0, 0.3],
        blink: [4, 8],
      }
    : {
        drift: 2.2,
        sway: 1.8,
        pace: 1,
        lean: 2,
        breath: breathe ? 0.03 : 0,
        breathPeriod: 8,
        lids: 1,
        look: "follow",
        blink: [2.6, 6.5],
      };
}

export function Creature({
  size = 220,
  mood = "watching",
  interactive = true,
  breathe = true,
  gloss = true,
  className,
}: {
  size?: number;
  mood?: Mood;
  /** false = logo mode: static, facing forward, no behaviours. */
  interactive?: boolean;
  breathe?: boolean;
  gloss?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const drift = useRef<SVGGElement>(null);
  const breath = useRef<SVGGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const pupils = useRef<SVGGElement>(null);
  const rig = useRef<Rig | null>(null);

  // The rig lives as long as the creature does.
  useEffect(
    () => () => {
      rig.current?.destroy();
      rig.current = null;
    },
    [],
  );

  // The first mood builds it; every later one is a new direction, never a restart.
  useEffect(() => {
    const next = moodFor(mood, interactive, breathe);
    if (rig.current) {
      rig.current.set(next);
      return;
    }
    const els = { wrap: wrap.current, drift: drift.current, breath: breath.current, lids: lids.current, pupils: pupils.current };
    if (!els.wrap || !els.drift || !els.breath || !els.lids || !els.pupils) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      stillPose({ drift: els.drift, breath: els.breath, lids: els.lids, pupils: els.pupils }, { eye: EYE, mood: next });
      return;
    }
    rig.current = createRig(
      { wrap: els.wrap, drift: els.drift, breath: els.breath, lids: els.lids, pupils: els.pupils },
      { origin: ORIGIN, eye: EYE, mood: next },
    );
  }, [mood, interactive, breathe]);

  return (
    <div ref={wrap} className={className} style={{ width: size, height: size, position: "relative" }} aria-hidden="true">
      <svg viewBox={VIEWBOX} width={size} height={size} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <radialGradient id={`${uid}-body`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" style={{ stopColor: creature.bodyLight }} />
            <stop offset="40%" style={{ stopColor: creature.body }} />
            <stop offset="100%" style={{ stopColor: creature.bodyDeep }} />
          </radialGradient>
          <radialGradient id={`${uid}-spec`} cx="34%" cy="24%" r="42%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <g ref={drift}>
          <g ref={breath}>
            {/* Named for a drawn look (brand.css): the body turns to paper with an ink line, the shine goes. */}
            <path className="brand-creature__body" d={BODY} style={{ fill: gloss ? `url(#${uid}-body)` : creature.body }} />
            {gloss && (
              <path className="brand-creature__shine" d={BODY} fill="none" style={{ stroke: creature.bodyDeep }} strokeWidth="0.7" strokeOpacity="0.6" />
            )}
            {gloss && (
              <ellipse className="brand-creature__shine" cx="125" cy="20" rx="5.4" ry="3.4" fill={`url(#${uid}-spec)`} transform="rotate(-18 125 20)" />
            )}
            <g ref={lids}>
              <path className="brand-creature__eye" d={EYE_WHITE_L} style={{ fill: creature.eye }} />
              <path className="brand-creature__eye" d={EYE_WHITE_R} style={{ fill: creature.eye }} />
              <g ref={pupils}>
                <path className="brand-creature__pupil" d={PUPIL_L} style={{ fill: creature.pupil }} />
                <path className="brand-creature__pupil" d={PUPIL_R} style={{ fill: creature.pupil }} />
                {gloss &&
                  EYE_CATCH.map(([x, y]) => <circle key={x} className="brand-creature__shine" cx={x} cy={y} r={0.55} fill="rgba(255,255,255,0.8)" />)}
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
