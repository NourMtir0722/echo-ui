"use client";

/**
 * On-brand and WCAG 2.2 AA, checked: a demo card, told on the screen itself,
 * the way a design review marks up a mock. What the
 * AI made: Pocket's heading and its line, with a Save button it wrote by
 * hand, a raw <button> in a blue typed by hand, and the code. Its screen takes
 * the height the conversation beside it sets, so the two sides end level. You
 * ask Echo to check it, in the conversation, as in Make, Pick and Build; Echo
 * presses Send. The blue button is selected, the way a design tool marks
 * something (Selection.tsx), its two findings numbered over it as in the code
 * and in the reply, and a leader runs to the check's verdict, lit on a strip
 * of screen glass (Echo's Annunciator): not your style. You ask it to fix
 * them: the blue button becomes Echo's where it stands, still selected, the verdict lights
 * "In your style" and "WCAG 2.2 AA", the code shows the change as a
 * diff, and the check finds nothing.
 *
 * The findings are the check's own answer on that line (check_code, run on it
 * against the registry's catalog: run.ts), in its order and its words; what
 * each says is wrong is set in the text's colour, the way to fix it muted. The
 * diff is the two real files, the slip and the fix, its unchanged lines
 * muted. The blue button is the slip as written, rendered: the landing's one
 * deliberate failure (the browser's black text on that blue fails AA), and
 * the check's whole point. The slip is a hand-typed blue, not a red: the
 * check's answer for it (the primary key's colour) reads as plainly right,
 * where a red's nearest role, a dim text colour, read to a visitor like the
 * check had made a mistake. The screen is in Echo's own style, as the page is
 * again from here on (the style is tried on in the Pick card only).
 *
 * Without the demo running, the card shows where the story ends: the whole
 * conversation, the fixed screen and the diff.
 */
import type { ReactNode } from "react";
import { Annunciator } from "@registry/echo/annunciator";
import { HardwareButton } from "@registry/echo/hardware-button";
import { DemoCard, useDemo } from "./DemoCard";
import { Selection } from "./Selection";
import { Chat, Composer, Mention, Mine, Theirs } from "./Thread";
import { CHECK } from "./run";

/** The check's two findings, in its order. */
const FINDINGS = [
  { n: 1, text: CHECK.findings[0]! },
  { n: 2, text: CHECK.findings[1]! },
] as const;

/** What you ask, first to check and then to fix. */
const ASK = "check this screen";
const FIX = "Fix them";

/**
 * What the check says of the button, on a strip of screen glass beside it
 * (Echo's Annunciator): every verdict printed there, the true ones lit.
 */
const VERDICT = [
  { value: "off", label: "Not your style", mark: "Not your style" },
  { value: "yours", label: "In your style", mark: "In your style" },
  { value: "aa", label: "WCAG 2.2 AA", mark: "WCAG 2.2 AA" },
] as const;

/** The check writes code in backticks: set it as code, the words unchanged. */
function ticks(msg: string) {
  return msg.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

/** A finding, split into where, the rule, what's wrong and the way to fix it (after the first colon). */
function parse(text: string) {
  const m = /^(\S+) \((\w+)\) (.*)$/.exec(text);
  const msg = m ? m[3]! : text;
  const cut = msg.indexOf(": ");
  return {
    at: m?.[1] ?? "",
    rule: m?.[2] ?? "",
    wrong: cut > 0 ? msg.slice(0, cut) : msg,
    fix: cut > 0 ? msg.slice(cut) : "",
  };
}

function Pin({ n, on }: { n: number; on: boolean }) {
  return (
    <span className="ck-pin" data-on={on ? "" : undefined} aria-hidden="true">
      {n}
    </span>
  );
}

/** Line 2 as the AI wrote it, with the check's two spots marked: 1 the colour, 2 the raw button. */
function SlipLine({ marked }: { marked: boolean }) {
  const mark = (n: number, body: ReactNode) => (
    <mark className="ck-mark" data-on={marked ? "" : undefined}>
      {body}
      <Pin n={n} on={marked} />
    </mark>
  );
  return (
    <>
      {"  return <"}
      {mark(2, "button")}
      {" style={{ background: "}
      {mark(1, "'#2563eb'")}
      {" }}>Save</button>;"}
    </>
  );
}

/** What the AI wrote; after the fix, the change, as a diff of the two files (its unchanged lines muted). */
function Code({ marked, fixed }: { marked: boolean; fixed: boolean }) {
  const slip = CHECK.slip.split("\n");
  const after = CHECK.fixed.split("\n");
  return (
    <figure className="ck-code" data-diff={fixed ? "" : undefined} aria-label={fixed ? `${CHECK.file}, after the fix` : CHECK.file}>
      <figcaption className="ck-code__file">{CHECK.file}</figcaption>
      <pre className="ck-code__pre">
        {fixed ? (
          <>
            {after.slice(0, 2).map((l, i) => (
              <span key={i} className="ck-line" data-diff="add">
                {l || " "}
              </span>
            ))}
            <span className="ck-line">{after[2]}</span>
            <span className="ck-line" data-diff="del">
              {slip[1]}
            </span>
            <span className="ck-line" data-diff="add">
              {after[3]}
            </span>
            <span className="ck-line">{after[4]}</span>
          </>
        ) : (
          <>
            <span className="ck-line">{slip[0]}</span>
            <span className="ck-line" data-hot={marked ? "" : undefined}>
              <SlipLine marked={marked} />
            </span>
            <span className="ck-line">{slip[2]}</span>
          </>
        )}
      </pre>
    </figure>
  );
}

/**
 * The screen the AI's code renders, marked up: the blue Save as written, and
 * Echo's in the same place; a selection round it, and a leader to the
 * check's verdict on a strip of screen glass.
 */
function Screen({ checked, fixed }: { checked: boolean; fixed: boolean }) {
  return (
    /*
      A picture of what the AI's code renders, not a control on this page: an image to assistive
      technology, out of the tab order (inert). So the slip's black on blue, the check's point, is
      a picture's text, which WCAG's contrast rule exempts; the code beside it says it in words.
    */
    <div
      className="ck-screen"
      role="img"
      aria-label={
        fixed
          ? "Pocket's heading, with Echo's Save button in the style: in your style, at WCAG 2.2 AA"
          : checked
            ? "Pocket's heading, with a flat blue Save button the AI wrote by hand, selected: not your style"
            : "Pocket's heading, with a flat blue Save button the AI wrote by hand"
      }
      inert
    >
      <div className="ck-strip">
        <p className="ck-strip__title">A little more in balance.</p>
        <p className="ck-strip__sub">Know what&rsquo;s left. Make room for what matters.</p>
        <div className="ck-stage" data-checked={checked ? "" : undefined} data-fixed={fixed ? "" : undefined}>
          <span className="ck-target">
            <span className="ck-slot">
              <span className="ck-was">
                <span className="ck-slip">
                  {/* The slip, exactly as the AI wrote it (no type: it isn't in a form, so it submits nothing). */}
                  <button style={{ background: "#2563eb" }} data-slip="">
                    Save
                  </button>
                  <span className="ck-slip__pins">
                    <Pin n={1} on={checked && !fixed} />
                    <Pin n={2} on={checked && !fixed} />
                  </span>
                </span>
              </span>
              <span className="ck-now">
                <HardwareButton variant="primary">Save</HardwareButton>
              </span>
            </span>
            <Selection className="ck-select" on={checked} />
            {/* Out of the selection: from its right edge to the verdict beside it, or down from its middle to the verdict under it. */}
            <span className="ck-lead" aria-hidden="true" />
          </span>
          <span className="ck-note">
            <Annunciator label="The check" marks={VERDICT} active={fixed ? ["yours", "aa"] : checked ? ["off"] : []} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Panes() {
  const { step, live, setStep } = useDemo();
  // Without the demo running, where the story ends: checked, and fixed.
  const checked = live ? step >= 1 : true;
  const fixed = live ? step >= 2 : true;
  return (
    <div className="ck">
      <div className="ck__made">
        <p className="mk__label">What the AI made</p>
        <Screen checked={checked} fixed={fixed} />
        {/* The code and its diff share one place, as tall as the diff from the start: the fix moves nothing. */}
        <div className="ck-swap">
          <div data-unseen={fixed ? "" : undefined}>
            <Code marked={checked} fixed={false} />
          </div>
          <div data-unseen={fixed ? undefined : ""}>
            <Code marked={false} fixed />
          </div>
        </div>
      </div>
      <div className="ck__check">
        <p className="mk__label">Your conversation</p>
        <Chat
          label="Checking what the AI made"
          composer={
            <Composer
              prompt={
                checked ? (
                  FIX
                ) : (
                  <>
                    <Mention /> {ASK}
                  </>
                )
              }
              press={checked ? 1 : 0}
              sent={fixed}
              onSend={() => setStep(checked ? 2 : 1)}
            />
          }
        >
          <Mine shown={checked}>
            <Mention /> {ASK}
          </Mine>
          <Theirs shown={checked} used={["check_code"]}>
            <p>{CHECK.head}</p>
            <ol className="ck-findings">
              {FINDINGS.map((f) => {
                const p = parse(f.text);
                return (
                  <li key={f.n} className="ck-finding">
                    <Pin n={f.n} on />
                    <span className="ck-finding__body">
                      <span className="ck-finding__rule">{p.rule}</span> {ticks(p.wrong)}
                      <span className="ck-finding__fix">{ticks(p.fix)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Theirs>
          <Mine shown={fixed}>{FIX}</Mine>
          <Theirs shown={fixed} used={["check_code"]}>
            <p>{CHECK.clean}</p>
          </Theirs>
        </Chat>
      </div>
    </div>
  );
}

/** When each press lands, s: Send to check; Send to fix, once the findings have been read. And how long it all plays. */
const BEATS = [0.8, 3.2] as const;
const LENGTH = 5.4;

export function CheckCard() {
  return (
    <DemoCard id="check" name="On-brand and WCAG 2.2 AA, checked" presses={2} beats={BEATS} length={LENGTH}>
      <Panes />
    </DemoCard>
  );
}
