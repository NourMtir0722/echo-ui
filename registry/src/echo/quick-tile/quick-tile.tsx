"use client";

/**
 * QuickTile. A quick-settings tile, as in a phone's control centre: a big
 * molded key with a glyph, a name and a line of state ("Home network"). Press
 * it to switch the thing on or off; on, it's the lit cap and its socket
 * glows. `wide` gives the name and the state room beside the glyph.
 *
 * It presses like every Echo key (the same cap physics and clicks). For
 * assistive technology it's a switch, named by its label, with the state
 * line as its description. Details, when there are any, open from a
 * separate key, never from holding the tile down.
 */
import { forwardRef, useId, useMemo, useState, type ReactNode } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { mergeHandlers, mergeRefs, useCapPhysics } from "echo-ui-core/tactile";
import { StatusDot } from "../status-dot";
import { HardwareButton } from "../hardware-button";
import "./quick-tile.css";

export interface QuickTileProps extends EchoInterop {
  /** What it switches: the tile's name and its accessible name. */
  label: string;
  /** The glyph on the tile. */
  icon: ReactNode;
  /** A line of state under the name: "Home network", "Until 7:00". */
  status?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** `square` (default) is a glyph over a name; `wide` sets them side by side, with the state line. */
  shape?: "square" | "wide";
  /** Shows a small key for the details, and calls this when it's pressed. */
  onMore?: () => void;
}

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the switch.
 */
export const QuickTile = forwardRef<HTMLButtonElement, QuickTileProps>(function QuickTile(
  { label, icon, status, checked, defaultChecked = false, onCheckedChange, shape = "square", onMore, disabled = false, name, ...interop },
  ref,
) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const statusId = useId();
  const { ref: capRef, handlers } = useCapPhysics<HTMLButtonElement>({ tilt: 3, sound: true });
  const setRef = useMemo(() => mergeRefs(capRef, ref), [capRef, ref]);
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onCheckedChange?.(!on);
  };
  return (
    <div className="echo-quick-tile" data-shape={shape} data-on={on || undefined} data-disabled={disabled || undefined}>
      <div className="echo-quick-tile__well">
        <button
          ref={setRef}
          type="button"
          role="switch"
          aria-checked={on}
          aria-describedby={status ? statusId : undefined}
          disabled={disabled}
          className="echo-quick-tile__cap"
          {...interop}
          // The caller's focus and key handlers and the cap's press, both heard.
          {...mergeHandlers(handlers, interop)}
          onClick={toggle}
        >
          <span className="echo-quick-tile__top">
            <span className="echo-quick-tile__icon" aria-hidden="true">
              {icon}
            </span>
            <StatusDot on={on} decorative />
          </span>
          <span className="echo-quick-tile__text">
            <span className="echo-quick-tile__label">{label}</span>
            {status ? (
              <span id={statusId} className="echo-quick-tile__status">
                {status}
              </span>
            ) : null}
          </span>
        </button>
      </div>
      {onMore ? (
        <span className="echo-quick-tile__more">
          <HardwareButton
            size="sm"
            iconOnly
            aria-label={`${label} settings`}
            disabled={disabled}
            onClick={onMore}
            icon={
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            }
          />
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={on ? "on" : "off"} /> : null}
    </div>
  );
});
