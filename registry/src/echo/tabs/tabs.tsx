"use client";

/**
 * Tabs. Base UI Tabs behavior (roving focus,
 * arrow-key nav, a11y) skinned as a hardware segmented control, with a lit cap
 * that slides under the active tab and sound.select on change.
 *
 * Compound API: <Tabs><Tabs.List><Tabs.Tab/></Tabs.List><Tabs.Panel/></Tabs>.
 * The sliding Indicator is rendered inside Tabs.List automatically.
 *
 * The lit rail is one part that moves (echo-ui-core's liquid engine): it
 * springs to the tab you open, drawing out with speed, leans toward a tab the
 * pointer is over, and each label brightens as the rail slides under it.
 * Base UI's own indicator draws the rail until the moving one is placed, and
 * in forced colors.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type PointerEvent,
  type MutableRefObject,
} from "react";
import gsap from "gsap";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import { createLiquid, timing, useReducedMotionRef, type Liquid } from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import "./tabs.css";

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ");

/** Narrow Base UI's string-or-function className to a plain string for skinning. */
type Skin<T> = Omit<T, "className"> & { className?: string };

function TabsRoot({ onValueChange, ...props }: ComponentProps<typeof BaseTabs.Root>) {
  const sound = useSoundOptional();
  return (
    <BaseTabs.Root
      onValueChange={(value, eventDetails) => {
        sound?.play("select");
        onValueChange?.(value, eventDetails);
      }}
      {...props}
    />
  );
}

type TabsListProps = Skin<ComponentProps<typeof BaseTabs.List>> & {
  /** How tall each tab is: `sm` 32, `md` 44, `lg` 60px, the control heights. Defaults to the surrounding `SizeProvider`, else `md`. */
  size?: ControlSize;
};

function TabsList({ className, children, ref, size: ownSize, ...props }: TabsListProps) {
  const size = useControlSize(ownSize);
  const reduced = useReducedMotionRef();
  const list = useRef<HTMLDivElement | null>(null);
  const rail = useRef<HTMLSpanElement | null>(null);
  const shape = useRef<HTMLSpanElement | null>(null);
  const liquid = useRef<Liquid | null>(null);

  const setList = useCallback(
    (node: HTMLDivElement | null) => {
      list.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    const l = list.current;
    const el = rail.current;
    const sh = shape.current;
    if (!l || !el || !sh) return;
    const tabs = () => [...l.querySelectorAll<HTMLElement>('[role="tab"]')];
    const cap = createLiquid({
      el,
      shape: sh,
      // A 2px rail has no room to taper, so it says speed by drawing out.
      stretch: 0.6,
      restRadius: () => 1,
      onDraw: ({ start, size }) => {
        for (const t of tabs()) {
          const w = t.offsetWidth;
          const covered = Math.max(0, Math.min(start + size, t.offsetLeft + w) - Math.max(start, t.offsetLeft));
          t.style.setProperty("--on", (w ? covered / w : 0).toFixed(3));
        }
      },
    });
    liquid.current = cap;
    let placed = false;
    const place = (animate: boolean) => {
      const t = l.querySelector<HTMLElement>('[role="tab"][data-active]');
      if (!t) return;
      const box = { start: t.offsetLeft, size: t.offsetWidth };
      if (!animate || !placed || reduced.current) {
        cap.place(box, "instant");
        placed = true;
        l.setAttribute("data-light", "");
        return;
      }
      cap.place(box, springs.snappy);
    };
    place(false);
    const changed = new MutationObserver(() => place(true));
    changed.observe(l, { subtree: true, attributes: true, attributeFilter: ["data-active"] });
    const resized = new ResizeObserver(() => place(false));
    resized.observe(l);
    return () => {
      changed.disconnect();
      resized.disconnect();
      cap.destroy();
      liquid.current = null;
      gsap.killTweensOf(el);
    };
  }, [reduced]);

  /* The rail notices the pointer: it leans toward the tab you are over. */
  const lean = (e: PointerEvent<HTMLDivElement>) => {
    const el = rail.current;
    const cap = liquid.current;
    if (!el || !cap || e.pointerType !== "mouse" || reduced.current) return;
    const t = (e.target as Element).closest<HTMLElement>('[role="tab"]');
    const d = t ? t.offsetLeft + t.offsetWidth / 2 - cap.centre : 0;
    gsap.to(el, { ...timing("follow"), overwrite: "auto", x: Math.max(-10, Math.min(10, d * 0.08)) });
  };

  return (
    <BaseTabs.List
      ref={setList}
      className={cx("echo-tabs__list", className)}
      data-size={size}
      onPointerMove={lean}
      onPointerLeave={() => {
        const el = rail.current;
        if (el && !reduced.current) gsap.to(el, { ...timing("rebound"), overwrite: "auto", x: 0 });
      }}
      {...props}
    >
      {children}
      <BaseTabs.Indicator className="echo-tabs__indicator" />
      <span ref={rail} className="echo-tabs__rail" aria-hidden>
        <span ref={shape} className="echo-tabs__rail-shape" />
      </span>
    </BaseTabs.List>
  );
}

function TabsTab({ className, ...props }: Skin<ComponentProps<typeof BaseTabs.Tab>>) {
  return <BaseTabs.Tab className={cx("echo-tabs__tab", className)} {...props} />;
}

function TabsPanel({ className, ...props }: Skin<ComponentProps<typeof BaseTabs.Panel>>) {
  return <BaseTabs.Panel className={cx("echo-tabs__panel", className)} {...props} />;
}

// Assembled into `Tabs` in index.ts, which isn't a client module.
export { TabsRoot, TabsList, TabsTab, TabsPanel };
