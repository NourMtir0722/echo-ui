/**
 * <BrandGrain> — the marketing surface: a soft airbrushed field in the three
 * aura ramps (the brand hue and its two companions) under two scales of
 * spray-grain.
 *
 * This is NOT the registry's GrainField: that one blooms in the accent ramp
 * alone, while this one is the brand's three-aura register. Both follow the
 * seed — the three ramps here are the brand's, relit for it (brand-theme.ts),
 * so a sky-blue site gets a sky-blue field with its companions turned the same
 * distance round the wheel. Brand and marketing surfaces only — never behind
 * product UI.
 */
import type { CSSProperties, ReactNode } from "react";
import { aura } from "./tokens";
import "./brand.css";

const FIELDS = {
  warm: `radial-gradient(70% 90% at 22% 28%, ${aura.raspberry[3]} 0%, transparent 58%),
    radial-gradient(60% 80% at 82% 18%, ${aura.peach[3]} 0%, transparent 55%),
    radial-gradient(80% 90% at 65% 95%, ${aura.lavender[3]} 0%, transparent 60%),
    ${aura.raspberry[5]}`,
  cool: `radial-gradient(70% 90% at 25% 75%, ${aura.lavender[3]} 0%, transparent 60%),
    radial-gradient(60% 80% at 80% 30%, ${aura.raspberry[3]} 0%, transparent 55%),
    radial-gradient(60% 70% at 50% 10%, ${aura.peach[2]} 0%, transparent 55%),
    ${aura.lavender[5]}`,
} as const;

export type GrainTone = keyof typeof FIELDS;

export function BrandGrain({
  tone = "warm",
  className,
  style,
  children,
}: {
  tone?: GrainTone;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={["brand-grain", className].filter(Boolean).join(" ")} data-tone={tone} style={style}>
      <div className="brand-grain__field" style={{ background: FIELDS[tone] }} aria-hidden="true" />
      <div className="brand-grain__spray brand-grain__spray--fine" aria-hidden="true" />
      <div className="brand-grain__spray brand-grain__spray--coarse" aria-hidden="true" />
      <div className="brand-grain__vignette" aria-hidden="true" />
      {children != null && <div className="brand-grain__content">{children}</div>}
    </div>
  );
}
