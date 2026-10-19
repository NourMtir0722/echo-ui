"use client";

/**
 * The paper road: the two style sheets Make a style with AI hands back
 * drift down to Pick it, and try it on as real paper (Paperlab), and merge into its "Try it on". The visitor watches the mood
 * board's analysis turn into components: mood board, sheets, parts.
 *
 * Carried by the scroll, from where the page rests on Make to where it rests
 * on Pick (`progress`), at a pace it can be seen at (follow.ts): however fast
 * the page steps from one to the other, the flight takes a second or so. The
 * paper takes off from exactly where the page's
 * sheets lay and stays in view while the page moves under it, drifting
 * (drift.ts), Pigment Window behind; the page's own sheets are hidden once
 * the paper is drawn in their place. Leaving Make before it has handed its
 * styles back takes it to its end (DemoCard's FINISH_EVENT), so there is
 * always something to carry. The two land together inside Try it on's panel,
 * with room round them, never over the card. Then the merge plays (`merge`):
 * Pigment Window sinks in behind; each drawn part lifts off the paper, flies
 * to the real component it drew and becomes it, its box with it
 * (journey/blueprint.ts and Pick's `Feel`, matched by `data-part`); with its
 * parts off it, what's printed on the paper fades and the bare paper spreads
 * to fill the panel, which takes on Ink Instrument under it as the paper
 * dissolves; the panel's words print in.
 * Until then the panel waits, empty. Scrolled back up, it comes apart and the
 * paper drifts back; arriving from below, it's simply merged.
 *
 * What the paper carries is pictured from a built copy of the sheets, laid
 * out off screen at Make's size for a moment (sheet-image.ts), so it never
 * depends on how far Make's demo has got.
 *
 * Mounted only where it can run: by the road (Workflow.tsx), on a window wide
 * enough for one card a screen, with motion, and with WebGL. Without it, Try
 * it on is as it always was.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { supportsWebGL } from "paperlab";
import { onFrame } from "@/components/home/frame";
import { frameFor } from "@/components/home/snap";
import { follow, following, type Follow } from "@/components/home/follow";
import { siteTheme } from "@/components/site/site-theme";
import { FINISH_EVENT } from "../DemoCard";
import { StyleSheets } from "../StyleSheets";
import { INK } from "../run";
import { Flight } from "./Flight";
import { drift, HIDDEN, type Place, type Pose } from "./drift";
import { drawnParts, type DrawnPart } from "./drawn-parts";
import { sheetImage, type SheetPicture } from "./sheet-image";

/** Try it on, once the paper has merged into it: in Ink Instrument. */
const MERGED_CSS = siteTheme(INK.seed as Parameters<typeof siteTheme>[0], { selector: "#pick .try[data-merged]" }).css;

/** Pigment Window takes off this much later, as a share of the way. */
const LAG = 0.1;
/** Within this share of the way of either card, the page is resting on it: a glide's last pixels never count as flight. */
const REST = 0.01;
/** Past this share of the way, the visitor has left Make. */
const LEFT = 0.03;
/** Pigment Window's turn as it lies behind (StyleSheets' 2.5°), radians. */
const PIGMENT_TURN = (-2.5 * Math.PI) / 180;
/** Try it on's words, and its parts, that wait for the paper. */
const WORDS = ".try__keys, .try__now, .feel__name, .try__note";
/** Try it on's parts, each in its box: shown only once its drawing has flown into it. */
const PARTS = ".feel__item";
/** The room kept round the two sheets as they lie on Try it on, px. */
const MARGIN = 18;

interface Kit {
  ink: SheetPicture;
  /** Ink Instrument without its drawn parts: the paper they lift off. */
  bare: SheetPicture;
  pigment: SheetPicture;
  parts: DrawnPart[];
  /** Ink Instrument's laid-out width, and Pigment Window's place relative to it, untilted (px). */
  inkW: number;
  pig: { dx: number; dy: number; w: number; h: number };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** The page's elements the road works between. */
function parts() {
  const make = document.getElementById("make");
  const pick = document.getElementById("pick");
  const style = make?.querySelector<HTMLElement>(".mk__style");
  const panel = pick?.querySelector<HTMLElement>(".try");
  if (!make || !pick || !style || !panel) return null;
  return { make, pick, style, panel, pane: panel.parentElement! };
}

/** How much smaller than laid out an element is drawn (a card fitted to a short window). */
const drawnScale = (el: HTMLElement) => el.getBoundingClientRect().width / (el.offsetWidth || 1);

export function PaperRoad() {
  const [ok, setOk] = useState(false);
  const [capture, setCapture] = useState<{ w: number; h: number } | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [flying, setFlying] = useState(false);
  const shot = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const flyingRef = useRef(false);
  const drawn = useRef(false);
  /** How far the flight has got: it follows `progress` at its own pace. */
  const flown = useRef(0);

  // Where it can run, and what it works between.
  useEffect(() => {
    const el = parts();
    if (!el || !supportsWebGL()) return;
    setOk(true);
    setHost(el.pane);
    const size = () => setCapture({ w: el.style.offsetWidth, h: el.style.offsetHeight });
    size();
    // Laid out anew (a resize), the paper is pictured again at the new size.
    let wait = 0;
    let last = `${el.style.offsetWidth}x${el.style.offsetHeight}`;
    const ro = new ResizeObserver(() => {
      const now = `${el.style.offsetWidth}x${el.style.offsetHeight}`;
      if (now === last) return;
      last = now;
      window.clearTimeout(wait);
      wait = window.setTimeout(size, 300);
    });
    ro.observe(el.style);
    return () => {
      ro.disconnect();
      window.clearTimeout(wait);
    };
  }, []);

  // Picture the sheets from the built copy laid out off screen, then let it go.
  useEffect(() => {
    if (!capture) return;
    let gone = false;
    void document.fonts.ready.then(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const root = shot.current;
      if (!root || gone) return;
      const inkEl = root.querySelector<HTMLElement>(".jy-sheet--ink");
      const pigEl = root.querySelector<HTMLElement>(".jy-sheet--pigment");
      if (!inkEl || !pigEl) return;
      pigEl.style.rotate = "0deg";
      const next: Kit = {
        ink: await sheetImage(inkEl),
        bare: await sheetImage(inkEl, { parts: false }),
        pigment: await sheetImage(pigEl),
        parts: drawnParts(inkEl),
        inkW: inkEl.offsetWidth,
        pig: { dx: pigEl.offsetLeft - inkEl.offsetLeft, dy: pigEl.offsetTop - inkEl.offsetTop, w: pigEl.offsetWidth, h: pigEl.offsetHeight },
      };
      if (gone) return;
      setKit(next);
      setCapture(null);
    });
    return () => {
      gone = true;
    };
  }, [capture]);

  /** From where the page rests on Make (0) to where it rests on Pick (1). */
  const progress = useCallback(() => {
    const el = parts();
    if (!el) return 0;
    const s0 = frameFor(el.make, window.scrollY);
    const s1 = frameFor(el.pick, window.scrollY);
    const p = s1 > s0 ? clamp((window.scrollY - s0) / (s1 - s0)) : 0;
    return p < REST ? 0 : p > 1 - REST ? 1 : p;
  }, []);

  /**
   * Where each sheet lands on Try it on: the two together, as they lay in
   * Make, fitted inside the panel with room round them and centred on it, so
   * neither hangs over the card.
   */
  const landing = useCallback(
    (which: 0 | 1): Place | null => {
      const el = parts();
      if (!el || !kit) return null;
      const r = el.panel.getBoundingClientRect();
      const inkH = kit.inkW * kit.ink.aspect;
      // Both sheets' box, in Make's px, from Ink Instrument's top left.
      const x0 = Math.min(0, kit.pig.dx);
      const y0 = Math.min(0, kit.pig.dy);
      const x1 = Math.max(kit.inkW, kit.pig.dx + kit.pig.w);
      const y1 = Math.max(inkH, kit.pig.dy + kit.pig.h);
      const s = Math.min((r.width - 2 * MARGIN) / (x1 - x0), (r.height - 2 * MARGIN) / (y1 - y0));
      const left = r.left + (r.width - (x1 - x0) * s) / 2 - x0 * s;
      const top = r.top + (r.height - (y1 - y0) * s) / 2 - y0 * s;
      if (which === 0) return { x: left + (kit.inkW * s) / 2, y: top + (inkH * s) / 2, w: kit.inkW * s, rz: 0 };
      return { x: left + (kit.pig.dx + kit.pig.w / 2) * s, y: top + (kit.pig.dy + kit.pig.h / 2) * s, w: kit.pig.w * s, rz: PIGMENT_TURN };
    },
    [kit],
  );

  const poseFor = useCallback(
    (which: 0 | 1) => (): Pose => {
      const el = parts();
      const sheet = el?.style.querySelector<HTMLElement>(which === 0 ? ".jy-sheet--ink" : ".jy-sheet--pigment");
      const b = landing(which);
      if (!el || !sheet || !b) return HIDDEN;
      const lag = which === 1 ? LAG : 0;
      const q = clamp((flown.current - lag) / (1 - lag));
      if (q <= 0 || q >= 1) return HIDDEN;
      const r = sheet.getBoundingClientRect();
      const a: Place = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: sheet.offsetWidth * drawnScale(el.style), rz: which === 1 ? PIGMENT_TURN : 0 };
      return drift(q, a, b, which === 1);
    },
    [landing],
  );

  /** Try it on waits for the paper: its words and parts out of sight, in Echo's own look. */
  const empty = useCallback(() => {
    const el = parts();
    if (!el) return;
    timeline.current?.kill();
    timeline.current = null;
    const q = gsap.utils.selector(el.panel);
    gsap.killTweensOf([...q(PARTS), ...q(WORDS)]);
    el.panel.removeAttribute("data-merged");
    if (overlay.current) {
      gsap.killTweensOf(overlay.current.querySelectorAll("*"));
      gsap.set(overlay.current, { autoAlpha: 0 });
    }
    gsap.set(q(WORDS), { autoAlpha: 0 });
    gsap.set(q(PARTS), { autoAlpha: 0, scale: 0.92 });
  }, []);

  /** Try it on as the paper leaves it: merged, every part and word in place. */
  const merged = useCallback(() => {
    const el = parts();
    if (!el) return;
    timeline.current?.kill();
    timeline.current = null;
    const q = gsap.utils.selector(el.panel);
    el.panel.setAttribute("data-merged", "");
    if (overlay.current) gsap.set(overlay.current, { autoAlpha: 0 });
    gsap.set(q(WORDS), { autoAlpha: 1 });
    gsap.set(q(PARTS), { autoAlpha: 1, scale: 1 });
  }, []);

  /** The paper has landed on Try it on, and merges into it. */
  const merge = useCallback(() => {
    const el = parts();
    const box = overlay.current;
    const ink = landing(0);
    const pig = landing(1);
    if (!el || !box || !kit || !ink || !pig) return merged();
    const q = gsap.utils.selector(el.panel);
    // The overlay lives in the pane, laid out unscaled: screen places, back into the pane's own px.
    const o = el.pane.getBoundingClientRect();
    const k = drawnScale(el.pane);
    const local = (x: number, y: number, w: number, h: number) => ({ left: (x - o.left) / k, top: (y - o.top) / k, width: w / k, height: h / k });
    const paper = box.querySelector<HTMLElement>(".jy-merge__paper")!;
    const ground = box.querySelector<HTMLElement>(".jy-merge__ground")!;
    const pigment = box.querySelector<HTMLElement>(".jy-merge__pigment")!;
    const inkH = ink.w * kit.ink.aspect;
    const landed = local(ink.x - ink.w / 2, ink.y - inkH / 2, ink.w, inkH);
    const s = landed.width / kit.inkW;
    const pigH = pig.w * kit.pigment.aspect;
    gsap.set([paper, ground], { ...landed, borderRadius: 6, autoAlpha: 1 });
    gsap.set(pigment, { ...local(pig.x - pig.w / 2, pig.y - pigH / 2, pig.w, pigH), rotate: 2.5, x: 0, y: 0, scale: 1, autoAlpha: 1 });
    const drawnEls = [...box.querySelectorAll<HTMLElement>(".jy-merge__part")];
    for (const d of drawnEls) {
      const p = kit.parts.find((x) => x.part === d.dataset.part)!;
      gsap.set(d, { left: landed.left + p.box.x * s, top: landed.top + p.box.y * s, width: p.box.w * s, height: p.box.h * s, x: 0, y: 0, scale: 1, autoAlpha: 1 });
    }
    gsap.set(box, { autoAlpha: 1 });

    const tl = gsap.timeline();
    const pr = el.panel.getBoundingClientRect();
    // Pigment Window sinks in behind Ink Instrument.
    tl.to(pigment, { x: -24, y: 18, rotate: 0, scale: 0.94, autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, 0.05);
    // Each drawn part lifts off the paper, flies to the component it drew, and becomes it: its box, then the part in it.
    drawnEls.forEach((d, i) => {
      const item = el.panel.querySelector<HTMLElement>(`.feel__item[data-part="${d.dataset.part}"]`);
      const part = item?.firstElementChild as HTMLElement | null;
      if (!item || !part) return;
      tl.add(
        gsap
          .timeline()
          .to(d, { y: -10, scale: 1.04, duration: 0.15, ease: "power2.out" })
          .add(() => {
            const t = part.getBoundingClientRect();
            gsap.to(d, { ...local(t.left, t.top, t.width, t.height), y: 0, scale: 1, duration: 0.55, ease: "power3.inOut" });
          })
          .to(item, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(1.8)" }, 0.6)
          .to(d, { autoAlpha: 0, duration: 0.2 }, 0.6),
        0.1 + i * 0.08,
      );
    });
    // With its parts off it, what's printed on the paper fades where it lies (never stretched), and the bare paper
    // spreads to fill the panel; covered, the panel takes on the style under it, and the paper dissolves into it.
    tl.to(paper, { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 0.15);
    tl.to(ground, { ...local(pr.left, pr.top, pr.width, pr.height), borderRadius: 16, duration: 0.4, ease: "power2.inOut" }, 0.2);
    tl.call(() => el.panel.setAttribute("data-merged", ""), [], 0.6);
    tl.to(ground, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0.75);
    tl.to(q(WORDS), { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 1.2);
    timeline.current = tl;
  }, [kit, landing, merged]);

  // The road, each frame: who is shown where, and what Try it on is doing.
  useEffect(() => {
    if (!kit) return;
    let prev = -1;
    let left = 0;
    let flight: Follow | null = null;
    let lastAt = 0;
    const stop = onFrame((now) => {
      const el = parts();
      if (!el) return;
      const dt = lastAt ? (now - lastAt) / 1000 : 0;
      lastAt = now;
      const scrolled = progress();
      // Leaving Make before it handed its styles back: it's at its end, so there is paper to carry.
      if (scrolled > LEFT && left <= LEFT && prev !== -1) el.make.dispatchEvent(new Event(FINISH_EVENT));
      left = scrolled;
      // Arriving (from above, or below, merged), or far from the road (a jump past it), it's where the scroll is; near,
      // it follows at its own pace.
      const vh = window.innerHeight;
      if (el.pick.getBoundingClientRect().bottom < -vh || el.make.getBoundingClientRect().top > vh * 2) flight = null;
      flight ??= following(scrolled);
      const p = follow(flight, scrolled, dt);
      flown.current = p;
      const inAir = p > 0 && p < 1;
      if (inAir !== flyingRef.current) {
        flyingRef.current = inAir;
        if (!inAir) drawn.current = false;
        setFlying(inAir);
      }
      // The page's own sheets are hidden while their paper is in the air, once the paper is drawn there.
      const qPig = clamp((p - LAG) / (1 - LAG));
      el.style.querySelector(".jy-sheet--ink")?.toggleAttribute("data-away", inAir && drawn.current);
      el.style.querySelector(".jy-sheet--pigment")?.toggleAttribute("data-away", qPig > 0 && qPig < 1 && drawn.current);
      if (prev === -1) {
        if (p >= 1) merged();
        else empty();
      } else if (p >= 1 && prev < 1) merge();
      else if (p < 1 && prev >= 1) empty();
      prev = p;
    });
    return () => {
      stop();
      const el = parts();
      if (!el) return;
      el.style.querySelectorAll(".jy-sheet").forEach((s) => s.removeAttribute("data-away"));
      merged();
      gsap.set([...el.panel.querySelectorAll(PARTS), ...el.panel.querySelectorAll(WORDS)], { clearProps: "opacity,visibility,scale" });
      el.panel.removeAttribute("data-merged");
    };
  }, [kit, progress, merge, merged, empty]);

  if (!ok) return null;
  const sheets = kit
    ? [
        // Pigment Window first: it lies behind.
        { picture: kit.pigment, pose: poseFor(1) },
        { picture: kit.ink, pose: poseFor(0) },
      ]
    : [];
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MERGED_CSS }} />
      {capture &&
        createPortal(
          <div ref={shot} className="jy-capture" style={{ width: capture.w, height: capture.h }} aria-hidden="true" inert>
            <StyleSheets shown />
          </div>,
          document.body,
        )}
      {kit &&
        host &&
        createPortal(
          <div ref={overlay} className="jy-merge" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="jy-merge__pigment" src={kit.pigment.src} alt="" />
            <span className="jy-merge__ground" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="jy-merge__paper" src={kit.bare.src} alt="" />
            {kit.parts.map((d) => (
              <div key={d.part} className="jy-merge__part" data-part={d.part} dangerouslySetInnerHTML={{ __html: d.svg }} />
            ))}
          </div>,
          host,
        )}
      {kit && <Flight sheets={sheets} flying={flying} onDrawn={() => (drawn.current = true)} />}
    </>
  );
}
