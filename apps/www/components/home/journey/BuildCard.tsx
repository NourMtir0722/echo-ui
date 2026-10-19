"use client";

/**
 * Build with Echo: a demo card in two panes, as Make's, Pick's and Check's
 * are, so the road's cards share one frame (the chat alone, centred, left the
 * card's sides empty). Your conversation: the prompt goes
 * up as Echo presses Send, and the run's reply arrives the way an agent's
 * does, under "Used Echo UI": its progress a line at a time, each ticked, then
 * what it built and the files it wrote. Your screen: what it built, Pocket,
 * in Ink Instrument, on the run's two checks, a desktop and a phone
 * (PocketGlance.tsx). The frames wait empty; the desktop renders as the reply
 * says the first version builds, the phone as it says both checks passed,
 * and each is ticked.
 *
 * Every word in the conversation is the run's (run.ts), and so is every word
 * and number on the screen. Every line is laid out from the start and shown
 * on its turn, so nothing on the page moves.
 */
import type { CSSProperties } from "react";
import { DemoCard, useDemo } from "./DemoCard";
import { PocketScreens } from "./PocketGlance";
import { Chat, Composer, Files, Mine, Theirs, withMention } from "./Thread";
import { BUILD } from "./run";

/** When Send is pressed, and how long the card plays: the reply takes about four seconds to arrive. */
const BEATS = [0.8] as const;
const LENGTH = 5.2;

/** Which reply line each screen renders with: the desktop as the first version builds, the phone as both checks pass. */
const DESKTOP_AT = 1;
const PHONE_AT = 2;

const at = (i: number) => ({ "--i": i }) as CSSProperties;

/** The reply's parts, in the order they arrive: its progress lines, then what it built, then its files. */
function Reply() {
  return (
    <div className="bd__reply">
      <ul className="jy-steps" aria-label="What it did">
        {BUILD.steps.map((l, i) => (
          <li key={l} className="jy-step bd__arrive" style={at(i)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {l}
          </li>
        ))}
      </ul>
      <p className="bd__arrive" style={at(BUILD.steps.length)}>
        {BUILD.done}
      </p>
      <div className="bd__arrive" style={at(BUILD.steps.length + 1)}>
        <Files files={BUILD.files} />
      </div>
    </div>
  );
}

function Panes() {
  const { step, live, setStep } = useDemo();
  const sent = live ? step >= 1 : true;
  return (
    <div className="mk bd" data-arriving={live && sent ? "" : undefined} data-waiting={live && !sent ? "" : undefined}>
      <div className="mk__pane">
        <p className="mk__label">Your conversation</p>
        <Chat
          label="Building the screen"
          composer={<Composer prompt={withMention(BUILD.prompt)} press={0} sent={sent} onSend={() => setStep(1)} />}
        >
          <Mine shown={sent}>{withMention(BUILD.prompt)}</Mine>
          <Theirs shown={sent}>
            <Reply />
          </Theirs>
        </Chat>
      </div>
      <div className="mk__pane">
        <p className="mk__label">Your screen</p>
        <PocketScreens desktopAt={DESKTOP_AT} phoneAt={PHONE_AT} />
      </div>
      <p className="get__bridge">
        <strong>Next product, next style, same base.</strong> <a href="/docs/workflow">The workflow, step by step</a>
      </p>
    </div>
  );
}

export function BuildCard() {
  return (
    <DemoCard id="build" name="Build with Echo" presses={1} beats={BEATS} length={LENGTH}>
      <Panes />
    </DemoCard>
  );
}
