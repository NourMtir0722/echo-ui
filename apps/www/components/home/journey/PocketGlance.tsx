"use client";

/**
 * What Build with Echo built: Pocket, on a desktop and a phone, the run's two
 * checks: the two screens, the responsive pair, with what's on them made
 * calm. The run's Pocket was a full dashboard, and shown
 * small it read as a mess of numbers and parts. So the screen here is Pocket's
 * opening drawn the way Ink Instrument says a screen should be: one large
 * statement surrounded by air, small condensed and monospaced labels, ink
 * rules, neutral outlined controls, and colour only in the diagram.
 *
 * What's on it is Pocket's: its name and line, its heading, its Add expense
 * key and week switch (Echo's HardwareButton and Segmented, in Ink
 * Instrument), and its sample week, $142.50 left of $250.00 (the run's
 * budget.ts). The week is drawn as a dimension band, the way a technical sheet
 * draws a measure: ticks along an outline, what's spent filled in the one
 * colour the board gave the style (#0495FB). The phone holds all of it; the
 * desktop, half behind the phone, sets the statement and the week in one
 * column with paper beside them.
 *
 * Each screen is a picture of the app, not a part of this page: an image to
 * assistive technology, named for what it shows, and out of the tab order.
 */
import type { CSSProperties } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Segmented } from "@registry/echo/segmented";
import { siteTheme } from "@/components/site/site-theme";
import { INK } from "./run";

/** Ink Instrument, on Pocket's screens only. */
const POCKET_CSS = siteTheme(INK.seed as Parameters<typeof siteTheme>[0], { selector: ".bd-pocket" }).css;

/** The run's sample week (budget.ts): the four limits, and the six expenses from 12 to 18 October. */
const BUDGET = 25000;
const SPENT = 10750;
const LEFT = BUDGET - SPENT;
const USED = SPENT / BUDGET;
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const ALT = `Pocket, the screen it built, in Ink Instrument: "A little more in balance.", ${money(LEFT)} left this week of ${money(BUDGET)}, and an Add expense key.`;

/** Lucide's wallet and plus, as the run drew them (ISC). */
function Wallet() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
function Plus() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

function Brand() {
  return (
    <span className="pk-brand">
      <span className="pk-mark">
        <Wallet />
      </span>
      <span>
        pocket<span className="pk-dot">.</span>
      </span>
    </span>
  );
}

/** The week as a technical sheet draws a measure: an outlined band with its ticks, what's spent filled, the ends labelled. */
function Week() {
  return (
    <div className="pk-week">
      <p className="pk-legend">Available this week</p>
      <p className="pk-amount">
        <span className="pk-currency">$</span>
        {(LEFT / 100).toFixed(2)}
      </p>
      <div className="pk-band" style={{ "--used": USED } as CSSProperties}>
        <span className="pk-band__spent" />
        <span className="pk-band__ticks" />
      </div>
      <p className="pk-ends">
        <span>{Math.round(USED * 100)}% spent</span>
        <span>{money(BUDGET)}</span>
      </p>
    </div>
  );
}

function Say() {
  return (
    <div className="pk-say">
      <p className="pk-legend">Your money, at a glance</p>
      <p className="pk-statement">A little more in balance.</p>
    </div>
  );
}

function Key() {
  return (
    <HardwareButton variant="primary" size="sm" icon={<Plus />}>
      Add expense
    </HardwareButton>
  );
}

function Period() {
  return <Segmented size="sm" aria-label="Budget period" options={["This week", "This month"]} value={0} onValueChange={() => {}} />;
}

/** A frame's check, passed: a tick on its corner (BuildCard.tsx says when). */
function Tick() {
  return (
    <span className="bd-pass" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

/** Pocket on the run's two screens: the desktop behind, the phone in front at its own size. `at`: each one's reply line. */
export function PocketScreens({ desktopAt, phoneAt }: { desktopAt: number; phoneAt: number }) {
  return (
    <div className="bd-screens">
      <style dangerouslySetInnerHTML={{ __html: POCKET_CSS }} />
      <div className="bd-screen bd-screen--desktop" style={{ "--i": desktopAt } as CSSProperties}>
        <div className="bd-pocket pk-desktop" role="img" aria-label={`${ALT} On a desktop.`} inert>
          <div className="pk-bar">
            <span className="pk-dots" />
          </div>
          <div className="pk-screen bd__render">
            <header className="pk-head">
              <Brand />
              <span className="pk-caption">A little clarity for everyday money.</span>
            </header>
            {/* One column on the left, paper to its right: the statement, then the week, with the air the style asks for. */}
            <div className="pk-desktop__body">
              <Say />
              <Week />
            </div>
          </div>
        </div>
        <Tick />
      </div>
      <div className="bd-screen bd-screen--phone" style={{ "--i": phoneAt } as CSSProperties}>
        <div className="bd-pocket pk-phone" role="img" aria-label={`${ALT} On a phone.`} inert>
          <div className="pk-screen bd__render">
            <header className="pk-head">
              <Brand />
            </header>
            <div className="pk-phone__body">
              <Say />
              <Period />
              <Week />
              <Key />
            </div>
          </div>
        </div>
        <Tick />
      </div>
    </div>
  );
}
