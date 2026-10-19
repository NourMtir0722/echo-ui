/**
 * use-tactile — Echo UI's motion + sound fusion primitive.
 */
export { useTactile } from "./use-tactile";
export type {
  TactileConfig,
  TactilePhase,
  TactilePhaseName,
  UseTactileResult,
} from "./use-tactile";
export {
  resolveMotion,
  isActivationKey,
  isMotionName,
  PHASE_GESTURE,
} from "./resolve-motion";
export type { PhaseMotion, ResolvedMotion, TweenVars } from "./resolve-motion";
export {
  timing,
  travelFrom,
  watchTravel,
  useBootOnView,
  useCapPhysics,
  usePressable,
  useReducedMotion,
  useReducedMotionRef,
} from "./physics";
export type { CapPhysics, CapPhysicsOptions } from "./physics";
export { createSpring, rubberband } from "./spring";
export type { Spring, SpringConfig } from "./spring";
export { capOutline, createLiquid } from "./liquid";
export type { CapEnd, Liquid, LiquidAxis, LiquidBox, LiquidOptions } from "./liquid";
export { useLiquidHighlight } from "./liquid-highlight";
export type { LiquidHighlight } from "./liquid-highlight";
export { attachWellMotion, useWellMotion } from "./well";
export { mergeHandlers, mergeRefs } from "./compose";
export { apart, morphFeels, outline } from "./morph-outline";
export type { MorphFeel, MorphFeelName, MorphPill, MorphField } from "./morph-outline";
export { MorphEngine } from "./morph";
export type { MorphEls, MorphPart, MorphTone } from "./morph";
export { MORPH_MARGIN, MorphSurface } from "./morph-surface";
export type { MorphLabel, MorphSurfaceProps } from "./morph-surface";
