"use client";

/**
 * MorphSurface — the body a Morph is drawn in, in the material of Echo's cap.
 *
 * Purely visual. A component shows its real controls at rest and draws this
 * only while its shape changes, from the real controls' boxes to the real
 * controls' boxes, so the hand-off is seamless. That is why it paints what a
 * HardwareButton paints, in the same role variables: the recessed well the
 * cap sits in, the neutral cap's gradient, the primary cap's gradient where a
 * part is lit, the seam under it, the key light's gloss on its top edge, and
 * its drop shadow. It relights with the seed like every other cap.
 *
 * Labels are copies for the eye (aria-hidden): the real controls carry the
 * names, focus and keyboard.
 */
import { useId, useLayoutEffect, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useSoundOptional } from "../sound/sound-provider";
import type { SoundRecipe } from "../sound/sound";
import { MorphEngine, type MorphTone } from "./morph";
import type { MorphFeel } from "./morph-outline";

export interface MorphLabel {
  /** The part it rides on; -1 is the whole. */
  part: number;
  content: ReactNode;
}

export interface MorphSurfaceProps {
  tones: MorphTone[];
  labels: MorphLabel[];
  feel: MorphFeel;
  /** Surface width, px. */
  width: number;
  /** A cap's height, px. The surface adds MORPH_MARGIN above and below. */
  body: number;
  /** Corner radius, px; omitted is a pill. */
  radius?: number;
  /** Rim of the recessed well, px (the cap's well padding). */
  well?: number;
  onMorph: (morph: MorphEngine) => void;
  className?: string;
  style?: CSSProperties;
  /** Class for every label copy (the component gives it the cap's type). */
  labelClassName?: string;
  /** Inline type for the label copies, read off the real cap. */
  labelStyle?: CSSProperties;
}

/** Room above and below a cap for its seam, swell and shadow, px. */
export const MORPH_MARGIN = 14;

/** A neck snapping, and a neck forming: quiet, and only with a SoundProvider. */
const POP: SoundRecipe = { wave: "sine", freq: 900, decay: 0.05, gain: 0.06, bend: 500 };
const GULP: SoundRecipe = { wave: "sine", freq: 460, decay: 0.07, gain: 0.07, bend: -200 };

const prefersReduced = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const baseLabel: CSSProperties = {
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  pointerEvents: "none",
};

const innerStyle: CSSProperties = {
  flex: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "inherit",
  transform: "translateY(calc((1 - var(--in, 1)) * 4px)) scale(calc(0.95 + 0.05 * var(--in, 1)))",
};

export function MorphSurface({
  tones,
  labels,
  feel,
  width,
  body,
  radius,
  well = 0,
  onMorph,
  className,
  style,
  labelClassName,
  labelStyle,
}: MorphSurfaceProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const paths = useRef<SVGPathElement[]>([]);
  const wells = useRef<SVGPathElement[]>([]);
  const stops = useRef<SVGStopElement[]>([]);
  const labelEls = useRef<(HTMLElement | null)[]>([]);
  const morph = useRef<MorphEngine | null>(null);
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;
  const height = body + 2 * MORPH_MARGIN;

  useLayoutEffect(() => {
    const m = new MorphEngine(
      { paths: paths.current, wells: wells.current, stops: stops.current, labels: labelEls.current },
      tones,
      labels.map((l) => l.part),
      width,
      height / 2,
    );
    m.k = feel.k;
    m.radius = radius ?? Infinity;
    m.well = well;
    m.reduced = prefersReduced();
    // Only a real division or fusion: a first draw from nothing is silent.
    m.onBodies = (now, before) => {
      if (now > 0 && before > 0) play.current?.(now > before ? POP : GULP);
    };
    morph.current = m;
    onMorph(m);
    return () => m.destroy();
    // Built once: the parts and labels are fixed for a surface's life, and
    // everything that can change is pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = morph.current;
    if (!m) return;
    m.k = feel.k;
    m.radius = radius ?? Infinity;
    m.well = well;
    m.reduced = prefersReduced();
    m.resize(width, height / 2);
  }, [feel.k, radius, well, width, height]);

  const top = height / 2 - body / 2;
  const path = (i: number) => (el: SVGPathElement | null) => {
    if (el) paths.current[i] = el;
  };
  const wellPath = (i: number) => (el: SVGPathElement | null) => {
    if (el) wells.current[i] = el;
  };
  const shade = (a: number) => `color-mix(in oklab, var(--echo-cast-ink, black) calc(${a} * var(--echo-shade, 1) * 100%), transparent)`;
  const gloss = (a: number) => `rgb(255 255 255 / calc(${a} * var(--echo-gloss, 1)))`;

  return (
    <div className={className} aria-hidden style={{ position: "relative", width, height, ...style }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {/* The neutral cap: highlight, body, body, shadow — as HardwareButton. */}
          <linearGradient id={`${id}-cap`} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={top + body}>
            <stop offset="0" style={{ stopColor: "var(--echo-cap-highlight)" }} />
            <stop offset="0.4" style={{ stopColor: "var(--echo-cap)" }} />
            <stop offset="0.62" style={{ stopColor: "var(--echo-cap)" }} />
            <stop offset="1" style={{ stopColor: "var(--echo-cap-shadow)" }} />
          </linearGradient>
          {/* The primary cap: its own three roles, as HardwareButton. */}
          <linearGradient id={`${id}-primary`} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={top + body}>
            <stop offset="0" style={{ stopColor: "var(--echo-primary-cap-top)" }} />
            <stop offset="0.45" style={{ stopColor: "var(--echo-primary-cap-mid)" }} />
            <stop offset="1" style={{ stopColor: "var(--echo-primary-cap-base)" }} />
          </linearGradient>
          <linearGradient id={`${id}-lit`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
            {tones.flatMap((_, i) =>
              [0, 1, 2, 3].map((j) => (
                <stop
                  key={`${i}-${j}`}
                  stopColor="#fff"
                  stopOpacity="0"
                  ref={(el) => {
                    if (el) stops.current[4 * i + j] = el;
                  }}
                />
              )),
            )}
          </linearGradient>
          <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="-50" y="-50" width={width + 100} height={height + 100}>
            <rect x="-50" y="-50" width={width + 100} height={height + 100} fill={`url(#${id}-lit)`} />
          </mask>
          {/* The well: a dark rim under the top edge, a faint catch-light at the bottom. */}
          <linearGradient id={`${id}-well`} gradientUnits="userSpaceOnUse" x1="0" y1={top - well} x2="0" y2={top + body + well}>
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#000" stopOpacity="0.28" />
            <stop offset="1" stopColor="#000" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id={`${id}-gloss`} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={top + body}>
            <stop offset="0" style={{ stopColor: gloss(0.42) }} />
            <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.85" stopColor="#000" stopOpacity="0" />
            <stop offset="1" style={{ stopColor: shade(0.35) }} />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <path ref={path(5)} />
          </clipPath>
        </defs>
        {well > 0 ? <path ref={wellPath(0)} fill={`url(#${id}-well)`} /> : null}
        {/* A lit cap's coloured glow, as HardwareButton's primary drop shadow. */}
        <path
          ref={path(6)}
          mask={`url(#${id}-mask)`}
          style={{
            fill: "var(--echo-primary-cap-base)",
            filter: "drop-shadow(0 8px 20px color-mix(in oklch, var(--echo-accent-4) 40%, transparent))",
          }}
        />
        <g style={{ filter: `drop-shadow(0 9px 14px ${shade(0.55)})` }}>
          <path ref={path(0)} transform="translate(0 4)" style={{ fill: "var(--echo-seam)" }} />
          {/* A lit cap sits on an accent seam, as HardwareButton's primary. */}
          <path ref={path(7)} transform="translate(0 4)" mask={`url(#${id}-mask)`} style={{ fill: "var(--echo-accent-6)" }} />
          <path ref={path(1)} fill={`url(#${id}-cap)`} />
          <path ref={path(2)} fill={`url(#${id}-primary)`} mask={`url(#${id}-mask)`} />
        </g>
        <path ref={path(3)} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth="3" clipPath={`url(#${id}-clip)`} />
        <path ref={path(4)} fill="none" />
      </svg>
      {labels.map((l, i) => (
        <span
          key={i}
          ref={(el) => {
            labelEls.current[i] = el;
          }}
          className={labelClassName}
          style={{ ...baseLabel, ...labelStyle }}
        >
          <span className="echo-morph__inner" style={innerStyle}>
            {l.content}
          </span>
        </span>
      ))}
    </div>
  );
}
