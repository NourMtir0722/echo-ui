"use client";

/**
 * The way from the ask to what it gets you: Echo standing on a key that asks
 * "What happens when you support Echo?". It hops on it a few times as the
 * page opens, pressing the cap down each time it lands, and again whenever
 * someone points at it or tabs to it; pressed, the page goes down to the
 * island. A few hops and it rests, so nothing moves for longer than five
 * seconds by itself (WCAG 2.2.2); under reduced motion it stands still.
 *
 * Echo is the landing's own, photographed once in 3D (supporters/photos.ts);
 * until the photograph is ready, and without WebGL, it's drawn flat.
 */
import { useEffect, useRef, useState } from "react";
import { Creature } from "@registry/echo/creature";
import { HardwareButton } from "@registry/echo/hardware-button";
import type { Person } from "@/components/supporters/people";

/** One hop, ms, and the share of it at which Echo lands (support-page.css, `sp-hop`). */
const HOP = 900;
const LANDS = 0.56;
/** How many hops a run is, and how long the cap stays down each time. */
const RUN = 3;
const DOWN = 150;

/** The brand's own Echo: the studio photographs a "maker" in the brand's glaze, standing straight. */
const ECHO: Person = { id: "echo", name: "Echo", plan: "maker", links: [] };

function DownIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

/** A phone's width: the question on the small cap, which fits it (a cap never wraps its label). */
const NARROW = "(max-width: 30rem)";

export function WhatHappens({ to }: { to: string }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = matchMedia(NARROW);
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  /** Counts the runs of hops: each new one restarts the animation. */
  const [run, setRun] = useState(0);
  const [held, setHeld] = useState(false);
  const busy = useRef(false);
  const still = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let gone = false;
    let url: string | null = null;
    import("@/components/supporters/photos")
      .then(({ openStudio }) => openStudio())
      .then(async (studio) => {
        try {
          url = await studio.shoot(ECHO);
          if (!gone) setPhoto(url);
        } finally {
          studio.dispose();
        }
      })
      .catch(() => {
        // No WebGL: the flat Echo stays.
      });
    return () => {
      gone = true;
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, []);

  const hop = () => {
    if (still.current || busy.current) return;
    busy.current = true;
    setRun((n) => n + 1);
    // The cap goes down as Echo lands on it, each hop.
    for (let k = 0; k < RUN; k++) {
      const at = (k + LANDS) * HOP;
      timers.current.push(
        window.setTimeout(() => setHeld(true), at),
        window.setTimeout(() => setHeld(false), at + DOWN),
      );
    }
    timers.current.push(window.setTimeout(() => (busy.current = false), RUN * HOP));
  };

  useEffect(() => {
    still.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A moment after the page opens, once the ask has been seen.
    const first = window.setTimeout(hop, 1400);
    const pending = timers.current;
    return () => {
      window.clearTimeout(first);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div className="sp-cue" onPointerEnter={hop} onFocus={hop}>
      <span className="sp-cue__echo" aria-hidden="true">
        <span key={run} className="sp-cue__body" data-hop={run > 0 ? "" : undefined}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sp-cue__photo" src={photo} alt="" width={320} height={320} />
          ) : (
            <span className="sp-cue__flat">
              <Creature size={56} />
            </span>
          )}
        </span>
        <span key={`s${run}`} className="sp-cue__shadow" data-hop={run > 0 ? "" : undefined} />
      </span>
      <HardwareButton
        variant="neutral"
        size={narrow ? "sm" : "md"}
        held={held}
        href={`#${to}`}
        trailingIcon={<DownIcon />}
        onClick={(e: React.MouseEvent) => {
          const there = document.getElementById(to);
          if (!there) return;
          e.preventDefault();
          // Right under the site's bar (the page's scroll-padding would leave a strip of the card showing).
          const bar = parseFloat(getComputedStyle(there).getPropertyValue("--echo-shell-rail-h")) || 56;
          window.scrollTo({ top: there.getBoundingClientRect().top + window.scrollY - bar, behavior: still.current ? "auto" : "smooth" });
          history.replaceState(null, "", `#${to}`);
        }}
      >
        What happens when you support Echo?
      </HardwareButton>
    </div>
  );
}
