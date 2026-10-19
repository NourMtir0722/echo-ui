"use client";

/**
 * Pulled in: Echo goes into ChatGPT. After the components and before the
 * blueprint, the page opens onto the landing's own blue light, and the scroll
 * becomes a camera pulled into it, as if a magnet were bringing Echo into a
 * new white world.
 *
 * Four stops, one push each (the waypoints carry `data-snap`, as the road's
 * cards do), and every one rests on a finished picture with something alive
 * in it (timeline.ts):
 *   1. Caught. The push that leaves the components carries the stage in: the
 *      dark opens into a vortex, and Echo is caught in it and circles the light.
 *   2. The lines. The storm holds, and the two lines write themselves on, a
 *      word at a time: "Make your style in the chat." / "Build with it in your
 *      code."
 *   3. ChatGPT. Echo is yanked out of the storm into the light, the lines rush
 *      past, the white floods, and the light at the end of the tunnel turns
 *      out to be ChatGPT: OpenAI's mark comes forward out of its last point,
 *      then steps aside as "ChatGPT" writes on beside it, under "Echo UI is now
 *      in".
 *   4. The key. "Get the plugin" rises in; Echo comes back out of the white and
 *      lands on it, and the key goes down under it, with its click and its
 *      ring of light (HardwareButton's `held`: the press our keys have), and
 *      comes home with Echo riding it.
 * Then no exit: the stage lets go and the white goes on with the page. The
 * blueprint is laid on it, and the page's ground turns back to the dark only
 * as the letter comes up (WhiteRun.tsx).
 *
 * The camera, the vortex and Echo follow the scroll, at a pace they can be
 * seen at (follow.ts): however fast the page gets to a stop (a step's glide, a
 * flick on a phone, a key), each beat takes a second or so and comes to rest
 * on its picture. Scroll back and they run back. The words play at their own
 * pace once their stop is reached, as a title does in a motion piece, and
 * play back when the scroll goes back past it. OpenAI's mark only travels: where it is and how big, never turned,
 * never taken apart, never lit (their brand rules: don't alter the mark, no
 * effects); the light and the colour are Echo's.
 *
 * Everyone gets it: the heading is real text ("Echo UI is now in ChatGPT"),
 * the lines are text, the key is a link to the listing. Under reduced motion,
 * without WebGL or without JavaScript, the section is its last stop, still,
 * the lines over it, Echo (or its drawing) on the key.
 */
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Vector3 } from "three";
import { HardwareButton } from "@registry/echo/hardware-button";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { GuideStop } from "@/components/home/Guide";
import { barHeight } from "@/components/home/snap";
import { onFrame } from "@/components/home/frame";
import { follow, following } from "@/components/home/follow";
import { OpenAIMark, PETAL } from "@/components/home/blueprint/openai-mark";
import { WHITE_GROUND } from "@/components/home/blueprint/Blueprint";
import { shades } from "@/components/home/light/shades";
import { GRADIENT } from "@/components/home/light/look";
import { CHATGPT_LISTING_URL } from "../../../../../mcp/src/plugin-downloads";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { CALL, camZ, cue, echoPose, end, ENTER, glideAt, HOLD, LANDS, LENGTH, LINES, mix, paceAt, STOPS, WORDS, type Pose } from "./timeline";
import type { Colours, PullScene } from "./scene";
import "./pulled-in.css";

const ARRIVE: SoundRecipe = { wave: "sine", freq: [659.25, 987.77, 1318.51], decay: 0.22, gain: 0.04 };
/** How long Echo holds the key down when it lands, ms: a tap, the whole stroke and its click. */
const PRESS_MS = 240;

/** The page's ground behind an element: the first colour that isn't see-through, from it outward. */
function groundOf(el: Element): string {
  for (let at: Element | null = el.parentElement; at; at = at.parentElement) {
    const c = getComputedStyle(at).backgroundColor;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) continue;
    const [r, g, b, a = "1"] = m[1]!.split(/[ ,/]+/).filter(Boolean);
    if (Number(a) > 0.5) return `#${[r, g, b].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("")}`;
  }
  return "#0b0e17";
}

/** OpenAI's mark, flat, in its own black: its one petal drawn six times round its centre (openai-mark.tsx). */
function Blossom({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="250 250 1906 1906" aria-hidden="true" fill="#0d0d0d">
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <path key={r} d={PETAL} transform={`rotate(${r} 1203 1203)`} />
      ))}
    </svg>
  );
}

/** Words that rise into place one after another, each out of its own slot (pulled-in.css), from `from` on. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="pull__w">
            <span style={{ "--i": from + i } as CSSProperties}>{w}</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** Whether this browser draws WebGL at all. */
function webgl(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/** An element's place inside `root`, by layout (transforms ignored). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let at: HTMLElement | null = el; at && at !== root; at = at.offsetParent as HTMLElement | null) {
    x += at.offsetLeft;
    y += at.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const NAME = "ChatGPT";

export function PulledIn() {
  // The light is the landing's, in the site's colour (Sky until the visitor picks one, as the blueprint's paper).
  const [seed] = useSiteSeed(LANDING_SEED);
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;

  // Server, no JavaScript, reduced motion, no WebGL: the last stop, still. The client turns the flight on.
  const [live, setLive] = useState(false);
  const [near, setNear] = useState(false);
  // Echo's landing holds the key down for a moment.
  const [held, setHeld] = useState(false);

  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dock = useRef<HTMLSpanElement>(null);
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);
  const title = useRef<HTMLHeadingElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const keyEl = useRef<HTMLDivElement>(null);
  const scene = useRef<PullScene | null>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !webgl()) return;
    setLive(true);
  }, []);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: "1400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Sizes: the stage, the lines' places in the world (each set to sit at its place at the lines' stop), Echo's
  // seat, and the lockup: where the light's point is from the mark's place, and how far the mark steps aside.
  const anchors = useRef<Vector3[]>([]);
  const seat = useRef<{ x: number; y: number; size: number } | null>(null);
  const fromLight = useRef({ x: 0, y: 0 });
  const centred = useRef({ x: 0, y: 0 });
  const drawn = useRef(-10);
  const measure = useCallback(() => {
    const st = stage.current;
    if (!st) return;
    // The room under the bar is the bar's own height off the window, as the page's stops measure it (snap.ts):
    // the shell's 56px var is a pixel short of the bar, which made each stop a pixel taller than the room, framed
    // 12px under the bar, with the page's dark showing over the stage.
    section.current?.style.setProperty("--pull-bar", `${barHeight()}px`);
    const w = st.clientWidth;
    const h = st.clientHeight;
    scene.current?.resize(w, h);
    const tan = Math.tan((50 * Math.PI) / 360);
    const z1 = camZ(HOLD);
    anchors.current = LINES.map((l) => {
      const nx = l.at.x * 2 - 1;
      const ny = 1 - l.at.y * 2;
      return new Vector3(nx * l.depth * tan * (w / h), ny * l.depth * tan, z1 - l.depth);
    });
    // Echo's seat: on the key's cap, in the middle, sunk a little into it.
    const cap = keyEl.current?.querySelector<HTMLElement>(".echo-hw");
    if (cap) {
      const r = offsetIn(cap, st);
      const size = Math.min(h * 0.13, r.h * 1.9);
      seat.current = { x: r.x + r.w / 2, y: r.y - size * 0.4, size };
    }
    // At its stop the lockup sits in the middle of the stage, then rises to its place as the key comes. The mark
    // alone sits in the middle of the lockup until the word comes, and comes out of the light's point, the stage's middle.
    const tl = title.current;
    const m = mark.current;
    const n = name.current;
    if (tl && m && n) {
      const t = offsetIn(tl, st);
      centred.current = { x: w / 2 - (t.x + t.w / 2), y: h / 2 - (t.y + t.h / 2) };
      const r = offsetIn(m, st);
      fromLight.current = { x: w / 2 - (r.x + r.w / 2 + centred.current.x), y: h / 2 - (r.y + r.h / 2 + centred.current.y) };
      const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
      m.style.setProperty("--shift", `${((n.offsetWidth + gap) / 2).toFixed(1)}px`);
    }
    drawn.current = -10;
  }, []);

  // The world: built once the section is near.
  useEffect(() => {
    const el = canvas.current;
    const st = stage.current;
    if (!live || !near || !el || !st) return;
    let gone = false;
    const colours: Colours = {
      ground: groundOf(st),
      // The landing's own light (look.ts): six shades of the site's colour, deep to glow.
      sky: shades(seed.accent, GRADIENT.hueDrift),
      white: "#FFFFFF",
      paper: WHITE_GROUND,
    };
    import("./scene")
      .then(({ createPullScene }) => {
        if (gone) return;
        scene.current = createPullScene(el, colours, { light: window.innerWidth < 700 });
        measure();
      })
      .catch(() => setLive(false));
    return () => {
      gone = true;
      scene.current?.destroy();
      scene.current = null;
    };
  }, [live, near, measure, seed.accent]);

  useLayoutEffect(() => {
    const st = stage.current;
    if (!live || !st) return;
    const ro = new ResizeObserver(measure);
    ro.observe(st);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [live, measure]);

  /** Put the box the stage flies Echo to where Echo is. */
  const lands = useRef(0);
  const place = useCallback((pose: Pose, landing: boolean) => {
    const el = dock.current;
    const st = stage.current;
    if (!el || !st) return;
    el.style.width = el.style.height = `${pose.size}px`;
    el.style.transform = `translate(${pose.x - pose.size / 2}px, ${pose.y - pose.size / 2}px)`;
    el.dataset.lean = pose.lean.toFixed(3);
    el.dataset.spin = pose.spin.toFixed(3);
    el.dataset.air = String(pose.air);
    if (landing) el.dataset.land = String(++lands.current);
    // Swallowed by the white: the stage stops drawing it (a dock without `stay` hides Echo once it's in).
    st.toggleAttribute("data-echo-dock-stay", pose.seen);
  }, []);

  // Echo's landing presses the key: down with its click, and home a moment later.
  const pressTimer = useRef(0);
  const press = useCallback(() => {
    setHeld(true);
    clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setHeld(false), PRESS_MS);
  }, []);
  useEffect(() => () => clearTimeout(pressTimer.current), []);

  // Frame by frame, before the stage draws Echo: the scroll's progress, and everything it moves.
  useEffect(() => {
    if (!live) return;
    let last = -10;
    let lastAt = 0;
    let frame = 0;
    /** How fast the scroll is carrying us, in stops a second, eased. */
    let speed = 0;
    /** Where the moment is: it follows the scroll at a pace it can be seen at (follow.ts). Null while it's far off. */
    let at: ReturnType<typeof following> | null = null;
    let drawnAt = -10;
    return onFrame((now) => {
      const tr = track.current;
      const st = stage.current;
      if (!tr || !st) return;
      const bar = barHeight();
      const room = window.innerHeight - bar;
      const r = tr.getBoundingClientRect();
      const dt = lastAt ? Math.min(0.1, (now - lastAt) / 1000) : 0;
      lastAt = now;
      if (r.bottom < -room || r.top > window.innerHeight + room) {
        // Far off (a jump past it, or to the foot of the page): it lets Echo go, or it would keep calling it.
        if (st.hasAttribute("data-called")) st.toggleAttribute("data-called", false);
        at = null;
        return;
      }
      // Windows of scroll from where the stage is held: -1 as it slides in, LENGTH as it lets go and scrolls on.
      const scrolled = Math.min(LENGTH, Math.max(-ENTER, (bar - r.top) / room));
      // Arriving from far off (a jump, a reload partway down), it's simply where the scroll is.
      at ??= following(scrolled);
      const p = follow(at, scrolled, dt, paceAt(at.at));
      const w = st.clientWidth;
      const h = st.clientHeight;
      const t = now / 1000;
      const down = last > -ENTER;

      // Echo: caught once the light is in the window; it rides the key as the page scrolls the end on,
      // and steps off once most of the stage has gone.
      const called = p >= CALL && r.bottom > window.innerHeight * 0.45;
      if (st.hasAttribute("data-called") !== called) st.toggleAttribute("data-called", called);
      const landing = down && last < LANDS && p >= LANDS;
      if (called) place(echoPose(p, w, h, t, seat.current), landing);
      if (landing) press();

      // The words: on as their stop comes, off as soon as the scroll turns back from it.
      const way = down ? Math.sign(p - last) : 0;
      const linesOn = cue(WORDS.lines, p, st.hasAttribute("data-lines"), way);
      if (st.hasAttribute("data-lines") !== linesOn) st.toggleAttribute("data-lines", linesOn);
      const lockupOn = cue(WORDS.lockup, p, st.hasAttribute("data-lockup"), way);
      if (st.hasAttribute("data-lockup") !== lockupOn) {
        st.toggleAttribute("data-lockup", lockupOn);
        if (lockupOn && down) play.current?.(ARRIVE);
      }

      // The speed: what the lens streaks and the air brightens with. It settles back to nothing at rest.
      const v = dt > 0 && down ? Math.abs(p - last) / dt : 0;
      speed += (v - speed) * Math.min(1, dt * 10);
      if (speed < 0.002) speed = 0;
      last = p;
      // At rest the storm still turns and the white still breathes: every other frame is enough for that.
      frame++;
      if (p === drawn.current && scrolled === drawnAt && speed === 0 && frame % 2) return;
      drawn.current = p;
      drawnAt = scrolled;
      scene.current?.draw(p, speed, t, scrolled);

      // The two lines, where the world puts them: they come toward you as they write on, and rush past on the dive.
      const sc = scene.current;
      lines.current.forEach((el, i) => {
        const a = anchors.current[i];
        if (!el || !a || !sc) return;
        const pr = sc.project(a);
        const d = pr.depth;
        // Gone as they pass you.
        const show = d > 0.6 ? Math.min(1, Math.max(0, (20 - d) / 8)) * Math.min(1, Math.max(0, (d - 1.2) / 1.6)) : 0;
        const s = d > 0.6 ? sc.unitAt(d) / sc.unitAt(LINES[i]!.depth) : 0;
        el.style.opacity = show.toFixed(3);
        el.style.transform = `translate(${pr.x.toFixed(1)}px, ${pr.y.toFixed(1)}px) translate(${LINES[i]!.side === "left" ? "0" : "-100%"}, -50%) scale(${Math.min(s, 4).toFixed(4)})`;
      });

      // The end: the mark out of the light's point, and the key. It stays; the page scrolls it on.
      const E = end(p);
      if (title.current) {
        const k = 1 - E.settle;
        title.current.style.transform = `translate(${(centred.current.x * k).toFixed(1)}px, ${(centred.current.y * k).toFixed(1)}px)`;
      }
      if (mark.current) {
        const k = 1 - E.mark;
        mark.current.style.transform = `translate(${(fromLight.current.x * k).toFixed(1)}px, ${(fromLight.current.y * k).toFixed(1)}px) scale(${mix(0.04, 1, E.mark).toFixed(4)})`;
        mark.current.style.opacity = Math.min(1, E.mark * 3).toFixed(3);
      }
      if (keyEl.current) {
        // A pointer goes through it until it has risen in (a keyboard brings it in early: pulled-in.css).
        keyEl.current.style.pointerEvents = E.key > 0.6 ? "auto" : "none";
        keyEl.current.style.opacity = E.key.toFixed(3);
        keyEl.current.style.transform = `translateY(${((1 - E.key) * 60).toFixed(1)}%) scale(${mix(0.85, 1, E.key).toFixed(4)})`;
      }
    }, "scroll");
  }, [live, place, press]);

  return (
    <section ref={section} className="pull" aria-labelledby="pull-h" data-guide-section="" data-live={live ? "" : undefined}>
      <div ref={track} className="pull__track" style={{ "--pull-length": LENGTH } as CSSProperties}>
        {/* The stops: the page's wheel steps from one to the next (snap.ts). */}
        {live &&
          STOPS.map((s) => (
            <span key={s} className="pull__stop" data-snap="" data-snap-glide={glideAt(s)} style={{ "--at": s } as CSSProperties} aria-hidden="true" />
          ))}
        <div ref={stage} className="pull__stage" data-echo-dock="" data-echo-dock-fill="1">
          <canvas ref={canvas} className="pull__world" aria-hidden="true" />
          {live && <GuideStop className="pull__perch pull__perch--light" />}

          <div className="pull__end">
            <h2 ref={title} id="pull-h" className="pull__title">
              <span className="pull__lead">
                <Words text="Echo UI is now in" />
              </span>{" "}
              <span ref={mark} className="pull__mark">
                <Blossom className="pull__blossom" />
                <span ref={name} className="pull__name">
                  <span className="pull__sr">{NAME}</span>
                  <span aria-hidden="true">
                    {[...NAME].map((ch, i) => (
                      <span key={i} className="pull__ch" style={{ "--i": i } as CSSProperties}>
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </h2>
            <div ref={keyEl} className="pull__key">
              {!live && <GuideStop className="pull__perch pull__perch--key" />}
              {/* Named for where it goes: the page has other "Get the plugin" keys, to the plugin's docs. */}
              <HardwareButton
                variant="primary"
                size="lg"
                impact
                held={live ? held : undefined}
                href={CHATGPT_LISTING_URL}
                aria-label="Get the plugin in ChatGPT"
                icon={<OpenAIMark className="pull__key-icon" />}
              >
                Get the plugin
              </HardwareButton>
            </div>
          </div>

          <p ref={(el) => void (lines.current[0] = el)} className="pull__line pull__line--left">
            <Words text="Make your style in the chat." />
          </p>
          <p ref={(el) => void (lines.current[1] = el)} className="pull__line pull__line--right">
            <Words text="Build with it in your code." from={3} />
          </p>

          <span ref={dock} className="pull__dock" data-echo-dock-screen="" data-land="0" />
        </div>
      </div>
    </section>
  );
}
