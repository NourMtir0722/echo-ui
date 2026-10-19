"use client";

/**
 * <BrandDevice> — the ECHO pocket device, as the homepage hero.
 *
 * Ported from the original repo's EchoDevice: a matte speckled chassis, a
 * recessed dot-matrix screen where the glossy creature lives in its aura, an engraved grille and nameplate, and a row of molded caps.
 *
 * The caps are the LIBRARY's HardwareButton, not the prototype's — they carry
 * everything the library has fixed since (contrast at every stop, press travel on the
 * motion tokens, the synth press/release sounds), and they relight with the
 * seed while the creature, which is brand, does not.
 *
 * Every cap does something the screen reports:
 *   Pause / Start → the creature rests or watches; the LCD says which
 *   Skip        → advances the session number
 *   +4          → snoozes; the LCD shows the minutes banked
 *
 * `away`: the creature has stepped out of the screen (the homepage's guide
 * carries it down the page), and the LCD says so. That is a story beat, not
 * device state: the words are hidden from assistive technology, and the live
 * region keeps saying what the caps set, so scrolling never announces.
 */
import { useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Creature } from "./Creature";
import "./brand.css";

function PlayIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function SkipIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6l9 6-9 6zM17 5h2v14h-2z" />
    </svg>
  );
}

export function BrandDevice({ away = false }: { away?: boolean }) {
  const [running, setRunning] = useState(true);
  const [session, setSession] = useState(1);
  const [snoozed, setSnoozed] = useState(0);

  return (
    <div className="echo-device brand-device" data-running={running ? "" : undefined} data-away={away ? "" : undefined}>
      <div className="brand-device__speckle" aria-hidden="true" />

      <div className="brand-device__well">
        {/*
          The screen is a live region in the plain sense: what it says is the
          device's state, so it is text, and the creature beside it is
          decorative. Polite, so a press is acknowledged without interrupting.
        */}
        <div className="echo-device__screen brand-device__screen" aria-live="polite">
          <div className="brand-device__aura" aria-hidden="true" />
          <div className="brand-device__spill" aria-hidden="true" />
          <div className="brand-device__creature">
            {/* Home: where the guide leaves from, and lands when it comes back. */}
            <span className="brand-device__home" data-guide-stop="" data-guide-home="" aria-hidden="true">
              <Creature size={188} mood={running ? "watching" : "resting"} />
            </span>
          </div>
          <div className="brand-device__brb" aria-hidden="true">
            BACK SOON
          </div>
          <div className="brand-device__dots" aria-hidden="true" />
          <div className="brand-device__scan" aria-hidden="true" />
          <div className="brand-device__vignette" aria-hidden="true" />

          <div className="brand-device__lcd">
            <span className="brand-device__lcd-row">
              <span className="brand-device__dim">ECHO</span>
              <span className="brand-device__state">
                <span className="brand-device__led" aria-hidden="true" />
                <span className={away ? "brand-device__sr" : undefined}>{running ? "WATCHING" : "RESTING"}</span>
                {away && <span aria-hidden="true">AWAY</span>}
              </span>
            </span>
            <span className="brand-device__lcd-row">
              <span className="brand-device__dim">SESSION {String(session).padStart(2, "0")}</span>
              <span className="brand-device__dim">{snoozed > 0 ? `SNOOZE +${snoozed}` : " "}</span>
            </span>
          </div>

          <div className="brand-device__glass" aria-hidden="true" />
        </div>
      </div>

      <div className="brand-device__plate">
        <span className="brand-device__grille" aria-hidden="true" />
        <span className="brand-device__name" aria-hidden="true">
          ECHO
        </span>
        <span className="brand-device__grille" aria-hidden="true" />
      </div>

      <div className="brand-device__keys">
        <HardwareButton
          iconOnly
          aria-label="Skip"
          caption="skip"
          icon={<SkipIcon />}
          onClick={() => setSession((n) => (n % 99) + 1)}
        />
        <HardwareButton
          variant="primary"
          iconOnly
          aria-label={running ? "Pause" : "Start"}
          caption={running ? "pause" : "start"}
          icon={running ? <PauseIcon /> : <PlayIcon />}
          onClick={() => setRunning((r) => !r)}
        />
        <HardwareButton caption="snooze" aria-label="Snooze +4" onClick={() => setSnoozed((n) => n + 4)}>
          +4
        </HardwareButton>
      </div>
    </div>
  );
}
