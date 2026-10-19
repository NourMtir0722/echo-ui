"use client";

/**
 * What a supporter does with the video of their spot: post it. The landing's
 * way of showing a thing (home/Motion.tsx): one giant title, then one molded
 * panel the column's width, on a field of the seed's light. Left, the two
 * steps, said briefly; right, a phone, Echo's material round its glass, with
 * Noor's video posted on X under her name, with the words and the link the
 * card's "Post on X" writes (supporters/parts.tsx).
 *
 * The video plays while it's in view; its key pauses it (WCAG 2.2.2). Under
 * reduced motion it waits on its first frame until asked.
 *
 * Nobody is invented: the post is Noor's, with her own handle. It shows no
 * counts, because none of it happened.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { BigTitle } from "@/components/home/BigTitle";
import { X_PROFILE } from "@/components/home/NavTools";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { isLightSeed } from "@/components/site/device-seed";
import { useSiteSeed } from "@/components/site/theme-store";
import { shades } from "@/components/home/light/shades";
import { GRADIENT, ROAD } from "@/components/home/light/look";
import { LINK_MARK, handleOf } from "@/components/supporters/links";
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import dynamic from "next/dynamic";

const ShaderField = dynamic(() => import("@/components/home/light/ShaderField").then((m) => m.ShaderField), {
  ssr: false,
});

/** The words the card's "Post on X" starts a post with (supporters/parts.tsx), and the link it adds. */
const POST_TEXT = "I'm on Echo's island";
const POST_LINK = `${new URL(REGISTRY_HOMEPAGE).host}/supporters#noor`;

/** A post's own row of actions, drawn: nothing to press, and no numbers. */
const ACTIONS = [
  "M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z",
  "M7 4 3.5 7.5 7 11M3.5 7.5H16a4 4 0 0 1 4 4V12M17 20l3.5-3.5L17 13M20.5 16.5H8a4 4 0 0 1-4-4V12",
  "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z",
  "M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
];

function XMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={LINK_MARK.x.d} />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

/** The light the panel stands in: the road's, rising round it from below (home/light/RoadLight.tsx). */
function PlaceLight() {
  const [seed] = useSiteSeed(LANDING_SEED);
  const light = isLightSeed(seed);
  const stops = useMemo(() => shades(seed.accent, GRADIENT.hueDrift, light), [seed.accent, light]);
  return (
    <div className="sp-place__light" aria-hidden="true">
      <ShaderField
        className="sp-place__light-field"
        stops={stops}
        amount={ROAD.amount}
        glow={ROAD.glow}
        fade={ROAD.fade}
        drift={GRADIENT.drift}
        size={GRADIENT.size}
        bend={GRADIENT.bend}
        bow={GRADIENT.bow}
        grain={GRADIENT.grain}
        guard=".sp-place > .big-title"
      />
    </div>
  );
}

/** Noor's post, on a phone: X's dark screen, her name and handle, the card's words, the video. */
function Phone({ film, load }: { film: React.RefObject<HTMLVideoElement | null>; load: boolean }) {
  return (
    <div className="sp-phone">
      <div className="sp-phone__glass">
        <div className="sp-x__bar">
          <XMark size={20} />
        </div>
        <article className="sp-x__post" aria-label="Noor's post on X">
          <header className="sp-x__who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sp-x__face" src="/letter/noor-mtir.webp" alt="" width={40} height={40} loading="lazy" />
            <p className="sp-x__names">
              <span className="sp-x__name">Noor Mtir</span>
              <span className="sp-x__handle">{handleOf("x", X_PROFILE)}</span>
            </p>
          </header>
          <p className="sp-x__text">
            {POST_TEXT}
            <br />
            <span className="sp-x__link">{POST_LINK}</span>
          </p>
          <video
            ref={film}
            className="sp-x__video"
            src="/support/noor-place.mp4"
            poster="/support/noor-place.webp"
            width={720}
            height={720}
            muted
            loop
            playsInline
            preload={load ? "auto" : "none"}
            aria-label="Noor's spot on Echo's island: the island turns, the camera flies down to her Echo in front of her house, and her card writes in."
          />
          <ul className="sp-x__actions" aria-hidden="true">
            {ACTIONS.map((d) => (
              <li key={d}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={d} />
                </svg>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

/** The panel: the two steps on the left, the post on the right. */
function Show() {
  const film = useRef<HTMLVideoElement>(null);
  /** Playing, as the visitor last left it. */
  const [on, setOn] = useState(true);
  const [inView, setInView] = useState(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setOn(false);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        setInView(e.intersectionRatio >= 0.5);
        if (e.isIntersecting) setNear(true);
      },
      { threshold: [0, 0.5], rootMargin: "0px 0px 50% 0px" },
    );
    io.observe(film.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = film.current!;
    if (on && inView) void v.play().catch(() => {});
    else v.pause();
  }, [on, inView]);

  return (
    <div className="sp-show" data-reveal="">
      <div className="sp-show__cell sp-show__cell--make">
        <h3 className="sp-show__name">Make it</h3>
        <p className="sp-show__line">Press &ldquo;Make the video&rdquo; on your Echo&rsquo;s card, and it&rsquo;s done.</p>
      </div>
      <div className="sp-show__cell sp-show__cell--post">
        <h3 className="sp-show__name">Share it</h3>
        <p className="sp-show__line">Post it wherever you like, with your link.</p>
      </div>
      <div className="sp-show__cell sp-show__cell--phone">
        <span className="sp-show__key">
          <HardwareButton
            size="sm"
            iconOnly
            aria-label={on ? "Pause" : "Play"}
            icon={on ? <PauseIcon /> : <PlayIcon />}
            onClick={() => setOn((v) => !v)}
          />
        </span>
        <Phone film={film} load={near} />
      </div>
    </div>
  );
}

export function PlacePost() {
  return (
    <section className="sp-place" aria-labelledby="sp-place-h">
      <PlaceLight />
      <BigTitle
        id="sp-place-h"
        title={
          <>
            Post your spot. <span className="big-title__dim">People find you.</span>
          </>
        }
      >
        <strong>Your Echo makes a short video of its spot on the island,</strong> with your name and your links.
      </BigTitle>
      <Show />
    </section>
  );
}
