"use client";

/**
 * The styles a run hands back (Make a style with AI's result), drawn as what
 * they are rather than said: each is a sheet in its own colours and type
 * (run.ts seeds). In front, Ink Instrument: its pale sheet, outlined in its
 * ink, its name set large, a blueprint of the parts it's for (blueprint.ts),
 * and the four colours sampled from the board as chips. Tucked behind, the
 * run's other style, Pigment Window: quiet paper framing a field of blurred
 * colour (its own words), one of the board's soft photos. The only words are
 * the names and the values.
 *
 * It builds the way the Puzzle's pieces do (Puzzle.tsx): the outline draws
 * itself, the paper pours in behind it with a moving wave, the words print
 * left to right; then the blueprint draws, line by line, what's solid in it
 * pours in and what sits on that pops up; then each chip is outlined and its
 * colour poured. About three seconds, from the moment the style is handed
 * back (`shown`); played again from the start whenever the demo is. Under
 * reduced motion, and without JavaScript, it's simply built.
 *
 * In Make, the paper isn't poured: it's the board turned over (`entrance:
 * "turn"`). Each group of the board's photos is gathered into a deck where its
 * sheet lies, DECK of its width (MakeCard.tsx), and turns edge-on; the sheet
 * turns in from that edge at the deck's size and grows into its place, as if
 * the deck had been turned over and opened out: Pigment Window first, behind,
 * Ink Instrument TURN_LAG after it, in front. Then what's on them builds as
 * above. Hurried (a push of the wheel: DemoCard's `rate`), it all plays faster.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { useDemo } from "./DemoCard";
import { FILLS, LINES, VIEW } from "./blueprint";
import { INK, PIGMENT, boardSrc } from "./run";

/* --- the drawing: the parts, as a blueprint ------------------------------ */

function Blueprint() {
  return (
    <svg className="jy-plate" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="jy-bp-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.7" />
        </pattern>
      </defs>
      <rect className="jy-bp-grid" width={VIEW.w} height={VIEW.h} fill="url(#jy-bp-dots)" />
      {LINES.map((l, i) => (
        <path key={i} className={`jy-bp-line jy-bp-line--${l.part}`} data-part={l.part} d={l.d} pathLength={1} />
      ))}
      {FILLS.map((f, i) => (
        <path
          key={i}
          className={["jy-bp-fill", f.paper && "jy-bp-fill--paper", f.stroke && "jy-bp-fill--stroke"].filter(Boolean).join(" ")}
          data-part={f.part}
          d={f.d}
        />
      ))}
    </svg>
  );
}

/* --- the sheets ------------------------------------------------------------- */

/** A sheet's paper, poured in behind its outline (the outline is drawn at the sheet's own size). */
function Paper() {
  return (
    <>
      <span className="jy-paper" aria-hidden="true">
        <span className="jy-pour" />
      </span>
      <svg className="jy-outline" aria-hidden="true">
        <rect pathLength={1} />
      </svg>
    </>
  );
}

/** A deck of the board's photos is this share of the width of the sheet it turns into. */
export const DECK = 0.46;
/** Ink Instrument turns over this long after Pigment Window, s. */
export const TURN_LAG = 0.12;

/**
 * `after`: seconds the build waits once shown (Make's board has its photos to
 * gather first: MakeCard.tsx). `entrance`: the paper poured in behind a drawn
 * outline, or the sheet turned in from a deck of photos.
 */
export function StyleSheets({ shown, after = 0, entrance = "pour" }: { shown: boolean; after?: number; entrance?: "pour" | "turn" }) {
  const { live, rate } = useDemo();
  const root = useRef<HTMLElement>(null);
  const build = useRef<gsap.core.Timeline | null>(null);

  // The build, laid out once the demo runs: everything starts unbuilt, and plays when the style is handed back.
  useEffect(() => {
    const el = root.current;
    if (!live || !el) return;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const tl = gsap.timeline({ paused: true, delay: after });
      const draw = (sel: string, at: number, duration: number, stagger = 0) =>
        tl.fromTo(q(sel), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, stagger, ease: "power1.inOut" }, at);
      const pour = (sel: string, at: number, duration: number, stagger = 0) =>
        tl.fromTo(q(sel), { "--level": 1, "--wave-x": "0px" }, { "--level": 0, "--wave-x": "-48px", duration, stagger, ease: "power1.inOut" }, at);
      const print = (sel: string, at: number, duration: number, stagger = 0) =>
        tl.fromTo(q(sel), { "--print": 0 }, { "--print": 1, duration, stagger, ease: "none" }, at);

      // Turned in from a deck: edge-on at the deck's size, it turns to face you, blank side up, then opens out into its place.
      const turn = (sel: string, at: number) => {
        tl.fromTo(
          q(sel),
          { rotationY: -90, scale: DECK, transformPerspective: 1100, transformOrigin: "50% 50%" },
          { rotationY: 0, duration: 0.24, ease: "power2.out" },
          at,
        );
        tl.to(q(sel), { scale: 1, duration: 0.5, ease: "back.out(1.3)" }, at + 0.2);
      };
      const turned = entrance === "turn";
      // What's printed on a turned sheet waits for it to face you; on a poured one, for its paper.
      const k = turned ? -0.2 : 0;

      // Pigment Window, behind: outline, paper, name, and its field of colour blooming open.
      if (turned) turn(".jy-sheet--pigment", 0);
      else {
        draw(".jy-sheet--pigment > .jy-outline rect", 0, 0.4);
        pour(".jy-sheet--pigment > .jy-paper > .jy-pour", 0.12, 0.5);
      }
      print(".jy-sheet__name", 0.45 + k, 0.3);
      tl.fromTo(
        q(".jy-sheet__window"),
        { opacity: 0, scale: 0.86, filter: "blur(18px) saturate(1.2)" },
        { opacity: 1, scale: 1, filter: "blur(5px) saturate(1.2)", duration: 0.8, ease: "power2.out" },
        0.75 + k,
      );
      // Ink Instrument, in front: outline, paper, its name, and the rule under it.
      if (turned) turn(".jy-sheet--ink", TURN_LAG);
      else {
        draw(".jy-sheet--ink > .jy-outline rect", 0.08, 0.45);
        pour(".jy-sheet--ink > .jy-paper > .jy-pour", 0.3, 0.55);
      }
      print(".jy-sheet__title", 0.62 + k, 0.32);
      tl.fromTo(q(".jy-sheet__title"), { "--rule": 0 }, { "--rule": 1, duration: 0.4, ease: "power2.inOut" }, 0.7 + k);
      // The drawing: the frame, the dotted ground, each part's outline, the draughtsman's marks; then
      // what's solid in the style pours in, and what sits on it in paper pops up (the Puzzle's order).
      draw(".jy-bp-line--frame", 0.75 + k, 0.4);
      tl.fromTo(q(".jy-bp-grid"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, 0.8 + k);
      draw(".jy-bp-line--button", 0.85 + k, 0.3);
      draw(".jy-bp-line--segmented", 0.9 + k, 0.32, 0.08);
      draw(".jy-bp-line--knob", 0.9 + k, 0.3, 0.025);
      draw(".jy-bp-line--slider", 1.0 + k, 0.3);
      draw(".jy-bp-line--switch", 1.05 + k, 0.3);
      draw(".jy-bp-line--measure", 1.05 + k, 0.35, 0.08);
      tl.fromTo(
        q(".jy-bp-fill:not(.jy-bp-fill--paper, .jy-bp-fill--stroke)"),
        { scaleY: 0, transformOrigin: "50% 100%" },
        { scaleY: 1, transformOrigin: "50% 100%", duration: 0.3, stagger: 0.05, ease: "power2.out" },
        1.3 + k,
      );
      tl.fromTo(
        q(".jy-bp-fill--paper, .jy-bp-fill--stroke"),
        { scale: 0, transformOrigin: "50% 50%" },
        { scale: 1, transformOrigin: "50% 50%", duration: 0.28, stagger: 0.04, ease: "back.out(2.6)" },
        1.5 + k,
      );
      // The colours: each chip outlined, its colour poured, its value printed.
      draw(".jy-swatch__chip > .jy-outline rect", 1.75 + k, 0.3, 0.07);
      pour(".jy-swatch__chip > .jy-pour", 1.9 + k, 0.45, 0.08);
      print(".jy-swatch__hex", 2.15 + k, 0.25, 0.06);
      build.current = tl;
    }, el);
    return () => {
      build.current = null;
      ctx.revert();
    };
  }, [live, after, entrance]);

  useEffect(() => {
    const tl = build.current;
    if (!tl) return;
    if (shown) tl.restart(true);
    else tl.pause(0);
  }, [shown, live]);

  // Hurried, the build keeps up with the demo.
  useEffect(() => {
    build.current?.timeScale(rate);
  }, [rate, live]);

  return (
    <article ref={root} className="jy-style" aria-labelledby="jy-style-h">
      <div className="jy-sheet jy-sheet--pigment">
        <Paper />
        <p className="jy-sheet__name jy-print">{PIGMENT.title}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="jy-sheet__window" src={boardSrc("horizon")} alt="" width={640} height={480} loading="lazy" decoding="async" />
      </div>
      <div className="jy-sheet jy-sheet--ink">
        <Paper />
        <h3 id="jy-style-h" className="jy-sheet__title jy-print">
          {INK.title}
        </h3>
        <Blueprint />
        <ul className="jy-swatches" aria-label="Colours sampled from your board">
          {INK.values.map((v) => (
            <li key={`${v.tile}${v.hex}`} className="jy-swatch" style={{ "--fill": v.hex } as CSSProperties}>
              <span className="jy-swatch__chip" aria-hidden="true">
                <span className="jy-pour" />
                <svg className="jy-outline">
                  <rect pathLength={1} />
                </svg>
              </span>
              <code className="jy-swatch__hex jy-print">{v.hex}</code>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
