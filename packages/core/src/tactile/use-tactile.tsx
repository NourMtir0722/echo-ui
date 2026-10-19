"use client";

/**
 * useTactile — the fusion primitive. One hook binds motion
 * (GSAP) + sound + haptics per interaction phase, and returns
 * handlers + a ref to spread onto an element.
 *
 *   const { ref, handlers } = useTactile({
 *     press:   { motion: "press", sound: "press" },
 *     release: { motion: "pop",   sound: "release" },
 *   });
 *   return <button ref={ref} {...handlers} />;
 *
 * - Keyboard parity: Space/Enter fire the same press/release as pointer.
 * - prefers-reduced-motion collapses motion (per-token, see resolve-motion);
 *   sound follows the SoundProvider's muteOnReducedMotion, so it is not
 *   double-handled here.
 * - Escape hatch: pass raw GSAP vars / sound recipe objects instead of names.
 * - SSR-safe: 'use client', no window access at module scope.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DOMAttributes,
  type RefCallback,
} from "react";
import gsap from "gsap";
import { useSoundOptional, type HapticName, type SoundName, type SoundRecipe } from "../sound";
import { resolveMotion, isActivationKey, type PhaseMotion } from "./resolve-motion";

export interface TactilePhase {
  /** Motion token name, or raw GSAP vars (escape hatch). */
  motion?: PhaseMotion;
  /** Sound token name, or a raw recipe (escape hatch). */
  sound?: SoundName | SoundRecipe;
  /**
   * A haptic for this phase. By default the phase's sound brings the one it
   * carries (see `HAPTIC_FOR_SOUND`); name another, or `false` for none. With
   * no sound, the haptic plays on its own.
   */
  haptic?: HapticName | false;
}

export type TactilePhaseName =
  | "press"
  | "release"
  | "hover"
  | "leave"
  | "focus"
  | "blur"
  | "activate";

export type TactileConfig = Partial<Record<TactilePhaseName, TactilePhase>>;

export interface UseTactileResult<T extends HTMLElement> {
  /** Callback ref to attach to the target element (version-agnostic). */
  ref: RefCallback<T>;
  handlers: DOMAttributes<T>;
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

export function useTactile<T extends HTMLElement = HTMLElement>(
  config: TactileConfig,
): UseTactileResult<T> {
  const elementRef = useRef<T | null>(null);
  const setRef = useCallback<RefCallback<T>>((node) => {
    elementRef.current = node;
  }, []);
  const sound = useSoundOptional();
  const reduced = usePrefersReducedMotion();
  const pressed = useRef(false);

  // Keep latest values addressable from stable handlers.
  const configRef = useRef(config);
  configRef.current = config;
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const run = useCallback((phase: TactilePhaseName) => {
    const cfg = configRef.current[phase];
    if (!cfg) return;
    if (cfg.sound && soundRef.current) soundRef.current.play(cfg.sound, cfg.haptic === undefined ? undefined : { haptic: cfg.haptic });
    else if (cfg.haptic && soundRef.current) soundRef.current.buzz(cfg.haptic);
    const resolved = resolveMotion(phase, cfg.motion, { reduced: reducedRef.current });
    const el = elementRef.current;
    if (resolved && el) {
      gsap.to(el, { overwrite: "auto", ...resolved.vars } as gsap.TweenVars);
    }
  }, []);

  const handlers = useMemo<DOMAttributes<T>>(
    () => ({
      onPointerDown: () => {
        pressed.current = true;
        run("press");
      },
      onPointerUp: () => {
        if (pressed.current) {
          pressed.current = false;
          run("release");
        }
      },
      onPointerEnter: () => run("hover"),
      onPointerLeave: () => {
        if (pressed.current) {
          pressed.current = false;
          run("release");
        }
        run("leave");
      },
      onFocus: () => run("focus"),
      onBlur: () => {
        if (pressed.current) {
          pressed.current = false;
          run("release");
        }
        run("blur");
      },
      onKeyDown: (e) => {
        // Note: do NOT preventDefault on Space — on a native <button> that
        // suppresses the synthesized click. Buttons already swallow Space.
        if (isActivationKey(e.key) && !e.repeat) {
          pressed.current = true;
          run("press");
        }
      },
      onKeyUp: (e) => {
        if (isActivationKey(e.key) && pressed.current) {
          pressed.current = false;
          run("release");
        }
      },
      onClick: () => run("activate"),
    }),
    [run],
  );

  return { ref: setRef, handlers };
}
