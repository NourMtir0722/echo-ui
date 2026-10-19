"use client";

/**
 * ShortcutMap. The "Keyboard shortcuts" sheet a desktop app opens with ?:
 * the list of what each shortcut does, and above it the keyboard drawn in
 * Kbd caps. Point at a shortcut and its keys light on the board; press keys
 * on your own keyboard and the drawn ones go down with them.
 *
 * The list is the content: each shortcut's keys as Kbd caps and what it
 * does, in words. The board is a picture of it and is hidden from assistive
 * technology.
 */
import { Fragment, useState } from "react";
import { Kbd } from "../kbd";
import { BOARD, lit } from "./board";
import "./shortcut-map.css";

export interface Shortcut {
  /** The keys, in the order they're held: ["Cmd", "K"]. */
  keys: readonly string[];
  /** What it does. */
  label: string;
}

export interface ShortcutMapProps {
  shortcuts: readonly Shortcut[];
  /** The list's accessible name. Default "Keyboard shortcuts". */
  label?: string;
  /** Draw the keyboard over the list. Default true. */
  board?: boolean;
}

export function ShortcutMap({ shortcuts, label = "Keyboard shortcuts", board = true }: ShortcutMapProps) {
  const [pointed, setPointed] = useState<number | null>(null);
  const on = pointed === null ? new Set<string>() : lit(shortcuts[pointed]!.keys);
  return (
    <div className="echo-shortcut-map">
      {board ? (
        <div className="echo-shortcut-map__board" aria-hidden="true">
          {BOARD.map((row, r) => (
            <div key={r} className="echo-shortcut-map__row">
              {row.map((key, i) => (
                <span key={i} className="echo-shortcut-map__slot" data-width={key.width} data-lit={on.has(key.legend) || undefined}>
                  <Kbd>{key.legend}</Kbd>
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <ul className="echo-shortcut-map__list" aria-label={label} onPointerLeave={() => setPointed(null)}>
        {shortcuts.map((s, i) => (
          <li key={s.label} className="echo-shortcut-map__item" onPointerEnter={() => setPointed(i)}>
            <span className="echo-shortcut-map__keys">
              {s.keys.map((key, j) => (
                <Fragment key={j}>
                  {j > 0 ? <span className="echo-shortcut-map__then" aria-hidden="true">+</span> : null}
                  <Kbd>{key}</Kbd>
                </Fragment>
              ))}
            </span>
            <span className="echo-shortcut-map__label">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
