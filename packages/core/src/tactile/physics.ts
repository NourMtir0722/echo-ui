"use client";

/**
 * Physics — the shared half of Echo's motion.
 *
 * The rules every moving part follows:
 *   1. Parts have weight: they spring, overshoot a little, and settle.
 *   2. The hand is answered before the click: hover lifts a part toward the
 *      light, a press sinks it, a release springs it back.
 *   3. The hand leads, the material follows: a dragged part trails by a few
 *      milliseconds, and a part that changes position travels there.
 *   4. Light belongs to the part: shadows and highlights move with it.
 *   5. Nothing waits for an animation. State and the accessibility tree update
 *      at once; only the picture catches up. Reduced motion drops the travel.
 *
 * Materials react through CSS custom properties the component's CSS reads:
 * `--lift` (0 rest → 1 raised), `--press` (0 → 1 sunk), `--load` (0 → 1 held
 * past the click), `--mx`/`--my` (where the pointer's light falls, in %). GSAP interpolates them like any property.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DOMAttributes,
  type Ref,
  type RefCallback,
  type RefObject,
} from "react";
import gsap from "gsap";
import { motion, type MotionName } from "../motion/motion";
import { isActivationKey } from "./resolve-motion";
import { createSpring, type Spring } from "./spring";
import { BOTTOM_OUT, LOAD_DEPTH, LOAD_DURATION, PRESS_STROKE, capPose, releaseClick, releaseSpring } from "./press";
import { useSoundOptional } from "../sound";
import { mergeHandlers, mergeRefs } from "./compose";

/** A token's timing as GSAP wants it: seconds and an ease string. */
export function timing(name: MotionName): { duration: number; ease: string } {
  const t: { duration?: number; ease: string } = motion[name];
  return { duration: (t.duration ?? 300) / 1000, ease: t.ease };
}

/** `prefers-reduced-motion: reduce`, live. False on the server. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * The same, readable from event handlers without re-binding them. Read from
 * the media query at once rather than after mount: a part that mounts under
 * the pointer (a pagination cap for the page just reached) must not get one
 * frame of motion the user asked not to see. It feeds no markup, so reading
 * it on the client's first render cannot cause a hydration mismatch.
 */
export function useReducedMotionRef(): RefObject<boolean> {
  const ref = useRef<boolean>(
    typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      ref.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ref;
}

/**
 * Spring a part home from where it just was.
 *
 * The layout has already moved the part (a thumb to its new value, a switch
 * knob to "on"); this puts it back where the eye last saw it and lets it
 * travel the difference. Offsets add to any travel still in flight, so a
 * part that is moved again mid-flight carries on from where it is.
 */
export function travelFrom(
  el: Element,
  offset: { x?: number; y?: number },
  name: MotionName = "travel",
  extra: gsap.TweenVars = {},
): void {
  const vars: gsap.TweenVars = { ...timing(name), overwrite: "auto", ...extra };
  const from: gsap.TweenVars = {};
  if (offset.x) {
    from.x = Number(gsap.getProperty(el, "x")) + offset.x;
    vars.x = 0;
  }
  if (offset.y) {
    from.y = Number(gsap.getProperty(el, "y")) + offset.y;
    vars.y = 0;
  }
  if (!("x" in vars) && !("y" in vars)) return;
  gsap.set(el, from);
  gsap.to(el, vars);
}

/**
 * Watch a part that something else positions (Base UI, a CSS state) and
 * report each move as the distance it jumped, before it is painted — ready to
 * hand to `travelFrom`. `on` is the element whose attributes change; the part
 * is measured against `frame`, and a resize of the frame is not a move.
 */
export function watchTravel({
  part,
  frame,
  on,
  attributes,
  onMove,
}: {
  part: Element;
  frame: Element;
  on: Element;
  attributes: string[];
  onMove: (dx: number, dy: number) => void;
}): () => void {
  const at = () => {
    const p = part.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    return {
      x: f.width ? (p.left + p.width / 2 - f.left) / f.width : 0,
      y: f.height ? (p.top + p.height / 2 - f.top) / f.height : 0,
      w: f.width,
      h: f.height,
    };
  };
  let was = at();
  const moved = new MutationObserver(() => {
    const now = at();
    const dx = (was.x - now.x) * now.w;
    const dy = (was.y - now.y) * now.h;
    was = now;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) onMove(dx, dy);
  });
  moved.observe(on, { attributes: true, attributeFilter: attributes });
  const resized = new ResizeObserver(() => {
    was = at();
  });
  resized.observe(frame);
  return () => {
    moved.disconnect();
    resized.disconnect();
  };
}

/**
 * Power a readout on the first time it scrolls into view: sets `data-boot`
 * on the element, which its CSS animates. A readout already on screen when
 * the page loads is left alone — it is on, and cycling it would be a flicker.
 * Without JavaScript, or under reduced motion, nothing is ever set and the
 * readout simply shows.
 */
export function useBootOnView<T extends HTMLElement>(): RefCallback<T> {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback<RefCallback<T>>((node) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let first = true;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (first) {
          first = false;
          if (entry.isIntersecting) {
            seen.disconnect();
            return;
          }
          node.setAttribute("data-boot", "off");
          return;
        }
        if (entry.isIntersecting) {
          node.setAttribute("data-boot", "on");
          seen.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    seen.observe(node);
    cleanup.current = () => seen.disconnect();
  }, []);
}

/* -------------------------------------------------------------- the cap */

export interface CapPhysicsOptions {
  /** How far a hovered cap rises, px. */
  lift?: number;
  /** How far a pressed cap travels down, px. The cap's seam should match. */
  travel?: number;
  /** How far the cap leans toward the pointer, degrees. 0 to stay flat. */
  tilt?: number;
  /**
   * The hit travels into the device: on each bottom-out the cap's parent (its
   * well) dips and rings. Its CSS reads `--impact` (1 at the hit → 0). For
   * the one action a screen is built around, not for every key.
   */
  impact?: boolean;
  /**
   * Click when the mechanism does: `press` as the cap lands on its seam,
   * `release` as it comes home through rest, pitched up the longer it was
   * held. Needs a SoundProvider; without one it is silent.
   */
  sound?: boolean;
}

export interface CapPhysics<T extends HTMLElement> {
  ref: RefCallback<T>;
  handlers: DOMAttributes<T>;
  /** Drive the press from elsewhere (a real key going down). */
  press: () => void;
  release: () => void;
}

/**
 * A molded cap under a hand. It rises and catches the light on hover and
 * leans toward the pointer. Pressed, it works like a key switch (see
 * press.ts): it resists, gives at the threshold and lands on its seam, keeps
 * loading while held, and comes home faster than it went down, harder the
 * longer it was held. A quick tap still makes the whole stroke. Space and
 * Enter press it the way a pointer does.
 *
 * The CSS reads `--lift`, `--press` (clamped to the seam) and `--load` (0..1,
 * held past the click).
 */
export function useCapPhysics<T extends HTMLElement = HTMLElement>(
  options: CapPhysicsOptions = {},
): CapPhysics<T> {
  const { lift = 1.5, travel = 3, tilt = 5 } = options;
  const el = useRef<T | null>(null);
  const reduced = useReducedMotionRef();
  const soundCtx = useSoundOptional();
  const player = useRef(soundCtx);
  player.current = soundCtx;
  const opts = useRef(options);
  opts.current = { ...options, lift, travel, tilt };

  const st = useRef({ h: 0, d: 0, load: 0, down: false, bottomed: false, queued: false, home: true, lastLoad: 0 });
  const stroke = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const hover = useRef<Spring | null>(null);
  const depth = useRef<Spring | null>(null);

  const draw = useCallback(() => {
    const node = el.current;
    if (!node) return;
    const { h, d, load } = st.current;
    const o = opts.current;
    // Loading sinks the cap past its travel; capPose keeps --press on the seam.
    const pose = capPose(h, d + LOAD_DEPTH * load, o.lift ?? 1.5, o.travel ?? 3);
    // Under reduced motion the light still answers, but nothing travels.
    const vars: gsap.TweenVars = { "--lift": pose.lift, "--press": pose.press, "--load": load };
    if (!reduced.current) vars.y = pose.y;
    gsap.set(node, vars);
  }, [reduced]);

  const topOut = (load: number) => {
    if (opts.current.sound) player.current?.play(releaseClick(load));
  };

  const ensureSprings = () => {
    if (!hover.current) {
      hover.current = createSpring(st.current.h, { duration: 0.32, bounce: 0.2 }, (v) => {
        st.current.h = v;
        draw();
      });
    }
    if (!depth.current) {
      depth.current = createSpring(st.current.d, { duration: 0.2, bounce: 0 }, (v, velocity) => {
        const s = st.current;
        s.d = v;
        if (!s.down && !s.home && v <= 0.02 && velocity < 0) {
          s.home = true;
          topOut(s.lastLoad);
        }
        draw();
      });
    }
  };

  const ref = useCallback<RefCallback<T>>((node) => {
    // Handed the same node again (a merged ref rebuilt on render): it is
    // already set up, and resetting it would drop the cap mid-press.
    if (node === el.current) return;
    el.current = node;
    if (node) gsap.set(node, { transformPerspective: 600, "--lift": 0, "--press": 0, "--load": 0 });
  }, []);

  useEffect(() => () => {
    hover.current?.stop();
    depth.current?.stop();
    stroke.current?.kill();
    if (el.current) gsap.killTweensOf(el.current);
  }, []);

  const inert = () => !el.current || el.current.matches(":disabled, [aria-disabled='true']");

  const shock = () => {
    const body = el.current?.parentElement;
    if (!body || reduced.current) return;
    gsap.fromTo(
      body,
      { y: 0 },
      {
        keyframes: [
          { y: 1.2, duration: 0.035, ease: "power2.out" },
          { y: 0, duration: 0.42, ease: "elastic.out(1, 0.5)" },
        ],
        overwrite: "auto",
      },
    );
    gsap.fromTo(body, { "--impact": 1 }, { "--impact": 0, duration: 0.45, ease: "power2.out" });
  };

  const letGo = () => {
    const s = st.current;
    stroke.current?.kill();
    s.down = false;
    s.lastLoad = s.load;
    if (reduced.current) {
      s.d = 0;
      s.load = 0;
      draw();
      s.home = true;
      topOut(s.lastLoad);
      return;
    }
    ensureSprings();
    // The loaded fraction becomes depth, so the spring starts from where the
    // cap really is.
    const from = s.d + LOAD_DEPTH * s.load;
    s.load = 0;
    const { config, velocity } = releaseSpring(s.lastLoad);
    depth.current!.set(from);
    depth.current!.to(0, { config, velocity });
  };

  const bottomOut = () => {
    const s = st.current;
    s.bottomed = true;
    if (opts.current.sound) player.current?.play("press");
    if (opts.current.impact) shock();
    if (s.queued) {
      s.queued = false;
      letGo();
    }
  };

  const press = useCallback(() => {
    const node = el.current;
    const s = st.current;
    if (!node || inert() || s.down) return;
    s.down = true;
    s.bottomed = false;
    s.queued = false;
    s.home = false;
    s.load = 0;
    depth.current?.stop();
    stroke.current?.kill();
    if (reduced.current) {
      s.d = 1;
      draw();
      bottomOut();
      return;
    }
    const tl = gsap.timeline({ onUpdate: draw });
    PRESS_STROKE.forEach((k, i) =>
      tl.to(s, { d: k.d, duration: k.duration, ease: k.ease, onComplete: i === BOTTOM_OUT ? bottomOut : undefined }),
    );
    // Held past the click, it keeps loading.
    tl.to(s, { load: 1, duration: LOAD_DURATION, ease: "power1.out" });
    stroke.current = tl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, reduced]);

  const release = useCallback(() => {
    const s = st.current;
    if (!s.down) return;
    // A tap shorter than the stroke still makes the whole stroke: the click
    // always happens, and bottomOut() lets go the moment it has.
    if (!s.bottomed) {
      s.queued = true;
      return;
    }
    letGo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlers = useMemo<DOMAttributes<T>>(
    () => ({
      onPointerEnter: (e) => {
        if (e.pointerType !== "mouse" || inert()) return;
        if (reduced.current) {
          st.current.h = 1;
          draw();
          return;
        }
        ensureSprings();
        hover.current!.to(1);
      },
      onPointerMove: (e) => {
        const node = el.current;
        if (!node || e.pointerType !== "mouse" || reduced.current || inert()) return;
        const r = node.getBoundingClientRect();
        const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        const t = opts.current.tilt ?? 5;
        gsap.to(node, {
          ...timing("light"),
          overwrite: "auto",
          rotationY: (nx - 0.5) * 2 * t,
          rotationX: -(ny - 0.5) * 2 * t * 0.6,
          "--mx": `${nx * 100}%`,
          "--my": `${ny * 100}%`,
        });
      },
      onPointerLeave: () => {
        release();
        const node = el.current;
        if (reduced.current) {
          st.current.h = 0;
          draw();
          return;
        }
        ensureSprings();
        hover.current!.to(0);
        if (node) gsap.to(node, { duration: 0.5, ease: "power3.out", overwrite: "auto", rotationX: 0, rotationY: 0 });
      },
      onPointerDown: (e) => {
        if (e.button === 0) press();
      },
      onPointerUp: () => release(),
      onPointerCancel: () => release(),
      onBlur: () => release(),
      onKeyDown: (e) => {
        if (isActivationKey(e.key) && !e.repeat) press();
      },
      onKeyUp: (e) => {
        if (isActivationKey(e.key)) release();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [press, release],
  );

  return { ref, handlers, press, release };
}

/**
 * useCapPhysics for a part that takes the caller's props (a Base UI trigger
 * or close): returns the ref and handlers to spread after them, each already
 * merged with the caller's own, so both hear the pointer.
 *
 *   <Drawer.Close {...props} {...usePressable(props, { travel: 1.5 })} />
 */
export function usePressable<T extends HTMLElement = HTMLElement>(
  props: { ref?: Ref<T> } & object,
  options: CapPhysicsOptions = {},
): DOMAttributes<T> & { ref: RefCallback<T> } {
  const cap = useCapPhysics<T>(options);
  const capRef = cap.ref;
  const outer = props.ref;
  const ref = useMemo(() => mergeRefs(outer, capRef), [outer, capRef]);
  return { ref, ...mergeHandlers(cap.handlers, props as Record<string, unknown>) };
}
