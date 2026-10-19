/**
 * Textures — the grain law as a set of composable overlays: ordered DITHER, film-grain NOISE, HALFTONE dots, SCANLINES, and
 * the GRAIN FIELD they all descend from.
 *
 * Nothing in Echo is ever a flat fill. These are also the practical cure for
 * gradient banding on the dark chassis — a dither or grain pass over a large
 * soft gradient kills the posterised rings that dark surfaces show.
 *
 * Every overlay is decorative: aria-hidden, pointer-events: none, absolutely
 * filling its nearest positioned ancestor. Tunables ride as CSS custom
 * properties (the sanctioned exception to the no-inline-styles rule, same as
 * the Loader dot and the Tabs indicator); no literal values in `style`.
 */
import type { CSSProperties, ReactNode } from "react";
import { ditherTile, noiseTile } from "./tiles";
import "./textures.css";

type Blend = CSSProperties["mixBlendMode"];

interface OverlayProps {
  /** Layer opacity. Each texture ships the weight it is usually right at. */
  opacity?: number;
  /** Compositing mode against the surface below. */
  blend?: Blend;
  /** Pin to the viewport instead of the positioned ancestor. Default false. */
  fixed?: boolean;
  className?: string;
}

function overlayVars(
  image: string | undefined,
  size: string,
  opacity: number,
  blend: Blend,
): CSSProperties {
  // Halftone and scanlines draw themselves from CSS gradients, so they pass no
  // image var at all rather than an empty one.
  return {
    ...(image ? { "--echo-texture-image": image } : null),
    "--echo-texture-size": size,
    "--echo-texture-opacity": opacity,
    "--echo-texture-blend": blend,
  } as CSSProperties;
}

function Overlay({
  kind,
  vars,
  fixed,
  className,
}: {
  kind: string;
  vars: CSSProperties;
  fixed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={["echo-texture", `echo-texture--${kind}`, className].filter(Boolean).join(" ")}
      data-fixed={fixed ? "" : undefined}
      aria-hidden="true"
      style={vars}
    />
  );
}

export interface DitherProps extends OverlayProps {
  /** Ink colour: dark deepens the surface, light lifts it. Default "dark". */
  tone?: "dark" | "light";
  /** Tile scale multiplier. 1 = a 16px tile. */
  scale?: number;
}

/** Ordered-dither overlay — the retro/print texture. Best over gradients and glows. */
export function Dither({
  opacity = 0.22,
  blend = "overlay",
  tone = "dark",
  scale = 1,
  fixed,
  className,
}: DitherProps = {}) {
  const size = `${16 * scale}px`;
  const uri = tone === "dark" ? ditherTile.dark : ditherTile.light;
  return (
    <Overlay
      kind="dither"
      vars={overlayVars(`url("${uri}")`, size, opacity, blend)}
      fixed={fixed}
      className={className}
    />
  );
}

export interface NoiseProps extends OverlayProps {
  /** "fine" for product surfaces, "coarse" for marketing fields. */
  grain?: "fine" | "coarse";
  /** Tile size in px. Larger = softer, more airbrushed. */
  size?: number;
}

/** Fractal-noise grain — the airbrushed, organic texture. */
export function Noise({
  opacity = 0.05,
  blend = "soft-light",
  grain = "fine",
  size = 200,
  fixed,
  className,
}: NoiseProps = {}) {
  const uri = grain === "fine" ? noiseTile.fine : noiseTile.coarse;
  return (
    <Overlay
      kind="noise"
      vars={overlayVars(`url("${uri}")`, `${size}px`, opacity, blend)}
      fixed={fixed}
      className={className}
    />
  );
}

export interface HalftoneProps extends OverlayProps {
  /** Dot pitch in px. */
  cell?: number;
}

/** Print/CRT halftone — the same DNA as the device dot-matrix, as a texture. */
export function Halftone({
  opacity = 0.4,
  blend = "multiply",
  cell = 4,
  fixed,
  className,
}: HalftoneProps = {}) {
  return (
    <Overlay
      kind="halftone"
      vars={overlayVars(undefined, `${cell}px`, opacity, blend)}
      fixed={fixed}
      className={className}
    />
  );
}

export interface ScanlinesProps extends OverlayProps {
  /** Line pitch in px. */
  gap?: number;
}

/** Scanlines — the CRT register, for anything pretending to be a screen. */
export function Scanlines({
  opacity = 0.35,
  blend = "multiply",
  gap = 3,
  fixed,
  className,
}: ScanlinesProps = {}) {
  return (
    <Overlay
      kind="scanlines"
      vars={overlayVars(undefined, `${gap}px`, opacity, blend)}
      fixed={fixed}
      className={className}
    />
  );
}

export interface GrainFieldProps {
  /**
   * Which ramp blooms. "accent" is the brand field (the seed accent, whatever
   * it is); "chassis" is the quiet neutral field for product backgrounds.
   */
  tone?: "accent" | "chassis";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * GrainField — the brand surface: a soft airbrushed bloom in the accent ramp,
 * two scales of spray grain, and an edge darkening pass that keeps overlaid
 * text legible. This is the marketing/brand texture; product surfaces keep
 * their own matte speckle and take only a whisper of `Noise`.
 */
export function GrainField({ tone = "accent", className, style, children }: GrainFieldProps) {
  return (
    <div
      className={["echo-grain-field", className].filter(Boolean).join(" ")}
      data-tone={tone}
      style={style}
    >
      <div className="echo-grain-field__bloom" aria-hidden="true" />
      <Noise grain="coarse" size={180} opacity={0.5} blend="soft-light" />
      <Noise grain="coarse" size={300} opacity={0.28} blend="overlay" />
      <div className="echo-grain-field__vignette" aria-hidden="true" />
      <div className="echo-grain-field__content">{children}</div>
    </div>
  );
}

export interface TexturedProps {
  dither?: boolean;
  noise?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Wrap any content and stack the default treatment (grain + dither) over it. */
export function Textured({
  dither = true,
  noise = true,
  className,
  style,
  children,
}: TexturedProps) {
  return (
    <div className={["echo-textured", className].filter(Boolean).join(" ")} style={style}>
      {children}
      {noise ? <Noise opacity={0.06} /> : null}
      {dither ? <Dither opacity={0.16} /> : null}
    </div>
  );
}
