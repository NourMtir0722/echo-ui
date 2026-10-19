"use client";

/**
 * One size scale for everything with a height. `sm`, `md` and `lg` are the
 * control heights (`--echo-control-compact`, `-default`, `-large`: 32, 44 and
 * 60px at default density), so a button, a field and a select of the same
 * size are the same height and line up in a row.
 *
 * Size flows down: wrap a toolbar, a filter bar or a card footer in
 * `<SizeProvider size="sm">` and every control in it is `sm` without saying
 * so. A `size` passed to a control wins. Density is different: it's global
 * ("this product is dense") and scales all three steps; size picks one.
 */
import { createContext, useContext, type ReactNode } from "react";

export type ControlSize = "sm" | "md" | "lg";

const SizeContext = createContext<ControlSize | undefined>(undefined);

export interface SizeProviderProps {
  /** The size every control inside takes, unless it's given its own. */
  size: ControlSize;
  children?: ReactNode;
}

export function SizeProvider({ size, children }: SizeProviderProps) {
  return <SizeContext.Provider value={size}>{children}</SizeContext.Provider>;
}

/**
 * The size a control should render at: its own `size` if it was given one,
 * else the nearest SizeProvider's, else `md`.
 */
export function useControlSize(own?: ControlSize): ControlSize {
  const inherited = useContext(SizeContext);
  return own ?? inherited ?? "md";
}
