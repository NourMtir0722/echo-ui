"use client";

/**
 * Toast — a raised glass slab with a status LED, and
 * the toaster that announces it.
 *
 * Mount `<Toaster>` once around the app, then call `toast({ title })` from
 * `useToast()` anywhere inside it. The toaster's live region is on the page
 * before any message arrives. That's the point: a `role="status"` element
 * created at the same moment as its text is often not announced at all, which
 * is what the old Toast did. Base UI's Toast owns the queue, the timing, the
 * announcement and the keyboard (F6 moves focus into the toasts); Echo owns
 * the look.
 *
 * The toasts pile up like ThrowStack's cards, each one behind a step up and
 * a little smaller, and fan out into a column while the pointer or focus is
 * on them. Flick one away and it keeps the speed you gave it and spins from
 * where you held it (Base UI decides the swipe; Echo carries it on). The
 * dismiss button does the same for a keyboard.
 *
 * `Toast` on its own is the slab, for showing one on a page. It doesn't
 * announce anything.
 */
import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import type { EchoTone } from "echo-ui-core/types";
import { usePressable } from "echo-ui-core/tactile";
import "./toast.css";

/**
 * The subset of Echo's status vocabulary a toast expresses.
 *
 * This used to be `"default" | "active"` — a different vocabulary from
 * Banner's, using one of the same words for a different idea. `"default"`
 * is now `"info"`, which is what it always meant.
 *
 * A subset, not the whole list, for the same reason `size` is `"sm" | "md"`
 * on some components: a toast slab renders one LED, and `warn` and `danger`
 * have no distinct treatment on it yet. Accepting words it cannot express
 * would be a worse lie than not accepting them — a `danger` toast that
 * looked exactly like an `info` one is how a user misses the thing that
 * went wrong. Widening it is a design change, not a rename.
 */
export type ToastTone = Extract<EchoTone, "info" | "active">;

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  body?: string;
  tone?: ToastTone;
}

/** The slab alone, for display. To announce something, use `useToast()`. */
export function Toast({ title, body, tone = "info", className, ...rest }: ToastProps) {
  return (
    <div className={["echo-toast", className].filter(Boolean).join(" ")} data-tone={tone} {...rest}>
      <span className="echo-toast__led" aria-hidden="true" />
      <div className="echo-toast__text">
        <span className="echo-toast__title">{title}</span>
        {body ? <span className="echo-toast__body">{body}</span> : null}
      </div>
    </div>
  );
}

export interface ToasterProps {
  children?: ReactNode;
  /** How long a toast stays, in ms. 0 keeps it until dismissed. Default 6000. */
  timeout?: number;
  /** How many show at once; older ones wait. Default 3. */
  limit?: number;
}

/** Mount once, around the app. Announces every toast from `useToast()` inside it. */
export function Toaster({ children, timeout = 6000, limit = 3 }: ToasterProps) {
  return (
    <BaseToast.Provider timeout={timeout} limit={limit}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="echo-toaster">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  const flick = useFlick();
  // Behind: not the front of the pile. One on its way out no longer counts.
  let shown = 0;
  const behind = new Set(toasts.filter((t) => t.transitionStatus !== "ending" && shown++ > 0).map((t) => t.id));
  // Oldest first, so the newest is painted last, on top of the pile.
  return [...toasts].reverse().map((t) => (
    <BaseToast.Root
      key={t.id}
      toast={t}
      className="echo-toast"
      data-tone={t.type === "active" ? "active" : "info"}
      data-behind={behind.has(t.id) ? "" : undefined}
      {...flick}
    >
      <span className="echo-toast__led" aria-hidden="true" />
      <div className="echo-toast__text">
        <BaseToast.Title className="echo-toast__title" />
        <BaseToast.Description className="echo-toast__body" />
      </div>
      {/*
        Base UI hides the close button from assistive tech until the stack is
        hovered or focused, which suits a collapsed pile of toasts. Echo's
        stack is a plain visible column, so hiding it only left a focusable
        button that a screen reader was told isn't there.
      */}
      <ToastCloseKey />
    </BaseToast.Root>
  ));
}

/**
 * ThrowStack's throw, on a toast. Base UI moves the toast with the finger and
 * decides whether it's dismissed; this adds what a thrown card does: it turns
 * as it's dragged (the other way when held low), and when it goes, it leaves
 * at the speed it was flicked (`--fling-ms`) and keeps turning
 * (`--fling-turn`). Under reduced motion it doesn't turn, and it leaves by
 * fading (toast.css).
 */
function useFlick() {
  const drag = useRef<{ x: number; y: number; flip: number; vx: number; vy: number; t: number; lx: number; ly: number } | null>(
    null,
  );
  const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      // Base UI doesn't swipe from a button; neither does the turn.
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      const r = e.currentTarget.getBoundingClientRect();
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        flip: e.clientY > r.top + r.height / 2 ? -1 : 1,
        vx: 0,
        vy: 0,
        t: performance.now(),
        lx: e.clientX,
        ly: e.clientY,
      };
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const d = drag.current;
      if (!d) return;
      const now = performance.now();
      const dt = Math.max(1, now - d.t);
      d.vx = d.vx * 0.6 + ((e.clientX - d.lx) / dt) * 1000 * 0.4;
      d.vy = d.vy * 0.6 + ((e.clientY - d.ly) / dt) * 1000 * 0.4;
      d.lx = e.clientX;
      d.ly = e.clientY;
      d.t = now;
      if (!still()) e.currentTarget.style.rotate = `${((e.clientX - d.x) * 0.07 * d.flip).toFixed(2)}deg`;
    },
    onPointerUp(e: PointerEvent<HTMLDivElement>) {
      const d = drag.current;
      drag.current = null;
      const el = e.currentTarget;
      el.style.rotate = "";
      if (!d) return;
      // It leaves at the speed it was flicked: a slow push drifts off, a flick is gone.
      const speed = Math.hypot(d.vx, d.vy);
      const ms = Math.round(Math.min(320, Math.max(140, (el.offsetWidth / Math.max(speed, 1)) * 1000)));
      const sideways = Math.abs(e.clientX - d.x) >= Math.abs(e.clientY - d.y);
      el.style.setProperty("--fling-ms", `${ms}ms`);
      el.style.setProperty("--fling-turn", `${sideways ? Math.sign(e.clientX - d.x || 1) * 22 : d.flip * 8}deg`);
    },
    onPointerCancel(e: PointerEvent<HTMLDivElement>) {
      drag.current = null;
      e.currentTarget.style.rotate = "";
    },
  };
}

export interface ToastOptions {
  title: string;
  body?: string;
  /**
   * `active` lights the LED: for something happening, not for emphasis.
   * `info` (the default) is the plain slab.
   */
  tone?: ToastTone;
  /**
   * `high` interrupts what a screen reader is saying; keep it for things that
   * can't wait. Default `low`, announced politely.
   */
  priority?: "low" | "high";
  /** Override the toaster's timeout for this one, in ms. 0 keeps it until dismissed. */
  timeout?: number;
}

/** Returns `toast(options)`, which shows and announces a toast and returns its id. */
export function useToast() {
  const manager = BaseToast.useToastManager();
  return ({ title, body, tone = "info", priority, timeout }: ToastOptions): string =>
    manager.add({ title, description: body, type: tone, priority, timeout });
}

/* The dismiss key presses like the library's keys: a small one, 1px down. */
function ToastCloseKey() {
  const press = usePressable<HTMLButtonElement>({}, { lift: 0, travel: 1, tilt: 0 });
  return (
    <BaseToast.Close className="echo-toast__close" aria-label="Dismiss notification" aria-hidden={false} {...press}>
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </BaseToast.Close>
  );
}
