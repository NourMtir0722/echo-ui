"use client";

/**
 * The foot of the page's light: shades of the seed rising high round its
 * panel, from the bottom and up the sides, the way the road's rises. Nothing
 * to read sits on it (the panel and the crowd stand over it), so it needs no
 * guard. Its shader loads with the page's others, never before first paint.
 *
 * It follows the scroll a little, as the hero's and the road's do: on the
 * way down to the end of the page it sits higher and drifts down against
 * the page (FOOT.follow), easing off within FOOT.reach of a window, and it's
 * in its place when the page has reached its end. It moves inside its own
 * box, so its edges never show. Under reduced motion it stays put.
 */
import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { isLightSeed } from "@/components/site/device-seed";
import { shades } from "./shades";
import { FOOT, GRADIENT } from "./look";

const ShaderField = dynamic(() => import("./ShaderField").then((m) => m.ShaderField), { ssr: false });

export function FootLight() {
  const [seed] = useSiteSeed(LANDING_SEED);
  const light = isLightSeed(seed);
  const stops = useMemo(() => shades(seed.accent, GRADIENT.hueDrift, light), [seed.accent, light]);
  const still = useRef<boolean | null>(null);

  /** How far above its place the light is: how far the page still has to go to its end, a share of it. */
  const foot = () => {
    still.current ??= window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still.current) return 0;
    const reach = FOOT.reach * window.innerHeight;
    const away = window.scrollY - (document.documentElement.scrollHeight - window.innerHeight);
    return Math.round(reach * Math.tanh((Math.min(0, away) * FOOT.follow) / reach) * 2) / 2;
  };

  return (
    <ShaderField
      className="foot__light"
      stops={stops}
      amount={FOOT.amount}
      glow={FOOT.glow}
      fade={FOOT.fade}
      drift={GRADIENT.drift}
      size={GRADIENT.size}
      bend={GRADIENT.bend}
      bow={GRADIENT.bow}
      grain={GRADIENT.grain}
      foot={foot}
    />
  );
}
