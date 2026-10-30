"use client";

/**
 * The homepage. Calm, centred, one thing per screen. What it is (the hero,
 * with the device that's Echo's home), who it's for (the puzzle, one piece
 * each), how it works (on a cable Echo travels: get Echo, in a chat or in
 * your code, then four stops, each played when you reach it: make a style
 * with AI, pick it and try it on, build with Echo, check it's on-brand), the
 * components, Echo pulled into ChatGPT (pulled-in/: the dark opens into a
 * vortex, Echo is yanked into its light, and the light turns out to be
 * ChatGPT; Echo lands on the key and presses it), the close on the white that
 * ends in (Echo's anatomy on a blueprint that opens like a shot, the scroll
 * drawing the ways in out of it), then dark again for who made it and how to
 * keep it free (pulled-in/WhiteRun.tsx).
 *
 * In each card Echo presses the real buttons (journey/DemoCard.tsx), and
 * every reply is a recorded run's, word for word (journey/run.ts).
 *
 * Calm, by rule: only one live thing per screen asks for attention. Demos
 * rest dimmed until they're in the middle of the window, and whatever builds
 * as you scroll finishes in under half a screen.
 *
 * Echo carries the page's light (light/): a pool of the seed's light goes
 * where it goes, held down wherever the text near it would stop reading, and
 * the hero, the road and the foot of the page each have a field of light in
 * shades of the seed (an arch behind the device, light rising round the road
 * and round the foot's panel), kept under their text the same way.
 *
 * Echo itself walks you through it, in 3D (echo3d/): it leaves the device's
 * screen, perches in each section and rides the margin between them as you
 * scroll, and ends in a heap with its crowd at the foot of the page. Every
 * section is a `data-guide-section` with one `GuideStop`. Its home stays with
 * you as a keychain in the corner (Keychain.tsx). The page scrolls smoothly
 * (Lenis) so Echo can glide with it.
 *
 * The seed is the site's, not this page's (theme-store.ts): a colour picked
 * anywhere on the site (the theme generator, the footer's light key) relights
 * every section here and every page opened next.
 */
import { useCallback, useRef, useState } from "react";
import "echo-ui-core/theme/material.css";
import { SoundProvider } from "echo-ui-core/sound";
import { AppShell } from "@registry/echo/app-shell";
import { TopNavLinks, Wordmark } from "@/components/site/SiteTopBar";
import { SiteMenu } from "@/components/site/SiteMenu";
import { LANDING_NAV } from "@/components/site/site-nav";
import { HomeHero } from "@/components/home/HomeHero";
import { Echo3D } from "@/components/home/echo3d/Echo3D";
import { Keychain } from "@/components/home/Keychain";
import { NavTools } from "@/components/home/NavTools";
import { Puzzle } from "@/components/home/Puzzle";
import { Workflow } from "@/components/home/Workflow";
import { MotionList } from "@/components/home/Motion";
import { Objects } from "@/components/home/Objects";
import { PulledIn } from "@/components/home/pulled-in/PulledIn";
import { WhiteRun } from "@/components/home/pulled-in/WhiteRun";
import { Blueprint } from "@/components/home/blueprint/Blueprint";
import { Letter } from "@/components/home/Letter";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { useReveal } from "@/components/home/use-reveal";
import { useSmoothScroll } from "@/components/home/use-smooth-scroll";
import { LightPool, type LightPoolHandle } from "@/components/home/light/LightPool";
import { CARRIED } from "@/components/home/light/look";
import type { DrawnPose } from "@/components/home/echo3d/stage";
import "./home.css";
import "./landing.css";
import "./sections.css";
// Here, beside the page's own sheets, not in Workflow.tsx: imported after
// HardwareButton there, it was a blocking stylesheet of its own.
import "./road/road.css";
// The road's own stylesheet, journey.css, is set into the page after its content (app/page.tsx), not here.

export interface HomeCounts {
  components: number;
  templates: number;
}

export function HomePage({ counts }: { counts: HomeCounts }) {
  const [away, setAway] = useState(false);
  // While the 3D stage draws Echo, it says when Echo is home on the device's screen.
  const [home, setHome] = useState<boolean | null>(null);
  useReveal();
  useSmoothScroll();
  // The light Echo carries follows it, every frame the stage draws it.
  const pool = useRef<LightPoolHandle>(null);
  const onPose = useCallback((p: DrawnPose) => pool.current?.move(p), []);

  return (
    <SoundProvider>
      {/*
        `bare`: the homepage wants the rail without a 109-item sidebar, and
        AppShell ships the skip link either way.
      */}
      <AppShell bare className="home-shell">
        <AppShell.Rail label="Site" brand={<Wordmark />}>
          <TopNavLinks links={LANDING_NAV} opening={LANDING_SEED} tools={<NavTools />} />
          {/* Under 56.25rem the destinations and the page's keys go into a menu (landing.css). */}
          <SiteMenu links={LANDING_NAV} tools={<NavTools />} />
        </AppShell.Rail>
        <AppShell.Content>
          {/* One layer for the page, so the light Echo carries lies over all of it and nothing past it. */}
          <div className="home-lit">
            {/* The page's ground from ChatGPT to the end of the blueprint: white, under everything. */}
            <WhiteRun />
            <LightPool ref={pool} mode={CARRIED.mode} amount={CARRIED.amount} size={CARRIED.size} />
            <HomeHero away={home === null ? away : !home} />
            <div className="home">
              <Puzzle />
              <Workflow />
              <MotionList />
              <Objects counts={counts} />
            </div>
            {/* The ChatGPT moment and the close run the page's whole width, so they sit outside the column. */}
            <PulledIn />
            <Blueprint />
            <Letter />
            <HomeFooter />
          </div>
        </AppShell.Content>
      </AppShell>
      <Echo3D onAwayChange={setAway} onHomeChange={setHome} onPose={onPose} />
      <Keychain />
    </SoundProvider>
  );
}
