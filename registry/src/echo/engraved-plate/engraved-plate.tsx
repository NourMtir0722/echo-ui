/**
 * EngravedPlate — a debossed cream plate with rivets.
 * Generalized from the first Echo device's `OwedTag`,
 * which hardcoded "Owed N": the value is the RENDERING — a machined plate
 * screwed onto the chassis — so the content is free-form and the domain noun
 * stays in the consumer.
 *
 * The one paper-coloured surface in the library. Use it for a fact that is
 * fixed to the device (a serial, a rating, a balance), not for a value that
 * updates while you watch — that is LcdChip's screen.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import "./engraved-plate.css";

export interface EngravedPlateProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The engraving. Short — a plate is stamped, not written on. */
  children: ReactNode;
  /** Rotation in degrees, as if screwed on slightly off-true. Default 0. */
  tilt?: number;
  /** Rivets at the plate's short edges. Default true. */
  rivets?: boolean;
}

export function EngravedPlate({
  children,
  tilt = 0,
  rivets = true,
  className,
  style,
  ...rest
}: EngravedPlateProps) {
  return (
    <span
      className={["echo-engraved-plate", className].filter(Boolean).join(" ")}
      // Tilt rides as a custom property (the sanctioned var-passthrough, as on
      // Loader's dot) so the transform stays in the stylesheet with the rest of
      // the material.
      style={{ "--echo-plate-tilt": `${tilt}deg`, ...style } as CSSProperties}
      {...rest}
    >
      {rivets ? (
        <>
          <span className="echo-engraved-plate__rivet" data-side="start" aria-hidden="true" />
          <span className="echo-engraved-plate__rivet" data-side="end" aria-hidden="true" />
        </>
      ) : null}
      <span className="echo-engraved-plate__text">{children}</span>
    </span>
  );
}
