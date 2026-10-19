"use client";

/**
 * FilterTray. Chunky filter pads in one long well, with the action at its
 * end. A pad that's on is a lit cap, lit from inside; the action carries the
 * count. Apply, and the lit pads fold into the action cap (Morph) and it
 * becomes one key that says how many are on, with their names engraved on the
 * tray's floor beside it; press that key and they come back out.
 *
 * Every pad is a HardwareButton: its icon on the cap, its name engraved under
 * it and said as its accessible name, `aria-pressed` for its state.
 */
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import type { EchoInterop } from "echo-ui-core/types";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";
import { SizeProvider, type ControlSize } from "../size";
import { Scope } from "../scope";
import "./filter-tray.css";

export interface FilterTrayOption {
  value: string;
  /** Engraved under the pad, and the pad's accessible name. */
  label: string;
  /** The glyph on the pad. */
  icon: ReactNode;
  /** A colour of its own for this pad, as a hex: it lights in it when it's on (a Scope). */
  accent?: string;
}

export interface FilterTrayProps extends EchoInterop {
  /** What the pads filter: the tray's accessible name. */
  label: string;
  options: readonly FilterTrayOption[];
  /** The pads that are on (controlled). */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Folded into the action (controlled). */
  applied?: boolean;
  defaultApplied?: boolean;
  /** Called when the pads fold in (true) or come back out (false). */
  onAppliedChange?: (applied: boolean) => void;
  /** The action's word. Default "Filter". */
  actionLabel?: string;
  /** Height on the control scale for every pad. Default `lg`. */
  size?: ControlSize;
}

const plural = (n: number) => `${n} filter${n === 1 ? "" : "s"}`;

/**
 * `forwardRef`, not a `ref` prop — see the note on `Field`. The ref lands on
 * the tray.
 */
export const FilterTray = forwardRef<HTMLDivElement, FilterTrayProps>(function FilterTray(
  {
    label,
    options,
    value,
    defaultValue,
    onValueChange,
    applied,
    defaultApplied = false,
    onAppliedChange,
    actionLabel = "Filter",
    size = "lg",
    disabled = false,
    name,
    ...interop
  },
  ref,
) {
  const [innerValue, setInnerValue] = useState<readonly string[]>(defaultValue ?? []);
  const on = value ?? innerValue;
  const [innerApplied, setInnerApplied] = useState(defaultApplied);
  const appliedNow = applied ?? innerApplied;
  const folded = appliedNow && on.length > 0;

  const setOn = (next: string[]) => {
    if (value === undefined) setInnerValue(next);
    onValueChange?.(next);
  };
  const setFolded = (next: boolean) => {
    if (applied === undefined) setInnerApplied(next);
    onAppliedChange?.(next);
  };

  // Nothing on is nothing applied: once the pads are cleared (from outside,
  // or never chosen), the next pad lights without folding the tray, and a
  // controlled `applied` hears that it's off.
  const setFoldedRef = useRef(setFolded);
  setFoldedRef.current = setFolded;
  useEffect(() => {
    if (appliedNow && on.length === 0) setFoldedRef.current(false);
  }, [appliedNow, on.length]);

  const chosen = options.filter((o) => on.includes(o.value));
  const names = chosen.map((o) => o.label).join(", ");
  const count = chosen.length;

  return (
    <div
      ref={ref}
      className="echo-filter-tray"
      role="group"
      aria-label={label}
      data-size={size}
      data-folded={folded || undefined}
      {...interop}
    >
      {folded ? (
        <span className="echo-filter-tray__summary" aria-hidden="true">
          {chosen.map((o) => o.label).join(" · ")}
        </span>
      ) : null}
      <SizeProvider size={size}>
        <Morph
          align="end"
          status={folded ? `${plural(count)} on: ${names}` : ""}
          onEscape={folded ? () => setFolded(false) : undefined}
        >
          {folded ? (
            <HardwareButton
              data-morph="action"
              variant="primary"
              disabled={disabled}
              aria-label={`${plural(count)}: ${names}. Change filters`}
              onClick={() => setFolded(false)}
            >
              {plural(count)}
            </HardwareButton>
          ) : (
            <>
              {options.map((o) => {
                const pressed = on.includes(o.value);
                const pad = (
                  <HardwareButton
                    key={o.value}
                    iconOnly
                    icon={o.icon}
                    aria-label={o.label}
                    caption={o.label}
                    aria-pressed={pressed}
                    variant={pressed ? "primary" : "neutral"}
                    disabled={disabled}
                    onClick={() => setOn(pressed ? on.filter((v) => v !== o.value) : [...on, o.value])}
                  />
                );
                return o.accent ? (
                  <Scope key={o.value} accent={o.accent}>
                    {pad}
                  </Scope>
                ) : (
                  pad
                );
              })}
              <HardwareButton
                data-morph="action"
                variant="primary"
                disabled={disabled || count === 0}
                aria-label={count ? `${actionLabel}: ${plural(count)}` : `${actionLabel}: choose a filter first`}
                onClick={() => setFolded(true)}
              >
                {count ? `${actionLabel} · ${count}` : actionLabel}
              </HardwareButton>
            </>
          )}
        </Morph>
      </SizeProvider>
      {name ? on.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
    </div>
  );
});
