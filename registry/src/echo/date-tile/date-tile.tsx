"use client";

/**
 * DateTile. The page of a desk calendar: the weekday and month engraved
 * small on a raised tile, the day huge on the screen set into it. Change the
 * date and the day turns over to the new one, like a tear-off page.
 *
 * `sm` sits in a list row (an event, a booking, an invoice due), `md` on a
 * card, `lg` on its own as a widget. For assistive technology it is one date,
 * said in full.
 */
import { SegmentDisplay } from "../segment-display";
import { dayOfMonth, spell } from "./dates";
import "../panel/panel.css";
import "../scope/scope.css";
import "./date-tile.css";

export interface DateTileProps {
  /** The day, as an ISO date: "2026-09-25". */
  date: string;
  /** `sm` for a list row, `md` (default) for a card, `lg` as a widget. */
  size?: "sm" | "md" | "lg";
  /** A new date turns over to its day instead of swapping it. */
  roll?: boolean;
  /** The language the weekday and month are engraved in. Default "en". */
  locale?: string;
  /** `emissive` (default): a dark screen that glows. `reflective`: the paper-coloured glass of a pocket calculator, printed in ink. */
  screen?: "emissive" | "reflective";
}

export function DateTile({ date, size = "md", roll = false, locale = "en", screen = "emissive" }: DateTileProps) {
  const iso = date.slice(0, 10);
  return (
    <time className="echo-panel echo-date-tile" data-variant="raised" data-size={size} dateTime={iso}>
      <span className="echo-date-tile__top" aria-hidden="true">
        <span className="echo-date-tile__weekday">{spell(iso, locale, { weekday: "short" })}</span>
        <span className="echo-date-tile__month">{spell(iso, locale, { month: "short" })}</span>
      </span>
      <span className="echo-date-tile__screen" aria-hidden="true" data-echo-screen={screen === "reflective" ? "reflective" : undefined}>
        <SegmentDisplay variant="flush" label="Day" value={String(dayOfMonth(iso))} digits={2} pad=" " size={size} roll={roll} />
      </span>
      <span className="echo-date-tile__said">
        {spell(iso, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </span>
    </time>
  );
}
