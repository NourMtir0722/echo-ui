"use client";

/**
 * TabBar. A phone app's bottom navigation, drawn as a dock: a molded slab
 * that floats clear of the screen's edges, a recessed track along it, and one
 * raised cap seated in the track under the destination you're on. Every
 * destination has an LED socket; only the current one is lit, and its icon
 * with it. A count sits on any that has news.
 *
 * The cap is a part that moves, not a highlight that jumps: go somewhere else
 * and it lifts out of the track, travels there on a spring (flowing into a
 * drop on the way, echo-ui-core's liquid engine), and settles back in. The
 * labels brighten as it passes under them. Before JavaScript, in forced
 * colours and under reduced motion, the current destination draws its own
 * cap and nothing travels.
 *
 * A `nav` landmark; the current link has `aria-current="page"`. Closed and
 * data-driven, with `renderLink` for your router. It sits above the home
 * indicator (safe area). Four or five destinations; more belong in SideNav.
 */
import { useCallback, useLayoutEffect, useRef, type ReactElement, type ReactNode } from "react";
import gsap from "gsap";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import { createLiquid, timing, useReducedMotionRef, type Liquid } from "echo-ui-core/tactile";
import "./tab-bar.css";

export interface TabBarItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

export interface TabBarLinkProps {
  href: string;
  className: string;
  "aria-current"?: "page";
  children: ReactNode;
  onClick?: () => void;
}

export interface TabBarProps {
  /** Names the navigation landmark. */
  label: string;
  items: TabBarItem[];
  /** The href of the page you're on. */
  current?: string;
  /** Pinned to the bottom of the viewport (default), or in the flow. */
  fixed?: boolean;
  renderLink?: (props: TabBarLinkProps) => ReactElement;
}

export function TabBar({ label, items, current, fixed = true, renderLink }: TabBarProps) {
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const track = useRef<HTMLDivElement | null>(null);
  const cap = useRef<HTMLSpanElement | null>(null);
  const shape = useRef<HTMLSpanElement | null>(null);
  const liquid = useRef<Liquid | null>(null);
  const placed = useRef(false);

  /** Every destination's box, in the track's own coordinates. */
  const slots = useCallback(() => {
    const t = track.current;
    if (!t) return [];
    return [...t.querySelectorAll<HTMLElement>(".echo-tab-bar__link")].map((el) => ({
      el,
      left: el.offsetLeft,
      width: el.offsetWidth,
      top: el.offsetTop,
      height: el.offsetHeight,
      here: el.getAttribute("aria-current") === "page",
    }));
  }, []);

  /** Out of the track while it travels; seated when it arrives. */
  const lift = useCallback(
    (up: boolean) => {
      const c = cap.current;
      if (!c) return;
      if (reduced.current) {
        gsap.set(c, { "--lift": 0 });
        return;
      }
      gsap.to(c, {
        ...timing(up ? "lift" : "rebound"),
        overwrite: "auto",
        "--lift": up ? 1 : 0,
        onUpdate: () => liquid.current?.redraw(),
      });
    },
    [reduced],
  );

  const ensureLiquid = useCallback(() => {
    const c = cap.current;
    const s = shape.current;
    if (liquid.current || !c || !s) return liquid.current;
    liquid.current = createLiquid({
      el: c,
      shape: s,
      restRadius: () => parseFloat(getComputedStyle(s).borderTopLeftRadius) || 16,
      // Every frame: the lift, and each label lit by how much of the cap is under it.
      onDraw: ({ start, size }) => {
        const up = reduced.current ? 0 : Number(gsap.getProperty(c, "--lift")) || 0;
        gsap.set(c, { y: -2 * up });
        for (const slot of slots()) {
          const covered = Math.max(0, Math.min(start + size, slot.left + slot.width) - Math.max(start, slot.left));
          slot.el.style.setProperty("--on", (slot.width ? covered / slot.width : 0).toFixed(3));
        }
      },
      onArrive: () => lift(false),
    });
    return liquid.current;
  }, [lift, reduced, slots]);

  /* Seat the cap under the current destination: instantly the first time and
     on resize, on a spring when you go somewhere else. */
  const place = useCallback(
    (animate: boolean) => {
      const t = track.current;
      const c = cap.current;
      const engine = ensureLiquid();
      if (!t || !c || !engine) return;
      const target = slots().find((s) => s.here);
      if (!target) {
        gsap.set(c, { autoAlpha: 0 });
        t.removeAttribute("data-cap");
        for (const slot of slots()) slot.el.style.removeProperty("--on");
        return;
      }
      gsap.set(c, { top: target.top, height: target.height, autoAlpha: 1 });
      const box = { start: target.left, size: target.width };
      if (!animate || !placed.current || reduced.current) {
        engine.place(box, "instant");
        placed.current = true;
        t.setAttribute("data-cap", "");
        return;
      }
      // Up out of the track first, then over: the glide starts a beat after
      // the lift, so the cap is seen to leave its seat before it moves.
      lift(true);
      gsap.delayedCall(engine.heading !== null ? 0 : 0.06, () => engine.place(box, springs.snappy));
    },
    [ensureLiquid, lift, reduced, slots],
  );

  useLayoutEffect(() => {
    place(true);
  }, [current, place]);

  useLayoutEffect(() => {
    const t = track.current;
    if (!t) return;
    const resized = new ResizeObserver(() => place(false));
    resized.observe(t);
    const c = cap.current;
    return () => {
      resized.disconnect();
      liquid.current?.destroy();
      liquid.current = null;
      placed.current = false;
      if (c) gsap.killTweensOf(c);
    };
  }, [place]);

  return (
    <nav className="echo-tab-bar" aria-label={label} data-fixed={fixed ? "" : undefined}>
      <div className="echo-tab-bar__dock">
        {/* The cap sits in the track beside the list, never inside it: a list holds only its items. */}
        <div ref={track} className="echo-tab-bar__track">
          <span ref={cap} className="echo-tab-bar__cap" aria-hidden="true">
            <span ref={shape} className="echo-tab-bar__shape" />
          </span>
          <ul className="echo-tab-bar__list">
            {items.map((item) => {
              const here = item.href === current;
              const props: TabBarLinkProps = {
                href: item.href,
                className: "echo-tab-bar__link",
                ...(here ? { "aria-current": "page" as const } : {}),
                onClick: () => sound?.play("tap"),
                children: (
                  <>
                    <span className="echo-tab-bar__led" aria-hidden="true" />
                    <span className="echo-tab-bar__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.badge ? (
                      <span className="echo-tab-bar__badge" aria-hidden="true">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                    <span className="echo-tab-bar__label">{item.label}</span>
                    {item.badge ? <span className="echo-tab-bar__sr">, {item.badge} new</span> : null}
                  </>
                ),
              };
              return <li key={item.href}>{renderLink ? renderLink(props) : <a {...props} />}</li>;
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
