"use client";

/**
 * The flat guide: Echo, travelling the homepage from perch to perch, drawn.
 * It's what makes the journey where there's no WebGL for the 3D Echo
 * (echo3d/Echo3D.tsx), and `GuideStop`, the perch, is both of theirs.
 *
 * It starts at home, inside the hero device's screen. Scroll, and it leaves
 * the screen (the device says AWAY) for a perch in the section you're reading.
 * Every section has one (`GuideStop`), which says what Echo does there with a
 * mood: it watches, works while a command runs, follows your keyboard focus,
 * naps in the footer. Scroll back up and it jumps back, all the way home.
 *
 * A jump is an arc, not a slide: it rises with the distance, leans into the
 * direction it's going, and lands on the perch's surface. Between jumps it
 * rides its perch, so it scrolls with the section it's in. Press something
 * near it and it hops.
 *
 * It's the registry's Creature, the one a product installs: the mascot on the
 * homepage is a component you can have.
 *
 * Decorative: hidden from assistive technology and never in a pointer's way.
 * Under reduced motion there are no flights; Echo is simply at each perch.
 * Without JavaScript it never leaves the device.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Creature, type CreatureMood } from "@registry/echo/creature";

/** The drawn size. Every perch is smaller, so a scaled Echo is only ever scaled down. */
const SIZE = 188;
/** Where the body's lowest petal sits in the drawing, as a fraction of its height. */
const FEET = 0.921;
/** A section is the one being read once its top passes this line. */
const READING_LINE = 0.5;

export const GUIDE_EVENT = "echo-guide";

/** Echo is pleased for a moment, wherever it is: a hop or two. */
export function cheerGuide(ms = 1400) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: { ms } }));
}

/**
 * A perch. Its box is the space Echo sits in: Echo lands with its feet on the
 * box's bottom edge, drawn at the box's width. Size it in CSS (`--guide-size`),
 * and it's the same size in every layout it has room in. While Echo sits on
 * it, it carries `data-guide-here`.
 */
export function GuideStop({
  mood = "idle",
  follow,
  pile,
  className,
  style,
}: {
  mood?: CreatureMood;
  /**
   * `focus`: in this section, Echo stands beside whatever has keyboard focus,
   * outside the `data-guide-rail` element it's in (where there's room).
   */
  follow?: "focus";
  /** The last perch: in 3D, Echo lands here and drops into the pile with its crowd. */
  pile?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={["guide-stop", className].filter(Boolean).join(" ")}
      data-guide-stop=""
      data-guide-mood={mood}
      data-guide-follow={follow}
      data-guide-pile={pile ? "" : undefined}
      aria-hidden="true"
      style={style}
    />
  );
}

interface Pose {
  x: number;
  y: number;
  s: number;
}

interface Flight {
  from: Pose;
  start: number;
  duration: number;
  rise: number;
}

const ease = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;

export function Guide({ onAwayChange }: { onAwayChange?: (away: boolean) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<CreatureMood>("idle");
  const away = useRef(onAwayChange);
  away.current = onAwayChange;

  useEffect(() => {
    const box = outer.current;
    const lean = inner.current;
    if (!box || !lean) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let sections: HTMLElement[] = [];
    const collect = () => {
      sections = [...document.querySelectorAll<HTMLElement>("[data-guide-section]")];
    };
    collect();
    const stopOf = (section: HTMLElement) => section.querySelector<HTMLElement>("[data-guide-stop]");

    let base: CreatureMood = "idle";
    let cheering = 0;
    let target: HTMLElement | null = null;
    let atHome = true;
    let flight: Flight | null = null;
    let pose: Pose = { x: 0, y: 0, s: 1 };
    let raf = 0;
    let shownAway = false;
    let here: HTMLElement | null = null;

    const setAway = (next: boolean) => {
      if (next === shownAway) return;
      shownAway = next;
      away.current?.(next);
    };

    /** The section being read, and the element Echo should be on in it. */
    const pick = (): { section: HTMLElement; stop: HTMLElement; el: HTMLElement } | null => {
      if (sections.length === 0) return null;
      const line = window.innerHeight * READING_LINE;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      let section = sections[0]!;
      for (const s of sections) if (s.getBoundingClientRect().top < line) section = s;
      if (atBottom) section = sections.at(-1)!;
      const stop = stopOf(section);
      if (!stop) return null;
      if (stop.dataset.guideFollow === "focus") {
        const a = document.activeElement;
        const rail = a instanceof HTMLElement ? a.closest<HTMLElement>("[data-guide-rail]") : null;
        const room = rail ? rail.getBoundingClientRect().left >= stop.getBoundingClientRect().width + 16 : false;
        if (rail && room && section.contains(rail) && (a as HTMLElement).matches(":focus-visible")) {
          return { section, stop, el: a as HTMLElement };
        }
      }
      return { section, stop, el: stop };
    };

    /** Where Echo's feet go for an element, and how big it's drawn there. */
    const anchor = (el: HTMLElement, stop: HTMLElement): Pose => {
      const w = stop.getBoundingClientRect().width;
      const s = w / SIZE;
      const r = el.getBoundingClientRect();
      if (el === stop) return { x: r.left + r.width / 2, y: r.bottom, s };
      // A focused control: beside the panel it's in, level with it, so it covers nothing.
      const rail = el.closest<HTMLElement>("[data-guide-rail]")!.getBoundingClientRect();
      return { x: rail.left - w / 2 - 8, y: r.top + r.height / 2 + (w * FEET) / 2, s };
    };

    const draw = (p: Pose, tilt: number) => {
      box.style.transform = `translate3d(${(p.x - SIZE / 2).toFixed(1)}px, ${(p.y - SIZE * FEET).toFixed(1)}px, 0) scale(${p.s.toFixed(4)})`;
      lean.style.transform = tilt ? `rotate(${tilt.toFixed(2)}deg)` : "";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const at = pick();
      if (!at) return;
      const home = at.stop.hasAttribute("data-guide-home");

      if (at.el !== target) {
        const first = target === null;
        target = at.el;
        const next = anchor(at.el, at.stop);
        if (first || reduced) {
          flight = null;
          pose = next;
        } else {
          const dist = Math.hypot(next.x - pose.x, next.y - pose.y);
          flight = {
            from: { ...pose },
            start: now,
            duration: Math.min(1050, 450 + dist / 1.8),
            rise: Math.min(220, Math.max(28, dist * 0.35)),
          };
        }
        const mood = (at.stop.dataset.guideMood as CreatureMood | undefined) ?? "idle";
        if (mood !== base) {
          base = mood;
          if (!cheering) setMood(mood);
        }
        // Leaving home: it steps out of the screen at once, from where it was drawn.
        if (!home) {
          atHome = false;
          setAway(true);
          box.style.visibility = "visible";
        }
      }

      const to = anchor(at.el, at.stop);
      let tilt = 0;
      if (flight) {
        const p = Math.min(1, (now - flight.start) / flight.duration);
        const e = ease(p);
        pose = {
          x: flight.from.x + (to.x - flight.from.x) * e,
          y: flight.from.y + (to.y - flight.from.y) * e - flight.rise * 4 * p * (1 - p),
          s: flight.from.s + (to.s - flight.from.s) * e,
        };
        const dx = to.x - flight.from.x;
        tilt = Math.max(-14, Math.min(14, dx / 40)) * Math.sin(Math.PI * p);
        if (p >= 1) flight = null;
      } else {
        pose = to;
        // A perch that travels (How it works' road) says how Echo turns on it: a roll, a lean (radians).
        const turn = (Number(at.stop.dataset.guideRoll) || 0) + (Number(at.stop.dataset.guideLean) || 0);
        if (turn && at.el === at.stop) tilt = (turn * 180) / Math.PI;
      }
      draw(pose, tilt);

      // The perch it's sitting on says so, for anything that makes room for it.
      const landed = flight ? null : at.stop;
      if (landed !== here) {
        here?.removeAttribute("data-guide-here");
        landed?.setAttribute("data-guide-here", "");
        here = landed;
      }

      // Back home and landed: the device's own creature takes over again.
      if (home && !flight && !atHome) {
        atHome = true;
        setAway(false);
        box.style.visibility = "hidden";
      }
    };
    raf = requestAnimationFrame(frame);

    // A hop: mood `done` for a moment, then back to what the perch asks for.
    const cheer = (ms: number) => {
      window.clearTimeout(cheering);
      setMood(base);
      requestAnimationFrame(() => setMood("done"));
      cheering = window.setTimeout(() => {
        cheering = 0;
        setMood(base);
      }, ms);
    };
    const onCheer = (e: Event) => {
      if (atHome) return;
      cheer((e as CustomEvent<{ ms?: number }>).detail?.ms ?? 1400);
    };
    // Press something in the section it's in, and it notices.
    const onClick = (e: MouseEvent) => {
      if (atHome || !(e.target instanceof Element)) return;
      const pressed = e.target.closest("button, a[href]");
      const section = target?.closest("[data-guide-section]");
      if (pressed && section?.contains(pressed)) cheer(1200);
    };

    window.addEventListener(GUIDE_EVENT, onCheer);
    document.addEventListener("click", onClick);
    window.addEventListener("resize", collect);
    return () => {
      cancelAnimationFrame(raf);
      here?.removeAttribute("data-guide-here");
      window.clearTimeout(cheering);
      window.removeEventListener(GUIDE_EVENT, onCheer);
      document.removeEventListener("click", onClick);
      window.removeEventListener("resize", collect);
      setAway(false);
    };
  }, []);

  return (
    <div ref={outer} className="guide" aria-hidden="true">
      <div ref={inner} className="guide__lean">
        <Creature mood={mood} size={SIZE} />
      </div>
    </div>
  );
}
