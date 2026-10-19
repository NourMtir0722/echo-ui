"use client";

/**
 * PullToRefresh. A scrolling list you can pull down from the top to reload:
 * the content follows your finger with the library's rubber band, a molded
 * key appears above it and turns as you pull, clicks when you pass the detent,
 * and holds there with the Loader's lights while `onRefresh` runs. Then the
 * list springs home.
 *
 * The pull is a gesture, so it is never the only way: the region's first stop
 * is a real Refresh button (shown when focused), and what is happening is said
 * in one status that is on the page from the start.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createSpring, rubberband, useReducedMotionRef, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import { Loader } from "../loader";
import "./pull-to-refresh.css";

export interface PullToRefreshProps {
  /** Reload. The list holds at the detent until the promise settles. */
  onRefresh: () => Promise<unknown> | void;
  /** The scrolling content. */
  children: ReactNode;
  /** What is refreshed, for the button and the status: "Refresh tasks". Default "list". */
  label?: string;
  /** How far to pull, in px, before letting go refreshes. Default 64. */
  threshold?: number;
  /** Turn the gesture off (the button still works). */
  disabled?: boolean;
  className?: string;
}

type Phase = "idle" | "pulling" | "armed" | "refreshing" | "done";

const SLOP = 6;

export function PullToRefresh({
  onRefresh,
  children,
  label = "list",
  threshold = 64,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLSpanElement>(null);
  const spring = useRef<Spring | null>(null);
  const drag = useRef<{ x: number; y: number; engaged: boolean; id: number | "touch" } | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const reduced = useReducedMotionRef();
  const sound = useSoundOptional();

  const draw = useCallback(
    (y: number) => {
      const c = content.current;
      const k = key.current;
      if (c) c.style.translate = y > 0.5 ? `0 ${y.toFixed(1)}px` : "";
      if (k) {
        const p = Math.min(1, y / threshold);
        k.style.setProperty("--ptr-progress", p.toFixed(3));
        k.style.setProperty("--ptr-y", `${y.toFixed(1)}px`);
      }
    },
    [threshold],
  );

  useEffect(() => {
    spring.current = createSpring(0, { duration: 0.42, bounce: 0.18 }, (v) => draw(v));
    return () => spring.current?.stop();
  }, [draw]);

  const go = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const settle = (to: number) => {
    const s = spring.current;
    if (!s) return;
    if (reduced.current) {
      s.set(to);
      draw(to);
    } else s.to(to);
  };

  const refresh = useCallback(async () => {
    if (phaseRef.current === "refreshing") return;
    go("refreshing");
    settle(threshold);
    try {
      await onRefresh();
    } finally {
      go("done");
      settle(0);
      sound?.play("notify");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, threshold, sound]);

  // --- the gesture ------------------------------------------------------------

  const begin = (x: number, y: number, id: number | "touch") => {
    if (disabled || phaseRef.current === "refreshing") return;
    if ((scroller.current?.scrollTop ?? 0) > 0) return;
    spring.current?.stop();
    drag.current = { x, y, engaged: false, id };
  };

  /** Returns true when the move is ours (so the page must not scroll). */
  const move = (x: number, y: number): boolean => {
    const d = drag.current;
    if (!d) return false;
    const dy = y - d.y;
    const dx = x - d.x;
    if (!d.engaged) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return false;
      // Sideways (a swipe on a row) or upward (a scroll): not a pull.
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
        drag.current = null;
        return false;
      }
      d.engaged = true;
      go("pulling");
    }
    const pulled = rubberband(Math.max(0, dy), threshold * 2.2, 0.7);
    spring.current?.set(pulled);
    draw(pulled);
    const armed = pulled >= threshold;
    if (armed && phaseRef.current !== "armed") {
      go("armed");
      sound?.play("select");
    } else if (!armed && phaseRef.current === "armed") go("pulling");
    return true;
  };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.engaged) return;
    if (phaseRef.current === "armed") void refresh();
    else {
      go("idle");
      settle(0);
    }
  };

  // Touch moves need a non-passive listener, or the browser scrolls first.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && e.touches.length === 1) begin(t.clientX, t.clientY, "touch");
    };
    const moveT = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", moveT, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", moveT);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  });

  const status =
    phase === "refreshing" ? `Refreshing ${label}…` : phase === "done" ? `${label[0]!.toUpperCase()}${label.slice(1)} up to date` : "";
  const hint = phase === "armed" ? "Release to refresh" : "Pull to refresh";

  return (
    <div
      ref={scroller}
      className={className ? `echo-ptr ${className}` : "echo-ptr"}
      data-phase={phase}
      // A mouse can pull too (a desktop browser in a phone-sized window, a
      // trackpad click-drag); touch goes through the listeners above.
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
        begin(e.clientX, e.clientY, e.pointerId);
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !drag.current) return;
        if (move(e.clientX, e.clientY) && !e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }}
      onPointerUp={(e) => e.pointerType === "mouse" && end()}
      onPointerCancel={(e) => e.pointerType === "mouse" && end()}
      onClickCapture={(e) => {
        // A pull that ended over a row is not a click on the row.
        if (phaseRef.current !== "idle" && phaseRef.current !== "done") e.stopPropagation();
      }}
    >
      <button type="button" className="echo-ptr__button" onClick={() => void refresh()} disabled={phase === "refreshing"}>
        Refresh {label}
      </button>
      <span className="echo-ptr__status" role="status">
        {status}
      </span>
      <div className="echo-ptr__indicator" aria-hidden="true">
        <span ref={key} className="echo-ptr__key">
          {phase === "refreshing" ? (
            <Loader dot={6} label="" />
          ) : (
            <svg className="echo-ptr__arrow" viewBox="0 0 16 16" width="16" height="16" focusable="false">
              <path d="M8 2.5v10M3.5 8 8 12.5 12.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="echo-ptr__hint">{phase === "refreshing" ? "Refreshing" : hint}</span>
      </div>
      <div ref={content} className="echo-ptr__content">
        {children}
      </div>
    </div>
  );
}
