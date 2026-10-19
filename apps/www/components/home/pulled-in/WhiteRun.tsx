"use client";

/**
 * The white run: from ChatGPT to the end of the blueprint, the page's ground
 * is the white the moment ends in: the blue paper on the white right after
 * ChatGPT, then back to the dark at the letter.
 *
 * One layer under the page, the white of the moment's world with the same
 * fine grain (scene.ts's lens), so the stage scrolls on without an edge. It
 * comes on while the stage is held and its world is already white, so the
 * change is never seen; and it goes as the letter comes up: the ground turns
 * back to the dark behind the sheet's foot and the letter's title, which are
 * on screen the whole time, so there's never an empty frame. The letter's
 * title, white, comes out of the white as the dark comes back. The turn is
 * played, not scrolled (pulled-in.css), so the page never rests on a grey
 * half-way between the two; it turns back the
 * same way going up.
 *
 * Only where the moment flies (its stage carries `data-live`): still (reduced
 * motion, no WebGL), the blueprint paints its own white (blueprint.css).
 */
import { useEffect, useRef } from "react";
import { barHeight } from "@/components/home/snap";
import { onFrame } from "@/components/home/frame";
import { WHITE_GROUND } from "@/components/home/blueprint/Blueprint";
import { ALL_WHITE } from "./timeline";

/**
 * A tile of grain round the white: each pixel lifted or lowered by up to `amount` of full scale, evenly,
 * as the lens's grain is, so the white's average stays the white.
 */
function grainTile(ground: string, amount: number): string {
  const n = 192;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  if (!g) return "";
  const lum = (parseInt(ground.slice(1, 3), 16) + parseInt(ground.slice(3, 5), 16) + parseInt(ground.slice(5, 7), 16)) / 765;
  const img = g.createImageData(n, n);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() - 0.5;
    // White over the ground lifts it by α(1 - c); black lowers it by α·c.
    const up = v > 0;
    const a = up ? (v * amount) / (1 - lum) : (-v * amount) / lum;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = up ? 255 : 0;
    img.data[i + 3] = Math.round(Math.min(1, a) * 255);
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export function WhiteRun() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    const lit = el?.closest(".home-lit");
    if (!el || !lit) return;
    const tile = grainTile(WHITE_GROUND, 0.045);
    if (tile) {
      el.style.backgroundImage = `url(${tile})`;
      el.style.backgroundSize = `${192 / Math.min(window.devicePixelRatio || 1, 1.6)}px`;
    }
    let shown = -1;
    let dark = false;
    let wasDark = false;
    return onFrame(() => {
      const pull = document.querySelector<HTMLElement>(".pull");
      const track = pull?.querySelector<HTMLElement>(".pull__track");
      const letter = document.querySelector<HTMLElement>(".letter-sec");
      const flying = !!pull?.hasAttribute("data-live");
      if (lit.hasAttribute("data-white-run") !== flying) lit.toggleAttribute("data-white-run", flying);
      let o = 0;
      if (flying && track) {
        const vh = window.innerHeight;
        const bar = barHeight();
        const u = (bar - track.getBoundingClientRect().top) / (vh - bar);
        // Back to the dark as the letter comes in at the foot of the window, before its white title shows on the
        // white; white again once it's back out (a gap between, so it never flickers on the line).
        const lt = letter?.getBoundingClientRect().top ?? Infinity;
        if (!dark && lt < vh * 0.9) dark = true;
        else if (dark && lt > vh * 0.98) dark = false;
        o = u >= ALL_WHITE && !dark ? 1 : 0;
      }
      const turned = dark !== wasDark;
      wasDark = dark;
      if (o === shown) return;
      // The turn at the letter plays; coming on or off under the held stage isn't seen, so it's at once.
      el.toggleAttribute("data-turn", turned);
      shown = o;
      el.toggleAttribute("data-on", o === 1);
    }, "scroll");
  }, []);

  return <div ref={layer} className="white-run" aria-hidden="true" />;
}
