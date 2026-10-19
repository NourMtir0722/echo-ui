"use client";

/**
 * useWellMotion — a well you type into, answering the hand.
 *
 *   Pressed in: clicking presses the well into the device; it settles a
 *   little shallower while focused and relaxes on a spring when you leave.
 *   Key strike: every key is a small impulse into the surface. A burst stacks
 *   into a faint shiver, deleting lifts the surface, a paste lands heavier.
 *   Weighted caret: the caret glides to each letter, stretches in the
 *   direction it travels, and only blinks once you stop.
 *
 * The well's CSS reads `--well-depth` (0 rest → 1 focused → 1.35 pushed,
 * plus the strike). The component renders two decorative children the hook
 * finds by attribute: `[data-echo-floor]` (the shade the depth darkens) and
 * `[data-echo-caret]` (the drawn caret). While the drawn caret is in charge
 * the well carries `data-caret="drawn"` and its CSS hides the native one.
 *
 * The drawn caret only takes over where it can be placed exactly: a
 * left-to-right, left-aligned `<input>` or `<textarea>` whose selection the
 * page can read (not email or number, which hide it; not password, whose
 * dots the browser draws its own way). A textarea's caret is found line by
 * line with a hidden mirror of its text, wrapped the way it wraps. Anywhere else, and under reduced motion, the native
 * caret stays, and under reduced motion nothing moves at all.
 */
import { useCallback, useRef, type RefCallback } from "react";
import gsap from "gsap";
import { createSpring, type Spring } from "./spring";

/** How hard each kind of edit strikes the surface (spring velocity). */
export function strikeFor(inputType: string): number {
  if (inputType.startsWith("delete")) return -3.2;
  if (inputType === "insertFromPaste" || inputType === "insertFromDrop") return 11;
  return 5.5;
}

/** Impulses stack, so a burst of typing shivers more, but never jumps. */
export function stackStrike(velocity: number, kick: number): number {
  return Math.max(-9, Math.min(14, velocity + kick));
}

/** The caret stretches along its travel with speed (px/s), never squashes. */
export function caretStretch(velocity: number): number {
  return Math.min(5, Math.abs(velocity) / 260);
}

/** Can a drawn caret be placed exactly in this input? */
export function canDrawCaret(input: HTMLInputElement | HTMLTextAreaElement, style: Pick<CSSStyleDeclaration, "direction" | "textAlign">): boolean {
  if (input instanceof HTMLInputElement && input.type === "password") return false;
  if (style.direction === "rtl" || !["start", "left", ""].includes(style.textAlign)) return false;
  try {
    return input.selectionStart !== null;
  } catch {
    return false;
  }
}

/** What a textarea's mirror copies, so it wraps exactly as the textarea does. */
const MIRRORED = [
  "boxSizing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "textTransform", "wordSpacing", "textIndent", "tabSize",
] as const;

/**
 * Attach the well's motion to an element and return what detaches it. The
 * element is the well around an input or textarea, or the input itself when
 * it is its own well (a code window): then it sinks and takes strikes, and
 * keeps the native caret.
 */
export function attachWellMotion(well: HTMLElement): () => void {
  const input = well.matches("input, textarea")
    ? (well as HTMLInputElement | HTMLTextAreaElement)
    : well.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!input || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const off: (() => void)[] = [];
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) => {
    el.addEventListener(type, fn);
    off.push(() => el.removeEventListener(type, fn));
  };
  const springs: Spring[] = [];
  const live = () => !input.disabled && !input.readOnly;

  /* ------------------------------------------------ pressed in + strike */

  let depth = 0;
  let hit = 0;
  const paint = () => {
    // Depth is a sink and a shade, never a scale: a scaled well would report
    // a false size to anything measuring the control inside it.
    gsap.set(well, {
      y: 0.9 * depth + 0.7 * hit,
      "--well-depth": Math.max(0, depth + 0.9 * hit),
    });
  };

  const press = createSpring(0, { duration: 0.34, bounce: 0.18 }, (v) => {
    depth = v;
    paint();
  });
  const strike = createSpring(0, { duration: 0.22, bounce: 0.35 }, (v) => {
    hit = v;
    paint();
  });
  springs.push(press, strike);

  let pushing = false;
  on(well, "pointerdown", () => {
    if (!live()) return;
    pushing = true;
    press.to(1.35, { config: { duration: 0.14, bounce: 0 } });
  });
  const up = () => {
    if (!pushing) return;
    pushing = false;
    press.to(document.activeElement === input ? 1 : 0, { config: { duration: 0.34, bounce: 0.3 } });
  };
  on(document, "pointerup", up);
  on(document, "pointercancel", up);
  on(input, "focus", () => {
    if (!pushing && live()) press.to(1, { config: { duration: 0.3, bounce: 0.18 } });
  });
  on(input, "blur", () => press.to(0, { config: { duration: 0.42, bounce: 0.28 } }));
  on(input, "input", (e) => {
    strike.to(0, { velocity: stackStrike(strike.velocity, strikeFor((e as InputEvent).inputType ?? "")) });
  });

  /* ------------------------------------------------------ weighted caret */

  const caret = well === input ? null : well.querySelector<HTMLElement>("[data-echo-caret]");
  const cs = getComputedStyle(input);
  if (caret && canDrawCaret(input, cs)) {
    const multiline = input instanceof HTMLTextAreaElement;
    const ctx = document.createElement("canvas").getContext("2d");
    const measure = (text: string) => {
      if (!ctx) return 0;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return ctx.measureText(text).width + (parseFloat(cs.letterSpacing) || 0) * text.length;
    };
    const lineHeight = () => parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;

    // Where the caret sits inside the control's own box, before scrolling.
    const inBox = (at: number): { x: number; y: number } => {
      if (!multiline) {
        return {
          x: (parseFloat(cs.paddingLeft) || 0) + measure(input.value.slice(0, at)),
          y: (input.clientHeight - lineHeight()) / 2,
        };
      }
      const mirror = document.createElement("div");
      for (const k of MIRRORED) mirror.style[k] = cs[k];
      Object.assign(mirror.style, {
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        top: "0",
        left: "-9999px",
        width: `${input.clientWidth}px`,
        height: "auto",
        borderWidth: "0",
      });
      mirror.textContent = input.value.slice(0, at);
      const mark = document.createElement("span");
      mark.textContent = input.value.slice(at) || ".";
      mirror.appendChild(mark);
      document.body.appendChild(mirror);
      const pos = { x: mark.offsetLeft, y: mark.offsetTop };
      mirror.remove();
      return pos;
    };

    const target = () => {
      const at = input.selectionEnd ?? input.value.length;
      const inRect = input.getBoundingClientRect();
      const wellRect = well.getBoundingClientRect();
      const p = inBox(at);
      return {
        x: inRect.left - wellRect.left + (parseFloat(cs.borderLeftWidth) || 0) + p.x - input.scrollLeft,
        y: inRect.top - wellRect.top + (parseFloat(cs.borderTopWidth) || 0) + p.y - input.scrollTop,
      };
    };

    // Lines don't glide: a new line is a jump, the way a carriage returns.
    let row = 0;
    const setRow = (y: number) => {
      row = y;
      gsap.set(caret, { y, height: lineHeight() * 0.86, marginTop: lineHeight() * 0.07 });
    };

    const pos = createSpring(0, { duration: 0.16, bounce: 0.12 }, (x, v) => {
      const s = caretStretch(v);
      gsap.set(caret, { x: x - 1 - (v < 0 ? s * 2 : 0), scaleX: 1 + s });
    });
    springs.push(pos);

    well.setAttribute("data-caret", "drawn");
    off.push(() => well.removeAttribute("data-caret"));

    let first = true;
    let blinkTimer = 0;
    const show = (on: boolean) => {
      gsap.killTweensOf(caret, "opacity");
      gsap.set(caret, { opacity: on ? 1 : 0 });
    };
    const blink = () => {
      show(true);
      window.clearTimeout(blinkTimer);
      blinkTimer = window.setTimeout(() => {
        gsap.to(caret, { opacity: 0.15, duration: 0.5, ease: "sine.inOut", repeat: -1, yoyo: true, repeatDelay: 0.1 });
      }, 550);
    };
    off.push(() => window.clearTimeout(blinkTimer));

    let frame = 0;
    const update = () => {
      frame = 0;
      if (document.activeElement !== input) return;
      const { x, y } = target();
      if (first || Math.abs(y - row) > 1) setRow(y);
      if (first) {
        pos.set(x);
        first = false;
      } else pos.to(x);
      if (input.selectionStart === input.selectionEnd) blink();
      else show(false);
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    off.push(() => cancelAnimationFrame(frame));

    on(input, "focus", () => {
      first = true;
      soon();
    });
    on(input, "blur", () => {
      window.clearTimeout(blinkTimer);
      show(false);
    });
    for (const type of ["input", "keydown", "keyup", "pointerup", "scroll", "select"]) on(input, type, soon);
    on(document, "selectionchange", soon);
    // Fonts arriving late move every letter.
    document.fonts?.ready.then(soon).catch(() => {});
    if (document.activeElement === input) soon();
  }

  return () => {
    springs.forEach((s) => s.stop());
    off.forEach((f) => f());
    if (caret) gsap.killTweensOf(caret);
    gsap.set(well, { clearProps: "transform,--well-depth" });
  };
}

/** A ref for the well element; see the module comment. */
export function useWellMotion<T extends HTMLElement = HTMLElement>(): RefCallback<T> {
  const detach = useRef<(() => void) | null>(null);
  return useCallback<RefCallback<T>>((node) => {
    detach.current?.();
    detach.current = node ? attachWellMotion(node) : null;
  }, []);
}
