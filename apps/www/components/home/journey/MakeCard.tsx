"use client";

/**
 * Make a style with AI: a demo card in two panes, the way a builder sees it.
 * Your conversation, as the agent shows it: the board goes to the AI with
 * the plugin mentioned, Echo presses Send, the agent uses the design-eye skill
 * and gives its reading, then asks what the board can't settle in its
 * questions card (three pages); Echo picks the run's answer to each and
 * presses Continue, and the reply lists the files the run wrote. Your style:
 * the board on the desk, then sorted the way Design Eye grouped it, then each
 * group gathered into a deck and turned over into the style it became, a
 * sheet of its own (StyleSheets.tsx). (Their places on the seven axes are the
 * run's too, but too fine to read at a glance.)
 *
 * Quick, on purpose (four pushes to see it through was too long): the questions come a beat apart, and the whole card plays in about
 * eight seconds; a push of the wheel while it plays hurries the rest.
 *
 * Every word in the conversation is the run's (run.ts), trimmed only where it
 * says "…".
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { RadioGroup } from "@registry/echo/radio-group";
import { DemoCard, pressProps, useDemo } from "./DemoCard";
import { DECK, StyleSheets, TURN_LAG } from "./StyleSheets";
import { Chat, Composer, Files, Mention, Mine, Theirs } from "./Thread";
import { BOARD, INK, MAKE, PIGMENT, boardSrc } from "./run";

/** Where each photo lies on the desk, and how it's turned: fixed, so the desk is the same every visit. */
const DESK: readonly [number, number, number, number][] = [
  // left %, top %, width %, turn deg
  [2, 4, 30, -4],
  [30, 0, 27, 3],
  [60, 3, 33, -2],
  [8, 30, 25, 5],
  [36, 26, 30, -3],
  [70, 28, 27, 4],
  [0, 54, 22, -6],
  [22, 50, 28, 2],
  [50, 52, 24, -4],
  [74, 55, 24, 6],
  [6, 76, 27, 3],
  [34, 74, 24, -5],
  [58, 76, 22, 2],
  [80, 4, 18, 7],
  [84, 78, 16, -3],
  [44, 6, 14, -8],
];

/**
 * Sent, the board sorts itself the way Design Eye grouped it, by visual
 * logic: the run's two groups, named in the reading's own words until the
 * styles have names.
 */
const GROUPS = [
  { key: "ink", reading: "technical spec sheets", style: INK.title },
  { key: "pigment", reading: "blurred organic colour", style: PIGMENT.title },
] as const;

/**
 * When each press lands, s: Send; the three answers, a beat apart; Continue;
 * then Echo points at the style as it turns over. And how long it all plays.
 */
const BEATS = [0.8, 2.3, 3.2, 4.1, 4.9, 5.8] as const;
const LENGTH = 8.2;

/** How long a group's photos take to gather into their deck, s, and how long one waits after the one before it. */
const GATHER = 0.5;
const STAGGER = 0.018;
/** When Pigment Window's deck has gathered and starts to turn edge-on, s after the styles are handed back. */
const TURN_AT = 0.56;
/** How long a deck takes to turn edge-on, s: its sheet turns on from there (StyleSheets.tsx `turn`). */
const EDGE_ON = 0.2;

function Board({ gathered, named, distilled = false }: { gathered: boolean; named: boolean; distilled?: boolean }) {
  const list = useRef<HTMLUListElement>(null);
  const figure = useRef<HTMLElement>(null);
  const boxes = useRef<Map<string, { x: number; y: number; w: number; h: number; r: number }> | null>(null);
  /*
   * The sort glides on transforms only: each photo's box is measured before
   * and after, and it travels from one to the other on the compositor.
   * Animating its left, top and width instead laid out and repainted all
   * sixteen every frame.
   */
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const items = [...ul.children] as HTMLElement[];
    const next = new Map(
      items.map((li) => [li.dataset.src!, { x: li.offsetLeft, y: li.offsetTop, w: li.offsetWidth, h: li.offsetHeight, r: parseFloat(getComputedStyle(li).getPropertyValue("--r")) || 0 }]),
    );
    const prev = boxes.current;
    boxes.current = next;
    if (!prev || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    items.forEach((li, i) => {
      const a = prev.get(li.dataset.src!);
      const b = next.get(li.dataset.src!);
      if (!a || !b || (a.x === b.x && a.y === b.y && a.w === b.w)) return;
      const dx = a.x + a.w / 2 - (b.x + b.w / 2);
      const dy = a.y + a.h / 2 - (b.y + b.h / 2);
      const from = gathered ? a.r : 0;
      const to = gathered ? 0 : b.r;
      li.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${a.w / b.w}, ${a.h / b.h}) rotate(${from}deg)` },
          { transform: `rotate(${to}deg)` },
        ],
        { duration: 700, delay: i * 18, easing: "cubic-bezier(0.65, 0, 0.2, 1)", fill: "backwards" },
      );
    });
  }, [gathered]);
  /*
   * Distilled: the run hands its two styles back, and each group of photos
   * becomes the sheet it was read as. The technical sheets gather into a deck
   * where Ink Instrument lies, the soft colour where Pigment Window does, each
   * deck squared up, DECK as wide as its sheet, a little thick, Pigment Window's
   * turned as its sheet is; the piles' names go first. Then each deck turns
   * edge-on, and its sheet turns in from that edge (StyleSheets.tsx `turn`):
   * Pigment Window first, Ink Instrument, in front, TURN_LAG after. Put back at
   * once when the demo starts again; never under reduced motion.
   */
  const was = useRef(distilled);
  useEffect(() => {
    const ul = list.current;
    const fig = figure.current;
    if (!ul || !fig) return;
    const before = was.current;
    was.current = distilled;
    const items = [...ul.children] as HTMLElement[];
    const names = [...fig.querySelectorAll<HTMLElement>(".jy-board__group")];
    if (!distilled) {
      for (const el of [...items, ...names]) for (const a of el.getAnimations()) if (a.id === "distil") a.cancel();
      for (const li of items) li.style.removeProperty("z-index");
      return;
    }
    if (before || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cell = fig.closest(".mk__style");
    const sheets = [cell?.querySelector(".jy-sheet--ink"), cell?.querySelector(".jy-sheet--pigment")];
    const boxes = sheets.map((el) => el?.getBoundingClientRect());
    if (!boxes[0] || !boxes[1]) return;
    // The card may be drawn smaller than laid out (fitted to a short window): moves are in its own px.
    const k = ul.getBoundingClientRect().width / (ul.offsetWidth || 1);
    for (const n of names) n.animate([{ opacity: 1 }, { opacity: 0 }], { id: "distil", duration: 200, fill: "forwards" });
    const count = [0, 0];
    items.forEach((li) => {
      const g = li.dataset.group === "0" ? 0 : 1;
      const n = count[g]!++;
      const sheet = boxes[g]!;
      // Each group's deck turns when its sheet turns in: Pigment Window's at TURN_AT, Ink Instrument's TURN_LAG later.
      const turnAt = TURN_AT + (g === 0 ? TURN_LAG : 0);
      const startAt = n * STAGGER;
      const end = turnAt + EDGE_ON;
      const r = li.getBoundingClientRect();
      // The sheet's own width: its box is a little wider for being turned (Pigment Window, 2.5°).
      const width = sheets[g] instanceof HTMLElement ? sheets[g].offsetWidth * k : sheet.width;
      const dx = (sheet.left + sheet.width / 2 - (r.left + r.width / 2)) / k;
      // Stacked: each photo a hair above the one under it, so the deck has a little thickness.
      const dy = (sheet.top + sheet.height / 2 - (r.top + r.height / 2)) / k - n * 1.4;
      const scale = (width * DECK) / (r.width || 1);
      // Squared up, near enough, as a deck tapped on the desk is; Pigment Window's lies turned as its sheet does.
      const turn = (g === 1 ? 2.5 : 0) + (((n * 37) % 7) - 3) * 0.6;
      const deck = `perspective(900px) translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${scale}) rotateY(0deg)`;
      const edge = `perspective(900px) translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${scale}) rotateY(90deg)`;
      const rest = "perspective(900px) translate(0px, 0px) rotate(0deg) scale(1) rotateY(0deg)";
      // Ink Instrument's deck lies over Pigment Window's, as its sheet will.
      li.style.zIndex = g === 0 ? "2" : "1";
      li.animate(
        [
          { transform: rest, offset: 0 },
          { transform: rest, offset: startAt / end, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          { transform: deck, offset: Math.min(turnAt, startAt + GATHER) / end },
          { transform: deck, offset: turnAt / end, easing: "cubic-bezier(0.55, 0, 1, 0.45)", opacity: 1 },
          { transform: edge, offset: 1, opacity: 1 },
        ],
        { id: "distil", duration: end * 1000, fill: "forwards" },
      );
    });
  }, [distilled]);

  // Where each photo goes once sorted: its group, and its place in it.
  const slot = new Map<string, { g: number; k: number }>();
  const count = [0, 0];
  for (const b of BOARD) {
    const g = b.group === "ink" ? 0 : 1;
    slot.set(b.src, { g, k: count[g]!++ });
  }
  return (
    <figure ref={figure} className="jy-board" data-sorted={gathered ? "" : undefined}>
      {gathered && (
        <div className="jy-board__groups" aria-hidden="true">
          {GROUPS.map((g, i) => (
            <span key={g.key} className="jy-board__group" style={{ "--g": i } as CSSProperties}>
              {named ? g.style : g.reading}
            </span>
          ))}
        </div>
      )}
      <ul ref={list} className="jy-board__photos" aria-label="The mood board, 16 images">
        {BOARD.map((b, i) => {
          const [left, top, width, turn] = DESK[i]!;
          const { g, k } = slot.get(b.src)!;
          // Sorted: the technical sheets in three columns on the left, the soft colour in two on the right.
          const cols = g === 0 ? 3 : 2;
          const sl = (g === 0 ? 0 : 61) + (k % cols) * 19.5;
          const st = 9 + Math.floor(k / cols) * 22;
          return (
            <li
              key={b.src}
              className="jy-board__photo"
              data-src={b.src}
              data-group={g}
              style={{ "--l": `${left}%`, "--t": `${top}%`, "--w": `${width}%`, "--r": `${turn}deg`, "--i": i, "--sl": `${sl}%`, "--st": `${st}%` } as CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={boardSrc(b.src)} alt={b.alt} width={b.w} height={b.h} loading="lazy" decoding="async" />
            </li>
          );
        })}
      </ul>
      <figcaption className="jy-board__caption">
        A mood board, 16 images. Credits at the foot of the page.
      </figcaption>
    </figure>
  );
}

function Mosaic() {
  return (
    <span className="jy-mosaic" aria-hidden="true">
      {BOARD.slice(0, 8).map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.src} src={boardSrc(b.src)} alt="" width={b.w} height={b.h} loading="lazy" decoding="async" />
      ))}
      <span className="jy-mosaic__more">+8</span>
    </span>
  );
}

/**
 * Design Eye's questions, the way the agent asks them: one card, a page per
 * question ("1 of 3"), each answer a numbered option, Skip and Continue at the
 * foot. Echo picks the run's answer to each in turn (presses 1 to 3), then
 * presses Continue (4). The visitor can pick any option; the card moves on
 * the same way. Every question shares one place, so the card never changes
 * size as the pages turn.
 */
function Questions({ shown }: { shown: boolean }) {
  const { step, held, live, setStep } = useDemo();
  const qs = MAKE.questions;
  const [picked, setPicked] = useState<Record<number, string>>({});
  const answered = (i: number) => (live ? step >= i + 2 : true);
  const cur = live ? Math.min(Math.max(step - 1, 0), qs.length - 1) : qs.length - 1;
  const done = live ? step >= 5 : true;
  return (
    <section className="jy-qcard" data-unseen={shown ? undefined : ""} aria-label="Design Eye's questions">
      <header className="jy-qcard__head">
        <span className="jy-qcard__title">Questions</span>
        <span className="jy-qcard__pager">
          {cur + 1} of {qs.length}
        </span>
      </header>
      <div className="jy-qcard__stack">
        {qs.map((q, i) => (
          <div key={i} className="jy-qcard__q" data-unseen={i === cur ? undefined : ""}>
            <p className="jy-qcard__text">{q.q}</p>
            <RadioGroup
              orientation="vertical"
              aria-label={`Question ${i + 1} of ${qs.length}`}
              value={picked[i] ?? (answered(i) ? q.options[q.answer]! : "")}
              onValueChange={(v) => {
                setPicked((p) => ({ ...p, [i]: String(v) }));
                setStep(i + 2);
              }}
            >
              {q.options.map((o, k) => (
                <RadioGroup.Item key={o} value={o}>
                  <span className="jy-qcard__opt" {...(k === q.answer ? pressProps(i + 1, { at: 0.15 }) : {})}>
                    <span className="jy-qcard__n" aria-hidden="true">
                      {k + 1}
                    </span>
                    {o}
                  </span>
                </RadioGroup.Item>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
      <footer className="jy-qcard__foot">
        <HardwareButton size="sm" disabled={done} onClick={() => setStep(5)}>
          Skip
        </HardwareButton>
        <span className="jy-press" {...pressProps(4)}>
          <HardwareButton size="sm" variant="primary" held={held === 4} disabled={!answered(qs.length - 1) || done} onClick={() => setStep(5)}>
            Continue
          </HardwareButton>
        </span>
      </footer>
    </section>
  );
}

function Panes() {
  const { step, live, setStep } = useDemo();
  const sent = live ? step >= 1 : true;
  const submitted = live ? step >= 5 : true;
  return (
    <div className="mk mk--talk">
      <div className="mk__pane">
        <p className="mk__label">Your conversation</p>
        <Chat
          label="Making a style from the board"
          composer={
            <Composer
              prompt={
                <>
                  <Mention /> {MAKE.prompt}
                </>
              }
              press={0}
              sent={sent}
              onSend={() => setStep(1)}
            />
          }
        >
          <Mine shown={sent}>
            <Mosaic />
            <Mention /> {MAKE.prompt}
          </Mine>
          <Theirs shown={sent} used={["design-eye"]}>
            <p>
              … The strongest shared idea is <strong className="jy-key">precision with one expressive interruption</strong> …
            </p>
          </Theirs>
          <Questions shown={sent} />
          <Theirs shown={submitted}>
            <p>{MAKE.saved}</p>
            <Files files={MAKE.files} />
          </Theirs>
        </Chat>
      </div>
      <div className="mk__pane">
        <p className="mk__label jy-press" {...pressProps(5, { mode: "point" })}>
          Your style
        </p>
        {/* The board and the style share one place, so the card is as tall as the taller from the start. */}
        <div className="mk__style">
          <div className="mk__desk" data-unseen={submitted ? "" : undefined}>
            <Board gathered={sent} named={false} distilled={submitted} />
          </div>
          <div data-unseen={submitted ? undefined : ""}>
            {/* Each sheet turns in as its deck reaches edge-on. */}
            <StyleSheets shown={submitted} after={TURN_AT + EDGE_ON} entrance="turn" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MakeCard() {
  return (
    <DemoCard
      id="make"
      name="Make a style with AI"
      presses={6}
      beats={BEATS}
      length={LENGTH}
    >
      <Panes />
    </DemoCard>
  );
}
