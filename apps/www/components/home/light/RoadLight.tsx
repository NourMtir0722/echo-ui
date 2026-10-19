"use client";

/**
 * The road's light: shades of the seed rising from below its title, climbing
 * the sides, gathering under the sentence and round the first card. Its title
 * sits in the deep part and reads by itself; where a line would ever have the
 * light too bright behind it, the gradient starts lower at that row
 * (ShaderField's guard, by rows), so it never shows as a shape round words.
 *
 * Laid in the page's own layer (`.home-lit`, the window's width), not in the
 * road's section, so nothing hangs out of a narrower box: from a third of a
 * window above the title to past the first card, measured from the title,
 * and again whenever the page changes size.
 *
 * And it follows the scroll a little: going down the page it drifts down
 * against it, going up it drifts back (ROAD.follow), on the homepage's frame
 * after the smooth scroll has moved the page. It's in its place when the
 * first card is framed, and eases off within ROAD.reach of a window either
 * side, so it never wanders into the sections round it. Under reduced motion
 * it stays put.
 */
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { isLightSeed } from "@/components/site/device-seed";
import { onFrame } from "@/components/home/frame";
import { frameFor } from "@/components/home/snap";
import { shades } from "./shades";
import { GRADIENT, ROAD } from "./look";

const ShaderField = dynamic(() => import("./ShaderField").then((m) => m.ShaderField), { ssr: false });

export function RoadLight() {
  const [seed] = useSiteSeed(LANDING_SEED);
  const light = isLightSeed(seed);
  const stops = useMemo(() => shades(seed.accent, GRADIENT.hueDrift, light), [seed.accent, light]);
  /** Where it's written in the road, to find the road and the page's layer from. */
  const anchor = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(anchor.current?.closest<HTMLElement>(".home-lit") ?? null);
  }, []);

  useLayoutEffect(() => {
    const g = glow.current;
    const section = anchor.current?.closest("section");
    if (!g || !host || !section) return;
    const place = () => {
      const title = section.querySelector<HTMLElement>(":scope > .big-title");
      if (!title) return;
      const h = host.getBoundingClientRect();
      const t = title.getBoundingClientRect();
      const vh = window.innerHeight;
      g.style.top = `${Math.round(t.top - h.top - vh * 0.3)}px`;
      g.style.height = `${Math.round(t.height + vh * 1.15)}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(host);
    ro.observe(section);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [host]);

  // Following the scroll: how far the page is from framing the first card, a share of it, eased off
  // toward the reach so it slows to a stop rather than hitting one.
  useEffect(() => {
    const g = glow.current;
    const card = anchor.current?.closest("section")?.querySelector<HTMLElement>(".demo");
    if (!g || !card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = Number.NaN;
    const stop = onFrame(() => {
      const reach = ROAD.reach * window.innerHeight;
      const away = window.scrollY - frameFor(card, window.scrollY);
      const y = Math.round(reach * Math.tanh((away * ROAD.follow) / reach) * 2) / 2;
      if (y !== last) {
        last = y;
        g.style.translate = `0 ${y}px`;
      }
    });
    return () => {
      stop();
      g.style.translate = "";
    };
  }, [host]);

  return (
    <>
      <span ref={anchor} hidden />
      {host &&
        createPortal(
          <div ref={glow} className="hiw__light" aria-hidden="true">
            <ShaderField
              className="hiw__light-field"
              stops={stops}
              amount={ROAD.amount}
              glow={ROAD.glow}
              fade={ROAD.fade}
              drift={GRADIENT.drift}
              size={GRADIENT.size}
              bend={GRADIENT.bend}
              bow={GRADIENT.bow}
              grain={GRADIENT.grain}
              guard=".hiw > .big-title"
            />
          </div>,
          host,
        )}
    </>
  );
}
