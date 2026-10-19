"use client";

/**
 * Segmented. Molded segments in a recessed well; the active segment lights as
 * the primary cap. A value
 * selector — a radiogroup with roving focus + arrow-key selection and a select
 * sound on change — distinct from Tabs, which switches content panels.
 *
 * The API mirrors the reference: `options` labels + a numeric selected index.
 *
 * The lit cap is a part you move, not a highlight that jumps. It notices the
 * pointer: hovering the control raises it a little and it leans your way.
 * Pressing an option pops it up out of the well, leaning toward what you
 * pressed; it glides over while lifted, on a real spring, flowing into a
 * drop as it goes — the front swelling round, the tail thinning behind,
 * drawn out by speed — and drops back into the well, a cap again, when it
 * arrives. Choosing again mid-flight bends its path
 * rather than restarting it, and the labels light as it passes under them.
 * Grab the lit cap and it follows the finger, rubber-banding at the ends; let
 * go and it lands on the nearest option, carrying the throw. Before
 * JavaScript (and in forced colors) each option lights itself, as it always
 * did.
 */
import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
} from "react";
import gsap from "gsap";
import type { EchoInterop } from "echo-ui-core/types";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { useSoundOptional } from "echo-ui-core/sound";
import { springs } from "echo-ui-core/motion";
import {
  createLiquid,
  rubberband,
  timing,
  useReducedMotionRef,
  type Liquid,
} from "echo-ui-core/tactile";
import { useControlSize, type ControlSize } from "../size";
import "./segmented.css";

/**
 * A segment: its label, or `{ label, disabled }` to switch one off. Give it
 * `content` and that's what the segment shows (a day and its date, a glyph
 * and a pip), while `label` stays its accessible name.
 */
export type SegmentedOption = string | { label: string; content?: ReactNode; disabled?: boolean };

interface SegmentedOwnProps extends EchoInterop {
  options: SegmentedOption[];
  /** Selected index (controlled). */
  value?: number;
  /** Selected index for the uncontrolled case. Default 0. */
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /**
   * Height on the control scale: `sm` 32px, `md` 44px (default), `lg` 60px,
   * the same as a Field or HardwareButton of that size. Defaults to the
   * nearest SizeProvider's size.
   */
  size?: ControlSize;
}

/**
 * A control has to have a name: `aria-label`, or
 * `aria-labelledby` pointing at visible text. Leaving both out is a type
 * error, so it gets decided rather than forgotten.
 */
type AccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type SegmentedProps = SegmentedOwnProps & AccessibleName;

/*
 * On Base UI's RadioGroup. The hand-rolled
 * version hard-coded arrow directions (wrong in right-to-left), had no way to
 * disable one segment, and gave no segment a tab stop when `value` was out of
 * range, so the control couldn't be reached by keyboard. Base UI handles all
 * three: arrows follow DirectionProvider, disabled segments are skipped, and
 * with nothing selected the first enabled segment takes the tab stop.
 */
/** `forwardRef`, not a `ref` prop — see the note on `Field`. */
export const Segmented = forwardRef<HTMLDivElement, SegmentedProps>(function Segmented(
  {
    options,
    value,
    defaultValue = 0,
    onValueChange,
    size: ownSize,
    disabled,
    onKeyDown: onKeyDownProp,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    ...interop
  },
  ref,
) {
  const sound = useSoundOptional();
  const size = useControlSize(ownSize);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const selected = isControlled ? value : internal;
  const reduced = useReducedMotionRef();
  const root = useRef<HTMLDivElement | null>(null);
  const light = useRef<HTMLSpanElement | null>(null);
  const shape = useRef<HTMLSpanElement | null>(null);
  // The lit cap: one part on a spring (echo-ui-core's liquid engine).
  const liquid = useRef<Liquid | null>(null);
  const placed = useRef(false);
  const grab = useRef<{ offset: number; startX: number; moved: boolean } | null>(null);
  // What the cap is doing, which sets how high it is lifted.
  const hovered = useRef(false);
  const pressing = useRef(false);
  const restRadius = useRef(8);
  // A glide is queued for the beat after the pop; it counts as travelling.
  const queued = useRef(false);

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  /** Every option's box, in the well's own coordinates (they scroll with it). */
  const segments = useCallback(() => {
    const r = root.current;
    if (!r) return [];
    return [...r.querySelectorAll<HTMLElement>('[role="radio"]')].map((el) => ({
      el,
      index: Number(el.dataset.index),
      left: el.offsetLeft,
      width: el.offsetWidth,
      centre: el.offsetLeft + el.offsetWidth / 2,
      top: el.offsetTop,
      height: el.offsetHeight,
      disabled: el.hasAttribute("data-disabled"),
    }));
  }, []);

  /** How high the cap sits: out of the well while pressed, grabbed or
      travelling; a little raised while the pointer is over the control. */
  const lift = useCallback(
    (name: "lift" | "rebound" = "lift", out?: boolean) => {
      const l = light.current;
      if (!l) return;
      const up =
        out ?? Boolean(grab.current || pressing.current || queued.current || liquid.current?.heading != null);
      const level = up ? 1 : hovered.current ? 0.35 : 0;
      if (reduced.current) {
        gsap.set(l, { "--lift": level });
        return;
      }
      gsap.to(l, { ...timing(name), overwrite: "auto", "--lift": level, onUpdate: () => liquid.current?.redraw() });
    },
    [reduced],
  );

  const ensureLiquid = useCallback(() => {
    const l = light.current;
    const sh = shape.current;
    if (liquid.current || !l || !sh) return liquid.current;
    liquid.current = createLiquid({
      el: l,
      shape: sh,
      restRadius: () => restRadius.current,
      // Every frame: the lift, and each label lit by how much of the cap
      // covers it — so a label brightens as the light slides under it.
      onDraw: ({ start, size }) => {
        // Under reduced motion the lift is only light (--lift, its shadow).
        const up = reduced.current ? 0 : Number(gsap.getProperty(l, "--lift")) || 0;
        gsap.set(l, { y: -1.5 * up, scale: 1 + 0.07 * up });
        for (const seg of segments()) {
          const covered = Math.max(0, Math.min(start + size, seg.left + seg.width) - Math.max(start, seg.left));
          seg.el.style.setProperty("--on", (seg.width ? covered / seg.width : 0).toFixed(3));
        }
      },
      // Arrived: set it back down into the well.
      onArrive: () => lift("rebound"),
    });
    return liquid.current;
  }, [lift, reduced, segments]);

  /* Put the cap under the selected option: instantly the first time and on
     resize, on a spring when the selection changes. */
  const place = useCallback(
    (animate: boolean, velocity?: number) => {
      const r = root.current;
      const l = light.current;
      const cap = ensureLiquid();
      if (!r || !l || !cap) return;
      const target = segments().find((s) => s.el.getAttribute("aria-checked") === "true");
      if (!target) {
        gsap.set(l, { autoAlpha: 0 });
        return;
      }
      gsap.set(l, { top: target.top, height: target.height, autoAlpha: 1 });
      restRadius.current = parseFloat(getComputedStyle(target.el).borderTopLeftRadius) || 8;
      const box = { start: target.left, size: target.width };
      if (!animate || !placed.current || reduced.current) {
        cap.place(box, "instant");
        placed.current = true;
        r.setAttribute("data-light", "");
        return;
      }
      // Out of the well first, then over: the glide starts a beat after the
      // pop, so the cap is seen to lift before it moves.
      const already = cap.heading !== null || pressing.current || grab.current;
      queued.current = true;
      lift("lift", true);
      gsap.delayedCall(already ? 0 : 0.07, () => {
        queued.current = false;
        cap.place(box, springs.snappy, velocity);
      });
    },
    [ensureLiquid, lift, reduced, segments],
  );

  useLayoutEffect(() => {
    if (!grab.current) place(true);
  }, [selected, place]);

  useLayoutEffect(() => {
    const r = root.current;
    if (!r) return;
    const resized = new ResizeObserver(() => place(false));
    resized.observe(r);
    const l = light.current;
    return () => {
      resized.disconnect();
      liquid.current?.destroy();
      liquid.current = null;
      placed.current = false;
      if (l) gsap.killTweensOf(l);
    };
  }, [place]);

  /** The pointer, in the well's coordinates. */
  const pointerX = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget;
    return e.clientX - r.getBoundingClientRect().left - r.clientLeft + r.scrollLeft;
  };

  /* Lean the cap toward the pointer: a few px, more toward a pressed option. */
  const lean = (e: PointerEvent<HTMLDivElement>, reach: number) => {
    const l = light.current;
    if (!l || !liquid.current || reduced.current) return;
    const d = pointerX(e) - liquid.current.centre;
    gsap.to(l, { ...timing("follow"), overwrite: "auto", x: Math.max(-reach, Math.min(reach, d * 0.08)) });
  };
  const unlean = () => {
    const l = light.current;
    if (l && !reduced.current) gsap.to(l, { ...timing("rebound"), overwrite: "auto", x: 0 });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const cap = liquid.current;
    if (e.button !== 0 || disabled || !cap) return;
    const option = (e.target as Element).closest('[role="radio"]');
    if (!option || option.hasAttribute("data-disabled")) return;
    pressing.current = true;
    lift();
    if (reduced.current) return;
    if (option.getAttribute("aria-checked") !== "true") {
      lean(e, 10);
      return;
    }
    const x = pointerX(e);
    grab.current = { offset: x - cap.centre, startX: x, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g && e.pointerType === "mouse") lean(e, pressing.current ? 10 : 5);
    const cap = liquid.current;
    if (!g || !cap) return;
    const x = pointerX(e);
    if (Math.abs(x - g.startX) > 4) g.moved = true;
    if (!g.moved) return;
    const all = segments().filter((s) => !s.disabled);
    if (!all.length) return;
    const min = all[0]!.centre;
    const max = all.at(-1)!.centre;
    let to = x - g.offset;
    if (to < min) to = min + rubberband(to - min, 24);
    if (to > max) to = max + rubberband(to - max, 24);
    // Glued to the finger, taking the width of whatever it is over.
    const under = all.reduce((a, b) => (Math.abs(b.centre - to) < Math.abs(a.centre - to) ? b : a));
    cap.follow(to, under.width);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pressing.current = false;
    unlean();
    const g = grab.current;
    grab.current = null;
    const cap = liquid.current;
    if (!g) {
      // A press on another option: its click is about to send the cap over,
      // so it stays lifted; otherwise it settles.
      requestAnimationFrame(() => lift("rebound"));
      return;
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!g.moved || !cap) {
      lift("rebound");
      return;
    }
    // Where the throw was heading, not just where it was let go.
    const velocity = cap.velocity;
    const heading = cap.centre + velocity * 0.12;
    const all = segments().filter((s) => !s.disabled);
    if (!all.length) return;
    const landing = all.reduce((a, b) => (Math.abs(b.centre - heading) < Math.abs(a.centre - heading) ? b : a));
    cap.place({ start: landing.left, size: landing.width }, springs.bouncy, velocity);
    if (landing.index !== selected) {
      landing.el.focus();
      choose(landing.index);
    }
  };

  const choose = (i: number) => {
    if (i === selected) return;
    sound?.play("select");
    if (!isControlled) setInternal(i);
    onValueChange?.(i);
  };

  // Base UI's radio group doesn't handle Home and End; the segmented control
  // always did, so they jump to the first and last segment that's enabled.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler runs first and may take the key for itself.
    onKeyDownProp?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== "Home" && e.key !== "End") return;
    const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([data-disabled])')];
    const target = e.key === "Home" ? radios[0] : radios.at(-1);
    if (!target) return;
    e.preventDefault();
    target.focus();
    choose(Number(target.dataset.index));
  };

  return (
    <BaseRadioGroup
      ref={setRoot}
      className="echo-segmented"
      data-size={size}
      value={selected}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      onValueChange={(next) => choose(next as number)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || disabled) return;
        hovered.current = true;
        lift();
      }}
      onPointerLeave={() => {
        hovered.current = false;
        pressing.current = false;
        unlean();
        lift("rebound");
      }}
      {...interop}
    >
      <span ref={light} className="echo-segmented__light" aria-hidden>
        <span ref={shape} className="echo-segmented__shape" />
      </span>
      {options.map((option, i) => {
        const label = typeof option === "string" ? option : option.label;
        const content = typeof option === "string" ? undefined : option.content;
        return (
          <BaseRadio.Root
            // Keyed by position, not by label: a segment's identity here *is*
            // its index — that's what `value` and `data-index` are — and two
            // options may share a label. Keyed by label, React had two children
            // with the same key, reused one node for another's place and left
            // the third in the DOM, whose stale data-index is what Home and End
            // then read.
            key={i}
            value={i}
            disabled={typeof option === "string" ? undefined : option.disabled}
            className="echo-segmented__option"
            data-index={i}
            data-content={content !== undefined ? "" : undefined}
            aria-label={content !== undefined ? label : undefined}
          >
            {content ?? label}
          </BaseRadio.Root>
        );
      })}
    </BaseRadioGroup>
  );
});
