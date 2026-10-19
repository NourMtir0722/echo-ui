"use client";

/**
 * NowPlaying. A small player: a screen with where it's from, what's playing
 * and the time in lit segments, a strip to scrub along, and the transport
 * keys under it, play the lit one. Music, a podcast, a voice message, a
 * recording of a meeting.
 *
 * Every part is an Echo part: the time is a SegmentDisplay, the strip is a
 * Slider, the keys are HardwareButtons in one ButtonGroup. You own the
 * audio; this is the device you control it with.
 */
import type { ReactNode } from "react";
import { SegmentDisplay } from "../segment-display";
import { Slider } from "../slider";
import { HardwareButton } from "../hardware-button";
import { ButtonGroup } from "../toolbar";
import { clock, lengthOf } from "./clock";
import "../scope/scope.css";
import "./now-playing.css";

export interface NowPlayingProps {
  /** What's playing: the track, the episode, the message. */
  title: string;
  /** Who it's by, or what it's part of. */
  artist?: string;
  /** Where it's coming from, engraved over the rest: "Fresh FM", "Voice memo". */
  source?: string;
  /** Artwork beside the title, square. */
  artwork?: ReactNode;
  /** Playing now. */
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  /** Where it is, in seconds. */
  position: number;
  /** How long it is, in seconds. Leave out for a live stream. */
  duration?: number;
  /** Called with a new position when someone scrubs. Without it, the strip only shows. */
  onSeek?: (seconds: number) => void;
  /** Shows the previous key, and calls this when it's pressed. */
  onPrevious?: () => void;
  /** Shows the next key, and calls this when it's pressed. */
  onNext?: () => void;
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

const glyph = (d: string) => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);
const PLAY = glyph("M5 3.2v9.6L12.8 8z");
const PAUSE = glyph("M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z");
const PREVIOUS = glyph("M4 3h1.8v10H4zM13 3.4v9.2L6.4 8z");
const NEXT = glyph("M10.2 3H12v10h-1.8zM3 3.4v9.2L9.6 8z");

export function NowPlaying({
  title,
  artist,
  source,
  artwork,
  playing,
  onPlayingChange,
  position,
  duration,
  onSeek,
  onPrevious,
  onNext,
  screen = "emissive",
}: NowPlayingProps) {
  // An <audio> element's duration is NaN until its metadata loads and
  // Infinity for a live stream; both are handled here, not left to the caller.
  const length = lengthOf(duration);
  const live = length.kind === "live";
  const at = Number.isFinite(position) ? Math.max(0, position) : 0;
  return (
    <section className="echo-now-playing" aria-label={`Now playing: ${title}`}>
      <div className="echo-now-playing__screen" data-echo-screen={screen === "reflective" ? "reflective" : undefined}>
        {source ? (
          <span className="echo-now-playing__source" aria-hidden="true">
            {source}
          </span>
        ) : null}
        <div className="echo-now-playing__track">
          {artwork ? (
            <span className="echo-now-playing__art" aria-hidden="true">
              {artwork}
            </span>
          ) : null}
          <span className="echo-now-playing__names">
            <span className="echo-now-playing__title">{title}</span>
            {artist ? <span className="echo-now-playing__artist">{artist}</span> : null}
          </span>
        </div>
        <div className="echo-now-playing__time">
          <SegmentDisplay variant="flush" size="sm" label="Elapsed" value={clock(at)} />
          {live ? (
            <span className="echo-now-playing__live">Live</span>
          ) : (
            <SegmentDisplay
              variant="flush"
              size="sm"
              label="Length"
              value={length.kind === "known" ? clock(length.seconds) : "--:--"}
              glow={false}
            />
          )}
        </div>
        {!live ? (
          <Slider
            size="sm"
            aria-label="Position"
            min={0}
            max={length.kind === "known" ? Math.max(1, Math.round(length.seconds)) : 1}
            value={length.kind === "known" ? Math.round(at) : 0}
            onValueChange={(v) => onSeek?.(v)}
            disabled={!onSeek || length.kind !== "known"}
          />
        ) : null}
      </div>
      <ButtonGroup aria-label="Playback" size="lg">
        {onPrevious ? <HardwareButton iconOnly icon={PREVIOUS} aria-label="Previous" onClick={onPrevious} /> : null}
        <HardwareButton
          iconOnly
          variant="primary"
          icon={playing ? PAUSE : PLAY}
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => onPlayingChange(!playing)}
        />
        {onNext ? <HardwareButton iconOnly icon={NEXT} aria-label="Next" onClick={onNext} /> : null}
      </ButtonGroup>
    </section>
  );
}
