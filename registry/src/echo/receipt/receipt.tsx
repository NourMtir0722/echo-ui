"use client";

/**
 * Receipt. The device prints: a summary feeds out of a slot in the chassis a
 * line at a time, each with a small tick, and waits there to be torn off.
 * For an order confirmation, a payment, an invoice, a weekly recap, or the
 * summary of what an automated run did.
 *
 * It prints when it arrives, after the page has loaded (a confirmation that
 * appears when payment goes through); one that's on the page from the start
 * is simply there. Change `printKey` to print it again.
 *
 * Everything on it is text in the page from the start (a heading, a list of
 * lines, a total), so a screen reader never waits for the paper; the feed is
 * only drawing. Tearing it off has a button.
 */
import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useReducedMotionRef } from "echo-ui-core/tactile";
import { useSoundOptional, type SoundRecipe } from "echo-ui-core/sound";
import { HardwareButton } from "../hardware-button";
import { barcode } from "./barcode";
import "./receipt.css";

export interface ReceiptLine {
  label: ReactNode;
  value: ReactNode;
}

export interface ReceiptProps {
  /** Printed at the top, and the receipt's heading. */
  title: string;
  /** A line under the title: a number, a date, a place. */
  meta?: string;
  /** What it lists, each with its value across a dotted leader. */
  lines: readonly ReceiptLine[];
  /** The bottom line, printed bold under a rule. */
  total?: ReceiptLine;
  /** Printed at the very bottom: how it was paid, a thank-you, what to do next. */
  footer?: string;
  /** A reference printed as a barcode, with the code in text beneath it. */
  code?: string;
  /** Shows a Tear off key; called once the paper has dropped away. */
  onTear?: () => void;
  /** Print it again whenever this changes. */
  printKey?: string | number;
  /** The heading's level. Default 3. */
  headingLevel?: 2 | 3 | 4;
}

/** A thermal printer's step: quieter and shorter than a key. */
const FEED: SoundRecipe = { wave: "square", freq: 2600, decay: 0.01, gain: 0.03 };
const STEP_MS = 90;

const never = () => () => {};

export function Receipt({ title, meta, lines, total, footer, code, onTear, printKey, headingLevel = 3 }: ReceiptProps) {
  const Heading = `h${headingLevel}` as const;
  const id = useId();
  const sound = useSoundOptional();
  const reduced = useReducedMotionRef();
  const feed = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [torn, setTorn] = useState(false);
  const printing = useRef(false);
  // False while the page hydrates (it was already there), true for a receipt
  // that mounts afterwards: the one that has just arrived and should print.
  const onClient = useSyncExternalStore(never, () => true, () => false);
  const arrivedLate = useRef(onClient);
  const lastKey = useRef(printKey);
  /** The pending step of the print under way: one print at a time, and none after unmounting. */
  const step = useRef<number | undefined>(undefined);

  /** Ends the print under way where it stands: the paper rests whole in the window. */
  const settle = () => {
    window.clearTimeout(step.current);
    feed.current?.removeAttribute("data-printing");
    feed.current?.style.removeProperty("--receipt-shown");
    printing.current = false;
  };

  const print = () => {
    const window_ = feed.current;
    const sheet = paper.current;
    // Printing again mid-print starts over, rather than feeding twice at once.
    window.clearTimeout(step.current);
    if (!window_ || !sheet || reduced.current) {
      settle();
      return;
    }
    const full = sheet.offsetHeight;
    // The paper leaves the slot bottom edge first, a line per step.
    const rows = [...sheet.querySelectorAll<HTMLElement>("[data-line]")].reverse();
    const stops = [...rows.map((row) => full - row.offsetTop), full];
    printing.current = true;
    window_.setAttribute("data-printing", "");
    window_.style.setProperty("--receipt-shown", "0px");
    let i = 0;
    const next = () => {
      const stop = stops[i++];
      if (stop === undefined) {
        settle();
        return;
      }
      window_.style.setProperty("--receipt-shown", `${stop}px`);
      sound?.play(FEED);
      step.current = window.setTimeout(next, STEP_MS);
    };
    step.current = window.setTimeout(next, STEP_MS);
  };

  // Arriving after the page has settled, it prints; so does a new printKey.
  // Whatever stops this effect (unmounting, a new printKey, or its effects
  // running again, as StrictMode and <Activity> do) settles the paper whole:
  // a print cut off mid-feed would otherwise leave it in the slot.
  useLayoutEffect(() => {
    const again = printKey !== lastKey.current;
    lastKey.current = printKey;
    if (!arrivedLate.current && !again) return;
    arrivedLate.current = false;
    setTorn(false);
    print();
    return settle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printKey]);

  const tear = () => {
    if (printing.current) return;
    sound?.play("release");
    setTorn(true);
    window.setTimeout(() => onTear?.(), reduced.current ? 0 : 420);
  };

  return (
    <section className="echo-receipt" aria-labelledby={`${id}-title`} data-torn={torn || undefined}>
      <div className="echo-receipt__slot" aria-hidden="true" />
      <div ref={feed} className="echo-receipt__feed">
        <div ref={paper} className="echo-receipt__paper">
          <Heading id={`${id}-title`} className="echo-receipt__title" data-line="">
            {title}
          </Heading>
          {meta ? (
            <p className="echo-receipt__meta" data-line="">
              {meta}
            </p>
          ) : null}
          <dl className="echo-receipt__lines">
            {lines.map((line, i) => (
              <div key={i} className="echo-receipt__line" data-line="">
                <dt>{line.label}</dt>
                <span className="echo-receipt__leader" aria-hidden="true" />
                <dd>{line.value}</dd>
              </div>
            ))}
            {total ? (
              <div className="echo-receipt__line" data-total="" data-line="">
                <dt>{total.label}</dt>
                <span className="echo-receipt__leader" aria-hidden="true" />
                <dd>{total.value}</dd>
              </div>
            ) : null}
          </dl>
          {code ? (
            <div className="echo-receipt__code" data-line="">
              <svg viewBox="0 0 200 36" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                {barcode(code).map((bar, i) => (
                  <rect key={i} x={bar.x} y={0} width={bar.w} height={36} />
                ))}
              </svg>
              <span>{code}</span>
            </div>
          ) : null}
          {footer ? (
            <p className="echo-receipt__footer" data-line="">
              {footer}
            </p>
          ) : null}
        </div>
      </div>
      {onTear ? (
        <div className="echo-receipt__tear">
          <HardwareButton size="sm" disabled={torn} onClick={tear}>
            Tear off
          </HardwareButton>
        </div>
      ) : null}
    </section>
  );
}
