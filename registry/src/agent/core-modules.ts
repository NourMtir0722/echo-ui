/**
 * The five modules that ship in the `echo-ui-core` npm package instead of
 * being copied from the registry: the grammar every component
 * depends on. They keep docs pages and catalog entries under their old item
 * names, so links and agent lookups don't break; only how they're installed
 * changes.
 *
 * Shaped like registry.json items so the catalog, the docs pages and the agent
 * layer can treat both lists the same way, with `isCoreModule` where install
 * differs.
 */
import type { RegistryItem } from "./catalog-entry";

/** The npm package the grammar ships in. */
export const CORE_PACKAGE = "echo-ui-core";

export interface CoreModule extends RegistryItem {
  /** Where it's imported from, e.g. "echo-ui-core/theme". */
  entry: string;
}

export const CORE_MODULES: readonly CoreModule[] = [
  {
    name: "echo-theme",
    type: "core:module",
    title: "Theme Engine",
    entry: `${CORE_PACKAGE}/theme`,
    description:
      "createEchoTheme(seed) — OKLCH derivation turning a ~6-value seed into the full semantic-role set, with dual { css, values } output and WCAG-AA contrast guardrails. The token foundation every Echo component depends on.",
    dependencies: [CORE_PACKAGE],
  },
  {
    name: "echo-sound",
    type: "core:module",
    title: "Sound Engine",
    entry: `${CORE_PACKAGE}/sound`,
    description:
      "SoundProvider + zero-dep WebAudio SynthBackend. Sound tokens are serializable synth recipes; lazy AudioContext, persisted mute, per-play jitter, blur guard, and reduced-motion coupling.",
    dependencies: [CORE_PACKAGE],
  },
  {
    name: "echo-motion",
    type: "core:module",
    title: "Motion Tokens",
    entry: `${CORE_PACKAGE}/motion`,
    description:
      "GSAP motion tokens (duration + ease as serializable data), each with an optional reduced-motion collapse variant. Glass moves smooth; pixels move steppy.",
    dependencies: [CORE_PACKAGE, "gsap"],
  },
  {
    name: "use-tactile",
    type: "core:module",
    title: "useTactile",
    entry: `${CORE_PACKAGE}/tactile`,
    description:
      "The fusion primitive: binds motion (GSAP) + sound per interaction phase, with pointer/keyboard parity and prefers-reduced-motion collapse. Accepts token names or raw GSAP vars / sound recipes as an escape hatch. The same entry holds the physics the components are built on: springs, cap presses, the typing well, the liquid cap, and the morph engine (MorphSurface, morphFeels) that divides one cap into several.",
    dependencies: [CORE_PACKAGE, "gsap"],
  },
  {
    name: "use-gsap-presence",
    type: "core:module",
    title: "useGsapPresence",
    entry: `${CORE_PACKAGE}/presence`,
    description:
      "The GSAP-exit bridge (implemented once, reused by every Base UI wrapper): controls open state + actionsRef so the exit animation completes before Base UI unmounts. Runs the enter on mount.",
    dependencies: [CORE_PACKAGE, "gsap"],
  },
];

const CORE_NAMES = new Set(CORE_MODULES.map((m) => m.name));

export const isCoreModule = (name: string): boolean => CORE_NAMES.has(name);

/** The install line for the core package, per package manager. */
export const coreInstallCommand = (manager: "npm" | "pnpm" | "yarn" | "bun" = "npm"): string =>
  `${manager === "npm" ? "npm install" : `${manager} add`} ${CORE_PACKAGE}`;
