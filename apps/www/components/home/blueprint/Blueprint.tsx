"use client";

/**
 * Echo's anatomy, on a blueprint: the homepage's close. A blue sheet laid on the white the
 * ChatGPT moment ends in (pulled-in/: the white goes on until the letter),
 * an even grid of squares, Echo in the middle, and chalk lines out of it to
 * the six ways in: the ChatGPT plugin, the Claude plugin, the skills, the MCP
 * server, the CLI and the check, three on each side. One note on the model.
 * Its title in ink; under it, the CLI's key (the ChatGPT key is the moment's,
 * one screen above).
 *
 * The sheet is real paper (ScrollPaper.tsx, Paperlab's `scroll`): a closed scroll that arrives
 * leaning back, a little way off, and opens like a shot in a film: it rises to face you as its rolls part, slow off the mark, sweeping out,
 * settling into place, a roll still held at each end, and its shadow gathering on the ground under
 * it. The shot is the scroll's, played at its own pace (follow.ts): scroll back and it closes the
 * same way, turning the moment the scroll does, as cinematic going back as coming; jump past it and it's simply open.
 *
 * Three stops, one push apart, so the title over the sheet is read too, not scrolled past:
 *   1. the title and its line, whole under the bar, the closed scroll waiting under them;
 *   2. the push opens the paper as it brings it up to be framed (the step glides at the shot's
 *      pace: `data-snap-glide`), and as it settles Echo's anatomy is scribbled in chalk in its
 *      middle: its outline, traced twice as a hand does, the eight circles it's built from, its
 *      axes, its eyes;
 *   3. the sheet stays where it is (held, one push long) and the push draws the rest, so whoever
 *      scrolls fast still sees it written (before, the words appeared only to someone who
 *      waited): white rises through Echo from its feet, its eyes printed on as the white reaches
 *      them, the construction fades, and the lines draw out to the ways in, their words writing
 *      themselves on, one after another. The stop rests on the finished sheet.
 * Scroll back, and it un-draws, then rolls up on the way back to the title. On a phone the sheet is made to fit the window too (Echo
 * cropped wide, the ways in as a list under it), so it's held and drawn the same way, and nobody sees a
 * blank sheet waiting to be written on. Where it still doesn't fit (a window shorter than any phone's),
 * it isn't held: the drawing follows the sheet up the window instead. Without JavaScript, and under
 * reduced motion, it's the finished sheet; without WebGL, a flat blue sheet, drawn the same way.
 *
 * Everything on it is true: the scribble's circles are the mark's measured
 * geometry (bloom.ts: eight, 45° apart), the 3D Echo takes the site's colour,
 * and each way in is what /docs/plugin, /docs/mcp, /docs/cli and /docs/ai
 * describe.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode, type Ref } from "react";
import localFont from "next/font/local";
import { ECHO_CLI } from "@registry/agent/guidance";
import { BigTitle } from "@/components/home/BigTitle";
import { CopyCommand } from "@/components/home/CopyCommand";
import { GuideStop } from "@/components/home/Guide";
import { whenNear } from "@/components/home/near";
import { onFrame } from "@/components/home/frame";
import { follow, following, type Follow } from "@/components/home/follow";
import { barHeight, topInset } from "@/components/home/snap";
import { paperFaces, type PaperBox } from "./paper-face";
import { BODY, EYE_WHITE_L, EYE_WHITE_R, PUPIL_L, PUPIL_R, FLOWER_BBOX } from "@/components/brand/paths";
import { mark } from "@/components/brand/bloom";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { BOARD, ChalkDefs, Sketch, Stroke, handLine, head } from "./chalk";

/*
 * The hand the sheet is lettered in, Architects Daughter (OFL), from its @fontsource package like the
 * site's other faces: the build loads nothing from the network, and the face names its real
 * family. Not preloaded: the section is far below the hero, whose first paint has no room to share.
 */
const hand = localFont({
  declarations: [{ prop: "font-family", value: '"Architects Daughter"' }],
  src: "../../../node_modules/@fontsource/architects-daughter/files/architects-daughter-latin-400-normal.woff2",
  weight: "400",
  display: "swap",
  preload: false,
});


const INIT = `npx ${ECHO_CLI} init`;
/** The off-white the ChatGPT moment ends in, the ground the sheet is laid on. */
export const WHITE_GROUND = "#f4f6fb";
/** How much of the drawing goes with the paper's opening (Echo's scribble); the held push draws the rest. */
const SCRIBBLE = 0.24;
/**
 * The opening, s: the step from the title to the framed sheet glides this long, and the shot keeps pace with
 * it (a step that leaves at 0.8 of its average speed is fastest at 1.35 of it: `PACE`). Where the sheet isn't
 * held (a window too short for it), it plays once the sheet is up, hurries once a push goes on into the
 * drawing, and closes on the way back.
 */
const OPEN_S = 1.9;
const PACE = 1.35 / OPEN_S;
const HURRY_S = 0.35;
const CLOSE_S = 0.7;
/** Framed within this, px, the sheet has arrived (snap.ts's IN_VIEW). */
const ARRIVED = 40;
/** A sheet too tall to hold has arrived once its top is this far down the window, and is written from there. */
const RISE = 0.6;
/** The opening, as one clock `s` (0 to 1): rising to face you, the rolls parting, Echo scribbled as it settles. */
const quart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
const rise = (s: number) => ease(clamp01(s / 0.55));
const unroll = (s: number) => quart(clamp01((s - 0.08) / 0.82));
const scribble = (s: number) => ease(clamp01((s - 0.62) / 0.38));
/** How far the held push is, as a share of the room under the site's bar. */
const DRAW = 0.9;
/** A sheet taller than the room is framed this far under the bar (snap.ts's TOP_AIR). */
const TOP_AIR = 12;
/** Paper past the drawing above and below it (the keys clear it: blueprint.css), and room round the paper for its rolls, px. */
const EXTRA = 28;
const ROOM = 64;
/**
 * On a phone (blueprint.css's breakpoint) the paper runs nearly the window's width, this far in from each
 * edge, so its flat face is as wide as it can be; and its squares are bigger, ten across the drawing, not
 * sixteen.
 */
const PHONE = "(max-width: 47.99rem)";
const PHONE_SIDE = 8;
const ACROSS = { wide: 16, phone: 10 };
/** The phone's legend block round the list of the ways in: this far past its words, px. */
const LEGEND_PAD = { x: 16, y: 14 };

type ScrollPaperProps = { width: number; height: number; front: string; back: string; open: () => number; lift?: () => number };
interface Paper {
  Scroll: ComponentType<ScrollPaperProps>;
  width: number;
  height: number;
  /** The flat face between the two rolls once it's open, px: what's written on the sheet stays on it. */
  face: number;
  front: string;
  back: string;
}

type Pt = [number, number];

/**
 * The six ways in: where each line leaves Echo, how it bends, where it lands, and the label there. The three on
 * Echo's right mirror the three on its left about its axis (x 600), so the drawing is centred on the sheet.
 */
const WAYS: { name: string; say: string; sketch: string; a: Pt; c1: Pt; c2: Pt; b: Pt; label: Pt; align: "left" | "right" }[] = [
  { name: "ChatGPT plugin", say: "make your style in the chat", sketch: "bubble", a: [478, 306], c1: [425, 244], c2: [360, 206], b: [311, 200], label: [298, 176], align: "left" },
  { name: "Claude plugin", say: "install it from the docs", sketch: "piece", a: [450, 400], c1: [405, 388], c2: [352, 398], b: [311, 394], label: [298, 370], align: "left" },
  { name: "Skills", say: "Design Eye, Style Fit, Echo UI", sketch: "book", a: [492, 510], c1: [442, 554], c2: [360, 584], b: [311, 578], label: [298, 554], align: "left" },
  { name: "MCP server", say: "any tool that connects", sketch: "plug", a: [722, 306], c1: [775, 244], c2: [840, 206], b: [889, 200], label: [902, 176], align: "right" },
  { name: "CLI", say: "npx echo-ui-cli init", sketch: "terminal", a: [750, 400], c1: [795, 388], c2: [848, 398], b: [889, 394], label: [902, 370], align: "right" },
  { name: "The check", say: "hands back what drifts", sketch: "check", a: [708, 510], c1: [758, 554], c2: [840, 584], b: [889, 578], label: [902, 554], align: "right" },
];

/** The note on the model itself: as far under Echo as the ways' sketches reach over it. */
const NOTES: { text: string[]; at: Pt; a: Pt; c1: Pt; c2: Pt; b: Pt }[] = [
  { text: ["Takes your", "style's colour"], at: [600, 633], a: [600, 629], c1: [598, 610], c2: [600, 587], b: [600, 566] },
];

/** Where the drawing of Echo sits on the sheet, front on: its middle (the sheet's) and its width (the 3D body's, measured). */
const ECHO_AT = { cx: 600, cy: 400, w: 292 };

/** The box the white rises through, in the drawing's units: the flower's, a little over. */
const FILL = { x: FLOWER_BBOX.x - 2, y: FLOWER_BBOX.y - 2, w: FLOWER_BBOX.w + 4, h: FLOWER_BBOX.h + 4 };

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
const f2 = (v: number) => v.toFixed(2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;

/** The scribble: Echo's anatomy in chalk, where the model will form. */
function Scribble({ fill }: { fill: Ref<SVGRectElement> }) {
  const m = mark();
  const s = ECHO_AT.w / FLOWER_BBOX.w;
  const tx = ECHO_AT.cx - FLOWER_BBOX.cx * s;
  const ty = ECHO_AT.cy - FLOWER_BBOX.cy * s;
  const w = (px: number) => px / s;
  return (
    <g className="bp__scribble">
      <g transform={`translate(${f2(tx)} ${f2(ty)}) scale(${f2(s)})`}>
        {/* How far the white has risen: the script moves this rect up; without it, it's full. */}
        <clipPath id="bp-fill">
          <rect ref={fill} x={f2(FILL.x)} y={f2(FILL.y)} width={f2(FILL.w)} height={f2(FILL.h)} />
        </clipPath>
        {/* The construction: the axes, the box it fits in, the eight circles it's built from, a second pass of the outline. It fades once the white is in. */}
        <g className="bp__construct">
          <Stroke d={`M${f2(m.cx)} ${f2(m.cy - 30)}V${f2(m.cy + 30)}`} from={0.0} to={0.05} width={w(1.4)} dashed />
          <Stroke d={`M${f2(m.cx - 30)} ${f2(m.cy)}H${f2(m.cx + 30)}`} from={0.01} to={0.06} width={w(1.4)} dashed />
          <Stroke
            d={`M${f2(FLOWER_BBOX.x)} ${f2(FLOWER_BBOX.y)}h${f2(FLOWER_BBOX.w)}v${f2(FLOWER_BBOX.h)}h${f2(-FLOWER_BBOX.w)}z`}
            from={0.02}
            to={0.08}
            width={w(1.2)}
            dashed
          />
          {m.petals.map((p, i) => {
            const cx = m.cx + p.d * Math.sin(p.angle);
            const cy = m.cy - p.d * Math.cos(p.angle);
            return (
              <Stroke
                key={i}
                d={`M${f2(cx + p.r)} ${f2(cy)}a${f2(p.r)} ${f2(p.r)} 0 1 0 ${f2(-2 * p.r)} 0a${f2(p.r)} ${f2(p.r)} 0 1 0 ${f2(2 * p.r)} 0`}
                from={0.03 + i * 0.012}
                to={0.09 + i * 0.012}
                width={w(1.3)}
                faint
              />
            );
          })}
          <g transform={`rotate(-2.2 ${f2(m.cx)} ${f2(m.cy)}) translate(0.4 -0.3)`}>
            <Stroke d={BODY} from={0.12} to={0.21} width={w(1.6)} faint />
          </g>
        </g>
        {/* The white, rising from its feet. */}
        <path className="bp__fill" d={BODY} clipPath="url(#bp-fill)" />
        {/* Pencil on the white, so it stays a drawing: an inner contour, and hatching down its shaded side. */}
        <clipPath id="bp-body">
          <path d={BODY} />
        </clipPath>
        <g className="bp__pencil" clipPath="url(#bp-body)">
          <g transform={`translate(${f2(m.cx)} ${f2(m.cy)}) scale(0.94) translate(${f2(-m.cx)} ${f2(-m.cy)})`}>
            <Stroke d={BODY} from={0.44} to={0.56} width={w(1.2)} />
          </g>
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <Stroke
              key={k}
              d={`M${f2(m.cx + 9 + k * 2.2)} ${f2(m.cy + 9.5 + k * 1.3)}l${f2(-4.2)} ${f2(5.8)}`}
              from={0.5 + k * 0.012}
              to={0.54 + k * 0.012}
              width={w(1.3)}
            />
          ))}
        </g>
        {/* Its eyes printed on, as the white reaches them. */}
        <g className="bp__eyes">
          <path d={EYE_WHITE_L} />
          <path d={EYE_WHITE_R} />
          <path className="bp__pupil" d={PUPIL_L} />
          <path className="bp__pupil" d={PUPIL_R} />
        </g>
        {/* The outline and the eyes in chalk: they stay. */}
        <Stroke d={BODY} from={0.08} to={0.18} width={w(2.8)} />
        <Stroke d={EYE_WHITE_L} from={0.15} to={0.19} width={w(2.2)} />
        <Stroke d={EYE_WHITE_R} from={0.16} to={0.2} width={w(2.2)} />
      </g>
    </g>
  );
}

/**
 * Words that write themselves on, a letter at a time, from `at` of the sheet's progress. Every
 * `at` plus its last letter's step (0.0045 each) stays under 0.97, so the last letter lands by the end.
 */
function Written({ text, at, className }: { text: string; at: number; className?: string }) {
  // Letters are kept together in their words, so a line only ever breaks between words.
  let i = 0;
  const words = text.split(" ").map((word) => {
    const start = i;
    i += word.length + 1;
    return { word, start };
  });
  return (
    <p className={className}>
      <span className="bp__sr">{text}</span>
      <span aria-hidden="true">
        {words.map(({ word, start }, w) => (
          <span key={w}>
            {w > 0 && " "}
            <span className="bp__word">
              {[...word].map((ch, k) => (
                <span key={k} className="bp__ch" style={{ "--at": at, "--i": start + k } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </p>
  );
}

function Spot({ at, align, className, children }: { at: Pt; align?: "left" | "right" | "centre"; className?: string; children: ReactNode }) {
  return (
    <div className={["bp__label", className].filter(Boolean).join(" ")} data-align={align} style={{ left: pct(at[0], BOARD.w), top: pct(at[1], BOARD.h) }}>
      {children}
    </div>
  );
}

export function Blueprint() {
  const section = useRef<HTMLElement>(null);
  const hold = useRef<HTMLDivElement>(null);
  const titleAt = useRef<HTMLSpanElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const fill = useRef<SVGRectElement>(null);
  const [seed] = useSiteSeed(LANDING_SEED);
  // The scroll draws the sheet (and holds it while it does) once the client knows motion is welcome.
  const [live, setLive] = useState(false);
  // Held: the sheet fits the room under the bar, so it stays while the push draws it.
  const [held, setHeld] = useState(true);
  // The paper: loaded as the section comes near, where it can be drawn; until then (and without WebGL) the grid is the page's.
  const [paper, setPaper] = useState<Paper | null>(null);
  const opened = useRef(0);
  const openness = useCallback(() => opened.current, []);
  const lifted = useRef(0);
  const liftness = useCallback(() => lifted.current, []);

  useEffect(() => {
    const el = section.current;
    const b = board.current;
    if (!el || !b) return;
    let Scroll: ComponentType<ScrollPaperProps> | null = null;
    let ends = 0;
    let gone = false;
    let timer = 0;
    const phone = window.matchMedia(PHONE);
    /*
     * On a phone, where the list of the ways in is on the paper, in the paper's own pixels: the board lies
     * centred on the paper, EXTRA below its top edge. The legend is printed there, so the list's chalk is
     * read on plain blue.
     */
    const legend = (width: number): PaperBox | undefined => {
      const list = b.querySelector<HTMLElement>(".bp__list");
      const note = b.querySelector<HTMLElement>(".bp__list-note");
      if (!phone.matches || !list || !note || list.offsetHeight === 0) return undefined;
      const left = Math.min(list.offsetLeft, note.offsetLeft);
      const right = Math.max(list.offsetLeft + list.offsetWidth, note.offsetLeft + note.offsetWidth);
      return {
        x: (width - b.clientWidth) / 2 + left - LEGEND_PAD.x,
        y: EXTRA + list.offsetTop - LEGEND_PAD.y,
        w: right - left + 2 * LEGEND_PAD.x,
        h: note.offsetTop + note.offsetHeight - list.offsetTop + 2 * LEGEND_PAD.y,
      };
    };
    const paint = () => {
      if (!Scroll || gone) return;
      const width = el.clientWidth - 2 * (phone.matches ? PHONE_SIDE : EXTRA);
      const height = b.clientHeight + 2 * EXTRA;
      const faces = paperFaces({
        width,
        height,
        cell: b.clientWidth / (phone.matches ? ACROSS.phone : ACROSS.wide),
        accent: seed.accent,
        legend: legend(width),
      });
      setPaper({ Scroll, width, height, face: Math.round(width * (1 - 2 * ends)), ...faces });
    };
    const stop = whenNear(el, window.innerHeight, () => {
      import("./ScrollPaper")
        .then((m) => {
          if (gone || !m.canUnroll()) return;
          Scroll = m.ScrollPaper;
          ends = m.ENDS;
          paint();
        })
        .catch((e) => console.warn("blueprint: no paper", e));
    });
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(paint, 200);
    });
    ro.observe(el);
    // The hand the list is lettered in arrives late (display: swap): the legend is measured again round it.
    document.fonts?.ready.then(() => {
      clearTimeout(timer);
      timer = window.setTimeout(paint, 0);
    });
    return () => {
      gone = true;
      stop();
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [seed.accent]);

  useEffect(() => {
    const el = board.current;
    const tr = hold.current;
    if (!el || !tr) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) setLive(true);
    let shown = -1;
    let fits = true;
    // The opening's clock, and which way it's going (a sheet too tall to hold); held, where it is on the scroll's way.
    let shot = reduced ? 1 : 0;
    let opening = false;
    let last = 0;
    let way: Follow | null = null;

    /** Sizes: the sheet's height, whether it fits the room under the bar (then it's held), and the held push. */
    const measure = () => {
      const bar = barHeight();
      const room = window.innerHeight - bar;
      const h = el.offsetHeight;
      fits = h <= room;
      setHeld(fits);
      tr.style.setProperty("--bp-h", `${h}px`);
      tr.style.setProperty("--bp-top", `${Math.round(bar + Math.max(TOP_AIR, (room - h) / 2))}px`);
      tr.style.setProperty("--bp-draw", `${Math.round(room * DRAW)}px`);
      section.current?.style.setProperty("--bp-room", `${room}px`);
    };

    const tick = (now = performance.now()) => {
      // The opening keeps its time on a slow machine too (a few frames a second): only a long gap is cut short.
      const dt = last ? Math.min(0.2, (now - last) / 1000) : 0;
      last = now;
      const vh = window.innerHeight;
      const inset = topInset();
      const room = vh - inset;
      const h = el.offsetHeight;
      // Where the sheet is framed: whole, centred in the room under the bar; taller than that, just under it.
      const framed = inset + (h <= room ? (room - h) / 2 : TOP_AIR);
      // The hold's top is where the sheet would be if nothing held it.
      const top = tr.getBoundingClientRect().top;
      /*
       * How far the rest is drawn: through the held push. Not held (a sheet taller than the room, on the
       * shortest phones), it can't wait at the top for the push: it opens as it comes up the window and is
       * written as it rises, done as its foot reaches the window's foot, so what's in view is never blank.
       */
      const rises = vh * RISE;
      // Within half a pixel of its stop is at it: WebKit's scroll lands a fraction short, and the sheet
      // stayed at 0.9996, never quite drawn where it stops.
      const drawn = fits ? clamp01((framed - top + 0.5) / (room * DRAW)) : clamp01((rises - top + 0.5) / Math.max(1, rises - (vh - h)));
      const arrived = fits ? framed + ARRIVED : rises;

      const title = titleAt.current;
      if (!reduced && fits && title) {
        /*
         * Held: the opening is the scroll's, from the title's stop (closed: the sheet's top is as far under the
         * title's as the page lays it) to the sheet's (open), at the shot's own pace both ways. Past it, in the
         * held push, it's open.
         */
        const from = inset + (top - title.getBoundingClientRect().top);
        const target = drawn > 0 ? 1 : clamp01((from - top) / Math.max(1, from - framed));
        way ??= following(target);
        shot = follow(way, target, dt, PACE);
      } else if (!reduced) {
        // Not held: it plays once the sheet has arrived, and closes once it's well back down the window.
        if (top <= arrived) opening = true;
        else if (top > arrived + room * 0.35) opening = false;
        if (drawn >= 1) shot = 1;
        else if (opening) shot = Math.min(1, shot + dt / (drawn > 0.02 ? HURRY_S : OPEN_S));
        else shot = Math.max(0, shot - dt / CLOSE_S);
      }
      opened.current = unroll(shot);
      lifted.current = rise(shot);
      const p = reduced ? 1 : SCRIBBLE * scribble(shot) + (1 - SCRIBBLE) * drawn;

      const isOpen = opened.current >= 0.995;
      if (isOpen !== el.hasAttribute("data-open")) el.toggleAttribute("data-open", isOpen);
      const key = p + opened.current * 10 + lifted.current * 100;
      if (key !== shown) {
        shown = key;
        el.style.setProperty("--p", p.toFixed(4));
        tr.style.setProperty("--open", opened.current.toFixed(4));
        tr.style.setProperty("--lift", lifted.current.toFixed(4));
        // The white rises through Echo once its scribble is drawn.
        const f = ease((p - 0.24) / 0.24);
        const rect = fill.current;
        if (rect) {
          rect.setAttribute("y", f2(FILL.y + FILL.h * (1 - f)));
          rect.setAttribute("height", f2(FILL.h * f));
        }
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    /*
     * Runs only while the sheet is within half a window of the screen. Measured from the scroll, not
     * with an IntersectionObserver: under a heavy load a browser can hold an observer's notices back for
     * seconds, and the sheet sat closed on its stop while the push went by undrawn.
     */
    let stop: (() => void) | null = null;
    let checking = 0;
    const near = () => {
      checking = 0;
      const r = tr.getBoundingClientRect();
      const margin = window.innerHeight / 2;
      const isNear = r.top < window.innerHeight + margin && r.bottom > -margin;
      // Back near after a while away, the opening is simply where the scroll has it.
      if (isNear && !stop) {
        way = null;
        last = 0;
        stop = onFrame(tick);
      } else if (!isNear && stop) {
        stop();
        stop = null;
      }
    };
    const schedule = () => {
      if (!checking) checking = requestAnimationFrame(near);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    near();
    tick();
    return () => {
      stop?.();
      cancelAnimationFrame(checking);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      ref={section}
      className="bp"
      aria-labelledby="bp-h"
      data-guide-section=""
      data-paper={paper ? "" : undefined}
      data-live={live ? "" : undefined}
      style={{ "--white-ground": WHITE_GROUND, "--bp-sheet": seed.accent, "--bp-face": paper ? `${paper.face}px` : undefined } as CSSProperties}
    >
      <div className="bp__col">
        {/* The title's stop: it and its line whole under the bar, the closed scroll under them (snap.ts). */}
        {live && held && <span ref={titleAt} className="bp__title-at" data-snap="" aria-hidden="true" />}
        <BigTitle id="bp-h" title="Wherever your agent builds.">
          <strong>In ChatGPT&rsquo;s plugins, in Claude, and in your terminal</strong> with one command. The same Echo in
          every one.
        </BigTitle>
      </div>

      {/* The hold: the sheet stays where it's framed while one push draws it (snap.ts steps to each stop). */}
      <div ref={hold} className="bp__hold" data-held={live && held ? "" : undefined}>
        {live &&
          held &&
          [0, 1].map((at) => (
            <span key={at} className="bp__at" data-snap="" data-snap-glide={at === 0 ? OPEN_S : undefined} style={{ "--at": at } as CSSProperties} aria-hidden="true" />
          ))}
        <div className="bp__frame">
          {/* The page's own Echo peeks over the sheet's top edge, looking down at it. */}
          <GuideStop className="bp__stop" />
          {paper && <span className="bp__shadow" aria-hidden="true" />}
          {paper && (
            <div className="bp__paperbox" style={{ "--room": `${ROOM}px` } as CSSProperties}>
              <paper.Scroll width={paper.width} height={paper.height} front={paper.front} back={paper.back} open={openness} lift={liftness} />
            </div>
          )}
          <div ref={board} className={`bp__board ${hand.className}`} data-snap={live && held ? undefined : ""}>
            {/* The drawing, in its own coordinates. On a phone the view crops it round Echo, zoomed in. */}
            <div className="bp__view">
              <div className="bp__zoom">

                <svg className="bp__ink" viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} aria-hidden="true">
                  <ChalkDefs />
                  <g filter="url(#bp-chalk)">
                    <Scribble fill={fill} />

                    {WAYS.map((w, i) => {
                      const from = 0.34 + i * 0.05;
                      return (
                        <g key={w.name} className="bp__ways-ink">
                          <Stroke d={handLine(w.a, w.c1, w.c2, w.b, 11 + i * 7)} from={from} to={from + 0.12} />
                          <Stroke d={head(w.b, w.c2, 15)} from={from + 0.11} to={from + 0.14} />
                          <Sketch name={w.sketch} x={w.align === "left" ? w.label[0] - 46 : w.label[0]} y={w.label[1] - 64} size={46} from={from + 0.08} to={from + 0.18} />
                        </g>
                      );
                    })}

                    {NOTES.map((n, i) => {
                      const from = 0.62 + i * 0.04;
                      return (
                        <g key={n.text[0]} className="bp__notes-ink">
                          <Stroke d={handLine(n.a, n.c1, n.c2, n.b, 101 + i * 13, 2.2)} from={from} to={from + 0.1} width={2} />
                          <Stroke d={head(n.b, n.c2, 12)} from={from + 0.09} to={from + 0.12} width={2} />
                        </g>
                      );
                    })}

                  </g>
                </svg>

                {WAYS.map((w, i) => (
                  <Spot key={w.name} at={w.label} align={w.align} className="bp__way">
                    <Written className="bp__name" text={w.name} at={0.4 + i * 0.05} />
                    <Written className="bp__say" text={w.say} at={0.44 + i * 0.05} />
                  </Spot>
                ))}
                {NOTES.map((n, i) => (
                  <Spot key={n.text[0]} at={n.at} align="centre" className="bp__note">
                    {n.text.map((t, k) => (
                      <Written key={t} text={t} at={0.68 + i * 0.035 + k * 0.04} />
                    ))}
                  </Spot>
                ))}
              </div>
            </div>
            {/* On a phone, the ways in as a list under Echo, readable, drawn and written in the same rhythm. */}
            <ul className="bp__list">
              {WAYS.map((w, i) => (
                <li key={w.name}>
                  <svg className="bp__list-sketch" viewBox="0 0 48 48" aria-hidden="true">
                    <g filter="url(#bp-chalk)">
                      <Sketch name={w.sketch} x={0} y={0} size={48} from={0.42 + i * 0.05} to={0.52 + i * 0.05} />
                    </g>
                  </svg>
                  <Written className="bp__name" text={w.name} at={0.4 + i * 0.05} />
                  <Written className="bp__say" text={w.say} at={0.44 + i * 0.05} />
                </li>
              ))}
            </ul>
            <Written className="bp__list-note" text={NOTES.map((n) => n.text.join(" ")).join(" ")} at={0.7} />
          </div>
        </div>
      </div>

      <div className="bp__col bp__keys">
        <CopyCommand cmd={INIT} />
      </div>
    </section>
  );
}
