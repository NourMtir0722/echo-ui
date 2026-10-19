"use client";

/**
 * A demo card: one thing Echo does, under a plain name and nothing else (the
 * demo says the rest), and a short demo inside it that plays once when the
 * card comes into view.
 *
 * Echo plays it: it hops onto the card's real buttons and presses them, one
 * after another (press.ts says where it is at each moment), and what a press
 * opens is what the visitor's own press opens. Echo's presses never move
 * focus; the visitor can press anything first and take over.
 *
 * It plays once the whole card is in view (a card is a stop the page comes to
 * rest on: snap.ts), so the visitor sees every step of it, never half. Each
 * card keeps its own time (`beats`: when each press lands), short, so it's
 * seen through between one push of the wheel and the next. A push onward
 * while it plays hurries it: the rest plays fast (HURRY_EVENT, sent by
 * use-smooth-scroll.ts), every step still seen, and when it ends the page goes
 * on by itself. Two pushes a card, however impatient: one to come, one to go.
 * Once it has been seen through it holds nothing. A ring round the pause key
 * fills as it plays, so you can see how long; pausing it lets the page go
 * (and it stops by itself while it's mostly out of view); at the end the key
 * plays it again. Under reduced motion it doesn't play: the card shows its
 * end, as it does without JavaScript.
 *
 * A card is one screen: on a window too short for it, its demo is drawn a
 * little smaller (down to 80%) so the whole card still fits under the bar.
 *
 * A button is one of Echo's presses when it carries `pressProps(k)`. The
 * card moves its marker (`.demo__marker`) from press to press; the road the
 * cards sit on (Workflow.tsx) stands Echo there while the card plays, and says
 * which phase it's in through `data-phase`.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { onFrame } from "@/components/home/frame";
import { barHeight, HURRY_EVENT, hurryRate, IN_VIEW, isFramed, topInset } from "@/components/home/snap";
import { evenBeats, poseAt, type Target } from "./press";


export interface DemoState {
  /** How many presses are done: what the card shows. */
  step: number;
  /** The press whose cap is held down right now. */
  held: number | null;
  /** Echo is on its way to the next button. */
  travelling: boolean;
  presses: number;
  /** The demo runs (false: under reduced motion, or before JavaScript; the card shows its end). */
  live: boolean;
  /** A press of the visitor's own: the card shows `step`, and the demo stops there. */
  setStep: (step: number) => void;
  /**
   * How far the demo has played, seconds: it stands still while paused or out
   * of view, and goes back to 0 when it starts again. For what plays beside
   * Echo's presses on the same clock (read it every frame; it never re-renders).
   */
  clock: () => number;
  /** How long the demo plays, seconds: Echo's presses, its rest, and the tail. */
  length: number;
  /**
   * A push of the wheel has hurried it (HURRY_EVENT): the rest plays this many
   * times faster. 1 when it plays at its own pace. What runs on its own clock
   * beside the presses (a timeline, say) plays at the same rate.
   */
  rate: number;
}

const DemoContext = createContext<DemoState>({
  step: 99,
  held: null,
  travelling: false,
  presses: 0,
  live: false,
  setStep: () => {},
  clock: () => 0,
  length: 0,
  rate: 1,
});

export const useDemo = () => useContext(DemoContext);

/** Makes an element one of Echo's presses: number `k` lands on it. */
export const pressProps = (k: number, opts: { mode?: "press" | "point"; at?: number; side?: "left" | "right" } = {}) => ({
  "data-press": k,
  "data-press-mode": opts.mode ?? "press",
  "data-press-at": opts.at ?? 0.5,
  "data-press-side": opts.side ?? "left",
});

/** How long one press takes, seconds, on a card that doesn't set its own beats; one more of these at the end, to rest on. */
const PER_PRESS = 1.9;
/** The smallest a demo is drawn to fit a short window; under it, the card is taller than the window. */
const MIN_FIT = 0.8;
/** Room kept above and below a card framed in the window, px. */
const AIR = 16;
/** Narrower than this the panes stack, and a card is read scrolling: it isn't fitted to the window. */
const FIT_FROM = 900;

type Phase = "waiting" | "playing" | "paused" | "done";

/**
 * Sent to a card to put its demo at its end, as if it had played: the paper
 * road (paper/PaperRoad.tsx) sends it to Make as the visitor leaves for Pick,
 * so the styles Make hands back are there to carry.
 */
export const FINISH_EVENT = "echo-demo-finish";

/**
 * A press whose button isn't laid out borrows the nearest one before it, or
 * after it: Echo waits there instead.
 */
function fillGaps(found: (Target | undefined)[]): Target[] {
  const first = found.find(Boolean);
  if (!first) return [];
  let last = first;
  return found.map((t) => (last = t ?? last));
}

export function DemoCard({
  id,
  name,
  presses,
  beats: ownBeats,
  length: ownLength,
  tail = 0,
  onReset,
  className,
  children,
}: {
  id: string;
  /** What it does, in a few plain words: "Make a style with AI". */
  name: string;
  presses: number;
  /** When each press lands, seconds into the demo (a module constant). Without them, one every PER_PRESS. */
  beats?: readonly number[];
  /** How long the demo plays in all, seconds, with its own beats. */
  length?: number;
  /** Without beats: seconds the demo runs on after Echo's last press and its rest, for something else in it to finish. */
  tail?: number;
  /** Called when the demo starts again from the beginning (play again, or scrolled back above it). */
  onReset?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const card = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [step, setStepState] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const [travelling, setTravelling] = useState(false);
  const [own, setOwn] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const progress = useRef(0);
  const beats = ownBeats ?? evenBeats(presses, PER_PRESS);
  const length = ownLength ?? (presses + 1) * PER_PRESS + tail;
  const beatsKey = beats.join(" ");
  const total = useRef(length);
  total.current = length;
  const clock = useRef(() => progress.current * total.current).current;
  // How fast it plays: 1, or hurried (HURRY_EVENT).
  const speed = useRef(1);
  const visible = useRef(false);
  const phaseRef = useRef<Phase>("waiting");
  phaseRef.current = phase;
  const reset = useRef(onReset);
  reset.current = onReset;

  useEffect(() => {
    setLive(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Scrolled back above it, out of view: it plays from the top next time. (When it plays is the clock's: below.)
  useEffect(() => {
    const el = card.current;
    if (!live || !el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e && !e.isIntersecting && e.boundingClientRect.top > 0 && phaseRef.current !== "waiting") {
        progress.current = 0;
        speed.current = 1;
        setRate(1);
        setOwn(null);
        setPhase("waiting");
        reset.current?.();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  // Asked to be at its end (FINISH_EVENT): it has played, and been seen.
  useEffect(() => {
    const el = card.current;
    if (!live || !el) return;
    const finish = () => {
      if (phaseRef.current === "done") return;
      progress.current = 1;
      setOwn(null);
      phaseRef.current = "done";
      setPhase("done");
      el.setAttribute("data-seen", "");
    };
    el.addEventListener(FINISH_EVENT, finish);
    return () => el.removeEventListener(FINISH_EVENT, finish);
  }, [live]);

  // A push onward while it plays: the rest plays fast (snap.ts `hurryRate`), then the page goes on.
  useEffect(() => {
    const el = card.current;
    if (!live || !el) return;
    const hurry = () => {
      if (phaseRef.current === "done" || phaseRef.current === "paused" || speed.current > 1) return;
      const left = (1 - progress.current) * total.current;
      speed.current = hurryRate(left);
      setRate(speed.current);
      if (phaseRef.current === "waiting") {
        phaseRef.current = "playing";
        setPhase("playing");
      }
    };
    el.addEventListener(HURRY_EVENT, hurry);
    return () => el.removeEventListener(HURRY_EVENT, hurry);
  }, [live]);

  /*
   * One screen: on a window too short for the card, the demo is drawn smaller
   * (a scale, laid out wider by as much, so it keeps the card's width) until
   * the card fits under the bar, down to MIN_FIT.
   */
  const fit = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = card.current;
    const f = fit.current;
    if (!el || !f) return;
    const draw = (k: number) => {
      if (k >= 1) {
        f.style.removeProperty("width");
        f.style.removeProperty("transform");
        f.style.removeProperty("margin-bottom");
        return;
      }
      f.style.width = `${(100 / k).toFixed(3)}%`;
      f.style.transform = `scale(${k.toFixed(4)})`;
      // The scale doesn't change the box the page lays out: take back what it no longer draws.
      f.style.marginBottom = `${(f.offsetHeight * (k - 1)).toFixed(1)}px`;
    };
    const measure = () => {
      draw(1);
      if (window.innerWidth < FIT_FROM) return;
      const room = window.innerHeight - barHeight() - AIR * 2;
      if (el.offsetHeight <= room) return;
      // Drawn wider, the demo's words wrap less, so it shrinks by more than the scale: find the largest that fits.
      let lo = MIN_FIT;
      let hi = 1;
      for (let i = 0; i < 6; i++) {
        const k = (lo + hi) / 2;
        draw(k);
        if (el.offsetHeight <= room) lo = k;
        else hi = k;
      }
      draw(lo);
    };
    measure();
    // Measured on the next frame, not inside the observer's own callback: drawing the card smaller
    // resizes what it watches, and a change inside the callback is a loop the browser reports.
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(later);
    ro.observe(el.querySelector(".demo__head") ?? el);
    for (const child of f.children) ro.observe(child);
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", later);
    };
  }, []);

  // The clock, and Echo on the card's buttons.
  useEffect(() => {
    const st = body.current;
    const el = card.current;
    if (!live || !st || !el) return;
    const duration = length;
    const at = beatsKey.split(" ").map(Number);
    let last = performance.now();
    let lastStep = -1;
    let lastHeld: number | null | undefined;
    let lastTravel: boolean | undefined;
    let lastTransform = "";
    let lastLean = "";
    let lastPress = "";
    let lastProgress = "";
    let perch: HTMLElement | null = el.querySelector<HTMLElement>(".demo__marker");
    let buttons: HTMLElement[] = [...st.querySelectorAll<HTMLElement>("[data-press]")];
    const mo = new MutationObserver(() => {
      buttons = [...st.querySelectorAll<HTMLElement>("[data-press]")];
      perch = el.querySelector<HTMLElement>(".demo__marker");
    });
    mo.observe(el, { childList: true, subtree: true });
    const off = onFrame((now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      // It starts once all of it is in view, and carries on while most of it is.
      const inset = topInset();
      const shown = (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, inset)) / Math.min(r.height, window.innerHeight - inset);
      visible.current = shown >= 0.6;
      // Framed as the wheel's hold takes it, so a card the page holds on is a card that plays.
      if (phaseRef.current === "waiting" && isFramed(r, inset, IN_VIEW)) {
        phaseRef.current = "playing";
        setPhase("playing");
      }
      if (phaseRef.current === "playing" && visible.current) {
        progress.current = Math.min(1, progress.current + (dt * speed.current) / duration);
        // Hurried, what plays on its own beside the presses (a transition, a pour) keeps up.
        if (speed.current > 1) {
          for (const a of el.getAnimations({ subtree: true })) if (a.playbackRate === 1) a.playbackRate = speed.current;
        }
        if (progress.current >= 1) {
          setPhase("done");
          // Seen through: it never holds the wheel again, even when it plays again (snap.ts `holding`).
          el.setAttribute("data-seen", "");
        }
      }
      // How far it has played, for the ring round the pause key: the page holds while it fills (snap.ts).
      const pv = progress.current.toFixed(3);
      if (pv !== lastProgress) el.style.setProperty("--demo-p", (lastProgress = pv));
      const t = progress.current * duration;
      const s = st.getBoundingClientRect();
      const found: (Target | undefined)[] = Array.from({ length: presses }, () => undefined);
      for (const t of buttons) {
        const k = Number(t.dataset.press);
        if (!(k >= 0 && k < presses)) continue;
        const b = t.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        found[k] = {
          left: b.left - s.left,
          top: b.top - s.top,
          width: b.width,
          height: b.height,
          mode: t.dataset.pressMode === "point" ? "point" : "press",
          at: Number(t.dataset.pressAt ?? 0.5),
          side: t.dataset.pressSide === "right" ? "right" : "left",
        };
      }
      const size = perch?.offsetWidth || 56;
      const pose = poseAt(t, fillGaps(found), size, at, duration);
      if (perch) {
        const transform = `translate(${(pose.x - size / 2).toFixed(1)}px, ${(pose.y - size).toFixed(1)}px)`;
        const lean = pose.lean.toFixed(3);
        const press = pose.held === null ? "0" : "1";
        if (transform !== lastTransform) perch.style.transform = lastTransform = transform;
        if (lean !== lastLean) perch.dataset.guideLean = lastLean = lean;
        if (press !== lastPress) perch.dataset.guidePress = lastPress = press;
      }
      if (pose.step !== lastStep) {
        lastStep = pose.step;
        setStepState(pose.step);
      }
      if (pose.held !== lastHeld) {
        lastHeld = pose.held;
        setHeld(pose.held);
      }
      if (pose.travelling !== lastTravel) {
        lastTravel = pose.travelling;
        setTravelling(pose.travelling);
      }
    });
    return () => {
      off();
      mo.disconnect();
    };
  }, [live, presses, length, beatsKey]);

  // A press of the visitor's own stops the demo where they've taken it.
  const setStep = (n: number) => {
    setOwn(n);
    if (phaseRef.current === "playing") setPhase("paused");
  };

  const toggle = () => {
    if (phase === "playing") setPhase("paused");
    else if (phase === "done") {
      progress.current = 0;
      speed.current = 1;
      setRate(1);
      setOwn(null);
      reset.current?.();
      setPhase("playing");
    } else {
      setOwn(null);
      setPhase("playing");
    }
  };

  const shown = live ? (own ?? step) : presses;
  const value: DemoState = { step: shown, held: live && own === null ? held : null, travelling: live && travelling, presses, live, setStep, clock, length, rate };
  const label = phase === "playing" ? "Pause the demo" : phase === "done" ? "Play the demo again" : "Play the demo";

  return (
    <article
      ref={card}
      id={id}
      className={["demo", className].filter(Boolean).join(" ")}
      aria-labelledby={`${id}-h`}
      data-live={live ? "" : undefined}
      data-phase={phase}
      data-step={shown}
      data-hurried={rate > 1 ? "" : undefined}
      data-snap=""
    >
      <header className="demo__head">
        <div className="demo__words">
          <h3 id={`${id}-h`} className="demo__name">
            {name}
          </h3>
        </div>
        {live && (
          <span className="demo__key">
            <HardwareButton size="sm" iconOnly aria-label={label} icon={phase === "playing" ? <PauseIcon /> : phase === "done" ? <AgainIcon /> : <PlayIcon />} onClick={toggle} />
          </span>
        )}
      </header>
      <div ref={body} className="demo__body">
        <div ref={fit} className="demo__fit">
          <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
        </div>
        <span className="guide-stop demo__marker" aria-hidden="true" />
      </div>
    </article>
  );
}

function PauseIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
function AgainIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
    </svg>
  );
}
