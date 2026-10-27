"use client";

/**
 * How it works, as a road: the four steps from a mood board to a screen that
 * stays on-brand, each one a demo card that plays when you reach it
 * (journey/DemoCard.tsx), strung on a patch cable that runs down the left
 * side, with a jack level with each card. Echo travels the cable as you
 * scroll (road.ts lays it: the cable, and Echo hopping the straights), and steps into each card to press its buttons
 * while it plays.
 *
 * The cards are the stops, so the steps are said once: get Echo (the plugin,
 * or init), then make a style with AI, pick it and try it on, build with
 * Echo, check it's on-brand and at WCAG 2.2 AA. Each is a plain name and the
 * demo.
 *
 * Echo on the road is the page's own Echo: the 3D one (echo3d/), or the
 * drawing without WebGL (Guide.tsx). The section has one perch; it rides the
 * cable, and while the card under the reading line is playing it stands where
 * that card's own marker is (the card moves its marker from press to press).
 * Under reduced motion the cards show their ends and Echo sits at the stop
 * being read. On a phone there's no cable: the cards take the whole column,
 * and Echo stands on the play key of the card being read.
 */
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BigTitle } from "@/components/home/BigTitle";
import { GuideStop } from "@/components/home/Guide";
import { whenNear } from "@/components/home/near";
import {
  alongFor,
  layOut,
  nearest,
  nextMove,
  slotsOf,
  type Layout,
  type Move,
} from "@/components/home/road/road";
import { GetCard } from "@/components/home/journey/GetCard";
import { MakeCard } from "@/components/home/journey/MakeCard";
import { PickCard } from "@/components/home/journey/PickCard";
import { BuildCard } from "@/components/home/journey/BuildCard";
import { CheckCard } from "@/components/home/journey/CheckCard";
import { INK } from "@/components/home/journey/run";
import { RoadLight } from "@/components/home/light/RoadLight";

// The cable, its styles with it, loads as the road comes near, once the section has measured itself.
const RoadCable = dynamic(
  () => import("@/components/home/road/RoadCable").then((m) => m.RoadCable),
  { ssr: false },
);

// The paper road (Make's sheets drifting into Try it on) loads as the road comes near, where it can run.
const PaperRoad = dynamic(
  () => import("@/components/home/journey/paper/PaperRoad").then((m) => m.PaperRoad),
  { ssr: false },
);

/** The paper road needs a window wide enough for one card a screen (DemoCard's fitting). */
const PAPER_FROM = "(min-width: 900px)";
/**
 * The cable needs a window wide enough to spare it a strip. On a phone the
 * cards take the whole column, the road's strip given to them, and Echo waits on the card being read,
 * standing on its play key, until the card plays and it steps in.
 */
const ROAD_FROM = "(min-width: 48rem)";

/** The stops, in order: getting Echo, then the four steps, each a demo card. */
const CARDS = [GetCard, MakeCard, PickCard, BuildCard, CheckCard];

/**
 * What Echo carries down the cable from a stop to the next, by how many stops
 * it has passed: each step's result is the next one's start. After Add Echo
 * to your AI, the plugin, as the next prompt mentions it; after Make, the
 * style (its name and the colours it sampled); after Pick, the same style,
 * now chosen; after Build, the screen; after Check, its verdict.
 */
const PLUGS: readonly ({
  title: string;
  swatches?: readonly string[];
} | null)[] = [
  null,
  // From Get to Make: the plugin, now in your AI, as Make's prompt mentions it.
  { title: "@Echo UI" },
  { title: INK.title, swatches: INK.values.map((v) => v.hex) },
  { title: INK.title, swatches: INK.values.map((v) => v.hex) },
  { title: "Pocket" },
  { title: "No problems" },
];

/** Echo's size on the road: smaller on a phone, where the road is narrower. */
const sizeFor = (width: number) => (width >= 768 ? 64 : 46);
/** The cable's half thickness: Echo stands on it, not in it. */
const FEET = 4;
/** Where the reading line is, as a share of the window: the stop under it is the one being read. */
const READING = 0.55;

export function Workflow() {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [lay, setLay] = useState<Layout | null>(null);
  const [near, setNear] = useState(false);
  const [reached, setReached] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [wide, setWide] = useState(false);
  const [road, setRoad] = useState(true);
  const plugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const w = window.matchMedia(PAPER_FROM);
    const r = window.matchMedia(ROAD_FROM);
    const sync = () => {
      setReduced(mq.matches);
      setWide(w.matches);
      setRoad(r.matches);
    };
    sync();
    for (const q of [mq, w, r]) q.addEventListener("change", sync);
    return () => {
      for (const q of [mq, w, r]) q.removeEventListener("change", sync);
    };
  }, []);

  // Nothing of the cable loads for a visitor who's elsewhere on the page.
  useEffect(() => {
    const el = box.current;
    if (el) return whenNear(el, 700, () => setNear(true));
  }, []);

  /*
   * Measure the cards and lay the cable down the left, a jack level with each
   * card's name, again whenever anything resizes (a card's demo moving on).
   */
  useLayoutEffect(() => {
    const el = box.current;
    const ol = list.current;
    if (!el || !ol) return;
    const items = () => [...ol.querySelectorAll<HTMLElement>(":scope > li")];
    const measure = () => {
      const spine = (parseFloat(getComputedStyle(ol).paddingLeft) || 0) / 2;
      const rows = items().map((li) => {
        const head = li.querySelector<HTMLElement>(".demo__head");
        const top = li.offsetTop + (head?.offsetTop ?? 0);
        return { top, bottom: top + (head?.offsetHeight ?? 120) };
      });
      setLay(layOut(el.clientWidth, el.clientHeight, rows, spine));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    items().forEach((li) => ro.observe(li));
    return () => ro.disconnect();
  }, []);

  // Echo on the road: the scroll says where it's going along the cable; in a playing card, it's at the card's marker.
  useEffect(() => {
    const el = box.current;
    const ol = list.current;
    const perch = el?.querySelector<HTMLElement>(":scope > .hiw__perch");
    if (!el || !ol || !perch || !lay) return;
    const size = sizeFor(lay.width);
    const { slots, rolls } = slotsOf(lay);
    const reading = () =>
      window.innerHeight * READING - el.getBoundingClientRect().top;
    const cards = [...ol.querySelectorAll<HTMLElement>(":scope > li")];
    let k = nearest(slots, alongFor(lay, reading()));
    let go: (Move & { t0: number }) | null = null;
    let lastReached = -1;
    let lastTransform = "";
    let lastPlug = "";
    let raf = 0;
    /** How Echo sits on the perch, written only when it changes: every write, even of the same, is a change for the page to look at. */
    const pose = (key: "guideRoll" | "guideLean" | "guidePress", value: string) => {
      if (perch.dataset[key] !== value) perch.dataset[key] = value;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      // Far from the road and still: nothing to do.
      if (
        !go &&
        (r.bottom < -window.innerHeight || r.top > window.innerHeight * 2)
      )
        return;
      const goal = nearest(slots, alongFor(lay, reading()));
      let s = slots[k]!.s;
      let lift = 0;
      let lean = 0;
      let roll = 0;
      if (reduced) {
        k = goal;
        go = null;
        s = slots[k]!.s;
      } else {
        if (!go && goal !== k) {
          const m = nextMove(lay, slots, rolls, k, goal, size);
          if (m) go = { ...m, t0: now };
        }
        if (go) {
          const u = Math.min(1, (now - go.t0) / go.dur);
          const e = 0.5 - Math.cos(Math.PI * u) / 2;
          s = slots[go.from]!.s + (slots[go.to]!.s - slots[go.from]!.s) * e;
          if (go.kind === "roll") roll = Math.PI * 2 * go.turns * e;
          else {
            const span = Math.abs(slots[go.to]!.s - slots[go.from]!.s);
            lift = Math.sin(Math.PI * u) * Math.min(120, 16 + span * 0.1);
            lean = (go.to > go.from ? 1 : -1) * Math.sin(Math.PI * u) * 0.16;
          }
          if (u >= 1) {
            k = go.to;
            go = null;
          }
        }
      }

      // The card under the reading line, if it's playing (or has played): Echo is in it, at its marker.
      const line = window.innerHeight * READING;
      let marker: HTMLElement | null = null;
      for (const li of cards) {
        const card = li.querySelector<HTMLElement>(".demo");
        const body = li.querySelector<HTMLElement>(".demo__body");
        if (
          !card ||
          !body ||
          !card.hasAttribute("data-live") ||
          card.dataset.phase === "waiting"
        )
          continue;
        const b = body.getBoundingClientRect();
        if (b.top < line && b.bottom > line - 80)
          marker = li.querySelector<HTMLElement>(".demo__marker");
      }

      let transform: string;
      if (marker) {
        const m = marker.getBoundingClientRect();
        const x = m.left + m.width / 2 - r.left;
        const y = m.bottom - r.top;
        transform = `translate(${(x - size / 2).toFixed(1)}px, ${(y - size).toFixed(1)}px)`;
        pose("guideRoll", "0");
        pose("guideLean", marker.dataset.guideLean ?? "0");
        pose("guidePress", marker.dataset.guidePress ?? "0");
      } else if (!road) {
        // No cable: on the card being read (the last whose top has passed the reading line), standing on its play key.
        let li = cards[0]!;
        for (const c of cards) if (c.getBoundingClientRect().top < line) li = c;
        const key = li.querySelector<HTMLElement>(".demo__key") ?? li;
        const k = key.getBoundingClientRect();
        const x = k.left + k.width / 2 - r.left;
        const y = k.top - r.top;
        transform = `translate(${(x - size / 2).toFixed(1)}px, ${(y - size + FEET).toFixed(1)}px)`;
        pose("guideRoll", "0");
        pose("guideLean", "0");
        pose("guidePress", "0");
      } else {
        const p = lay.road.at(s);
        transform = `translate(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size + FEET - lift).toFixed(1)}px)`;
        // How Echo is turning on the perch: the stage and the drawing read these (radians).
        pose("guideRoll", roll ? roll.toFixed(3) : "0");
        pose("guideLean", lean ? lean.toFixed(3) : "0");
        pose("guidePress", "0");
      }
      if (transform !== lastTransform)
        perch.style.transform = lastTransform = transform;

      // The jacks Echo has reached light up (RoadCable.tsx).
      let passed = 0;
      lay.stations.forEach((st, i) => {
        if (st.s <= s + 2) passed = i + 1;
      });

      // Travelling the cable between stops, Echo carries the last stop's result; arrived, it has plugged it in.
      const plug = plugRef.current;
      if (plug) {
        let at = "";
        if (go && !marker && PLUGS[passed]) {
          const p = lay.road.at(s);
          at = `translate(${(p.x + size * 0.45).toFixed(1)}px, ${(p.y - size * 1.05 - lift).toFixed(1)}px)`;
        }
        if (at !== lastPlug) {
          lastPlug = at;
          if (at) plug.style.transform = at;
          plug.toggleAttribute("data-shown", Boolean(at));
        }
      }
      if (passed !== lastReached) {
        lastReached = passed;
        setReached(passed);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lay, reduced, road]);

  return (
    <section className="sec hiw" aria-labelledby="hiw-h" data-guide-section="">
      <RoadLight />
      <BigTitle
        id="hiw-h"
        title={
          <>
            One design system.{" "}
            <span className="big-title__dim">Endless styles.</span>
          </>
        }
      >
        <strong>
          Your mood boards become styles, and your AI builds each product in
          one.
        </strong>
      </BigTitle>

      <div ref={box} className="hiw__way">
        <GuideStop className="hiw__perch" />
        {road && (
          <div ref={plugRef} className="hiw__plug" aria-hidden="true">
            {PLUGS[reached] && (
              <>
                {PLUGS[reached]!.swatches && (
                  <span className="hiw__plug-swatches">
                    {PLUGS[reached]!.swatches!.map((hex) => (
                      <i key={hex} style={{ background: hex }} />
                    ))}
                  </span>
                )}
                {PLUGS[reached]!.title}
              </>
            )}
          </div>
        )}
        {lay && near && road && <RoadCable lay={lay} reached={reached} />}
        {near && wide && !reduced && <PaperRoad />}
        <ol ref={list} className="hiw__cards">
          {CARDS.map((Card, i) => (
            <li key={i} className="hiw__card">
              <Card />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
