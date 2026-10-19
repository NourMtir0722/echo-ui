"use client";

/**
 * SoundProvider. Owns the AudioContext lifecycle and all eight
 * required behaviors:
 *   1. Lazy AudioContext — created on first pointerdown (autoplay policy).
 *   2. Master gain — conservative default (0.5 of recipe gains), exposed.
 *   3. Mute — persisted to localStorage ("echo-sound-muted"). A visitor with
 *      no stored choice starts muted: a first visit makes no sound nobody
 *      asked for. `defaultMuted={false}` starts with sound instead.
 *   4. Variation jitter — every play (see backend.jitterRecipe).
 *   5. Blur guard — silent when the tab is hidden or the window is blurred.
 *   6. Reduced-motion coupling — muteOnReducedMotion (default true).
 *   7. Pluggable backend — SynthBackend by default, behind SoundBackend.
 *   8. SSR-safe — no window/AudioContext at module scope; 'use client' here.
 *
 * And haptics (haptics.ts): the sounds that carry one buzz a phone, whether
 * or not sound is on, and `buzz` plays one on its own. `haptics={false}` turns
 * them off.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { noteForPageCheck } from "../check/channel";
import { sound, type SoundName, type SoundRecipe } from "./sound";
import { HAPTIC_FOR_SOUND, vibrate, type HapticName } from "./haptics";
import { SynthBackend, jitterRecipe, type SoundBackend } from "./backend";

const MUTE_KEY = "echo-sound-muted";

export interface PlayOptions {
  /**
   * The haptic to go with it. By default a token plays the one it carries
   * (`select` a tick, `error` an error) and a recipe plays none; name another,
   * or `false` for none.
   */
  haptic?: HapticName | false;
}

export interface SoundContextValue {
  /** Play a token by name, or an ad-hoc recipe object, and the haptic it carries. */
  play: (sound: SoundName | SoundRecipe, options?: PlayOptions) => void;
  /** A haptic on its own, with no sound. */
  buzz: (haptic: HapticName) => void;
  /** User mute preference (does not include the reduced-motion coupling). */
  muted: boolean;
  setMuted: (muted: boolean) => void;
  /** Master gain 0..1, scales every recipe. */
  masterGain: number;
  setMasterGain: (gain: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export interface SoundProviderProps {
  children: ReactNode;
  /** Sound rendering backend. Defaults to the zero-dep WebAudio SynthBackend. */
  backend?: SoundBackend;
  /** Conservative master gain, 0..1. Default 0.5. */
  masterGain?: number;
  /** Silence sound when the OS requests reduced motion. Default true. */
  muteOnReducedMotion?: boolean;
  /**
   * Muted until the person turns sound on, for anyone who hasn't chosen yet.
   * Default true; a stored choice always wins. Pass false for an app where
   * sound is the point from the first press.
   */
  defaultMuted?: boolean;
  /**
   * Buzz a phone for the sounds that carry a haptic: a choice changing, a
   * completion, a warning, an error. Independent of mute, so it works while
   * sound is off. Default true; a device that can't vibrate ignores it.
   */
  haptics?: boolean;
}

export function SoundProvider({
  children,
  backend,
  masterGain: initialMasterGain = 0.5,
  muteOnReducedMotion = true,
  defaultMuted = true,
  haptics = true,
}: SoundProviderProps) {
  const backendRef = useRef<SoundBackend>(backend ?? new SynthBackend());
  useEffect(() => {
    if (backend) backendRef.current = backend;
  }, [backend]);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const [muted, setMutedState] = useState(defaultMuted);
  const [masterGain, setMasterGainState] = useState(initialMasterGain);
  const [reduced, setReduced] = useState(false);

  // (1) Lazily create the AudioContext + master gain on a user gesture.
  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = masterGain;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, [masterGain]);

  useEffect(() => {
    const onPointerDown = () => ensureContext();
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [ensureContext]);

  // The context goes with the provider. One inside a page left an audio
  // thread running for every visit, until the browser made no more.
  useEffect(
    () => () => {
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      masterRef.current = null;
    },
    [],
  );

  // (2) Keep the live master-gain node in sync.
  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = masterGain;
  }, [masterGain]);

  // (3) Hydrate the persisted mute preference (client-only).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MUTE_KEY);
      if (stored !== null) setMutedState(stored === "true");
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    try {
      window.localStorage.setItem(MUTE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  // (6) Track prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const buzz = useCallback(
    (haptic: HapticName) => {
      if (!haptics || typeof document === "undefined") return;
      // The blur guard holds for the hand too: nothing buzzes from a tab you aren't looking at.
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      vibrate(haptic);
    },
    [haptics],
  );

  const play = useCallback(
    (input: SoundName | SoundRecipe, options?: PlayOptions) => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      // Before mute: sound starts off, haptics don't.
      const haptic = options?.haptic ?? (typeof input === "string" ? HAPTIC_FOR_SOUND[input] : undefined);
      if (haptic) buzz(haptic);
      // (3 + 6) Respect mute and the reduced-motion coupling.
      if (muted || (muteOnReducedMotion && reduced)) return;
      // (5) Blur guard.
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;

      const ctx = ensureContext();
      const master = masterRef.current;
      if (!ctx || !master) return;

      const recipe: SoundRecipe = typeof input === "string" ? sound[input] : input;
      // (4) Jitter every play.
      backendRef.current.play(jitterRecipe(recipe), { ctx, destination: master });
    },
    [buzz, ensureContext, muted, muteOnReducedMotion, reduced],
  );

  const value = useMemo<SoundContextValue>(
    () => ({ play, buzz, muted, setMuted, masterGain, setMasterGain: setMasterGainState }),
    [play, buzz, muted, setMuted, masterGain],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within a <SoundProvider>.");
  }
  return ctx;
}

/** What the page check says when a part that makes sound has no provider above it. */
const NO_PROVIDER = {
  rule: "setup",
  key: "setup:sound-provider",
  message:
    "Echo parts on this page make sound and buzz phones, but there's no SoundProvider above them, so they're silent. Wrap the app in `SoundProvider` from `echo-ui-core/sound`; it starts muted until the person turns sound on.",
} as const;

/**
 * Like useSound, but returns null instead of throwing when no provider is
 * present. Every Echo part that makes sound asks through this, so a null here
 * is the one place a missing provider shows: the page check hears about it (in
 * development; nowhere else is listening).
 */
export function useSoundOptional(): SoundContextValue | null {
  const ctx = useContext(SoundContext);
  useEffect(() => {
    if (!ctx) noteForPageCheck(NO_PROVIDER);
  }, [ctx]);
  return ctx;
}
