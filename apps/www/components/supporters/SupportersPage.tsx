"use client";

/**
 * /supporters: Echo's island, where everyone who supports Echo has an Echo
 * of their own, with their name and their links. Noor's stands on the hill
 * in front of Echo's device; monthly supporters live in the village round
 * it, one-time supporters out in the meadows; free plots glow for the next.
 *
 * Under the island, everyone by name. A pressed Echo or name opens a card,
 * and the card is the address: every person has a link of their own
 * (/supporters#their-id) that opens the page on them.
 *
 * Who's on it comes from the supporters server as the page opens (live.ts):
 * the island is raised once the list is here, so it's raised once.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "echo-ui-core/theme/material.css";
import { SoundProvider } from "echo-ui-core/sound";
import { AppShell } from "@registry/echo/app-shell";
import { TopNavLinks, Wordmark } from "@/components/site/SiteTopBar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { everyone } from "./people";
import { useIsland } from "./live";
import { LitPeople, PersonCard, Photos } from "./parts";
import { Island } from "./Island";
import type { Studio } from "./photos";
import "@/components/home/home.css";
import "./supporters.css";

export function SupportersPage() {
  const island = useIsland();
  const people = useMemo(() => (island ? everyone(LANDING_SEED.accent, island.supporters) : null), [island]);
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set());
  const opened = people?.find((p) => p.id === openId);

  // Everyone's Echo photographed once (photos.ts), for the name tags and the cards, a few at a time.
  const [photos, setPhotos] = useState<ReadonlyMap<string, string>>(() => new Map());
  useEffect(() => {
    if (!people) return;
    let cancelled = false;
    let studio: Studio | null = null;
    const shot = new Map<string, string>();
    void import("./photos")
      .then(({ openStudio }) => openStudio())
      .then(async (s) => {
        studio = s;
        for (const p of people) {
          if (cancelled) return;
          shot.set(p.id, await s.shoot(p));
          if (shot.size % 8 === 0) setPhotos(new Map(shot));
        }
        if (!cancelled) setPhotos(new Map(shot));
      })
      // No WebGL: the names keep their dots and the cards their drawn Echo.
      .catch(() => {});
    return () => {
      cancelled = true;
      studio?.dispose();
    };
  }, [people]);

  // A person's own link opens their card; an opened card is the address. The link is read once, on
  // arrival, once everyone is known, and the address is only rewritten after that, so it can't be
  // wiped before it's read.
  const arrived = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!people) return;
    arrived.current ??= decodeURIComponent(location.hash.slice(1)) || null;
    const id = arrived.current;
    if (id && people.some((p) => p.id === id)) {
      setOpenId(id);
      // Arriving on someone's link: the island, where the camera is going to them, comes into view.
      document.querySelector(".sw-island")?.scrollIntoView({ block: "start" });
    }
    arrived.current = null;
  }, [people]);
  useEffect(() => {
    if (arrived.current !== null) return;
    history.replaceState(null, "", openId ? `#${openId}` : location.pathname);
  }, [openId]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    const down = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".sw-card, .sw-name, .sw-island")) close();
    };
    addEventListener("keydown", key);
    addEventListener("pointerdown", down);
    return () => {
      removeEventListener("keydown", key);
      removeEventListener("pointerdown", down);
    };
  }, [close]);

  return (
    <SoundProvider>
      <AppShell bare>
        <AppShell.Rail label="Site" brand={<Wordmark />}>
          {/* The page opens on the brand's blue (app/supporters/page.tsx), so the light key keeps it. */}
          <TopNavLinks opening={LANDING_SEED} />
        </AppShell.Rail>
        <AppShell.Content>
          <Photos.Provider value={photos}>
            <LitPeople.Provider value={lit}>
              {/* The island is the page: the whole first screen, finding and listing everyone included. */}
              <Island people={people} openId={openId} onOpen={(p) => setOpenId(p.id)} onLight={setLit} />
            </LitPeople.Provider>
          </Photos.Provider>
          <Photos.Provider value={photos}>{opened && people && <PersonCard person={opened} people={people} onClose={close} />}</Photos.Provider>
          <HomeFooter />
        </AppShell.Content>
      </AppShell>
    </SoundProvider>
  );
}
