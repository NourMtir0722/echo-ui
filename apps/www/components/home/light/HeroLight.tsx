"use client";

/**
 * The hero's light: an arch, half a circle of light standing on the card's
 * bottom edge and rising behind the device, wide and low, shaded like the
 * foot of the page (deep at its rim, pale at its core). It sits inside the
 * card, on its ground and under its grid, words and device.
 *
 * The hero is the page's first paint, and its budget has none to spare: the
 * shader loads once the browser is idle, and until it has drawn, a CSS arch
 * in the same place stands in (landing.css, `.hero4::before`). Its text is
 * kept readable line by line (ShaderField's guard): the light thins back to
 * the ground round any line it would reach too brightly.
 *
 * As the page opens it rises into place from just below the card's edge, the
 * way the sun comes up: its rim first, its core last. One clock for both, the
 * stand-in's (`--hero-in`, landing.css), so the shader can take over halfway
 * up and carry on from the same height. Then it follows the scroll a little,
 * as the road's light does: going down the page it drifts down against it,
 * behind the card's edge (HERO.follow), and back up as you return.
 *
 * And the card's contour forms with the scroll: at the top of the page the
 * hero is plain, so its light floats free, and a third of a window down its
 * border and its own ground have faded in (`--hero-frame`, landing.css).
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSeed } from "@/components/site/theme-store";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { isLightSeed } from "@/components/site/device-seed";
import { shades } from "./shades";
import { GRADIENT, HERO } from "./look";

const ShaderField = dynamic(() => import("./ShaderField").then((m) => m.ShaderField), { ssr: false });

/** The text on the light. Not the command: on the light it's a frosted pane of its own (landing.css). */
const TEXT = ".hero4__word, .hero4__small, .hero4__lede, .hero4__links, .hero4__brand, .hero4__support";
/** How far below the card's edge the rise starts, in the arch's own heights: its rim just out of sight. */
const RISE_FROM = 1 + HERO.edge;

export function HeroLight() {
  const [seed] = useSiteSeed(LANDING_SEED);
  const light = isLightSeed(seed);
  const stops = useMemo(() => shades(seed.accent, GRADIENT.hueDrift, light), [seed.accent, light]);
  const layer = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const still = useRef<boolean | null>(null);
  const risen = useRef(false);

  /** Where the arch's foot is now, below the card's edge: on its way up, and as the page scrolls on. */
  const foot = () => {
    const card = layer.current?.closest<HTMLElement>(".hero4");
    if (!card) return 0;
    still.current ??= window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still.current) return 0;
    let up = 1;
    if (!risen.current) {
      const n = parseFloat(getComputedStyle(card, "::before").getPropertyValue("--hero-in"));
      up = Number.isNaN(n) ? 1 : n;
      risen.current = up >= 1;
    }
    return (1 - up) * RISE_FROM * HERO.height * card.clientHeight + Math.max(0, window.scrollY) * HERO.follow;
  };

  // After the first paint, when the browser has a moment.
  useEffect(() => {
    const ric = (window as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  // The contour, by the scroll: 0 at the top of the page, 1 a third of a window down. And, while the
  // stand-in is the light, how far it has set.
  useEffect(() => {
    const card = layer.current?.closest<HTMLElement>(".hero4");
    if (!card) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = -1;
    let lastSink = -1;
    const tick = () => {
      raf = 0;
      const f = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.35)));
      const eased = f * f * (3 - 2 * f);
      if (Math.abs(eased - last) > 0.002) {
        last = eased;
        card.style.setProperty("--hero-frame", eased.toFixed(3));
      }
      const sink = still ? 0 : Math.round(Math.max(0, window.scrollY) * HERO.follow);
      if (sink !== lastSink && !card.hasAttribute("data-lit")) {
        lastSink = sink;
        card.style.setProperty("--hero-sink", `${sink}px`);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={layer} className="hero4__light" aria-hidden="true">
      {ready && (
        <ShaderField
          className="hero4__light-field"
          stops={stops}
          amount={HERO.amount}
          glow={1}
          drift={GRADIENT.drift}
          size={GRADIENT.size}
          bend={GRADIENT.bend}
          bow={GRADIENT.bow}
          grain={GRADIENT.grain}
          shape="arch"
          arch={[HERO.roundness, HERO.height]}
          edge={HERO.edge}
          foot={foot}
          guard={TEXT}
          guardBy="lines"
          onDrawn={() => layer.current?.closest(".hero4")?.setAttribute("data-lit", "")}
        />
      )}
    </div>
  );
}
