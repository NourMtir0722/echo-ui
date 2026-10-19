"use client";

/**
 * Switch. Base UI Switch behavior (role=switch,
 * keyboard, a11y) with a hardware-toggle skin and a click sound on toggle.
 *
 * Sound is driven from onCheckedChange rather than useTactile: Base UI's Root
 * owns the click handler, so wrapping the change callback avoids clobbering it.
 *
 * The knob has mass, and it keeps its shape. Hovered, it pops up out of the
 * track; held, it grows and lifts clear. It can be dragged: it follows the
 * finger along the track, the colour filling in behind it, rubber-banding
 * past the ends — let go past halfway and the switch flips, short of it and
 * the knob springs home. A click throws it across on a spring. The state
 * flips at once either way; only the knob and the light catch up.
 *
 * NOTE: the package is `@base-ui/react`, NOT `@base-ui-components/react`.
 */
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import gsap from "gsap";
import type { EchoChangeEvent, EchoInterop } from "echo-ui-core/types";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import {
  createSpring,
  rubberband,
  timing,
  useReducedMotionRef,
  watchTravel,
  type Spring,
} from "echo-ui-core/tactile";
import "./switch.css";

interface SwitchOwnProps extends EchoInterop {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, eventDetails: EchoChangeEvent) => void;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type SwitchProps = SwitchOwnProps & AccessibleName;

/** `forwardRef`, not a `ref` prop — see the note on `Checkbox`. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { onCheckedChange, ...props },
  ref,
) {
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const root = useRef<HTMLButtonElement | null>(null);
  const thumb = useRef<HTMLSpanElement | null>(null);
  const hovered = useRef(false);
  const held = useRef(false);
  // The knob's offset from where CSS puts it: the rest of a throw still to
  // travel, plus how far the finger has dragged it.
  const lag = useRef<Spring | null>(null);
  const drag = useRef<Spring | null>(null);
  const gesture = useRef<{ startX: number; moved: boolean; pointerId: number } | null>(null);
  const swallowClick = useRef(false);

  const setRoot = useCallback(
    (node: HTMLButtonElement | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [ref],
  );

  /** +1 in left-to-right, -1 in right-to-left: which way "on" is. */
  const direction = () => (root.current && getComputedStyle(root.current).direction === "rtl" ? -1 : 1);

  useEffect(() => {
    const r = root.current;
    const t = thumb.current;
    if (!r || !t) return;
    // Draw the knob, and fill the track behind it: --p is how far toward
    // "on" the knob is, 0–1, so dragging it halfway lights the track halfway.
    const draw = () => {
      const x = (lag.current?.value ?? 0) + (drag.current?.value ?? 0);
      gsap.set(t, { x });
      const on = r.hasAttribute("data-checked") ? 1 : 0;
      const p = Math.min(1, Math.max(0, on + (x * direction()) / 24));
      r.style.setProperty("--p", p.toFixed(3));
    };
    lag.current = createSpring(0, springs.bouncy, draw);
    drag.current = createSpring(0, springs.bouncy, draw);
    const stop = watchTravel({
      part: t,
      frame: r,
      on: r,
      attributes: ["data-checked", "data-unchecked"],
      onMove: (dx) => {
        if (reduced.current || !lag.current) {
          draw();
          return;
        }
        lag.current.shift(dx);
        lag.current.to(0, { config: springs.bouncy });
      },
    });
    return () => {
      stop();
      lag.current?.stop();
      drag.current?.stop();
      gsap.killTweensOf(t);
    };
  }, [reduced]);

  /* The knob's pose. It never deforms: it pops up when hovered, and grows and
     lifts when held. */
  const pose = (name: "lift" | "rebound") => {
    const t = thumb.current;
    if (!t) return;
    const vars = { "--lift": held.current ? 1 : hovered.current ? 0.6 : 0 };
    if (reduced.current) {
      gsap.set(t, vars);
      return;
    }
    gsap.to(t, {
      ...timing(name),
      overwrite: "auto",
      ...vars,
      scale: held.current ? 1.22 : hovered.current ? 1.12 : 1,
    });
  };

  const release = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (held.current) {
      held.current = false;
      pose("rebound");
    }
    if (!g || !drag.current) return;
    if (e.currentTarget.hasPointerCapture(g.pointerId)) e.currentTarget.releasePointerCapture(g.pointerId);
    if (!g.moved) return;
    // Past halfway (or flicked that way) the click that follows flips the
    // switch; short of it, the click is swallowed and the knob goes home.
    const on = e.currentTarget.hasAttribute("data-checked");
    const toward = (drag.current.value + drag.current.velocity * 0.08) * direction();
    const flips = on ? toward < -12 : toward > 12;
    swallowClick.current = !flips;
    drag.current.to(0, { config: springs.bouncy });
  };

  return (
    <BaseSwitch.Root
      ref={setRoot}
      className="echo-switch"
      onCheckedChange={(checked, eventDetails) => {
        sound?.play("tap");
        onCheckedChange?.(checked, eventDetails);
      }}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || props.disabled) return;
        hovered.current = true;
        pose("lift");
      }}
      onPointerLeave={() => {
        hovered.current = false;
        if (!gesture.current) pose("rebound");
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 || props.disabled) return;
        held.current = true;
        swallowClick.current = false;
        pose("lift");
        if (reduced.current) return;
        gesture.current = { startX: e.clientX, moved: false, pointerId: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g || !drag.current) return;
        const dx = e.clientX - g.startX;
        if (Math.abs(dx) > 3) g.moved = true;
        if (!g.moved) return;
        // Free between the two ends; past either, it rubber-bands.
        const on = e.currentTarget.hasAttribute("data-checked");
        const d = direction();
        const lo = on ? -24 : 0;
        const hi = on ? 0 : 24;
        let x = dx * d;
        if (x < lo) x = lo + rubberband(x - lo, 8);
        if (x > hi) x = hi + rubberband(x - hi, 8);
        drag.current.to(x * d, { config: springs.track });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      {...props}
    >
      <BaseSwitch.Thumb ref={thumb} className="echo-switch__thumb" />
    </BaseSwitch.Root>
  );
});
