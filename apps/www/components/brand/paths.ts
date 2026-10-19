/**
 * The canonical Echo vectors, in viewBox "102.5 4 56 56". They live with the
 * Creature component in the registry (character.ts) and are re-exported here
 * under the brand's names, so there is ONE drawing for the creature,
 * the logo-O and the boot reveal. The silhouette and eye shapes are never
 * altered; only fills change, and only as the logo-use rules allow.
 *
 * The one edit to the export: two knots of tracing noise at the right and
 * top-right notches, which the rim stroke drew as burrs, are each the single
 * step they amounted to. No point of the silhouette moved.
 */
export {
  ECHO_VIEWBOX as VIEWBOX,
  ECHO_BODY as BODY,
  ECHO_EYE_WHITE_L as EYE_WHITE_L,
  ECHO_EYE_WHITE_R as EYE_WHITE_R,
  ECHO_PUPIL_L as PUPIL_L,
  ECHO_PUPIL_R as PUPIL_R,
  ECHO_EYE_CY as EYE_CY,
  ECHO_EYE_CATCH as EYE_CATCH,
} from "@registry/echo/creature/character";

/** Measured flower bbox (getBBox, in the viewBox above). */
const VIEW = { x: 102.5, y: 4, size: 56 } as const;
export const FLOWER_BBOX = { x: 105.19, y: 7.7, w: 48.09, h: 47.9, cx: 129.23, cy: 31.65 } as const;
export const FLOWER_FRAC = {
  left: (FLOWER_BBOX.x - VIEW.x) / VIEW.size,
  right: (FLOWER_BBOX.x + FLOWER_BBOX.w - VIEW.x) / VIEW.size,
  bottom: (FLOWER_BBOX.y + FLOWER_BBOX.h - VIEW.y) / VIEW.size,
  cy: (FLOWER_BBOX.cy - VIEW.y) / VIEW.size,
  h: FLOWER_BBOX.h / VIEW.size,
} as const;

/** SVG box size that renders the visible flower (petal tips) at height `m` px. */
export const markBox = (m: number) => m / FLOWER_FRAC.h;
