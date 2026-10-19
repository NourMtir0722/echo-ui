"use client";

/**
 * Who it's for, as a puzzle: three big pieces, one colour each (developers,
 * designers, AI builders), with small pieces filling the gaps.
 *
 * Each piece is a slab with the same material as a key: a stepped outline, a
 * side wall in a darker tone, a face with grain and a lit top edge. It's
 * built as you scroll up to it, fast, and you watch its anatomy: the outline
 * draws, the wall rises and lifts it off the page, colour pours up from the
 * bottom with a liquid edge, then the grain, the light and the words land.
 * Scroll back up and it comes apart.
 *
 * A big piece presses exactly like a button (useCapPhysics from echo-ui-core:
 * the travel, the spring, the click), and opens into a panel over the puzzle,
 * in its own colour, with what Echo gives that person and one live demo. The
 * panel grows out of the piece and shrinks back into it. What each says:
 * developers, the two commands that add Echo; designers,
 * a style from a mood board, WCAG and the design tests; AI builders, Echo in
 * ChatGPT first, then the code tool. The small pieces
 * are only the puzzle's filling: nothing to press, nothing to focus.
 *
 * Each piece is a button that says whether its panel is open; opening moves
 * focus to the panel's heading and closing brings it back; Esc, the close key
 * or a press outside close it. It isn't a modal: the page keeps scrolling.
 * `#for-developers` (or designers, ai) in the address opens that one.
 *
 * Without JavaScript the three panels are simply there under the puzzle, as
 * plain content. Under reduced motion the pieces are built when you arrive
 * and panels open without growing.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { useCapPhysics } from "echo-ui-core/tactile";
import { Scope } from "@registry/echo/scope";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Segmented } from "@registry/echo/segmented";
import { BigTitle } from "@/components/home/BigTitle";
import { Deferred, WaysShow } from "@/components/home/Deferred";
import { CopyCommand } from "@/components/home/CopyCommand";
import { GuideStop } from "@/components/home/Guide";
import { useScrub } from "@/components/home/scrub";
import { toPath, tracePiece, inset, type Point, type Traced } from "@/components/home/puzzle/geometry";
import { seedFamily } from "@/components/site/family";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { NO_TERMINAL } from "@/components/home/no-terminal";
import { CommandLine } from "@/components/home/journey/GetCard";
import { OpenAIMark } from "@/components/home/blueprint/openai-mark";
import { CHATGPT_LISTING_URL } from "../../../../mcp/src/plugin-downloads";
import "@/components/component-doc.css";

/* --- the audiences --------------------------------------------------------- */

type AudienceKey = "developers" | "designers" | "ai";
type Role = "seed" | "next" | "prev" | "spark" | "pale" | "grey" | "mist";
type IconName = "code" | "drop" | "spark" | "sound" | "heart" | "keys" | "light" | "open";

/**
 * What adding Echo prints in a new Vite app (echo-ui-cli 0.3.0, 2026-10-18),
 * word for word, its wide column gaps narrowed so a path fits its line; "…"
 * marks what's left out: npm's own install lines, the rest of what init adds,
 * the part hardware-button brings with it (size), and the setup steps each
 * command spells out.
 */
const ADD_ECHO = [
  {
    cmd: "npx echo-ui-cli init",
    out: [
      "· vite app, npm, components in src/components/echo",
      "…",
      "· Added echo.json, echo-lock.json, src/components/echo/echo-theme.css, … the check hook and the Stop gate in .claude/settings.json, …",
      "…",
      "Then: npx echo-ui-cli add hardware-button",
    ],
  },
  {
    cmd: "npx echo-ui-cli add hardware-button",
    out: [
      "…",
      "· hardware-button 0.3.0",
      "  new  src/components/echo/hardware-button/hardware-button.css",
      "  new  src/components/echo/hardware-button/hardware-button.tsx",
      "  new  src/components/echo/hardware-button/treatment.ts",
      "  new  src/components/echo/hardware-button/index.ts",
      "…",
    ],
  },
];

/** Adding Echo, in the road's terminal (journey.css): each command is its key, press to copy. */
function AddEcho() {
  return (
    <figure className="term who__term">
      <figcaption className="term__bar">
        <span className="term__dots" aria-hidden="true" />
        Your terminal
      </figcaption>
      <pre className="term__body" aria-label="What init and add print in a new Vite app">
        {ADD_ECHO.map(({ cmd, out }) => (
          <span key={cmd} className="who__run">
            <CommandLine cmd={cmd} />
            {out.map((line, i) => (
              <span key={i} className="term__line term__out">
                {line}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </figure>
  );
}

/**
 * One finding from Echo's tests, as `echo-ui-cli test` printed it (0.3.0,
 * 2026-10-18) for three plan cards whose keys sat at different heights: the
 * line, and the summary under it. Word for word.
 */
const FINDING = [
  "/  alignment  div.echo-hw \"Choose Pro\": 3 cards side by side have their actions at 2 heights (162px, 180px, 162px from the top of the row). Line them up at the bottom of their cards: put each card's actions last, at `margin-top: auto` (an Echo Card's footer is). Change only the cards' layout, not the actions, the text or the colours.",
  "1 to fix on 1 of 1 page. Each line says what to change; change that and nothing else.",
];

/** The designers' demo: one colour relights every part, then a design test's finding. */
function DesignersShow() {
  return (
    <div className="who__design">
      <Deferred className="who__deferred">
        <WaysShow which="designers" />
      </Deferred>
      <figure className="term who__term">
        <figcaption className="term__bar">
          <span className="term__dots" aria-hidden="true" />
          Echo&rsquo;s tests
        </figcaption>
        <pre className="term__body" aria-label="A finding from Echo's tests">
          <CommandLine cmd="npx echo-ui-cli test" />
          {FINDING.map((line, i) => (
            <span key={i} className={i ? "term__line term__out" : "term__line"}>
              {line}
            </span>
          ))}
        </pre>
      </figure>
    </div>
  );
}

/** How an agent gets Echo, in three steps: set the project up, ask, and what it asks Echo before it writes. */
function AgentSetup() {
  return (
    <ol className="agent">
      <li className="agent__step">
        <span className="agent__n" aria-hidden="true">
          01
        </span>
        <div className="agent__body">
          <p className="agent__what">Add Echo in ChatGPT</p>
          <HardwareButton variant="primary" href={CHATGPT_LISTING_URL} icon={<OpenAIMark className="agent__mark" />}>
            Add to ChatGPT
          </HardwareButton>
          <p className="agent__note">Or in your code tool, once:</p>
          <CopyCommand cmd="npx echo-ui-cli init" />
          <p className="agent__note">
            {NO_TERMINAL.text} <code>{NO_TERMINAL.url}</code>
          </p>
        </div>
      </li>
      <li className="agent__step">
        <span className="agent__n" aria-hidden="true">
          02
        </span>
        <div className="agent__body">
          <p className="agent__what">Ask for what you want</p>
          <blockquote className="agent__ask">
            &ldquo;Build me a radio with Echo: a Tuner for the station and a Knob for the volume.&rdquo;
          </blockquote>
        </div>
      </li>
      <li className="agent__step">
        <span className="agent__n" aria-hidden="true">
          03
        </span>
        <div className="agent__body">
          <p className="agent__what">It asks Echo, writes the code, and checks it</p>
          <p className="agent__tools">
            {/* The moves, not the CLI's names: in ChatGPT the same moves are the server's tools (mcp/src/server.ts). */}
            {["which part", "how it's used", "the code", "the check"].map((t, i) => (
              <span key={t}>
                {i > 0 && (
                  <span className="agent__arrow" aria-hidden="true">
                    →
                  </span>
                )}
                <span className="agent__move">{t}</span>
              </span>
            ))}
          </p>
        </div>
      </li>
    </ol>
  );
}

interface Audience {
  key: AudienceKey;
  /** The piece's words, and the switcher's. */
  piece: string;
  tab: string;
  role: Role;
  icon: IconName;
  claim: string;
  rest: string;
  facts: string[];
  demo: () => ReactNode;
  /** Where to go next: a label and an address each, the first one the way in. */
  links: [string, string][];
}

const AUDIENCES: Audience[] = [
  {
    key: "developers",
    piece: "For developers",
    tab: "Developers",
    role: "seed",
    icon: "code",
    claim: "You get the source code",
    rest: "The CLI copies each component into your project, so you can read it and change it. Theming, sound and motion come from one small package, echo-ui-core.",
    facts: ["React 18 and 19, TypeScript, Next.js and Vite", "Built on Base UI: focus, keyboard and ARIA are handled", "Safe to render on the server"],
    demo: () => <AddEcho />,
    links: [["Read the install guide", "/docs/installation"]],
  },
  {
    key: "designers",
    piece: "For designers",
    tab: "Designers",
    role: "next",
    icon: "drop",
    claim: "Your mood board becomes a style",
    rest: "Share a mood board and Echo reads it into a whole style. One colour themes every component with text readable at WCAG AA, and Echo tests what your agent builds the way you'd review it.",
    facts: ["Colours, type, corners and finish, read from your board", "Alignment, depth, corners and icons tested, then WCAG A and AA", "A report with a crop of every finding"],
    demo: () => <DesignersShow />,
    links: [
      ["Make a theme", "/generator"],
      ["See the tests", "/docs/checks"],
    ],
  },
  {
    key: "ai",
    piece: "Building with AI",
    tab: "AI",
    role: "prev",
    icon: "spark",
    claim: "Echo is in ChatGPT",
    rest: "Add Echo UI from ChatGPT's plugin directory and share a mood board. It makes your style, picks the one that fits your product, and checks the code it writes. Then one command hands it all to Claude Code, Codex or Cursor.",
    facts: ["In ChatGPT's plugin directory, nothing to download", "Claude and Codex install the same plugin from the site", "In Claude Code, a check on every file it saves and Echo's tests before it stops"],
    demo: () => <AgentSetup />,
    links: [["Get the plugin", "/docs/plugin"]],
  },
];

const panelId = (key: AudienceKey) => `for-${key}`;

/* --- the layouts ------------------------------------------------------------- */

/** How deep a piece's side wall is, how far apart the pieces stand, and how round their corners are, in cells. */
const WALL = 0.34;
const GAP = 0.18;
const ROUND = 0.16;
/** The liquid's wave: height and length, in cells. */
const WAVE_A = 0.2;
const WAVE_L = 2.6;

interface PieceDef {
  letter: string;
  role: Role;
  icon?: IconName;
  audience?: AudienceKey;
}

interface Layout {
  name: "wide" | "narrow";
  rows: string[];
  pieces: PieceDef[];
  /** Where Echo stands, on the grid: its feet on `y`, centred on `x`, `w` cells wide. */
  perch: { x: number; y: number; w: number };
  /** When each piece starts building, as a share of the scroll that builds them. */
  starts: Record<string, number>;
}

/*
 * D developers, S designers, A AI builders; 1 a pale piece with a speaker,
 * 2 a grey one with keys, 3 a spark-coloured one with a heart, 4 a mist one
 * with a light. Three L's that lock into each other, and the fillers in the
 * steps they leave: every cell is taken, so the pieces complete each other.
 */
const WIDE: Layout = {
  name: "wide",
  rows: [
    "111222SSSSSSSSS333344444",
    "111222SSSSSSSSS333344444",
    "DDDDDDSSSSSSSSS333344444",
    "DDDDDDSSSSSSSSSAAAAAAAAA",
    "DDDDDDSSSSSSSSSAAAAAAAAA",
    "DDDDDDDDDDSSSSSAAAAAAAAA",
    "DDDDDDDDDDSSSSSAAAAAAAAA",
    "DDDDDDDDDDSSSSSAAAAAAAAA",
    "DDDDDDDDDDSSSSSAAAAAAAAA",
    "DDDDDDDDDDAAAAAAAAAAAAAA",
    "DDDDDDDDDDAAAAAAAAAAAAAA",
    "DDDDDDDDDDAAAAAAAAAAAAAA",
  ],
  // Drawn top to bottom: a piece's side wall hangs below it, and the piece under it covers it,
  // so the walls only show at the gaps, the way stacked slabs look.
  pieces: [
    { letter: "1", role: "pale", icon: "sound" },
    { letter: "2", role: "grey", icon: "keys" },
    { letter: "3", role: "spark", icon: "heart" },
    { letter: "4", role: "mist", icon: "light" },
    { letter: "S", role: "next", audience: "designers" },
    { letter: "D", role: "seed", audience: "developers" },
    { letter: "A", role: "prev", audience: "ai" },
  ],
  perch: { x: 21.5, y: 0, w: 2.2 },
  starts: { D: 0, S: 0.12, A: 0.24, "1": 0.16, "2": 0.2, "3": 0.26, "4": 0.3 },
};

/* A phone: the three stacked full width, stepped into each other, and one filler. Every cell taken. */
const NARROW: Layout = {
  name: "narrow",
  rows: [
    "DDDDDDDDD111",
    "DDDDDDDDD111",
    "DDDDDDDDDDDD",
    "DDDDDDDDDDDD",
    "DDDDDDDDDDDD",
    "DDDSSSSSSSSS",
    "SSSSSSSSSSSS",
    "SSSSSSSSSSSS",
    "SSSSSSSSSSSS",
    "SSSSSSSSSAAA",
    "AAAAAAAAAAAA",
    "AAAAAAAAAAAA",
    "AAAAAAAAAAAA",
    "AAAAAAAAAAAA",
  ],
  pieces: [
    { letter: "1", role: "spark", icon: "heart" },
    { letter: "D", role: "seed", audience: "developers" },
    { letter: "S", role: "next", audience: "designers" },
    { letter: "A", role: "prev", audience: "ai" },
  ],
  perch: { x: 10.5, y: 0, w: 2.4 },
  starts: { D: 0, S: 0.12, A: 0.24, "1": 0.18 },
};

/* --- icons ------------------------------------------------------------------- */

const ICONS: Record<IconName, ReactNode> = {
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  drop: <path d="M12 3c3.5 4.2 6 7.4 6 10.6A6 6 0 0 1 6 13.6C6 10.4 8.5 7.2 12 3z" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z" />,
  sound: <path d="M4 10v4h4l5 4V6L8 10H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  keys: <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" />,
  light: <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />,
  open: <path d="M7 17L17 7M9 7h8v8" />,
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* --- a piece ------------------------------------------------------------------- */

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** The liquid: a wave along its top, a body far below, drawn from x = -L so it can drift a whole wave. */
function wavePath(w: number, h: number) {
  const f = (v: number) => +v.toFixed(3);
  let d = `M${f(-WAVE_L)} 0`;
  for (let x = -WAVE_L; x < w + WAVE_L; x += WAVE_L) d += `q${f(WAVE_L / 4)} ${f(-WAVE_A)} ${f(WAVE_L / 2)} 0t${f(WAVE_L / 2)} 0`;
  return `${d}V${f(h + 2)}H${f(-WAVE_L)}Z`;
}

function Piece({
  layout,
  def,
  traced,
  audience,
  open,
  onOpen,
  travel,
  grain,
}: {
  layout: Layout;
  def: PieceDef;
  traced: Traced;
  audience?: Audience;
  open: boolean;
  onOpen?: (key: AudienceKey, el: HTMLElement) => void;
  travel: number;
  grain: string;
}) {
  const uid = useId().replace(/:/g, "");
  const cols = layout.rows[0]!.length;
  const rows = layout.rows.length;
  const { box, body } = traced;
  const origin: Point = [box.x, box.y];
  const face = toPath(traced.points, origin, 0, ROUND);
  const ring = toPath(inset(traced.points, -0.1), origin, 0, ROUND + 0.1);
  const walls = [WALL / 3, (2 * WALL) / 3, WALL].map((dy) => toPath(traced.points, origin, dy, ROUND));
  const cap = useCapPhysics<HTMLSpanElement>({ lift: 2, travel, tilt: 1.2, sound: true });

  const style = {
    left: pct(box.x, cols),
    top: pct(box.y, rows + WALL),
    width: pct(box.w, cols),
    height: pct(box.h + WALL, rows + WALL),
  } as CSSProperties;
  const faceBox = { height: pct(box.h, box.h + WALL) } as CSSProperties;
  const bodyBox = {
    left: pct(body.x - box.x, box.w),
    top: pct(body.y - box.y, box.h),
    width: pct(body.w, box.w),
    height: pct(body.h, box.h),
  } as CSSProperties;

  const inner = (
    <>
      <svg className="pz__wall" viewBox={`0 0 ${box.w} ${box.h + WALL}`} preserveAspectRatio="none" aria-hidden="true">
        {walls.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <span className="pz__lift" style={faceBox}>
        <span className="pz__face" ref={cap.ref}>
          <svg className="pz__skin" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id={`c${uid}`}>
                <path d={face} />
              </clipPath>
              <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0" className="pz__stop-top" />
                <stop offset="0.5" className="pz__stop-mid" />
                <stop offset="1" className="pz__stop-base" />
              </linearGradient>
              <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
                <stop offset={Math.min(0.5, 0.9 / box.h)} stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x={-WAVE_L} y="-1" width={box.w + WAVE_L * 2} height={box.h + 4}>
                <path className="pz__liquid" d={wavePath(box.w, box.h)} fill="#fff" />
              </mask>
            </defs>
            <g clipPath={`url(#c${uid})`}>
              <g mask={`url(#m${uid})`}>
                <rect width={box.w} height={box.h} fill={`url(#g${uid})`} />
              </g>
              <rect className="pz__grain" width={box.w} height={box.h} filter={`url(#${grain})`} />
              <path className="pz__shine" d={face} fill="none" stroke={`url(#s${uid})`} strokeWidth="0.09" />
            </g>
            <path className="pz__line" d={face} pathLength={1} />
            {audience && <path className="pz__ring" d={ring} />}
          </svg>
          <span className="pz__body" style={bodyBox}>
            {audience ? (
              <>
                <span className="pz__icon pz__icon--top">
                  <Icon name={audience.icon} />
                </span>
                <span className="pz__words">{audience.piece}</span>
                <span className="pz__icon pz__icon--end">
                  <Icon name="open" />
                </span>
              </>
            ) : (
              def.icon && (
                <span className="pz__icon pz__icon--mid">
                  <Icon name={def.icon} />
                </span>
              )
            )}
          </span>
        </span>
      </span>
    </>
  );

  if (!audience) {
    return (
      <span className="pz__piece" data-role={def.role} data-filler="" data-at={layout.starts[def.letter] ?? 0} data-h={box.h} style={style} aria-hidden="true">
        {inner}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="pz__piece"
      data-role={def.role}
      data-at={layout.starts[def.letter] ?? 0}
      data-h={box.h}
      data-audience={audience.key}
      style={style}
      aria-expanded={open}
      aria-controls={panelId(audience.key)}
      {...cap.handlers}
      onClick={(e) => onOpen?.(audience.key, e.currentTarget)}
    >
      {inner}
    </button>
  );
}

/* --- a board ------------------------------------------------------------------- */

function Board({
  layout,
  open,
  onOpen,
  perched,
}: {
  layout: Layout;
  open: AudienceKey | null;
  onOpen: (key: AudienceKey, el: HTMLElement) => void;
  /** Echo stands on this board (it's the one on screen, and no panel is open). */
  perched: boolean;
}) {
  const board = useRef<HTMLDivElement>(null);
  const grain = `pzg${useId().replace(/:/g, "")}`;
  const cols = layout.rows[0]!.length;
  const rows = layout.rows.length;
  const [u, setU] = useState(48);
  const traced = layout.pieces.map((p) => tracePiece(layout.rows, p.letter, GAP));

  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setU(e!.contentRect.width / cols));
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols]);

  // The anatomy, scrubbed by the scroll: outline, wall, pour, finish. Reversible.
  useScrub(
    board,
    (tl, el) => {
      for (const p of el.querySelectorAll<HTMLElement>(".pz__piece")) {
        const at = Number(p.dataset.at);
        const h = Number(p.dataset.h);
        const words = p.querySelector(".pz__words");
        tl.fromTo(p.querySelector(".pz__line"), { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.24 }, at)
          .fromTo(p.querySelector(".pz__wall"), { opacity: 0 }, { opacity: 1, duration: 0.06 }, at + 0.18)
          .fromTo(p.querySelector(".pz__lift"), { "--rise": 0 }, { "--rise": 1, duration: 0.16, ease: "power2.out" }, at + 0.18)
          .fromTo(p.querySelector(".pz__liquid"), { y: h + WAVE_A * 2, x: 0 }, { y: -WAVE_A * 2, x: -WAVE_L, duration: 0.3, ease: "power1.inOut" }, at + 0.3)
          .fromTo(p.querySelectorAll(".pz__grain, .pz__shine"), { opacity: 0 }, { opacity: 1, duration: 0.1 }, at + 0.56)
          .fromTo(p.querySelectorAll(".pz__icon"), { scale: 0 }, { scale: 1, duration: 0.1, ease: "back.out(2.6)", stagger: 0.03 }, at + 0.6)
          .to(p.querySelector(".pz__line"), { opacity: 0, duration: 0.08 }, at + 0.66);
        if (words) tl.fromTo(words, { "--print": 0 }, { "--print": 1, duration: 0.12 }, at + 0.58);
      }
      // The callouts name the parts as they appear, on the first piece, then leave.
      const show = (sel: string, from: number, to: number) => {
        const c = el.querySelector(sel);
        if (!c) return;
        tl.fromTo(c, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.06 }, from).to(
          c,
          { clipPath: "inset(0 0% 0 100%)", duration: 0.06 },
          to,
        );
      };
      show(".pz__call--outline", 0.02, 0.62);
      show(".pz__call--wall", 0.2, 0.66);
      show(".pz__call--fill", 0.32, 0.7);
    },
    { start: 0.95, end: 0.5 },
  );

  const perch = layout.perch;
  return (
    <div
      ref={board}
      className="pz__board"
      data-set={layout.name}
      inert={open !== null || undefined}
      style={{ "--cols": cols, "--rows": rows, "--wall": WALL, aspectRatio: `${cols} / ${rows + WALL}` } as CSSProperties}
    >
      <svg className="pz__defs" width="0" height="0" aria-hidden="true">
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="24" numOctaves="2" seed="4" stitchTiles="stitch" />
          <feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 0.3" />
        </filter>
      </svg>
      {layout.pieces.map((def, i) => {
        const audience = AUDIENCES.find((a) => a.key === def.audience);
        return (
          <Piece
            key={def.letter}
            layout={layout}
            def={def}
            traced={traced[i]!}
            audience={audience}
            open={open === def.audience}
            onOpen={onOpen}
            travel={Math.max(5, Math.min(12, u * WALL * 0.72))}
            grain={grain}
          />
        );
      })}
      {layout.name === "wide" && (
        <>
          <span className="pz__call pz__call--outline" aria-hidden="true">
            Outline
          </span>
          <span className="pz__call pz__call--wall" aria-hidden="true">
            Wall
          </span>
          <span className="pz__call pz__call--fill" aria-hidden="true">
            Fill
          </span>
        </>
      )}
      {perched && (
        <GuideStop
          className="pz__stop"
          style={{
            left: pct(perch.x - perch.w / 2, cols),
            width: pct(perch.w, cols),
            bottom: `calc(100% - ${pct(perch.y, rows + WALL)})`,
          }}
        />
      )}
    </div>
  );
}

/* --- the section --------------------------------------------------------------- */

const isShown = (el: Element) => el.getClientRects().length > 0;

export function Puzzle() {
  const [open, setOpen] = useState<AudienceKey | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  /** The piece the panel grows out of, when a piece opened it. */
  const grow = useRef<DOMRect | null>(null);
  /** Opened from a piece or the address: focus goes to the heading. Switched with the switcher: it stays there. */
  const focusHeading = useRef(false);
  const busy = useRef(false);

  const pieceFor = (key: AudienceKey) =>
    [...(stage.current?.querySelectorAll<HTMLElement>(`[data-audience="${key}"]`) ?? [])].find(isShown) ?? null;

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    setEnhanced(true);
    const mq = window.matchMedia("(max-width: 47.99rem)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    // #for-developers (designers, ai) opens that piece.
    const fromHash = () => {
      const key = AUDIENCES.find((a) => `#${panelId(a.key)}` === window.location.hash)?.key;
      if (!key) return;
      focusHeading.current = true;
      setOpen(key);
      requestAnimationFrame(() => stage.current?.scrollIntoView({ block: "start" }));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("hashchange", fromHash);
    };
  }, []);

  const onOpen = useCallback((key: AudienceKey, el: HTMLElement) => {
    if (busy.current) return;
    grow.current = el.querySelector(".pz__face")?.getBoundingClientRect() ?? null;
    focusHeading.current = true;
    setOpen(key);
  }, []);

  // The sheet grows out of the piece that opened it, then its words rise in.
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!open || !el) return;
    const from = grow.current;
    grow.current = null;
    if (focusHeading.current) {
      focusHeading.current = false;
      el.querySelector<HTMLElement>(`#${panelId(open)}-h`)?.focus({ preventScroll: true });
    }
    if (reduced()) return;
    const words = el.querySelectorAll(`#${panelId(open)} [data-rise]`);
    gsap.fromTo(
      words,
      { y: 24, clipPath: "inset(0% 0% 100% 0%)" },
      { y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, delay: from ? 0.16 : 0, stagger: 0.05, ease: "power3.out", clearProps: "transform,clipPath" },
    );
    if (!from) return;
    const r = el.getBoundingClientRect();
    const c = (v: number) => Math.max(0, v);
    busy.current = true;
    gsap.fromTo(
      el,
      { clipPath: `inset(${c(from.top - r.top)}px ${c(r.right - from.right)}px ${c(r.bottom - from.bottom)}px ${c(from.left - r.left)}px round 12px)` },
      {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        duration: 0.62,
        ease: "expo.out",
        clearProps: "clipPath",
        onComplete: () => void (busy.current = false),
      },
    );
  }, [open]);

  const close = useCallback(() => {
    const el = sheet.current;
    if (!open || !el || busy.current) return;
    const piece = pieceFor(open);
    const done = () => {
      busy.current = false;
      stage.current?.removeAttribute("data-closing");
      // Rendered now, so the board is no longer inert when its piece takes focus back.
      flushSync(() => setOpen(null));
      piece?.focus({ preventScroll: true });
    };
    if (!piece || reduced()) return done();
    const r = el.getBoundingClientRect();
    const f = piece.querySelector(".pz__face")!.getBoundingClientRect();
    const c = (v: number) => Math.max(0, v);
    busy.current = true;
    // The pieces come back while the sheet shrinks into its own.
    stage.current?.setAttribute("data-closing", "");
    gsap.to(el, {
      clipPath: `inset(${c(f.top - r.top)}px ${c(r.right - f.right)}px ${c(r.bottom - f.bottom)}px ${c(f.left - r.left)}px round 12px)`,
      duration: 0.38,
      ease: "power3.in",
      onComplete: () => {
        gsap.set(el, { clearProps: "clipPath" });
        done();
      },
    });
  }, [open]);

  // Esc, or a press anywhere outside the sheet, closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (sheet.current && e.target instanceof Node && !sheet.current.contains(e.target)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const role = AUDIENCES.find((a) => a.key === open)?.role;
  // Inside a sheet, the components speak its colour: its piece's family colour is their accent.
  const [seed] = useSiteSeed(LANDING_SEED);
  const family = useMemo(() => seedFamily(seed.accent), [seed.accent]);
  const tint = role === "seed" || role === "next" || role === "prev" ? family[role].hex : undefined;
  return (
    <section className="sec pz-sec" aria-labelledby="who-h" data-guide-section="">
      <BigTitle id="who-h" title="For developers, designers and AI builders">
        <strong>Open the piece that&rsquo;s you</strong> and see what Echo gives you: two commands, a style from your mood
        board, or Echo in ChatGPT.
      </BigTitle>

      <div ref={stage} className="pz" data-enhanced={enhanced ? "" : undefined} data-open={open ?? undefined}>
        <Board layout={WIDE} open={open} onOpen={onOpen} perched={enhanced && !narrow && !open} />
        <Board layout={NARROW} open={open} onOpen={onOpen} perched={enhanced && narrow && !open} />

        <div ref={sheet} className="pz__sheet" data-role={role} hidden={(enhanced && !open) || undefined}>
          <Scope accent={tint}>
          {enhanced && open && (
            <div className="pz__bar">
              <Segmented
                size="sm"
                aria-label="Who it's for"
                options={AUDIENCES.map((x) => x.tab)}
                value={AUDIENCES.findIndex((x) => x.key === open)}
                onValueChange={(i) => setOpen(AUDIENCES[i]!.key)}
              />
              <HardwareButton size="sm" iconOnly aria-label="Close" icon={<CloseIcon />} onClick={close} />
            </div>
          )}
          {AUDIENCES.map((a) => (
            <article
              key={a.key}
              id={panelId(a.key)}
              className="pz__panel"
              data-role={a.role}
              aria-labelledby={`${panelId(a.key)}-h`}
              hidden={(enhanced && open !== a.key) || undefined}
            >
              <div className="pz__panel-copy">
                <p className="pz__panel-kicker" data-rise="">
                  / {a.piece}
                </p>
                <h3 id={`${panelId(a.key)}-h`} className="pz__panel-h" tabIndex={-1} data-rise="">
                  {a.claim}
                </h3>
                <p className="pz__panel-rest" data-rise="">
                  {a.rest}
                </p>
                <ul className="pz__facts" data-rise="">
                  {a.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="pz__panel-cta" data-rise="">
                  {a.links.map(([label, href]) => (
                    <HardwareButton key={href} href={href}>
                      {label}
                    </HardwareButton>
                  ))}
                </div>
              </div>
              <div className="pz__screen" data-rise="">
                {a.demo()}
              </div>
            </article>
          ))}
          </Scope>
          {open && <GuideStop className="pz__panel-stop" />}
        </div>
      </div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
