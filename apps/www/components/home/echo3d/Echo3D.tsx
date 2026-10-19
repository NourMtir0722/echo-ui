"use client";

/**
 * Echo in 3D, travelling the homepage with the scroll and piling up with its
 * crowd at the foot of it (stage.ts). Where there's no WebGL, the flat guide
 * does the same journey with the drawing (Guide.tsx), and without JavaScript
 * Echo stays home on the hero's bench.
 *
 * three.js and the model load once the page is up and the browser is idle, so
 * the first screen never waits for them: until the stage has drawn, the
 * drawing at home is Echo.
 *
 * Decorative: the canvas is hidden from assistive technology and never in a
 * pointer's way. Presses reach it from the window, and only the ones that
 * land on nothing usable.
 */
import { useEffect, useRef, useState } from "react";
import { useSoundOptional } from "echo-ui-core/sound";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { Guide, GUIDE_EVENT } from "@/components/home/Guide";
import { RELIGHT_EVENT } from "@/components/home/journey/wear";
import type { DrawnPose, Stage } from "./stage";
import { loadIsland } from "@/components/supporters/live";

/**
 * Runs `fn` once the page has loaded and the browser has a moment, so three.js
 * and the model never compete with the first paint or with hydration. Until
 * then the device's own drawing is Echo, at home.
 */
function whenIdle(fn: () => void): () => void {
  let id = 0;
  let timer = 0;
  // Safari before 18 has no requestIdleCallback: a short wait after load stands in for it.
  const ric = (window as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  const idle = () => {
    if (ric) id = ric(fn, { timeout: 2500 });
    else timer = window.setTimeout(fn, 600);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    if (id) window.cancelIdleCallback?.(id);
    window.clearTimeout(timer);
  };
}

/** The model, made in Blender by scripts/echo-3d/model.py. */
const MODEL = "/models/echo.glb";

export function Echo3D({
  onAwayChange,
  onHomeChange,
  onPose,
}: {
  onAwayChange: (away: boolean) => void;
  /** Echo is sitting at home (true) or out on the page, while the 3D stage draws it. */
  onHomeChange?: (home: boolean) => void;
  /** Where Echo is drawn, every frame it's drawn. */
  onPose?: (pose: DrawnPose) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Stage | null>(null);
  const [flat, setFlat] = useState(false);
  const [seed] = useSiteSeed(LANDING_SEED);
  const sound = useSoundOptional();
  const play = useRef(sound?.play);
  play.current = sound?.play;
  const away = useRef(onAwayChange);
  away.current = onAwayChange;
  const home = useRef(onHomeChange);
  home.current = onHomeChange;
  const pose = useRef(onPose);
  pose.current = onPose;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let gone = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The heap's supporters come from the supporters server, asked while the stage loads.
    const start = () =>
      Promise.all([import("./stage"), loadIsland()])
        .then(([{ createStage }, island]) =>
          createStage({
            canvas: el,
            model: MODEL,
            reduced,
            cheerEvent: GUIDE_EVENT,
            onAway: (a) => {
              document.documentElement.toggleAttribute("data-echo3d", a);
              away.current(a);
            },
            play: (s) => play.current?.(s),
            onHome: (h) => home.current?.(h),
            // Only where something's listening: the homepage's frames don't pay for it.
            onPose: pose.current ? (p) => pose.current?.(p) : undefined,
            supporters: island.supporters.map(({ id, name }) => ({ id, name })),
          }),
        )
        .then((s) => {
          if (gone) s.destroy();
          else stage.current = s;
        })
        .catch(() => {
          // No WebGL (or the model didn't load): the drawing makes the journey instead.
          if (!gone) setFlat(true);
        });
    const cancel = whenIdle(() => {
      if (!gone) void start();
    });
    return () => {
      gone = true;
      cancel();
      stage.current?.destroy();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    stage.current?.relight();
  }, [seed]);


  // The page put a style on for a while, or took it off (journey/wear.ts): read its colours again.
  useEffect(() => {
    const relight = () => stage.current?.relight();
    window.addEventListener(RELIGHT_EVENT, relight);
    return () => window.removeEventListener(RELIGHT_EVENT, relight);
  }, []);

  if (flat) return <Guide onAwayChange={onAwayChange} />;
  return <canvas ref={canvas} className="echo3d" aria-hidden="true" />;
}
