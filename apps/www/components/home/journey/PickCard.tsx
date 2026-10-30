"use client";

/**
 * Pick it, and try it on: a demo card in two panes. Your conversation: the
 * builder asks which style fits a budgeting app for students; Echo's fit tool
 * ranks the styles (its top two, from the run), and the AI (Style Fit) picks
 * one and says why, where its pick differs from that order.
 * Try it on: Echo flips the style toggle, and the whole page changes into Ink
 * Instrument (wear.ts); flipped back, the page is Echo's own again. Then Echo
 * points at the promise under the parts, and "WCAG 2.2 AA" is selected
 * (Selection.tsx): whatever you wear, text stays readable. The style is worn only while
 * this card is the one being read: on to Build with Echo (or back up to Make),
 * the page is Echo's own again, so the next steps aren't read in a style
 * they don't show.
 *
 * The reply is the run's, word for word, trimmed where it says "…". The page
 * wears the whole style (its corners, type and finish too), as a project does;
 * that the plugin's link carries only the colours is /docs/plugin's to say.
 * Under reduced motion nothing is put on for you: the key is yours to press.
 */
import { useEffect, useRef, useState } from "react";
import { onFrame } from "@/components/home/frame";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Switch } from "@registry/echo/switch";
import { Slider } from "@registry/echo/slider";
import { Segmented } from "@registry/echo/segmented";
import { Knob } from "@registry/echo/knob";
import { DemoCard, pressProps, useDemo } from "./DemoCard";
import { Selection } from "./Selection";
import { Chat, Composer, Files, Mention, Mine, Theirs } from "./Thread";
import { CANDIDATES, FIT, INK } from "./run";
import { wearOnPage } from "./wear";

/** A few real parts to press, each with its name: the parts the style sheet draws (blueprint.ts `PARTS`, by `data-part`). */
export function Feel() {
  const [on, setOn] = useState(true);
  const [level, setLevel] = useState(60);
  const [seg, setSeg] = useState(1);
  // Four periods fill the wide cell; a phone's cell holds three without the Segmented scrolling inside itself.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 30rem)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const periods = narrow ? ["Week", "Month", "Year"] : ["Day", "Week", "Month", "Year"];
  const [knob, setKnob] = useState(40);
  const [saved, setSaved] = useState(0);
  return (
    <ul className="feel" aria-label="Press them">
      <li className="feel__item" data-part="button">
        <HardwareButton
          variant="primary"
          impact
          onClick={() => setSaved((n) => n + 1)}
        >
          Save
        </HardwareButton>
        <span className="feel__name">
          HardwareButton{saved ? ` · ${saved}×` : ""}
        </span>
      </li>
      <li className="feel__item" data-part="switch">
        <Switch
          checked={on}
          onCheckedChange={setOn}
          aria-label="Notifications"
        />
        <span className="feel__name">Switch</span>
      </li>
      <li className="feel__item feel__item--pair feel__item--fill" data-part="slider">
        <Slider value={level} onValueChange={setLevel} aria-label="Level" />
        <span className="feel__name">Slider</span>
      </li>
      <li className="feel__item feel__item--wide" data-part="segmented">
        <Segmented
          size="sm"
          aria-label="Period"
          options={periods}
          value={Math.min(seg, periods.length - 1)}
          onValueChange={setSeg}
        />
        <span className="feel__name">Segmented</span>
      </li>
      <li className="feel__item" data-part="knob">
        <Knob label="Volume" size="sm" value={knob} onValueChange={setKnob} />
        <span className="feel__name">Knob</span>
      </li>
    </ul>
  );
}

function Panes() {
  const { step, live, setStep } = useDemo();
  const [mine, setMine] = useState(false);
  const asked = step >= 1;
  const worn = live ? step >= 2 : mine;
  // Echo's last stop: it points at the promise, and it's selected (shown whole without the demo).
  const marked = live ? step >= 3 : true;
  const wear = (on: boolean) => (live ? setStep(on ? 2 : 1) : setMine(on));

  // Worn while this card is the one being read (it spans the window's middle); past it either way, Echo's own again.
  const root = useRef<HTMLDivElement>(null);
  const [here, setHere] = useState(true);
  useEffect(() => {
    const card = root.current?.closest<HTMLElement>(".demo");
    if (!card) return;
    let last = true;
    return onFrame(() => {
      const r = card.getBoundingClientRect();
      const mid = window.innerHeight * 0.5;
      const now = r.top < mid && r.bottom > mid;
      if (now !== last) {
        last = now;
        setHere(now);
      }
    });
  }, []);

  useEffect(() => {
    wearOnPage(worn && here ? INK.seed : null);
  }, [worn, here]);
  useEffect(() => () => wearOnPage(null), []);

  return (
    <div ref={root} className="mk">
      <div className="mk__pane">
        <p className="mk__label">Your conversation</p>
        <Chat
          label="Picking the style that fits"
          composer={
            <Composer
              prompt={
                <>
                  {FIT.prompt} <Mention />
                </>
              }
              press={0}
              sent={asked}
              onSend={() => setStep(1)}
            />
          }
        >
          <Mine shown={asked}>
            {FIT.prompt} <Mention />
          </Mine>
          <Theirs shown={asked} used={["style-fit", "fit_styles"]}>
            {/* What Echo's fit tool ranked first, so the pick under it reads as a judgement on something you can see. */}
            <div className="jy-rank">
              <p className="jy-rank__label">Echo&rsquo;s ranking</p>
              <ol>
                {CANDIDATES.slice(0, 2).map((c) => (
                  <li key={c.name}>
                    <span className="jy-rank__row">
                      <span className="jy-rank__name">{c.title}</span>
                      <span className="jy-rank__from">
                        {c.from === "yours" ? "yours" : "Echo’s"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p>
              <strong className="jy-key">{FIT.pick}</strong>
              {FIT.pickRest}
            </p>
            <Files files={FIT.files} />
          </Theirs>
        </Chat>
      </div>
      <div className="mk__pane mk__pane--try">
        <p className="mk__label">Try it on</p>
        <div className="try" data-worn={worn ? "" : undefined}>
          {/* One toggle between the two looks, as Build's: Echo's own on the left, the style on the right. */}
          <div className="try__keys">
            <span
              className="try__look"
              data-on={worn ? undefined : ""}
              aria-hidden="true"
            >
              Echo&rsquo;s own look
            </span>
            <span className="jy-press" {...pressProps(1)}>
              <Switch
                checked={worn}
                onCheckedChange={wear}
                aria-label={`Wear ${INK.title} on this page`}
              />
            </span>
            <span
              className="try__look"
              data-on={worn ? "" : undefined}
              aria-hidden="true"
            >
              {INK.title}
            </span>
          </div>
          {/* Under the toggle, not over it: Echo stands on the toggle it presses, and the line is what the press did. */}
          <p className="try__now" aria-live="polite">
            {worn
              ? `This page is in ${INK.title}.`
              : "This page is in Echo’s own look."}
          </p>
          <Feel />
          {/* /docs: "holds WCAG 2.2 AA on every seed you give it"; "every component is keyboard-complete". */}
          {/* The promise on a line of its own, larger, with room above and beside it for Echo to stand and point. */}
          <div className="try__note">
            <p>Whatever you wear, every part keeps its keyboard, and its text stays readable at</p>
            <p className="try__promise">
              <span className="try__mark" data-on={marked ? "" : undefined} {...pressProps(2, { mode: "point", side: "right" })}>
                WCAG 2.2 AA
                {/* Selected, as Check's off-style button is: Echo's own way to mark something up. */}
                <Selection className="try__select" on={marked} />
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** When each press lands, s: Send; the toggle, once the pick has been read; the promise. And how long it all plays. */
const BEATS = [0.8, 2.8, 4.3] as const;
const LENGTH = 5.9;

export function PickCard() {
  return (
    <DemoCard
      id="pick"
      name="Pick it, and try it on"
      presses={3}
      beats={BEATS}
      length={LENGTH}
      onReset={() => wearOnPage(null)}
    >
      <Panes />
    </DemoCard>
  );
}
