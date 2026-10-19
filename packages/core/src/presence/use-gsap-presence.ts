"use client";

/**
 * useGsapPresence — the GSAP-exit bridge for Base UI overlays, implemented
 * ONCE and reused by every Base UI wrapper (Modal, Popover, Tooltip, …).
 *
 * Base UI can auto-detect CSS transitions before unmounting, but not JS
 * (GSAP) animations. The contract: pass `actionsRef` + control `open`, and on
 * close run the GSAP exit, THEN call `actions.unmount()` so the element leaves
 * the DOM only after the animation finishes. Enter runs when the popup mounts.
 *
 * Base-UI-agnostic: it only needs an actions object exposing `unmount()`, so
 * the same hook serves Dialog/Popover/Tooltip (cast the ref at the call site).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion, type MotionName, type MotionToken } from "../motion/motion";

export interface PresenceActions {
  unmount: () => void;
}

export interface GsapPresenceConfig {
  /** Motion token for the enter timing. Default "bloom": it grows out of what opened it. */
  enter?: MotionName;
  /**
   * Take over the motion: `enter` runs when the popup mounts, `exit` when it
   * closes (call `done` when finished, and it unmounts). Used by a component
   * whose arrival is its own — a modal — rather than the shared bloom. Under
   * reduced motion these are skipped for the plain fade.
   */
  animate?: PresenceAnimation;
  /** Motion token for the exit timing. Default "summon". */
  exit?: MotionName;
  /** Initial open state. Default false. */
  defaultOpen?: boolean;
  /** Called when the dialog has finished opening (enter animation started). */
  onOpened?: () => void;
}

/** The relevant slice of Base UI's onOpenChange event details. */
export interface PresenceAnimationContext {
  /** The control that opened it, when known. */
  trigger: Element | null;
}

export interface PresenceAnimation {
  enter: (el: HTMLElement, context: PresenceAnimationContext) => void;
  exit: (el: HTMLElement, done: () => void, context: PresenceAnimationContext) => void;
}

export interface PresenceCloseDetails {
  /** Keeps the element mounted after close so a JS exit animation can run. */
  preventUnmountOnClose?: () => void;
  /** The event that opened or closed it (Base UI passes it). */
  event?: Event;
}

export interface GsapPresenceResult {
  open: boolean;
  /** Programmatically open/close (runs the same animations). */
  setOpen: (open: boolean) => void;
  /** Spread onto the Base UI Root: pass open, onOpenChange, actionsRef. */
  actionsRef: React.RefObject<PresenceActions | null>;
  onOpenChange: (nextOpen: boolean, details?: PresenceCloseDetails) => void;
  /** Attach to the animated popup element (Base UI `Popup`). */
  popupRef: (node: HTMLElement | null) => void;
}

function usePrefersReducedMotion(): boolean {
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

const seconds = (ms: number | undefined, fallback = 0.3) => (ms == null ? fallback : ms / 1000);

export function useGsapPresence(config: GsapPresenceConfig = {}): GsapPresenceResult {
  const { enter = "bloom", exit = "summon", animate, defaultOpen = false, onOpened } = config;
  // The control that opened it, handed to a custom animation.
  const trigger = useRef<Element | null>(null);
  const [open, setOpenState] = useState(defaultOpen);
  const actionsRef = useRef<PresenceActions | null>(null);
  const popupEl = useRef<HTMLElement | null>(null);
  const opening = useRef(false);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const runEnter = useCallback(
    (el: HTMLElement) => {
      const token: MotionToken = motion[enter];
      const d = seconds(token.duration);
      gsap.killTweensOf(el);
      gsap.killTweensOf(el.children);
      if (reducedRef.current) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" });
      } else if (animate) {
        animate.enter(el, { trigger: trigger.current });
      } else {
        // It grows out of what opened it (the popup's CSS sets the origin
        // there): solid almost at once, while its size overshoots and settles.
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: Math.min(d, 0.14), ease: "power1.out" });
        gsap.fromTo(el, { scale: 0.9, y: 6 }, { scale: 1, y: 0, duration: d, ease: token.ease });
      }
      onOpened?.();
    },
    [enter, onOpened, animate],
  );

  const runExit = useCallback(
    (el: HTMLElement, done: () => void) => {
      const token: MotionToken = motion[exit];
      const d = seconds(token.duration);
      gsap.killTweensOf(el);
      gsap.killTweensOf(el.children);
      if (reducedRef.current) {
        gsap.to(el, { opacity: 0, duration: 0.12, ease: "none", onComplete: done });
      } else if (animate) {
        animate.exit(el, done, { trigger: trigger.current });
      } else {
        gsap.to(el, {
          opacity: 0,
          scale: 0.98,
          y: 6,
          duration: Math.min(d, 0.22),
          ease: "power2.in",
          onComplete: done,
        });
      }
    },
    [exit, animate],
  );

  // Attach to the popup; run enter the moment Base UI mounts it.
  const popupRef = useCallback(
    (node: HTMLElement | null) => {
      popupEl.current = node;
      if (node && opening.current) {
        opening.current = false;
        runEnter(node);
      }
    },
    [runEnter],
  );

  const close = useCallback((details?: PresenceCloseDetails) => {
    // Ask Base UI to keep the node mounted after close so our GSAP exit can run;
    // we call unmount() ourselves when the animation finishes.
    details?.preventUnmountOnClose?.();
    setOpenState(false);
    const el = popupEl.current;
    const finish = () => actionsRef.current?.unmount();
    if (el) runExit(el, finish);
    else finish();
  }, [runExit]);

  const onOpenChange = useCallback(
    (nextOpen: boolean, details?: PresenceCloseDetails) => {
      if (nextOpen) {
        const target = details?.event?.target;
        trigger.current =
          (target instanceof Element && target.closest("button, a, [role='button']")) ||
          (typeof document !== "undefined" ? document.activeElement : null);
        opening.current = true;
        setOpenState(true);
      } else {
        close(details);
      }
    },
    [close],
  );

  const setOpen = useCallback(
    (next: boolean) => onOpenChange(next),
    [onOpenChange],
  );

  return { open, setOpen, actionsRef, onOpenChange, popupRef };
}
