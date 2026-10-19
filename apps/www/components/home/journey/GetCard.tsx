"use client";

/**
 * Add Echo to your AI: the road's first stop, before any of the steps it shows. Two ways
 * in, side by side: in a chat, the plugin; in your code, one command. The
 * same Echo in both: its components, your styles, and the check.
 *
 * Each way is a window of the same frame, and nothing else: a chat (the run's own question about a
 * component, and its answer) and a terminal (`init`, typed, and what it
 * really printed), each with its name on its bar. The terminal's command is
 * its key: the lit line at its top, press to copy. The plugin's key sits
 * quiet at the chat's foot, so neither way outweighs the other.
 *
 * A demo card like the others, it moves too, played
 * once it's framed: Echo presses Send in the chat, and the answer arrives;
 * then it hops onto the terminal, and `init` types itself and prints, a line
 * at a time. Echo never presses the two keys: one leaves the page and the
 * other copies, which are the visitor's to do. Without the demo (reduced
 * motion, no JavaScript) both windows are whole.
 */
import type { CSSProperties, ReactNode } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { ECHO_CLI } from "@registry/agent/guidance";
import { CopyIcon } from "@/components/home/CopyCommand";
import { cheerGuide } from "@/components/home/Guide";
import { useCopy } from "@/components/use-copy";
import { DemoCard, pressProps, useDemo } from "./DemoCard";
import { Composer, Mine, Theirs, withMention } from "./Thread";
import { ASK } from "./run";

const INIT = `npx ${ECHO_CLI} init`;

/**
 * What `npx echo-ui-cli init` printed in a new Vite app (echo-ui-cli 0.3.0,
 * 2026-10-14), word for word; "…" marks what's left out: npm's own install
 * lines, and the three paste-in steps it spells out.
 */
const INIT_OUTPUT = [
  "· vite app, npm, components in src/components/echo",
  "…",
  "· Added echo.json, echo-lock.json, src/components/echo/echo-theme.css, … the check hook and the Stop gate in .claude/settings.json, the echo-ui skill, the echo-design-eye skill, the echo-style-fit skill.",
  "Three things left, and they're yours to paste: …",
  "Then: npx echo-ui-cli add hardware-button",
];

/** A terminal's command line, lit: the command itself is the key, press to copy. The puzzle's terminal has them too. */
export function CommandLine({ cmd = INIT }: { cmd?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      className="term__line term__cmd"
      onClick={() => {
        void copy(cmd);
        cheerGuide(1600);
      }}
      aria-label={copied ? "Copied" : `Copy the command: ${cmd}`}
    >
      <span className="term__prompt" aria-hidden="true">
        ${" "}
      </span>
      <span className="term__typed" style={{ "--n": cmd.length } as CSSProperties}>
        {cmd}
      </span>
      <span className="term__copy" aria-hidden="true">
        <CopyIcon copied={copied} />
      </span>
    </button>
  );
}

/** When each press lands, s: Send in the chat; then onto the terminal, which runs init. And how long it all plays. */
const BEATS = [0.8, 2.6] as const;
const LENGTH = 6;

/**
 * A terminal, the way a code tool shows one: the command typed, then what it
 * printed, a line at a time. `state`: whole (no demo), waiting (its turn hasn't
 * come), typing (Echo is on it).
 */
function Terminal({ title, state }: { title: string; state: "whole" | "waiting" | "typing" }) {
  return (
    <figure className="term" data-state={state}>
      {/* Echo hops onto the window as its turn comes: the window isn't a key, so it lands, and the command runs. */}
      <figcaption className="term__bar jy-press" {...pressProps(1, { at: 0.5 })}>
        <span className="term__dots" aria-hidden="true" />
        {title}
      </figcaption>
      <pre className="term__body" aria-label={`What ${INIT} prints in a new Vite app`}>
        <CommandLine />
        {INIT_OUTPUT.map((line, i) => (
          <span key={i} className="term__line term__out" style={{ "--i": i } as CSSProperties}>
            {line}
          </span>
        ))}
      </pre>
    </figure>
  );
}

/**
 * A chat, opposite the terminal: the run's own question about a component,
 * and the start of its answer, in the same window frame. A different
 * exchange from the road's, so the two never tell the same step.
 */
function ChatWindow({ title, foot, asked, onSend }: { title: string; foot: ReactNode; asked: boolean; onSend: () => void }) {
  return (
    <figure className="term term--chat">
      <figcaption className="term__bar">
        <span className="term__dots" aria-hidden="true" />
        {title}
      </figcaption>
      <div className="echo-chat__thread jy-chat__thread get__thread" role="log" aria-label="A question in a chat">
        <Mine shown={asked}>{withMention(ASK.prompt)}</Mine>
        <Theirs shown={asked}>
          <p>
            Use <strong className="jy-key">{ASK.component}</strong> (<code>{ASK.item}</code>) {ASK.answer}
          </p>
        </Theirs>
      </div>
      <div className="get__compose">
        <Composer prompt={withMention(ASK.prompt)} press={0} sent={asked} onSend={onSend} />
      </div>
      <div className="term__foot">{foot}</div>
    </figure>
  );
}

function Ways() {
  const { step, live, setStep } = useDemo();
  const asked = live ? step >= 1 : true;
  const state = !live ? "whole" : step >= 2 ? "typing" : "waiting";
  return (
    <div className="get__ways">
      <section className="get__way" aria-label="In a chat">
        <ChatWindow
          title="In a chat"
          asked={asked}
          onSend={() => setStep(1)}
          foot={
            <HardwareButton variant="neutral" href="/docs/plugin">
              Get the plugin
            </HardwareButton>
          }
        />
      </section>
      <section className="get__way" aria-label="In your code">
        <Terminal title="In your code" state={state} />
      </section>
      <p className="get__bridge">
        <strong>Start in a chat, finish in your code.</strong> The chat ends with the commands for your code tool.
      </p>
    </div>
  );
}

export function GetCard() {
  return (
    <DemoCard id="get" name="Add Echo to your AI" presses={2} beats={BEATS} length={LENGTH} className="get">
      <Ways />
    </DemoCard>
  );
}
