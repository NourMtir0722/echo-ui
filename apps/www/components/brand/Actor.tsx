"use client";

/**
 * <Actor> — Echo's full performance rig, ported from the first Echo's
 * EchoActor: the canonical body plus a composed behaviour set and locomotion
 * legs. Distinct from <Creature> (the leg-less canonical mark): the silhouette
 * lock survives because legs exist only while Echo is MOVING — they sprout for
 * walk and squat and tuck away for everything else.
 *
 *   idle    breathe + cursor-tracking eyes + blink
 *   wander  drifts to gentle new spots and leans toward you
 *   walk    legs out, feet planted, paces side to side, looks where it's going
 *   peek    slides up from below, looks around, ducks
 *   nap     lids shut, slow deep breath, drifting z's
 *   squat   one rep loop — knees bend, body lowers, drives up
 *   glitch  brief RGB-split shear and step jitter, then snaps clean
 *
 * The living layers (drift, breath, lids, eyes) are ./rig, the same as the
 * Creature's; this file adds what each behaviour does on top. Both are built
 * once, so switching behaviour carries on from wherever Echo is: walking to
 * idle, it slows and comes home, the legs tucking as it stops.
 *
 * The body never squashes: a squat bends the knees and lowers the body, and a
 * step's bob is what straight legs swinging from the hip do to its height.
 * Legs are surface-adaptive ink (cream on dark, near-black on light) so they
 * never disappear. Every behaviour has a single composed pose under
 * prefers-reduced-motion.
 */
import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { creature, glitch, neutral } from "./tokens";
import { BODY, EYE_CATCH, EYE_CY, EYE_WHITE_L, EYE_WHITE_R, PUPIL_L, PUPIL_R, VIEWBOX } from "./paths";
import { createRig, stillPose, type Rig, type RigMood } from "./rig";
import { sprung } from "./springs";

export type Behavior = "idle" | "wander" | "walk" | "peek" | "nap" | "squat" | "glitch";

export const BEHAVIORS: readonly [Behavior, string][] = [
  ["idle", "Sits, breathes, tracks your cursor, blinks."],
  ["wander", "Drifts to gentle new spots and leans toward you."],
  ["walk", "Legs out, feet planted, paces across and looks where it’s going."],
  ["peek", "Slides up from below and peeks, eyes wide."],
  ["nap", "Eyes shut, slow deep breath, drifting z’s."],
  ["squat", "One steady rep — knees bend, body lowers, drives up."],
  ["glitch", "A brief RGB-split shear and jitter, then snaps clean."],
];

const ORIGIN = [129.3, 34] as const;
const EYE = [129.3, EYE_CY] as const;
const SVG_ORIGIN = `${ORIGIN[0]} ${ORIGIN[1]}`;
const HIP = { l: { x: 126.6, y: 49 }, r: { x: 132, y: 49 } } as const;
const LEG_LEN = 7.4;
/** How far each leg swings from the hip at full stride, radians. */
const STRIDE_ANGLE = (22 * Math.PI) / 180;
/** Ground covered by one step at full swing: what keeps a planted foot planted. */
const STRIDE = 2 * LEG_LEN * Math.sin(STRIDE_ANGLE);
/** A full squat's knee bend, radians: lowers the body three units. */
const SQUAT_BEND = Math.acos(1 - 3 / LEG_LEN);

const HOME = { duration: 0.6, bounce: 0 };
const SPROUT = { duration: 0.4, bounce: 0.25 };
const TUCK = { duration: 0.3, bounce: 0 };

const BASE: RigMood = {
  drift: 0,
  sway: 0,
  pace: 1,
  lean: 0,
  breath: 0.03,
  breathPeriod: 8,
  lids: 1,
  look: "follow",
  blink: [2.4, 6],
};

const MOODS: Record<Behavior, RigMood> = {
  idle: { ...BASE, drift: 0.35, sway: 0.3, lean: 0.6 },
  wander: { ...BASE, drift: 3.2, sway: 2.4, lean: 2 },
  walk: { ...BASE, breath: 0.015, look: "held" },
  peek: { ...BASE, breath: 0.015, look: "held" },
  nap: { ...BASE, pace: 0.4, breath: 0.06, breathPeriod: 12, lids: 0.06, look: "rest", rest: [0, 0.3], blink: null },
  squat: { ...BASE, breath: 0, look: "rest", rest: [0, 0.25] },
  glitch: { ...BASE, drift: 0.35, sway: 0.3 },
};

const needsLegs = (b: Behavior) => b === "walk" || b === "squat";

/** A leg from the hip, its knee bent outward by `bend`: the foot stays under the hip. */
function legShape(side: "l" | "r", bend: number): { leg: string; foot: string } {
  const h = HIP[side];
  const out = side === "l" ? -1 : 1;
  const b = Math.max(0, bend);
  const kx = h.x + out * (LEG_LEN / 2) * Math.sin(b);
  const ky = h.y + (LEG_LEN / 2) * Math.cos(b);
  const fy = h.y + LEG_LEN * Math.cos(b);
  return {
    leg: `M${h.x} ${h.y}L${kx.toFixed(3)} ${ky.toFixed(3)}L${h.x} ${fy.toFixed(3)}`,
    foot: `M${h.x - 1.6} ${fy.toFixed(3)}L${h.x + 2.4} ${fy.toFixed(3)}`,
  };
}

interface Els {
  wrap: HTMLDivElement;
  stage: SVGGElement;
  drift: SVGGElement;
  lift: SVGGElement;
  breath: SVGGElement;
  lids: SVGGElement;
  pupils: SVGGElement;
  legs: SVGGElement;
  legL: SVGGElement;
  legR: SVGGElement;
  shapes: SVGPathElement[];
  gCyan: SVGGElement;
  gPink: SVGGElement;
  zzz: SVGGElement;
}

/** The legs' length out of the body: 0 tucked inside, 1 standing. */
const sprout = (k: number) => `translate(0 ${HIP.l.y}) scale(1 ${Math.max(0.001, k).toFixed(4)}) translate(0 ${-HIP.l.y})`;

/** Knees and body height: a crouch (the knee bend) and a step's bob, one writer for the body's height. */
function createLegs(els: Els) {
  const pose = { crouch: 0, bob: 0, out: 0 };
  const apply = () => {
    const a = pose.crouch;
    // Bent knees lower the hips; past straight, the drive up lifts a hair.
    const lower = a >= 0 ? LEG_LEN * (1 - Math.cos(a)) : a * 3;
    gsap.set(els.lift, { y: lower + pose.bob });
  };
  return {
    pose,
    crouch(a: number) {
      pose.crouch = a;
      const l = legShape("l", a);
      const r = legShape("r", a);
      const [legL, footL, legR, footR] = els.shapes;
      legL?.setAttribute("d", l.leg);
      footL?.setAttribute("d", l.foot);
      legR?.setAttribute("d", r.leg);
      footR?.setAttribute("d", r.foot);
      apply();
    },
    bob(y: number) {
      pose.bob = y;
      apply();
    },
    sprout(k: number) {
      pose.out = k;
      els.legs.setAttribute("transform", sprout(k));
    },
  };
}

/** One composed still per behaviour, for reduced motion. */
function still(els: Els, b: Behavior) {
  const legs = createLegs(els);
  stillPose(els, { eye: EYE, mood: MOODS[b] });
  gsap.set(els.stage, { x: 0, y: b === "peek" ? 16 : 0, rotation: 0 });
  gsap.set([els.legL, els.legR], { rotation: 0 });
  legs.sprout(needsLegs(b) ? 1 : 0);
  legs.crouch(b === "squat" ? SQUAT_BEND * 0.8 : 0);
  gsap.set(els.zzz, { opacity: b === "nap" ? 1 : 0 });
  gsap.set(els.zzz.children, { opacity: b === "nap" ? 0.6 : 0, y: 0, x: 0 });
}

/**
 * The behaviour layer: what a behaviour does on top of the rig. Every switch
 * stops the last behaviour where it is and moves on from there.
 */
function createPerformer(els: Els, rig: Rig) {
  const legs = createLegs(els);
  const stops: (() => void)[] = [];
  const keep = <T extends { kill(): unknown }>(a: T): T => {
    stops.push(() => void a.kill());
    return a;
  };

  const stop = () => stops.splice(0).forEach((s) => s());

  const home = (hold: { x?: boolean; y?: boolean; rotation?: boolean } = {}) => {
    const to: gsap.TweenVars = { svgOrigin: SVG_ORIGIN, ...sprung(HOME) };
    if (!hold.x) to.x = 0;
    if (!hold.y) to.y = 0;
    if (!hold.rotation) to.rotation = 0;
    keep(gsap.to(els.stage, to));
    keep(gsap.to(els.lift, { x: 0, skewX: 0, ...sprung(HOME) }));
    keep(gsap.to([els.legL, els.legR], { rotation: 0, ...sprung(HOME) }));
  };

  const play = (b: Behavior) => {
    stop();
    rig.set(MOODS[b]);
    const out = { k: legs.pose.out };
    keep(gsap.to(out, { k: needsLegs(b) ? 1 : 0, ...sprung(needsLegs(b) ? SPROUT : TUCK), onUpdate: () => legs.sprout(out.k) }));
    // Whatever the last behaviour left bent or bobbing straightens from there.
    if (b !== "squat") {
      const knees = { a: legs.pose.crouch };
      keep(gsap.to(knees, { a: 0, ...sprung(HOME), onUpdate: () => legs.crouch(knees.a) }));
    }
    const step = { y: legs.pose.bob };
    keep(gsap.to(step, { y: 0, ...sprung(HOME), onUpdate: () => legs.bob(step.y) }));
    if (b !== "nap") keep(gsap.to(els.zzz, { opacity: 0, duration: 0.3 }));
    gsap.set([els.gCyan, els.gPink], { opacity: 0, x: 0 });

    if (b === "idle" || b === "wander") home();

    if (b === "walk") {
      home({ x: true, rotation: true });
      // The legs are driven by the ground covered, so a slowing body slows its
      // stride and a stopped one stands: the planted foot never slides.
      let phase = 0;
      let lastX = Number(gsap.getProperty(els.stage, "x"));
      const stepping = () => {
        const x = Number(gsap.getProperty(els.stage, "x"));
        phase += (Math.PI * Math.abs(x - lastX)) / STRIDE;
        lastX = x;
        const swing = STRIDE_ANGLE * Math.sin(phase);
        gsap.set(els.legL, { rotation: (swing * 180) / Math.PI, svgOrigin: `${HIP.l.x} ${HIP.l.y}` });
        gsap.set(els.legR, { rotation: (-swing * 180) / Math.PI, svgOrigin: `${HIP.r.x} ${HIP.r.y}` });
        // Straight legs swinging from the hip lower it as they spread.
        legs.bob(LEG_LEN * (1 - Math.cos(swing)));
      };
      // After the step settle above has handed the bob over.
      keep(gsap.delayedCall(0.05, () => gsap.ticker.add(stepping)));
      stops.push(() => gsap.ticker.remove(stepping));
      const heading = (dir: number) => () => rig.look(dir * 0.75, 0.1);
      rig.look(0.75, 0.1);
      const lap = gsap
        .timeline({ repeat: -1 })
        .to(els.stage, { x: -9, rotation: -2, duration: 2.6, ease: "sine.inOut", svgOrigin: SVG_ORIGIN })
        // Eyes turn toward the way back a moment before the body does.
        .call(heading(1), [], 2.25)
        .to(els.stage, { x: 9, rotation: 2, duration: 2.6, ease: "sine.inOut", svgOrigin: SVG_ORIGIN })
        .call(heading(-1), [], 4.85);
      keep(
        gsap
          .timeline()
          .to(els.stage, { x: 9, rotation: 2, duration: 1.8, ease: "sine.inOut", svgOrigin: SVG_ORIGIN })
          .call(heading(-1), [], 1.45)
          .add(lap),
      );
    }

    if (b === "peek") {
      home({ y: true });
      rig.look(0, -0.5);
      const look = (x: number) => () => rig.look(x, -0.5);
      const loop = gsap
        .timeline({ repeat: -1, repeatDelay: 0.6 })
        // In viewBox units: at 52 the petal tips sit under the frame; at 16 the
        // eyes clear it and the lower body stays clipped.
        .to(els.stage, { y: 16, ...sprung({ duration: 0.7, bounce: 0.2 }) })
        .call(look(0.7), [], 0.55)
        .call(look(-0.7), [], 1.1)
        .call(look(0), [], 1.8)
        .to(els.stage, { y: 52, duration: 0.5, ease: "power2.in" }, 2.3);
      keep(gsap.timeline().to(els.stage, { y: 52, duration: 0.45, ease: "power2.in" }).add(loop));
    }

    if (b === "nap") {
      home({ rotation: true });
      const tl = keep(gsap.timeline());
      tl.to(els.stage, { rotation: 4, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true, svgOrigin: SVG_ORIGIN }, 0);
      // The z's used to drift inside a group left at opacity 0.
      tl.to(els.zzz, { opacity: 1, duration: 0.4 }, 0.6);
      Array.from(els.zzz.children).forEach((z, i) => {
        tl.fromTo(
          z,
          { opacity: 0, y: 0, x: 0, scale: 0.6 },
          { opacity: 0.7, y: -10, x: 4, scale: 1, duration: 2.4, ease: "power1.out", repeat: -1, repeatDelay: 1.2 },
          0.6 + i * 0.8,
        );
      });
    }

    if (b === "squat") {
      home();
      const knees = { a: legs.pose.crouch };
      const draw = () => legs.crouch(knees.a);
      keep(
        gsap
          .timeline({ repeat: -1 })
          .to(knees, { a: SQUAT_BEND, duration: 0.7, ease: "power2.inOut", onUpdate: draw })
          .to(knees, { a: 0, ...sprung({ duration: 0.5, bounce: 0.15 }), onUpdate: draw }, "+=0.1")
          .to({}, { duration: 0.5 }),
      );
    }

    if (b === "glitch") {
      home();
      const q = gsap.utils;
      let burst: gsap.core.Timeline | null = null;
      let wait: gsap.core.Tween | null = null;
      const fire = () => {
        burst = gsap.timeline({ onComplete: () => void (wait = gsap.delayedCall(q.random(1.6, 3.4), fire)) });
        for (let i = 0; i < 6; i++) {
          const off = q.random(-3, 3);
          burst
            .set([els.gCyan, els.gPink], { opacity: 0.65 }, i * 0.05)
            .set(els.gCyan, { x: -off }, i * 0.05)
            .set(els.gPink, { x: off }, i * 0.05)
            .set(els.lift, { x: q.random(-2.5, 2.5), skewX: q.random(-6, 6) }, i * 0.05);
        }
        burst.set([els.gCyan, els.gPink], { opacity: 0 }, 0.3).set(els.lift, { x: 0, skewX: 0 }, 0.3);
      };
      wait = gsap.delayedCall(q.random(0.6, 1.6), fire);
      stops.push(() => {
        burst?.kill();
        wait?.kill();
        gsap.set([els.gCyan, els.gPink], { opacity: 0 });
        gsap.set(els.lift, { x: 0, skewX: 0 });
      });
    }
  };

  return { play, stop };
}

export function Actor({
  size = 220,
  behavior = "idle",
  surface = "dark",
  className,
}: {
  size?: number;
  behavior?: Behavior;
  surface?: "dark" | "light";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<SVGGElement>(null);
  const drift = useRef<SVGGElement>(null);
  const lift = useRef<SVGGElement>(null);
  const breath = useRef<SVGGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const pupils = useRef<SVGGElement>(null);
  const legs = useRef<SVGGElement>(null);
  const legL = useRef<SVGGElement>(null);
  const legR = useRef<SVGGElement>(null);
  const gCyan = useRef<SVGGElement>(null);
  const gPink = useRef<SVGGElement>(null);
  const zzz = useRef<SVGGElement>(null);
  const live = useRef<{ rig: Rig; performer: ReturnType<typeof createPerformer> } | null>(null);

  const ink = surface === "dark" ? neutral.cream : neutral.void;

  // The rig and the performer live as long as the Actor does.
  useEffect(
    () => () => {
      live.current?.performer.stop();
      live.current?.rig.destroy();
      live.current = null;
    },
    [],
  );

  useEffect(() => {
    const parts = [wrap, stage, drift, lift, breath, lids, pupils, legs, legL, legR, gCyan, gPink, zzz].map((r) => r.current);
    if (parts.some((p) => !p)) return;
    const els: Els = {
      wrap: wrap.current!,
      stage: stage.current!,
      drift: drift.current!,
      lift: lift.current!,
      breath: breath.current!,
      lids: lids.current!,
      pupils: pupils.current!,
      legs: legs.current!,
      legL: legL.current!,
      legR: legR.current!,
      shapes: [...legs.current!.querySelectorAll("path")],
      gCyan: gCyan.current!,
      gPink: gPink.current!,
      zzz: zzz.current!,
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      still(els, behavior);
      return;
    }
    if (!live.current) {
      const rig = createRig(els, { origin: ORIGIN, eye: EYE, mood: MOODS[behavior] });
      live.current = { rig, performer: createPerformer(els, rig) };
    }
    live.current.performer.play(behavior);
  }, [behavior]);

  const body = (tint?: string) => (
    <>
      <path d={BODY} style={{ fill: tint ?? `url(#${uid}-body)` }} />
      {!tint && <path d={BODY} fill="none" style={{ stroke: creature.bodyDeep }} strokeWidth="0.7" strokeOpacity="0.6" />}
      {!tint && <ellipse cx="125" cy="20" rx="5.4" ry="3.4" fill={`url(#${uid}-spec)`} transform="rotate(-18 125 20)" />}
    </>
  );

  const leg = (side: "l" | "r") => {
    const shape = legShape(side, 0);
    return (
      <g ref={side === "l" ? legL : legR}>
        <path d={shape.leg} fill="none" style={{ stroke: ink }} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <path d={shape.foot} fill="none" style={{ stroke: ink }} strokeWidth={2.2} strokeLinecap="round" />
      </g>
    );
  };

  return (
    <div
      ref={wrap}
      className={className}
      aria-hidden="true"
      // Clipped below the frame only: peek rises from under it, while walk and
      // squat stay free to overflow sideways and the z's to drift up.
      style={{ width: size, height: size, position: "relative", clipPath: "inset(-50% -50% 0 -50%)" }}
    >
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
        <g ref={stage}>
          <g ref={gCyan} style={{ mixBlendMode: "screen", opacity: 0 }}>
            {body(glitch.cyan)}
          </g>
          <g ref={gPink} style={{ mixBlendMode: "screen", opacity: 0 }}>
            {body(glitch.pink)}
          </g>
          <g ref={zzz} style={{ opacity: 0 }}>
            {[0, 1, 2].map((i) => (
              <text
                key={i}
                x={138 + i * 3}
                y={16 - i * 4}
                style={{ fill: ink, opacity: 0 }}
                fontSize={i === 0 ? 5 : 4}
                fontFamily="var(--echo-font-mono), monospace"
                fontWeight={700}
              >
                z
              </text>
            ))}
          </g>
          <g ref={drift}>
            <g ref={lift}>
              <g ref={legs} transform={sprout(0)}>
                {leg("l")}
                {leg("r")}
              </g>
              <g ref={breath}>
                {body()}
                <g ref={lids}>
                  <path d={EYE_WHITE_L} style={{ fill: creature.eye }} />
                  <path d={EYE_WHITE_R} style={{ fill: creature.eye }} />
                  <g ref={pupils}>
                    <path d={PUPIL_L} style={{ fill: creature.pupil }} />
                    <path d={PUPIL_R} style={{ fill: creature.pupil }} />
                    {EYE_CATCH.map(([x, y]) => (
                      <circle key={x} cx={x} cy={y} r={0.55} fill="rgba(255,255,255,0.8)" />
                    ))}
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
