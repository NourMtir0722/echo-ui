"use client";

/**
 * The island's parts that aren't the island: the card an Echo opens (its
 * number, name, links, and the video of its place to share) and everyone by
 * name, for the list that slides out.
 *
 * Supporters' links are paid for, so they say so to search engines
 * (`rel="sponsored"`); Noor's are her own (`rel="me"`).
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Creature } from "@registry/echo/creature";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Badge } from "@registry/echo/badge";
import { Progress } from "@registry/echo/progress";
import { Tag } from "@registry/echo/tag";
import { usePopupMotion, liquidBloom } from "echo-ui-core/presence";
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import type { LinkKind } from "@/components/support/supporters";
import { LINK_MARK, LINK_NAME } from "./links";
import { FOUNDING_THANKS, PLAN_LABEL, numberOf, type Person } from "./people";

/** Each person's Echo photographed in 3D (photos.ts): id to picture, as they arrive. */
export const Photos = createContext<ReadonlyMap<string, string>>(new Map());

/** Who's lit up on the island from the list: pointed at or focused. */
export const LitPeople = createContext<ReadonlySet<string>>(new Set());

export function LinkIcon({ kind }: { kind: LinkKind }) {
  const mark = LINK_MARK[kind];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {mark.line ? <path d={mark.d} fill="none" stroke="currentColor" strokeWidth="1.6" /> : <path d={mark.d} />}
    </svg>
  );
}

type Making = { state: "idle" } | { state: "making"; done: number } | { state: "ready"; url: string; file: File } | { state: "failed" };

/**
 * The video of someone's place: made on this device when asked (video.ts),
 * then shared through the phone's share sheet with the file attached, or
 * saved. Where a browser can't make it, the card offers the link to post
 * instead.
 */
function PlaceVideo({ person, people }: { person: Person; people: readonly Person[] }) {
  const photo = useContext(Photos).get(person.id);
  const [able, setAble] = useState<boolean | null>(null);
  const [making, setMaking] = useState<Making>({ state: "idle" });
  const stop = useRef<AbortController | null>(null);
  const link = `${REGISTRY_HOMEPAGE}/supporters#${person.id}`;
  const post = `https://x.com/intent/post?text=${encodeURIComponent("I'm on Echo's island")}&url=${encodeURIComponent(link)}`;

  useEffect(() => {
    let live = true;
    void import("./video").then(({ canMakeVideo }) => canMakeVideo()).then((ok) => live && setAble(ok), () => live && setAble(false));
    return () => {
      live = false;
      stop.current?.abort();
    };
  }, []);
  useEffect(() => () => void (making.state === "ready" && URL.revokeObjectURL(making.url)), [making]);

  async function make() {
    stop.current?.abort();
    const ctl = new AbortController();
    stop.current = ctl;
    setMaking({ state: "making", done: 0 });
    try {
      const { makeVideo, videoFile } = await import("./video");
      const blob = await makeVideo(person, people, { photo, signal: ctl.signal, onProgress: (done) => setMaking({ state: "making", done }) });
      const file = videoFile(person, blob);
      setMaking({ state: "ready", url: URL.createObjectURL(blob), file });
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMaking({ state: "failed" });
    }
  }

  async function share(file: File) {
    try {
      await navigator.share({ files: [file], title: "Echo’s island", text: `I'm on Echo's island: ${link}` });
    } catch {
      // Closing the share sheet is a choice, not a failure.
    }
  }

  function save(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  const canShareFile = making.state === "ready" && typeof navigator !== "undefined" && navigator.canShare?.({ files: [making.file] });

  if (able === false || making.state === "failed") {
    return (
      <div className="sw-video">
        <HardwareButton size="sm" variant="ghost" href={post} target="_blank" rel="noopener noreferrer">
          Share this place
        </HardwareButton>
      </div>
    );
  }
  return (
    <div className="sw-video" data-state={making.state}>
      {making.state === "idle" && (
        <HardwareButton size="sm" variant="primary" onClick={make} disabled={able === null}>
          Make the video
        </HardwareButton>
      )}
      {making.state === "making" && (
        <div className="sw-video__making" role="status">
          <Progress value={making.done} aria-label="Making the video" />
          <span>Making the video… {Math.round(making.done * 100)}%</span>
        </div>
      )}
      {making.state === "ready" && (
        <>
          <video className="sw-video__preview" src={making.url} autoPlay muted loop playsInline aria-label={`The video of ${person.name}'s place`} />
          <div className="sw-video__keys">
            {canShareFile ? (
              <HardwareButton size="sm" variant="primary" onClick={() => share(making.file)}>
                Share the video
              </HardwareButton>
            ) : (
              <HardwareButton size="sm" variant="primary" onClick={() => save(making.url, making.file.name)}>
                Download the video
              </HardwareButton>
            )}
            <HardwareButton size="sm" variant="ghost" href={post} target="_blank" rel="noopener noreferrer">
              Post on X
            </HardwareButton>
          </div>
        </>
      )}
    </div>
  );
}

/** The card a pressed Echo opens. */
export function PersonCard({ person, people, onClose }: { person: Person; people: readonly Person[]; onClose: () => void }) {
  const maker = person.plan === "maker";
  const card = useRef<HTMLDivElement>(null);
  const bloom = usePopupMotion<HTMLDivElement>(liquidBloom);
  const photo = useContext(Photos).get(person.id);
  useEffect(() => card.current?.focus(), [person.id]);
  return (
    <div
      key={person.id}
      ref={(el) => {
        card.current = el;
        bloom(el);
      }}
      className="sw-card"
      data-photo={photo ? "" : undefined}
      data-founding={person.founding ? "" : undefined}
      role="dialog"
      aria-label={person.name}
      tabIndex={-1}
    >
      <div className="sw-card__echo" aria-hidden="true">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={160} height={160} />
        ) : (
          <Creature size={64} accent={person.colour} mood={person.asleep ? "sleep" : "done"} />
        )}
      </div>
      <div className="sw-card__who">
        {person.no !== undefined && <p className="sw-card__no">{numberOf(person)}</p>}
        <p className="sw-card__name">{person.name}</p>
        <p className="sw-card__plan">
          {PLAN_LABEL[person.plan]}
          {person.since ? `, since ${person.since}` : ""}
          {person.times && person.times > 1 ? `. Supported Echo ${person.times === 2 ? "twice" : `${person.times} times`}` : ""}
        </p>
        {person.asleep && <p className="sw-card__asleep">Asleep for now: supporting Echo again wakes it up.</p>}
        {person.founding && (
          <p className="sw-card__founding">
            <Badge variant="accent" size="sm">
              Founding
            </Badge>
            <span>{FOUNDING_THANKS}</span>
          </p>
        )}
      </div>
      <div className="sw-card__do">
        {person.links.length > 0 && (
          <ul className="sw-card__links">
            {person.links.map((l) => (
              <li key={l.kind}>
                <HardwareButton
                  size="sm"
                  variant="neutral"
                  href={l.href}
                  target="_blank"
                  rel={maker ? "me noopener noreferrer" : "sponsored noopener noreferrer"}
                  icon={<LinkIcon kind={l.kind} />}
                >
                  {LINK_NAME[l.kind]}
                </HardwareButton>
              </li>
            ))}
          </ul>
        )}
        <PlaceVideo person={person} people={people} />
      </div>
      <button type="button" className="sw-card__close" onClick={onClose} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Everyone on the island, by name, for the list that slides out: a name is a
 * plate with its Echo on it; point at it and its Echo lights up on the
 * island, press it and the camera goes to it as its card opens. It's also
 * what a keyboard and a screen reader use: every name is a key.
 */
export function Everyone({
  people,
  onOpen,
  onLight,
}: {
  people: readonly Person[];
  onOpen: (p: Person) => void;
  onLight: (ids: ReadonlySet<string>) => void;
}) {
  const photos = useContext(Photos);
  const none = new Set<string>();
  const groups: { title: string; people: Person[] }[] = [
    { title: PLAN_LABEL.maker, people: people.filter((p) => p.plan === "maker") },
    { title: "Monthly", people: people.filter((p) => p.plan === "monthly" && !p.asleep) },
    { title: "One-time", people: people.filter((p) => p.plan === "once" && !p.asleep) },
    // Supporters whose time has run out, still on the island, sleeping.
    { title: "Asleep", people: people.filter((p) => p.asleep) },
  ];
  return (
    <div className="sw-everyone">
      {groups.map(
        (g) =>
          g.people.length > 0 && (
            <div key={g.title} className="sw-everyone__group">
              <p className="sw-everyone__title">{g.title}</p>
              <ul className="sw-everyone__names">
                {g.people.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="sw-name"
                      data-founding={p.founding ? "" : undefined}
                      aria-label={`${p.name}${p.founding ? ", founding supporter" : ""}`}
                      onClick={() => onOpen(p)}
                      onPointerEnter={() => onLight(new Set([p.id]))}
                      onPointerLeave={() => onLight(none)}
                      onFocus={() => onLight(new Set([p.id]))}
                      onBlur={() => onLight(none)}
                    >
                      <Tag>
                        {photos.get(p.id) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="sw-name__photo" src={photos.get(p.id)} alt="" width={26} height={26} />
                        ) : (
                          <span className="sw-name__dot" style={{ background: p.colour }} aria-hidden="true" />
                        )}
                        {p.name}
                      </Tag>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
      {people.length === 1 && (
        <p className="sw-everyone__first">
          No supporters yet. <a href="/support">Yours could be No. 001.</a>
        </p>
      )}
    </div>
  );
}
