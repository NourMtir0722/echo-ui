"use client";

/**
 * The crowd: Echo's supporters as creatures, piled along the foot of the
 * section the way the balls pile up on a conference's ticket page, except
 * every one here is somebody. Each wears its own shade of the brand's blue,
 * the same as its Echo on the island (supporters/finish.ts), with their name
 * on a tag that leads to their place there.
 *
 * Nobody is invented. Before anyone has asked to be here, the pile is Echo in
 * the page's colour and four unnamed Echos in shades of the brand's blue, as
 * on the island, beside an empty place that says "Be the first". The names are a list (the creatures are
 * drawings), so a screen reader hears who, not how they're drawn.
 *
 * Who's here comes from the supporters server as the page opens (live.ts).
 * Until it answers, and if it can't, the pile is the unnamed one without the
 * empty place: nothing says there's no one when that isn't known.
 */
import type { CSSProperties, ReactNode } from "react";
import { Creature } from "@registry/echo/creature";
import { HardwareButton } from "@registry/echo/hardware-button";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { blueOf } from "@/components/supporters/finish";
import { useIsland } from "@/components/supporters/live";
import type { Supporter } from "./supporters";

/** Before anyone has joined: four Echos in the island's own shades of the brand's blue. */
const PLACEHOLDER = ["one", "two", "three", "four"].map((id) => blueOf({ id, plan: "monthly" }, LANDING_SEED.accent));

/** How many creatures the pile draws; the rest are counted. */
const SHOWN = 24;

/** A place in the pile: small, stable offsets, so it reads as a heap and not a row. */
function place(i: number) {
  const size = 58 + ((i * 37) % 5) * 9;
  const lift = ((i * 53) % 4) * 7;
  const turn = (((i * 29) % 7) - 3) * 3;
  return { size, lift, turn };
}

function Body({
  colour,
  i,
  asleep,
  as: Tag = "li",
  children,
}: {
  colour?: string;
  i: number;
  /** A supporter whose time has run out: their Echo sleeps here too. Unnamed Echos doze as they like. */
  asleep?: boolean;
  as?: "li" | "span";
  children?: ReactNode;
}) {
  const { size, lift, turn } = place(i);
  const mood = asleep === undefined ? (i % 3 === 0 ? "idle" : "sleep") : asleep ? "sleep" : "idle";
  return (
    <Tag className="crowd__one" style={{ "--lift": `${lift}px`, "--turn": `${turn}deg` } as CSSProperties}>
      <span className="crowd__body" aria-hidden="true">
        <Creature size={size} accent={colour} mood={mood} />
      </span>
      {children}
    </Tag>
  );
}

export function Crowd() {
  const island = useIsland();
  return <Pile supporters={island?.supporters ?? []} first={island?.known === true} />;
}

/** The pile itself: the supporters, or, with none, the unnamed Echos (and the empty place, when `first`). */
function Pile({ supporters, first }: { supporters: readonly Supporter[]; first: boolean }) {
  const shown = supporters.slice(0, SHOWN);
  const more = supporters.length - shown.length;
  return (
    <div className="crowd">
      {shown.length === 0 ? (
        // Nobody yet: a drawing, and the line under it says what it's for.
        <div className="crowd__pile" aria-hidden="true">
          <Body as="span" i={0} />
          {PLACEHOLDER.map((colour, i) => (
            <Body as="span" key={colour} i={i + 1} colour={colour} />
          ))}
          {first && (
            <span className="crowd__one crowd__one--empty">
              <span className="crowd__slot" />
              <span className="crowd__tag">Be the first</span>
            </span>
          )}
        </div>
      ) : (
        <ul className="crowd__pile" aria-label="Supporters">
          {shown.map((s, i) => (
            <Body key={s.id} i={i} colour={blueOf(s, LANDING_SEED.accent)} asleep={!!s.asleep}>
              <span className="crowd__tag">
                <a href={`/supporters#${s.id}`}>{s.name}</a>
              </span>
            </Body>
          ))}
        </ul>
      )}
      <p className="crowd__line">
        {more > 0 ? `And ${more} more. ` : ""}
        Everyone who supports Echo gets an Echo on Echo&rsquo;s island, with their name and their links. You name
        yours right after paying.
      </p>
      {/* The way to the island, as a key: the crowd is the supporters, so this is where people look for them. */}
      <HardwareButton variant="neutral" href="/supporters">
        Visit the island
      </HardwareButton>
    </div>
  );
}
