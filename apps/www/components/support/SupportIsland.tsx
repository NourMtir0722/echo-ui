"use client";

/**
 * The island on /support, on a screen of its own under the ask: the real one
 * (supporters/island-world.ts), with the visitor's own Echo on it, as theirs
 * would be. Its night is the ask's too: the canvas runs up behind it, and the
 * free plots' beams rise up through it, so the two screens are one place. As
 * the island comes into view their Echo drops onto the free plot
 * in front of Noor's house, tagged with the number it would have, and under
 * the island one plain sentence says what a supporter gets, and a key opens
 * the whole island (/supporters). Whichever kind of
 * support is picked in the panel above decides where it lands: the village
 * round Noor's hill, or out in the meadows. Pressed, it jumps.
 *
 * A picture of what you'd get, and nothing more: nothing is asked for and
 * nothing is saved. The name and the links are asked for right after paying,
 * on the thank-you page (/supporters/welcome). Who's already on the island
 * comes from the supporters server (live.ts); the island is raised once it's
 * here.
 *
 * The tags are drawn by the page over the picture, so they're real text; the
 * island itself is a picture to a screen reader, and the sentence under it
 * says what it shows. Without WebGL, the visitor's Echo is drawn flat.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Creature } from "@registry/echo/creature";
import { HardwareButton } from "@registry/echo/hardware-button";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { blueOf } from "@/components/supporters/finish";
import { everyone, numberOf } from "@/components/supporters/people";
import { useIsland } from "@/components/supporters/live";
import type { Hit, IslandWorld } from "@/components/supporters/island-world";
import type { Frequency } from "./donation-links";
import "@/components/supporters/supporters.css";

/** The visitor, as the island draws a supporter: their shade of blue comes from the id. */
const VISITOR = "you";

/** How far up the island's sky runs behind the ask, at most: its view's height times this (a phone's ask is long). */
const ABOVE_MAX = 1.2;
/** How tall its beams are there, times the island's own: up through the ask, gone by its top. */
const REACH = 3.6;

export function SupportIsland({
  plan,
  under,
}: {
  plan: Frequency;
  /** What stands over the island (the ask): its sky, and its beams, run on up behind it. */
  under: RefObject<HTMLElement | null>;
}) {
  const island = useIsland();
  const people = useMemo(() => (island ? everyone(LANDING_SEED.accent, island.supporters) : null), [island]);
  /** The number the visitor's Echo would have: the next one the server gives (numbers are never reused). */
  const next = island?.next ? numberOf({ no: island.next }) : "";
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<IslandWorld | null>(null);
  const youTag = useRef<HTMLSpanElement>(null);
  const personTag = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"building" | "ready" | "failed">(
    "building",
  );
  const hover = useRef<Hit | null>(null);
  const view = useRef<HTMLDivElement>(null);
  /** How far the canvas runs up behind the ask, px (`--sp-above` on the island). */
  const above = useRef(0);
  const measure = () => {
    const ask = under.current;
    const box = view.current;
    if (!ask || !box || !wrap.current) return;
    above.current = Math.round(Math.min(ask.offsetHeight, box.clientHeight * ABOVE_MAX));
    wrap.current.style.setProperty("--sp-above", `${above.current}px`);
  };
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (under.current) ro.observe(under.current);
    if (view.current) ro.observe(view.current);
    return () => ro.disconnect();
    // `measure` reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!people) return;
    let cancelled = false;
    let made: IslandWorld | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("@/components/supporters/island-world")
      .then(({ createIsland }) =>
        // Still, so its beams stand still behind the ask; they're tall enough to rise up through it.
        createIsland(canvas.current!, people, reduced, { spin: 0, reach: REACH, above: () => above.current }),
      )
      .then((w) => {
        if (cancelled) return w.dispose();
        made = w;
        world.current = w;
        w.onFrame = drawTags;
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
      made?.dispose();
      world.current = null;
    };
    // The world is made once, when everyone is known; what it draws follows the refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  // Their Echo drops in once the island is up and in view, and moves when the kind of support does.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const seen = new IntersectionObserver(([e]) => e?.isIntersecting && setArrived(true), { threshold: 0.5 });
    seen.observe(wrap.current!);
    return () => seen.disconnect();
  }, []);
  useEffect(() => {
    if (arrived) world.current?.preview({ id: VISITOR, plan }, false);
  }, [arrived, plan, state]);

  // The wheel scrolls the page; only a pinch (which arrives as ctrl + wheel) zooms the island.
  useEffect(() => {
    const el = wrap.current!;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    el.addEventListener("wheel", wheel, { capture: true });
    return () => el.removeEventListener("wheel", wheel, { capture: true });
  }, []);

  /** Over the picture: "Your Echo" on theirs, and the name of whoever is pointed at. */
  function drawTags() {
    const w = world.current;
    if (!w) return;
    const place = (
      el: HTMLElement | null,
      at: { x: number; y: number; ok: boolean } | null,
    ) => {
      if (!el) return;
      el.style.transform = at
        ? `translate(${at.x}px, ${at.y}px) translate(-50%, -100%)`
        : "";
      el.style.visibility = at?.ok ? "visible" : "hidden";
    };
    place(youTag.current, w.youLabel());
    const h = hover.current;
    const who =
      h?.kind === "person" ? people?.find((p) => p.id === h.id) : undefined;
    if (personTag.current && who) personTag.current.textContent = who.name;
    place(personTag.current, who ? w.label(who.id) : null);
  }

  const down = useRef<{ x: number; y: number } | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e: React.PointerEvent) => {
    const w = world.current;
    if (!w || e.pointerType === "touch") return;
    const { x, y } = local(e);
    const hit = w.pick(x, y);
    hover.current = hit;
    canvas.current!.style.cursor = hit ? "pointer" : "grab";
    w.light(new Set(), hit?.kind === "person" ? hit.id : null);
  };
  const onUp = (e: React.PointerEvent) => {
    const start = down.current;
    down.current = null;
    const w = world.current;
    if (!w || !start) return;
    const { x, y } = local(e);
    if (Math.hypot(x - start.x, y - start.y) > 6) return;
    const hit = w.pick(x, y);
    if (hit?.kind === "you") w.cheer();
    else if (hit?.kind === "person") location.href = `/supporters#${hit.id}`;
  };

  const tag = (
    <>
      <span className="sp-you__name">Your Echo</span>
      {next && <span className="sp-you__no">{next}</span>}
    </>
  );
  return (
    <div ref={wrap} className="sw-island sp-island" data-state={state}>
      <div ref={view} className="sw-island__view">
        {/* The canvas and its tags: the island's view, and the sky over it up behind the ask. */}
        <div className="sp-island__stage">
        <canvas
          ref={canvas}
          className="sw-island__canvas"
          aria-hidden="true"
          onPointerDown={(e) => (down.current = local(e))}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => {
            hover.current = null;
            world.current?.light(new Set(), null);
          }}
        />
        <div className="sw-island__tags" aria-hidden="true">
          <span
            ref={personTag}
            className="sw-island__tag"
            style={{ visibility: "hidden" }}
          />
          <span
            ref={youTag}
            className="sw-island__tag sp-you"
            style={{ visibility: "hidden" }}
          >
            {tag}
          </span>
        </div>
        </div>
        {state === "building" && (
          <p className="sw-island__note">Raising the island…</p>
        )}
        {state === "failed" && (
          <div className="sp-island__flat" aria-hidden="true">
            <Creature
              size={120}
              accent={blueOf({ id: VISITOR, plan }, LANDING_SEED.accent)}
              mood="idle"
            />
            <span className="sw-island__tag sp-you">{tag}</span>
          </div>
        )}
      </div>
      {/* Under the island, what it shows, said plainly, and the way to all of it. */}
      <div className="sp-island__foot">
        <p className="sp-island__say">
          <strong>Every supporter gets a spot on this island:</strong> their own
          Echo, with their name and their social links, so people can find
          them.
        </p>
        <HardwareButton variant="neutral" href="/supporters">
          See the full island
        </HardwareButton>
      </div>
    </div>
  );
}
