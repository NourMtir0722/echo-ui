/**
 * echo-theme — Echo UI theme engine.
 *
 * Public surface: seeds in (Layer 1), semantic roles out (Layer 3), via one
 * OKLCH derivation with dual { css, values } output. Import material.css
 * separately for the molded-plastic material recipes.
 */
export { createEchoTheme, devicePolarity, LIGHT_CHASSIS_L, __resetThemeWarnings } from "./create-echo-theme";
export type {
  CreateEchoThemeOptions,
  EchoThemeResult,
} from "./create-echo-theme";
export { EchoSeed, SEED_DEFAULTS, defaultSeed } from "./seed";
export {
  KEY_LIGHT_ANGLE,
  DENSITIES,
  RENDERS,
  DRAWN_LINE_WIDTH,
  DENSITY_FACTOR,
  DEVICE_DEFAULTS,
  glossFactor,
  shadeFactor,
  radiusFactor,
} from "./device";
export type { EchoDensity, EchoDevice, EchoRender } from "./device";
export type { EchoSeedInput, EchoSeedResolved } from "./seed";
export {
  RADIUS_SCALE,
  TYPE_SCALE,
  SPACE_SCALE,
  CONTROL_HEIGHT,
  DURATION_SCALE,
  EASE_SCALE,
  Z_SCALE,
  WEIGHT_SCALE,
  LEADING_SCALE,
  TRACKING_SCALE,
  TEXT_STYLES,
  BORDER_SCALE,
  ICON_SCALE,
  BREAKPOINTS,
} from "./scales";
export { SHADOW_RECIPES, shadowValue } from "./shadow";
export { APCA_FLOOR, CAP_OFF_BODY, RIM_OFF_CAP, readability, simulate, type ColourBlindness, type ReadabilityNote } from "./readability";
export type { ShadowName, ShadowKind, ShadowRecipe } from "./shadow";
export type {
  RadiusStep,
  TypeStep,
  SpaceStep,
  ControlHeightStep,
  DurationStep,
  ZStep,
  WeightStep,
  LeadingStep,
  TrackingStep,
  TextStyle,
  BorderStep,
  IconStep,
  Breakpoint,
} from "./scales";
export { ECHO_ROLES, ECHO_FONT_ROLES } from "./roles";
export type { EchoRole, EchoFontRole, EchoTheme } from "./roles";
export {
  contrastRatio,
  apcaContrast,
  APCA_SMALL_TEXT,
  relativeLuminance,
  ensureContrast,
  ensureBackgroundContrast,
  sampleGradient,
  gradientContrast,
  worstGradientContrast,
  AA_NORMAL,
  AA_LARGE,
  AA_NON_TEXT,
} from "./contrast";
export type { ContrastFix, GradientStop, GradientContrast } from "./contrast";
export {
  hexToOklch,
  oklchToHex,
  deltaEOK,
  deltaEHex,
  inGamut,
  clampToGamut,
  adjust,
  parseHex,
  toHex,
} from "./oklch";
export type { OKLCH } from "./oklch";
