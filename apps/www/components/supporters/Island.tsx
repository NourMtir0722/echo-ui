"use client";

/**
 * Island: the land of Echos (island-world.ts), the whole first screen of
 * /supporters and the most important thing on it. A quiet line in the top
 * left corner of its sky; "Find yourself" and the list of everyone in the
 * top right; the ask at the bottom left, and the island's own keys at the
 * bottom right. Drag to turn it, scroll the page as usual (the wheel only
 * zooms with a pinch). Point at an Echo and its name shows; press it, or
 * find it, and the camera glides down to it while its card opens. A free
 * plot, and the ask, lead to Support.
 *
 * The names are drawn by the page over the picture, so they're real text,
 * sharp at any size. The island itself is a picture to a screen reader;
 * "Find yourself" and the list are how a keyboard or a screen reader visits
 * someone.
 *
 * Until the list of who's on it has come (`people` is null), it's "raising".
 */
import { useContext, useEffect, useRef, useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Combobox } from "@registry/echo/combobox";
import { Sheet } from "@registry/echo/sheet";
import { Everyone, LitPeople } from "./parts";
import type { Person } from "./people";
import type { Hit, IslandWorld } from "./island-world";
import { DONATION_AMOUNTS } from "@/components/support/donation-links";

export function Island({
  people,
  openId,
  onOpen,
  onLight,
}: {
  people: readonly Person[] | null;
  openId: string | null;
  onOpen: (p: Person) => void;
  /** Who the list of everyone is pointing at, to light up on the island. */
  onLight: (ids: ReadonlySet<string>) => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  const known = people ?? [];
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const world = useRef<IslandWorld | null>(null);
  const [state, setState] = useState<"building" | "ready" | "failed">("building");
  const [paused, setPaused] = useState(false);
  const [plotCount, setPlotCount] = useState(0);
  const claims = useRef<(HTMLAnchorElement | null)[]>([]);
  const lit = useContext(LitPeople);
  const hover = useRef<Hit | null>(null);
  const openRef = useRef(openId);
  openRef.current = openId;
  const litRef = useRef(lit);
  litRef.current = lit;

  useEffect(() => {
    if (!people) return;
    let cancelled = false;
    let made: IslandWorld | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setState("building");
    import("./island-world")
      .then(({ createIsland }) => createIsland(canvas.current!, people, reduced))
      .then((w) => {
        if (cancelled) return w.dispose();
        made = w;
        world.current = w;
        w.onFrame = drawTags;
        setPlotCount(w.plots);
        w.light(litRef.current, hover.current?.kind === "person" ? hover.current.id : null);
        if (openRef.current) w.focus(openRef.current);
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
      made?.dispose();
      world.current = null;
    };
  }, [people]);

  useEffect(() => world.current?.focus(openId && people?.some((p) => p.id === openId) ? openId : null), [openId, people, state]);
  useEffect(() => world.current?.light(lit, hover.current?.kind === "person" ? hover.current.id : null), [lit, state]);
  useEffect(() => world.current?.pause(paused), [paused, state]);

  // The wheel scrolls the page; only a pinch (which arrives as ctrl + wheel) zooms the island.
  useEffect(() => {
    const el = wrap.current!;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    el.addEventListener("wheel", wheel, { capture: true });
    return () => el.removeEventListener("wheel", wheel, { capture: true });
  }, []);

  // Names over the picture: whoever is pointed at, open, or lit from the index.
  const byId = useRef(new Map<string, Person>());
  byId.current = new Map((people ?? []).map((p) => [p.id, p]));
  function drawTags() {
    const w = world.current;
    const box = tags.current;
    if (!w || !box) return;
    const want = new Map<string, { text: string; at: { x: number; y: number; ok: boolean } | null; plot?: boolean }>();
    const h = hover.current;
    // "Your Echo here" over the two free plots nearest you that don't collide, and over any you point at:
    // the beams already show every free place; seven labels at once read as noise.
    const spots = claims.current
      .map((el, i) => ({ el, i, at: el ? w.plotLabel(i) : null }))
      .filter((c) => c.el && c.at)
      .sort((a, b) => a.at!.depth - b.at!.depth);
    const shown: { x: number; y: number }[] = [];
    const viewW = canvas.current!.clientWidth;
    for (const { el, i, at } of spots) {
      const pointed = h?.kind === "plot" && h.index === i;
      // Whole, or not at all: a label cut by the edge of a phone says nothing.
      const half = el!.offsetWidth / 2 + 8;
      // …and clear of the rows along the top and the bottom, and quiet while someone is being visited.
      const viewH = canvas.current!.clientHeight;
      const fits =
        !openRef.current && at!.x - half > 0 && at!.x + half < viewW && at!.y - el!.offsetHeight > 110 && at!.y < viewH - 150;
      const free = at!.ok && fits && shown.length < 2 && shown.every((q) => Math.abs(q.x - at!.x) > 200 || Math.abs(q.y - at!.y) > 48);
      const show = at!.ok && (pointed || free);
      if (free) shown.push(at!);
      el!.style.transform = `translate(${at!.x}px, ${at!.y}px) translate(-50%, -100%)`;
      el!.style.visibility = show ? "visible" : "hidden";
    }
    for (const id of new Set([...(h?.kind === "person" ? [h.id] : []), ...(openRef.current ? [openRef.current] : []), ...litRef.current])) {
      const p = byId.current.get(id);
      if (p) want.set(id, { text: p.name, at: w.label(id) });
    }
    for (const el of [...box.children] as HTMLElement[]) if (!want.has(el.dataset.id!)) el.remove();
    for (const [id, t] of want) {
      let el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
      if (!el) {
        el = document.createElement("span");
        el.className = t.plot ? "sw-island__tag sw-island__tag--plot" : "sw-island__tag";
        el.dataset.id = id;
        el.textContent = t.text;
        box.append(el);
      }
      el.style.transform = t.at ? `translate(${t.at.x}px, ${t.at.y}px) translate(-50%, -100%)` : "";
      el.style.opacity = t.at?.ok ? "1" : "0";
    }
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
    w.light(litRef.current, hit?.kind === "person" ? hit.id : null);
  };
  const onUp = (e: React.PointerEvent) => {
    const start = down.current;
    down.current = null;
    const w = world.current;
    if (!w || !start) return;
    const { x, y } = local(e);
    if (Math.hypot(x - start.x, y - start.y) > 6) return;
    const hit = w.pick(x, y);
    if (hit?.kind === "person") {
      const p = byId.current.get(hit.id);
      if (p) onOpen(p);
    } else if (hit?.kind === "plot") {
      location.href = "/support";
    }
  };

  return (
    <div ref={wrap} className="sw-island" data-state={state}>
      {/* The island is the page; its title is a quiet line in the corner of the sky. */}
      <header className="sw-island__head">
        {/* The page's title, for screen readers and search; on screen the island says it. */}
        <h1 className="sw-island__sr">Supporters</h1>
        <p className="sw-island__line">
          <strong>There&rsquo;s room for you.</strong> Everyone who supports Echo has an Echo on its island.
        </p>
      </header>
      {/* Top right: find someone by name, or open the list of everyone. */}
      <div className="sw-island__find">
        <Combobox
          size="sm"
          label="Find yourself"
          placeholder="Find yourself"
          options={known.map((p) => ({ value: p.id, label: p.name }))}
          // Until everyone is known there's no one to find, and what's typed then wouldn't refresh when they come.
          disabled={!people}
          value={null}
          onValueChange={(id) => {
            const p = typeof id === "string" ? known.find((x) => x.id === id) : undefined;
            if (p) onOpen(p);
          }}
          emptyText="No one called that yet. It could be you."
        />
        <Sheet side="right" open={listOpen} onOpenChange={setListOpen}>
          <Sheet.Trigger className="sw-island__list-key" aria-label={`Everyone on the island, ${known.length}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6h11M9 12h11M9 18h11" />
              <circle cx="4.5" cy="6" r="1" fill="currentColor" />
              <circle cx="4.5" cy="12" r="1" fill="currentColor" />
              <circle cx="4.5" cy="18" r="1" fill="currentColor" />
            </svg>
            <span className="sw-island__list-count" aria-hidden="true">
              {known.length}
            </span>
          </Sheet.Trigger>
          <Sheet.Content title="Everyone on the island" description={`${known.length} on the island, monthly supporters first.`}>
            <Everyone
              people={known}
              onOpen={(p) => {
                setListOpen(false);
                onLight(new Set());
                onOpen(p);
              }}
              onLight={onLight}
            />
          </Sheet.Content>
        </Sheet>
      </div>
      <div className="sw-island__view">
      <canvas
        ref={canvas}
        className="sw-island__canvas"
        aria-hidden="true"
        onPointerDown={(e) => (down.current = local(e))}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => {
          hover.current = null;
          world.current?.light(litRef.current, null);
        }}
      />
      <div ref={tags} className="sw-island__tags" aria-hidden="true" />
      {/* The free plots, each a link to Support, written over its ghost Echo. */}
      <div className="sw-island__claims">
        {Array.from({ length: state === "ready" ? plotCount : 0 }, (_, i) => (
          <a
            key={i}
            ref={(el) => {
              claims.current[i] = el;
            }}
            className="sw-island__claim"
            href="/support"
          >
            <span aria-hidden="true">+</span> Your Echo here
          </a>
        ))}
      </div>
      <p className="sw-island__sr">Echo&rsquo;s island, where everyone who supports Echo lives. To visit someone, use Find yourself or the list of everyone.</p>
      {state === "building" && <p className="sw-island__note">Raising the island…</p>}
      {state === "failed" && <p className="sw-island__note">This browser can&rsquo;t draw the island. Everyone is in the names below.</p>}
      </div>
      {/* Along the bottom: the ask on the left, how to move the island, and its keys on the right. */}
      <div className="sw-island__foot">
        <div className="sw-island__ask">
          <HardwareButton variant="primary" size="lg" impact href="/support">
            Get your Echo on the island
          </HardwareButton>
          <p className="sw-island__ask-note">From ${DONATION_AMOUNTS[0]}, once or monthly.</p>
        </div>
        <p className="sw-island__hint" aria-hidden="true">
          <span className="sw-island__hint-mouse">Drag to turn the island</span>
          <span className="sw-island__hint-touch">Two fingers to turn the island</span>
        </p>
        <div className="sw-island__keys">
          <HardwareButton
            size="sm"
            variant="neutral"
            iconOnly
            aria-label="Closer"
            onClick={() => world.current?.zoom(1)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          />
          <HardwareButton
            size="sm"
            variant="neutral"
            iconOnly
            aria-label="Further"
            onClick={() => world.current?.zoom(-1)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            }
          />
          <HardwareButton size="sm" variant="neutral" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? "Turn" : "Pause"}
          </HardwareButton>
        </div>
      </div>
    </div>
  );
}
