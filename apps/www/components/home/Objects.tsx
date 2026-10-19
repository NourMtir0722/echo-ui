"use client";

/**
 * The objects Echo ships beyond form controls: a dial, a jog wheel, a flip
 * board, a lamp cord, all built from the same parts as a
 * button, all running. Each name opens its page, which has the command that
 * installs it: six commands here would be the docs. Each
 * stands on the same shelf at about the same size, so none outweighs the
 * rest (a paper receipt stood here once, and did).
 *
 * Six, on a sheet divided by the seam, nothing around each object: they
 * bring their own material. Every one is lit at rest (dimmed, an object reads
 * as switched off); the one nearest the middle of the window, or the one you
 * point at, is where Echo stands. Then a lit frame: a whole screen made of Echo, which answers the
 * question the pieces raise (can I build a real product with this?). The
 * screens are Echo's templates, scaled to the frame (FitScreen): nothing in
 * the frame scrolls, so the wheel always moves the page. They run, so you
 * can use them. The links under it open the real ones.
 *
 * The frame is one size whichever screen is in it (both are shown at the
 * chat's height; the console's foot fades out), so switching screens never
 * moves the page, and its keys are above it: you press, and read the new
 * screen from its top. On a phone the templates aren't drawn small: each is
 * laid out at the frame's width, as it reflows on a phone of its own, at the
 * height the window has room for. The keys and the frame fit the window together, and
 * the page comes to rest with them whole (`data-snap`, snap.ts). Before it
 * loads, its box already holds that size.
 *
 * The guide perches on the Creature's cell: the mascot, looking down at the
 * component you install.
 */
import { useRef, useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { BigTitle } from "@/components/home/BigTitle";
import { useAwake } from "@/components/home/awake";
import { BenchStage, Deferred, TemplateStage } from "@/components/home/Deferred";
import { GuideStop } from "@/components/home/Guide";
import { FitScreen } from "@/components/home/FitScreen";
import type { TemplateKey } from "@/components/home/stages";
import type { HomeCounts } from "@/components/home/HomePage";

/**
 * Named in words, with the component's own name as the tag (as the motion
 * buttons are). Two of them are things a builder puts in a product as it is:
 * a due date, and work running in the background. Each is about the size of
 * the others, so none outweighs the shelf.
 */
const OBJECTS: { slug: string; name: string; tag: string; what: string }[] = [
  { slug: "tuner", name: "Tuner", tag: "Tuner", what: "Pick any number on a dial, like tuning a radio." },
  { slug: "jog-wheel", name: "Jog wheel", tag: "JogWheel", what: "A heavy wheel with no ends: slow clicks for precision, a spin to travel." },
  { slug: "split-flap", name: "Split flap", tag: "SplitFlap", what: "A number that flips like a train station board." },
  { slug: "date-tile", name: "Date tile", tag: "DateTile", what: "A day on a desk calendar's page, turning over when the date moves." },
  { slug: "pull-cord", name: "Pull cord", tag: "PullCord", what: "An on and off switch you pull, like a lamp cord." },
  { slug: "status-island", name: "Status island", tag: "StatusIsland", what: "Work running in the background, in one small slab that opens when it needs you." },
];

/** The height both screens are shown at, in their own px: the chat's whole window. */
const SCREEN_H = 720;
/** Where the screens are laid out at the frame's own width, unscaled: the page's phone width (home.css). */
const PHONE = "(max-width: 47.99rem)";

const SCREENS: { key: TemplateKey; name: string }[] = [
  { key: "console", name: "Console" },
  { key: "chat", name: "Chat" },
];

export function Objects({ counts }: { counts: HomeCounts }) {
  const [screen, setScreen] = useState<TemplateKey>("console");
  const grid = useRef<HTMLDivElement>(null);
  const { wake } = useAwake(grid, ":scope > figure");
  return (
    <section className="sec objects" aria-labelledby="objects-h" data-guide-section="">
      {/* The title alone: the objects show the rest (one line a stop). */}
      <BigTitle id="objects-h" title="Dials, tiles and flip boards" />

      <div ref={grid} className="objects__grid" data-reveal="">
        {OBJECTS.map((o, i) => (
          <figure key={o.slug} className="objects__cell" data-object={o.slug} {...wake(i)}>
            {i === 0 && <GuideStop className="objects__stop" />}
            <Deferred className="objects__stage">
              <BenchStage slug={o.slug} />
            </Deferred>
            <figcaption className="objects__label">
              <span className="objects__title">
                <a href={`/docs/${o.slug}`} className="objects__name">
                  {o.name}
                </a>
                <code className="objects__tag">{o.tag}</code>
              </span>
              <span className="objects__what">{o.what}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="objects__screens" data-reveal="">
        {/* On the page's grid, as every section's title is: the title on the left, its line on the right. */}
        <BigTitle id="screens-h" as="h3" size="sub" title="Or a whole screen">
          <strong>The same parts</strong>, put together into a working app.
        </BigTitle>
        <div className="objects__show" data-snap="">
          {/* The keys on the frame's left, the way in full on its right, as the motion panel's are. */}
          <div className="objects__bar">
            <div className="objects__pick" role="group" aria-label="Screen">
              {SCREENS.map((s) => (
                <HardwareButton key={s.key} size="sm" aria-pressed={screen === s.key} onClick={() => setScreen(s.key)}>
                  {s.name}
                </HardwareButton>
              ))}
            </div>
            <p className="objects__open">
              Open <a href="/templates/console">Console</a> or <a href="/templates/chat">Chat</a> in full.
            </p>
          </div>
          <div className="objects__frame">
            <Deferred className="objects__screen" margin={400}>
              <FitScreen width={1180} reflow={PHONE} crop={SCREEN_H} className="objects__fit">
                <TemplateStage which={screen} />
              </FitScreen>
            </Deferred>
          </div>
        </div>
      </div>

      <div className="objects__more">
        <HardwareButton href="/docs" size="lg">
          See all {counts.components} components
        </HardwareButton>
      </div>
    </section>
  );
}
