"use client";

/**
 * Item. The row every list is made of: something to recognise it by
 * (an Avatar, an icon), a title and a line under it, and what trails it (a
 * time, a count, a control). Member lists, file lists, notifications,
 * settings rows. Consecutive Items are ruled by a hairline.
 *
 * `href` or `onClick` makes the row one target (the title is the link,
 * stretched over the row), like an interactive Card.
 *
 * `swipeActions` sit behind the row: swipe it toward the start and they
 * come into view, each a real button. Swipe past the last and let go, and the
 * row springs to hold them open; tap elsewhere or swipe back and it closes.
 * They are never only a gesture: Tab reaches each one, and focusing one
 * slides the row open the same way.
 *
 * The title and description wrap; `truncate` keeps each to one line.
 *
 * Closed: slots are props, `size` is the padding step.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type MouseEventHandler,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createSpring, type Spring } from "echo-ui-core/tactile";
import { useSoundOptional } from "echo-ui-core/sound";
import "./item.css";

export interface ItemAction {
  /** The button's words. Say what it does: "Archive", "Delete file". */
  label: string;
  onSelect: () => void;
}

export interface ItemProps {
  title: ReactNode;
  /** A line under the title. */
  description?: ReactNode;
  /** What you recognise it by, at the start: an Avatar, an icon, or one small control (a done Checkbox), which stays its own target. */
  media?: ReactNode;
  /** What trails it at the end: a time, a CountBadge, a Switch. */
  trailing?: ReactNode;
  /** The whole row goes here. */
  href?: string;
  /** The whole row does this. */
  onClick?: MouseEventHandler<HTMLElement>;
  /** Actions behind the row, revealed by a swipe or by Tab. */
  swipeActions?: ItemAction[];
  /** `sm` for dense lists, `md` (default). */
  size?: "sm" | "md";
  /**
   * One line each for the title and description, ending in an ellipsis, for a
   * list whose rhythm matters more than every word (file names). Off by
   * default: the text wraps, so nothing is lost at a narrow width or zoomed.
   */
  truncate?: boolean;
  /** `li` inside a list (`<Stack as="ul">`), `div` otherwise. Default `div`. */
  as?: "div" | "li";
}

const settle = { duration: 0.42, bounce: 0.18 };

export function Item({
  title,
  description,
  media,
  trailing,
  href,
  onClick,
  swipeActions,
  size = "md",
  truncate = false,
  as: As = "div",
}: ItemProps) {
  const sound = useSoundOptional();
  const surface = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  const openRef = useRef(false);
  const hasActions = !!swipeActions?.length;
  const interactive = href !== undefined || onClick !== undefined;

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Toward the start: left in left-to-right, right in right-to-left.
  const dir = () => (surface.current && getComputedStyle(surface.current).direction === "rtl" ? 1 : -1);
  const width = () => tray.current?.offsetWidth ?? 0;

  useEffect(() => {
    const el = surface.current;
    if (!el || !hasActions) return;
    const row = el.parentElement!;
    spring.current = createSpring(0, settle, (x) => {
      el.style.translate = Math.abs(x) < 0.3 ? "" : `${x.toFixed(1)}px 0`;
      // The tray shows only in the strip the row has slid away from.
      row.style.setProperty("--item-reveal", `${Math.abs(x).toFixed(1)}px`);
    });
    // An action focused before this ran (a fast Tab while the page was still
    // hydrating, focus restored by the browser) opens the row now.
    if (tray.current?.contains(document.activeElement)) {
      openRef.current = true;
      spring.current.set(dir() * width());
    }
    return () => spring.current?.stop();
  }, [hasActions]);

  const moveTo = useCallback((open: boolean, velocity = 0) => {
    openRef.current = open;
    const to = open ? dir() * width() : 0;
    if (reduced()) spring.current?.set(to);
    else spring.current?.to(to, { config: settle, velocity });
  }, []);

  // A swipe: follows the finger (rubber-banding past the tray), then holds
  // open or springs shut depending on how far and how fast it went.
  const drag = useRef<{ x: number; y: number; base: number; t: number; lx: number; v: number; sideways: boolean | null } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!hasActions || e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      base: spring.current?.value ?? 0,
      t: performance.now(),
      lx: e.clientX,
      v: 0,
      sideways: null,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.sideways === null && Math.hypot(dx, dy) > 6) {
      d.sideways = Math.abs(dx) > Math.abs(dy);
      if (d.sideways) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.sideways) return;
    const now = performance.now();
    d.v = d.v * 0.6 + ((e.clientX - d.lx) / Math.max(1, now - d.t)) * 1000 * 0.4;
    d.t = now;
    d.lx = e.clientX;
    const max = width();
    let x = d.base + dx;
    const open = dir() * max;
    // Free between shut and open; past either, it gives less and less.
    const lo = Math.min(0, open);
    const hi = Math.max(0, open);
    if (x < lo) x = lo - Math.sqrt(lo - x) * 3;
    if (x > hi) x = hi + Math.sqrt(x - hi) * 3;
    spring.current?.set(x);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.sideways) return;
    const x = spring.current?.value ?? 0;
    const flung = d.v * dir() > 500;
    const shut = d.v * dir() < -500;
    const open = !shut && (flung || Math.abs(x) > width() / 2);
    if (open !== openRef.current) sound?.play("tap");
    moveTo(open, d.v);
  };
  // A swipe that became a drag isn't also a click on the row.
  const onClickCapture = (e: MouseEvent) => {
    if (Math.abs(spring.current?.value ?? 0) > 4 && !openRef.current) e.stopPropagation();
  };

  // Closes when focus or a tap goes elsewhere.
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!hasActions) return;
    const away = (e: Event) => {
      if (openRef.current && root.current && !root.current.contains(e.target as Node)) moveTo(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
    };
  }, [hasActions, moveTo]);

  const name = !interactive ? (
    title
  ) : href !== undefined ? (
    <a className="echo-item__link" href={href} onClick={onClick}>
      {title}
    </a>
  ) : (
    <button type="button" className="echo-item__link" onClick={onClick}>
      {title}
    </button>
  );

  return (
    <As
      ref={(node: HTMLElement | null) => {
        root.current = node;
      }}
      className="echo-item"
      data-size={size}
      data-truncate={truncate ? "" : undefined}
      data-interactive={interactive ? "" : undefined}
    >
      {hasActions ? (
        <div ref={tray} className="echo-item__tray">
          {swipeActions!.map((a) => (
            <button
              key={a.label}
              type="button"
              className="echo-item__action"
              onFocus={() => moveTo(true)}
              onClick={() => {
                sound?.play("tap");
                a.onSelect();
                moveTo(false);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={surface}
        className="echo-item__surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {media ? <div className="echo-item__media">{media}</div> : null}
        <div className="echo-item__text">
          <span className="echo-item__title">{name}</span>
          {description ? <span className="echo-item__description">{description}</span> : null}
        </div>
        {trailing ? <div className="echo-item__trailing">{trailing}</div> : null}
      </div>
    </As>
  );
}
