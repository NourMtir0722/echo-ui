"use client";

/**
 * The ECHO identity, ported from the original repo's Logo + Wordmark.
 *
 * The flower is the O (the fused signature, ECH🌸) and also detaches as the
 * atomic mark for the separated, stacked, icon and wordmark forms. One
 * canonical drawing everywhere (./paths). The wordmark is Fredoka — an
 * unambiguous H and a round O that pairs with the flower. Geometry is built on
 * two units: H, the wordmark's cap height, and M, the flower's visible height.
 */
import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { useBrandMotion } from "./use-brand-motion";
import { alpha, creature, neutral } from "./tokens";
import { bloomAt, bloomEnd, bloomNearlyDone, framePath, frameGrowth, getBloom, type BloomId } from "./bloom";
import { sprung, type SpringCfg } from "./springs";
// The mark renders in the site rail on every page, so it brings its own styles
// rather than relying on a brand page having loaded them.
import "./brand.css";
import {
  BODY,
  EYE_CATCH,
  EYE_WHITE_L,
  EYE_WHITE_R,
  FLOWER_FRAC,
  PUPIL_L,
  PUPIL_R,
  VIEWBOX,
  markBox,
} from "./paths";

export type Surface = "dark" | "light";
/** Expressive: gloss + eyes (>64px). Standard: flat + eyes. Micro: solid, no eyes (<24px). */
export type Tier = "expressive" | "standard" | "micro";
/**
 * The coloured mark only has contrast on NEUTRAL grounds. On any colour,
 * photo or the aura it must switch to `white`; on a pale colour, `ink`.
 */
export type Tone = "full" | "white" | "ink";

const tierFor = (m: number): Tier => (m > 64 ? "expressive" : m >= 24 ? "standard" : "micro");
const letterInk = (s: Surface, tone: Tone) =>
  tone === "white" ? "#fff" : tone === "ink" ? neutral.void : s === "light" ? neutral.void : neutral.cream;

/* --- wordmark ------------------------------------------------------------ */

/**
 * Fredoka 600 metrics, re-measured via canvas against the file next/font
 * actually serves. The original repo's numbers (capRatio 0.6758, ECH 3.21 caps
 * wide) came from an older, wider cut; with them the flower-O sat a third of a
 * letter too far from the H. Re-measure if the font source changes.
 */
const WM = { capRatio: 0.69, advECH: 2.7754, advECHO: 3.8261 } as const;
const wmFont = (cap: number) => cap / WM.capRatio;
/**
 * Where the cap band centres in a line-height:1 box, as a fraction of
 * font-size: ascent 0.974 + descent 0.236 overflow the em by 0.21, so the
 * baseline lands at 0.869 and the cap (0.69) centres at 0.524.
 */
const CAP_CENTER = 0.524;
/** H → O gap: the flower's leftmost petal tucks in one letter-gap past the H. */
const FUSED_GAP = -0.07;

function WordmarkText({
  text,
  cap,
  color,
  size,
  letterRef,
}: {
  text: string;
  cap: number;
  color: string;
  /** The font size as any CSS length; defaults to the one cap `cap` gives, in px. */
  size?: string;
  letterRef?: (el: HTMLSpanElement | null, i: number) => void;
}) {
  const style: CSSProperties = {
    fontFamily: "var(--brand-font-display), var(--echo-font-sans)",
    fontWeight: 600,
    fontSize: size ?? wmFont(cap),
    lineHeight: 1,
    color,
    whiteSpace: "pre",
    display: "inline-flex",
  };
  if (!letterRef) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {[...text].map((ch, i) => (
        <span key={i} ref={(el) => letterRef(el, i)} style={{ display: "inline-block" }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/* --- the atomic flower mark --------------------------------------------- */

/** The static brand flower (NOT the live creature). `m` = visible height in px. */
export function Flower({
  m = 64,
  surface = "dark",
  tier,
  eyes,
  tone = "full",
  style,
}: {
  m?: number;
  surface?: Surface;
  tier?: Tier;
  eyes?: boolean;
  tone?: Tone;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const box = markBox(m);
  const t = tier ?? tierFor(m);
  const mono = tone !== "full";
  const gloss = t === "expressive" && !mono;
  const showEyes = eyes ?? t !== "micro";
  const bodyFill =
    tone === "white" ? "#fff" : tone === "ink" ? neutral.void : gloss ? `url(#${uid})` : creature.body;
  // Knockout inks: the eyes stay legible whatever colour the mark is.
  const eyeFill = tone === "white" ? "rgba(22,18,26,0.16)" : tone === "ink" ? "rgba(255,255,255,0.18)" : creature.eye;
  const pupilFill =
    tone === "white" ? "rgba(22,18,26,0.9)" : tone === "ink" ? "rgba(245,240,233,0.92)" : creature.pupil;

  return (
    <div className="brand-flower" style={{ width: box, height: box, ...style }}>
      {surface === "dark" && !mono && (
        <div
          className="brand-flower__aura"
          style={{
            width: box * 0.9,
            height: box * 0.9,
            background: `radial-gradient(circle, ${alpha(creature.aura, 33)} 0%, transparent 66%)`,
            filter: `blur(${box * 0.06}px)`,
          }}
        />
      )}
      <svg viewBox={VIEWBOX} width={box} height={box} style={{ overflow: "visible", position: "relative" }}>
        <defs>
          <radialGradient id={uid} cx="38%" cy="30%" r="80%">
            <stop offset="0%" style={{ stopColor: creature.bodyLight }} />
            <stop offset="40%" style={{ stopColor: creature.body }} />
            <stop offset="100%" style={{ stopColor: creature.bodyDeep }} />
          </radialGradient>
        </defs>
        {/* Named for a drawn look (brand.css), like the creature's own drawing. */}
        <path className="brand-creature__body" d={BODY} style={{ fill: bodyFill }} />
        {gloss && (
          <ellipse className="brand-creature__shine" cx="125" cy="20" rx="5.4" ry="3.4" fill="rgba(255,255,255,0.55)" transform="rotate(-18 125 20)" />
        )}
        {showEyes && (
          <g>
            <path className="brand-creature__eye" d={EYE_WHITE_L} style={{ fill: eyeFill }} />
            <path className="brand-creature__eye" d={EYE_WHITE_R} style={{ fill: eyeFill }} />
            <path className="brand-creature__pupil" d={PUPIL_L} style={{ fill: pupilFill }} />
            <path className="brand-creature__pupil" d={PUPIL_R} style={{ fill: pupilFill }} />
            {gloss &&
              EYE_CATCH.map(([x, y]) => <circle key={x} className="brand-creature__shine" cx={x} cy={y} r={0.55} fill="rgba(255,255,255,0.8)" />)}
          </g>
        )}
      </svg>
    </div>
  );
}

/* --- fused signature — ECH🌸 --------------------------------------------- */

/** Flower-O = 1.3H; H→O gap = the letter gap; optically centred. */
function fusedLayout(H: number) {
  const wordFS = wmFont(H);
  const wordW = WM.advECH * H;
  const flowerBox = markBox(1.3 * H);
  const flowerLeft = wordW - FLOWER_FRAC.left * flowerBox + FUSED_GAP * H;
  const vc = flowerBox / 2;
  return {
    flowerBox,
    flowerLeft,
    containerW: flowerLeft + flowerBox,
    containerH: flowerBox,
    wordTop: vc - CAP_CENTER * wordFS,
    // Round-on-flat reads high, so the flower is nudged down a hair.
    flowerTop: vc - FLOWER_FRAC.cy * flowerBox + H * 0.045,
  };
}

/**
 * THE signature. Eyeless below a 32px cap.
 *
 * `o`: something that sits exactly in the O's place, over the flower, in a box
 * the flower's width whose floor is the flower's lowest petal (the homepage
 * footer puts the guide's perch there).
 */
export function FusedLockup({
  surface = "dark",
  H = 72,
  tone = "full",
  o,
}: {
  surface?: Surface;
  H?: number;
  tone?: Tone;
  o?: ReactNode;
}) {
  const L = fusedLayout(H);
  return (
    <div role="img" aria-label="Echo" style={{ position: "relative", width: L.containerW, height: L.containerH }}>
      <div style={{ position: "absolute", left: 0, top: L.wordTop }}>
        <WordmarkText text="ECH" cap={H} color={letterInk(surface, tone)} />
      </div>
      <div className="brand-lockup__o" style={{ position: "absolute", left: L.flowerLeft, top: L.flowerTop }}>
        <Flower m={1.3 * H} surface={surface} tone={tone} eyes={H >= 32} />
        {o != null && (
          <div style={{ position: "absolute", left: 0, top: 0, width: L.flowerBox, height: L.flowerBox * FLOWER_FRAC.bottom }}>
            {o}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mark leads, the full word follows. Unit M. */
export function SeparatedLockup({ surface = "dark", M = 48, tone = "full" }: { surface?: Surface; M?: number; tone?: Tone }) {
  const box = markBox(M);
  const cap = 0.62 * M;
  const wordLeft = FLOWER_FRAC.right * box + 0.5 * M;
  return (
    <div role="img" aria-label="Echo" style={{ position: "relative", width: wordLeft + WM.advECHO * cap, height: box }}>
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <Flower m={M} surface={surface} tone={tone} />
      </div>
      <div style={{ position: "absolute", left: wordLeft, top: box / 2 - CAP_CENTER * wmFont(cap) }}>
        <WordmarkText text="ECHO" cap={cap} color={letterInk(surface, tone)} />
      </div>
    </div>
  );
}

/** Square / vertical. Unit M. */
export function StackedLockup({ surface = "dark", M = 64, tone = "full" }: { surface?: Surface; M?: number; tone?: Tone }) {
  const box = markBox(M);
  const cap = 0.5 * M;
  const capTopOff = CAP_CENTER * wmFont(cap) - cap / 2;
  const marginTop = 0.4 * M - (1 - FLOWER_FRAC.bottom) * box - capTopOff;
  return (
    // As wide as the wider of the two: the word under a small mark is wider
    // than the mark, and a box sized to the flower alone let it spill out.
    <div
      role="img"
      aria-label="Echo"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", width: Math.max(box, WM.advECHO * cap) }}
    >
      <Flower m={M} surface={surface} tone={tone} />
      <div style={{ marginTop }}>
        <WordmarkText text="ECHO" cap={cap} color={letterInk(surface, tone)} />
      </div>
    </div>
  );
}

export function WordmarkLogo({ surface = "dark", cap = 48, tone = "full" }: { surface?: Surface; cap?: number; tone?: Tone }) {
  return (
    <span role="img" aria-label="Echo">
      <WordmarkText text="ECHO" cap={cap} color={letterInk(surface, tone)} />
    </span>
  );
}

/** App icon / favicon / avatar: the flower at 64% of the safe area. */
export function IconMark({ size = 96, surface = "dark", radius }: { size?: number; surface?: Surface; radius?: number }) {
  return (
    <div
      role="img"
      aria-label="Echo icon"
      className="brand-icon"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.24,
        background: surface === "dark" ? neutral.void : neutral.cream,
        boxShadow: surface === "dark" ? "inset 0 0 0 1px rgba(255,255,255,0.06)" : "inset 0 0 0 1px color-mix(in oklab, var(--echo-cast-ink, var(--echo-shade-ink, black)) 6.0%, transparent)",
      }}
    >
      <Flower m={0.64 * size} surface={surface} />
    </div>
  );
}

/** The fused lockup inside its clear space (0.5·H), drawn. */
export function LogoClearspace({ H = 56 }: { H?: number }) {
  return (
    <div className="brand-clearspace" style={{ padding: H * 0.5 }}>
      <FusedLockup H={H} />
    </div>
  );
}

/** The bloom, drawn still: the seed, the first buds, the full bloom, the mark itself. */
export function MorphStrip({ size = 48, bloom }: { size?: number; bloom?: BloomId }) {
  const b = getBloom(bloom);
  const end = bloomEnd(b);
  const stages = [0.16, 0.34, 0.5].map((f) => framePath(bloomAt(b, f * end)));
  return (
    <div className="brand-morph" role="img" aria-label="The flower grows from a seed, buds, and blooms into its eight petals">
      {[...stages, BODY].map((d, i) => (
        <span key={i} className="brand-morph__step">
          <svg viewBox={VIEWBOX} width={size} height={size} aria-hidden="true">
            <path d={d} style={{ fill: creature.body }} />
          </svg>
          {i < 3 && <span aria-hidden="true">→</span>}
        </span>
      ))}
    </div>
  );
}

/* --- the brand boot: Echo writes itself --------------------------------- */

const EYE_ORIGIN = "129.3 32";
const EYES_OPEN: SpringCfg = { duration: 0.34, bounce: 0.1 };
const TRAVEL: SpringCfg = { duration: 0.75, bounce: 0.12 };
const LAND: SpringCfg = { duration: 0.4, bounce: 0.28 };
const GLANCE: SpringCfg = { duration: 0.22, bounce: 0.05 };
/** The glow the finished mark sits in, and the one the markup shows. */
const AURA = 0.44;

/**
 * A dot swells centre-stage and blooms into the mark (./bloom), opens its
 * eyes, travels into the O slot, and E·C·H land while Echo watches each one.
 * One continuous run on springs, started when the logo is in view; activate
 * to replay.
 *
 * The markup is the finished lockup, so without scripts, and under reduced
 * motion, the page shows the logo and nothing moves. Where scripts run and
 * motion is welcome, brand.css holds the art hidden until the boot has drawn
 * its first frame: the finished logo never flashes before the bloom.
 */
export function LogoBoot({ H = 84, bloom }: { H?: number; /** Which bloom; Unfurl by default. */ bloom?: BloomId }) {
  const L = fusedLayout(H);
  /*
   * Every length is a share of the button's width (cqw), which is the drawn
   * width or the column's, whichever is less: the lockup scales to fit a
   * narrow column in CSS alone, before any script and without one (from a
   * layout effect, it would overflow until hydration).
   */
  const u = (px: number) => `${((px / L.containerW) * 100).toFixed(4)}cqw`;
  // The travel, as a share of the flower's own box, so it scales with it.
  const startX = ((L.containerW / 2 - (L.flowerLeft + L.flowerBox / 2)) / L.flowerBox) * 100;
  const drawBack = startX - ((H * 0.05) / L.flowerBox) * 100;

  const root = useRef<HTMLButtonElement>(null);
  const flower = useRef<HTMLSpanElement>(null);
  const body = useRef<SVGPathElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const pupils = useRef<SVGGElement>(null);
  const auraEl = useRef<HTMLSpanElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);

  useBrandMotion(
    root,
    ({ reduced }) => {
      const el = root.current;
      if (reduced || !el) return;
      const b = getBloom(bloom);
      const end = bloomEnd(b);
      const clock = { t: 0 };
      const draw = () => {
        const frame = bloomAt(b, clock.t);
        body.current?.setAttribute("d", frame.done ? BODY : framePath(frame));
        const grown = frameGrowth(frame);
        gsap.set(auraEl.current, { opacity: AURA * Math.min(1, grown), scale: 0.6 + 0.4 * grown });
      };
      const word = letters.current.filter((l): l is HTMLSpanElement => l !== null);

      gsap.set(flower.current, { xPercent: startX });
      gsap.set(eyes.current, { scaleY: 0, svgOrigin: EYE_ORIGIN });
      gsap.set(pupils.current, { x: 0, y: 0 });
      gsap.set(word, { opacity: 0, scale: 0.4, transformOrigin: "50% 55%" });
      draw();
      el.setAttribute("data-boot", "live");

      // The eyes open as the last petals arrive; Echo sets off once they have.
      const eyesAt = bloomNearlyDone(b);
      const leave = Math.max(eyesAt + 0.4, end - 0.15);
      const lettersAt = leave + 0.3;
      const tl = gsap.timeline({ paused: true });
      // GSAP rounds a plain value's last frame to six decimals, which can stop
      // the clock a hair short of `end`; finish on the mark explicitly.
      const finish = () => {
        clock.t = Infinity;
        draw();
      };
      tl.to(clock, { t: end, duration: end, ease: "none", onUpdate: draw, onComplete: finish }, 0)
        .to(eyes.current, { scaleY: 1, svgOrigin: EYE_ORIGIN, ...sprung(EYES_OPEN) }, eyesAt)
        // A small draw-back, then the spring carries it into the O slot.
        .to(flower.current, { xPercent: drawBack, duration: 0.16, ease: "power2.out" }, leave)
        .to(flower.current, { xPercent: 0, ...sprung(TRAVEL) }, leave + 0.16);
      word.forEach((letter, i) => {
        const at = lettersAt + i * 0.15;
        tl.to(letter, { opacity: 1, duration: 0.14, ease: "power1.out" }, at)
          .to(letter, { scale: 1, ...sprung(LAND) }, at)
          .to(pupils.current, { x: [-1.1, -0.8, -0.45][i], y: 0.3, ...sprung(GLANCE) }, at);
      });
      tl.to(pupils.current, { x: 0, y: 0, ...sprung({ duration: 0.4, bounce: 0 }) }, lettersAt + 0.9);

      const seen = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          tl.play();
          seen.disconnect();
        },
        { threshold: 0.5 },
      );
      seen.observe(el);
      const replay = () => void tl.restart();
      el.addEventListener("click", replay);
      return () => {
        seen.disconnect();
        el.removeEventListener("click", replay);
      };
    },
    [H, bloom],
  );

  return (
    <button
      ref={root}
      type="button"
      className="brand-boot"
      aria-label="Echo — replay the logo animation"
      style={{ width: "100%", maxWidth: L.containerW, aspectRatio: `${L.containerW} / ${L.containerH}` }}
    >
      <span className="brand-boot__art">
        <span style={{ position: "absolute", left: 0, top: u(L.wordTop) }}>
          <WordmarkText
            text="ECH"
            cap={H}
            size={u(wmFont(H))}
            color={neutral.cream}
            letterRef={(el, i) => {
              letters.current[i] = el;
            }}
          />
        </span>
        <span
          ref={flower}
          style={{
            position: "absolute",
            display: "block",
            left: u(L.flowerLeft),
            top: u(L.flowerTop),
            width: u(L.flowerBox),
            height: u(L.flowerBox),
          }}
        >
          <span
            ref={auraEl}
            className="brand-flower__aura"
            style={{
              width: u(L.flowerBox * 0.82),
              height: u(L.flowerBox * 0.82),
              opacity: AURA,
              background: `radial-gradient(circle, ${alpha(creature.body, 87)} 0%, ${alpha(creature.body, 33)} 34%, transparent 66%)`,
              filter: `blur(${u(L.flowerBox * 0.07)})`,
            }}
          />
          <svg viewBox={VIEWBOX} width="100%" height="100%" style={{ overflow: "visible", position: "relative", display: "block" }}>
            <path ref={body} d={BODY} style={{ fill: creature.body }} />
            <g ref={eyes}>
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
          </svg>
        </span>
      </span>
    </button>
  );
}
