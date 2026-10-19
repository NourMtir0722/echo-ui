/**
 * Stack and Grid. The two layouts a screen is made of, with the gaps on the
 * space scale, so two people laying out two cards space them the same way.
 * Closed: a gap is a step (`gap={6}` is `--echo-space-6`), not a length, and
 * there's no className to reach for.
 *
 *   <Stack gap={6}>…</Stack>                    a column
 *   <Stack direction="row" align="center">…      a row
 *   <Grid minItemWidth="16rem" gap={8}>…</Grid>  as many columns as fit
 *
 * A row wraps by default, and a Grid's columns never get narrower than the
 * screen, so neither pushes a phone sideways.
 */
import type { CSSProperties, ReactNode } from "react";
import "./layout.css";

/** A step on the space scale: 0 is none, 6 is 12px, 8 is 16px, 11 is 32px. */
export type SpaceStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between";

const space = (step: SpaceStep) => (step === 0 ? "0" : `var(--echo-space-${step})`);
const JUSTIFY: Record<Justify, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

export interface StackProps {
  children?: ReactNode;
  /** `column` (default) or `row`. */
  direction?: "column" | "row";
  /** Space between items, a step on the space scale. Default 6 (12px). */
  gap?: SpaceStep;
  /** Cross-axis alignment. Default `stretch` for a column, `center` for a row. */
  align?: Align;
  /** Main-axis distribution. Default `start`. */
  justify?: Justify;
  /** A row wraps onto more lines when it runs out of room. Default true. */
  wrap?: boolean;
  /** The element: a `ul` for a list of things, a `section`, a `nav`. Default `div`. */
  as?: "div" | "section" | "ul" | "ol" | "nav" | "header" | "footer";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Stack({
  children,
  direction = "column",
  gap = 6,
  align,
  justify = "start",
  wrap = true,
  as: As = "div",
  ...aria
}: StackProps) {
  const style = {
    "--stack-gap": space(gap),
    "--stack-align": align ?? (direction === "row" ? "center" : "stretch"),
    "--stack-justify": JUSTIFY[justify],
  } as CSSProperties;
  return (
    <As className="echo-stack" data-direction={direction} data-wrap={wrap && direction === "row" ? "" : undefined} style={style} {...aria}>
      {children}
    </As>
  );
}

export interface GridProps {
  children?: ReactNode;
  /**
   * The narrowest a column may be; as many columns as fit, never narrower
   * than the screen (`"16rem"`). Fewer items than fit share the row rather
   * than leave columns empty. Use this or `columns`.
   */
  minItemWidth?: string;
  /** A fixed number of equal columns. On a screen too narrow for them, see `minItemWidth`. */
  columns?: number;
  /** Space between cells, a step on the space scale. Default 8 (16px). */
  gap?: SpaceStep;
  /** Align each cell's content vertically. Default `stretch`. */
  align?: "start" | "center" | "end" | "stretch";
  as?: "div" | "section" | "ul" | "ol";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Grid({ children, minItemWidth, columns, gap = 8, align = "stretch", as: As = "div", ...aria }: GridProps) {
  const template = minItemWidth
    ? `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))`
    : `repeat(${Math.max(1, Math.floor(columns ?? 1))}, minmax(0, 1fr))`;
  const style = { "--grid-template": template, "--grid-gap": space(gap), "--grid-align": align } as CSSProperties;
  return (
    <As className="echo-grid" style={style} {...aria}>
      {children}
    </As>
  );
}
