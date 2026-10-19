/**
 * A small hand-written catalog for the server tests. Deliberately NOT the real
 * built catalog.json: the tools are tested for behaviour (name resolution,
 * empty examples, missing components), and a fixture that changes every time a
 * component ships would make those assertions unreadable.
 */
import { RegistryError, hashContent, type EIndex, type EItem, type Fetcher } from "@echo-ui/client";

import type { RegistryCatalog } from "@registry/agent/catalog";

export const sampleCatalog: RegistryCatalog = {
  name: "echo-ui",
  homepage: "https://echo-ui.com",
  components: [
    {
      name: "echo-hardware-button",
      title: "HardwareButton",
      description:
        "A molded tactile button with press travel and sound. Press feel and sound come from useTactile; plastic colour from the theme.",
      summary: "A molded tactile button with press travel and sound.",
      type: "registry:component",
      dependencies: ["gsap"],
      registryDependencies: ["@echo/echo-theme", "@echo/use-tactile"],
      install: "npx echo-ui-cli add hardware-button",
      props: [
        { name: "variant", type: '"primary" | "neutral" | "ghost"', required: false, defaultValue: '"neutral"' },
        { name: "loading", type: "boolean", required: false, defaultValue: "false", description: "Shows the dots." },
      ],
      examples: [
        { title: "Primary", description: "The accent cap.", code: '<HardwareButton variant="primary">Record</HardwareButton>' },
      ],
      antiPatterns: ["Never ship an icon-only button without an aria-label."],
      usage: {
        imports: 'import { HardwareButton } from "@/components/echo/hardware-button";',
        code: "<HardwareButton>Save</HardwareButton>",
      },
      composition: "HardwareButton",
      a11y: ["Renders a native <button>; Enter and Space press it."],
      motion: { tokens: ["press"], reducedMotion: "The cap still travels; the spring settle is dropped." },
      sound: ["`press` on pointer down, `release` on pointer up"],
    },
    // Modal carries none of the docs fields — it stands in for a catalog.json
    // published before they existed.
    {
      name: "echo-modal",
      title: "Modal",
      description: "Base UI Dialog skinned as an Echo device panel.",
      type: "registry:component",
      dependencies: ["gsap", "@base-ui/react"],
      registryDependencies: [],
      install: "npx echo-ui-cli add modal",
      props: [],
      examples: [],
      antiPatterns: [],
    },
  ],
  tokens: {
    colorRoles: ["--echo-surface", "--echo-accent"],
    sound: ["press", "release"],
    motion: ["press", "pop"],
  },
};

/**
 * The `/e/` half of the same two components: what they ship as. Hand-written
 * for the same reason the catalog is — these tests are about whether the
 * server joins the two documents, not about what HardwareButton's real
 * dependencies happen to be this week.
 *
 * Served to the tests through a fetcher, so it travels the real client path:
 * schema check, hash check, path check. The hashes are computed rather than
 * written down, because a fixture with a wrong hash would fail for a reason
 * that has nothing to do with the test.
 */
export const sampleRegistry = (() => {
  const file = (path: string, content: string) => ({ path, sha256: hashContent(content), content });
  const items: Record<string, EItem> = {
    "hardware-button": {
      schemaVersion: 1,
      name: "hardware-button",
      version: "0.2.0",
      kind: "component",
      title: "HardwareButton",
      description: "A molded tactile button with press travel and sound.",
      core: ">=0.1.0 <0.2.0",
      dependencies: { gsap: "^3.13.0", "echo-ui-core": ">=0.1.0 <0.2.0" },
      items: [],
      files: [file("hardware-button/hardware-button.tsx", "export const HardwareButton = () => null;\n")],
      setup: ["theme-css", "client-boundary", "sound-provider"],
      motion: ["press"],
      sound: ["press", "release"],
      a11y: {
        standard: "WCAG 2.2 AA",
        tested: ["axe", "keyboard", "focus-visible", "forced-colors", "target-size"],
        limits: ["screen-reader: not yet verified by a person"],
      },
      changes: [{ version: "0.2.0", flags: ["changed", "a11y"], summary: "Icon-only buttons need a name." }],
    },
    modal: {
      schemaVersion: 1,
      name: "modal",
      version: "0.1.3",
      kind: "component",
      title: "Modal",
      description: "Base UI Dialog skinned as an Echo device panel.",
      core: ">=0.1.0 <0.2.0",
      dependencies: { "@base-ui/react": "^1.0.0" },
      items: ["hardware-button"],
      files: [file("modal/modal.tsx", "export const Modal = () => null;\n")],
      setup: ["theme-css", "client-boundary"],
      motion: ["summon"],
      sound: ["transition"],
      a11y: { standard: "WCAG 2.2 AA", tested: ["axe", "keyboard"], limits: [] },
      changes: [],
    },
  };

  const index: EIndex = {
    schemaVersion: 1,
    version: "0.2.0",
    core: "0.1.0",
    items: Object.values(items).map(({ name, version, kind, title, description, items: deps }) => ({
      name,
      version,
      kind,
      title,
      description,
      items: deps,
    })),
  };

  /**
   * Echo's library: its own style, and one the slop police stops (a near-black
   * ground with one acid accent), so a tool that wears a style is seen refusing.
   */
  const styles: Record<string, Record<string, unknown>> = {
    echo: {
      version: 1,
      name: "echo",
      title: "Echo",
      essence: "A device molded in one plastic and lit by one key light.",
      fingerprint: { warmth: 4, volume: 3, density: 3, formality: 2, era: 3, craft: 5, ornament: 3 },
      seed: { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA", finish: 0.5, radius: 0.5, density: "default" },
      rules: ["The primary action is the one lit cap; everything else is the body's plastic."],
      motion: { character: "Springs with weight.", inferred: false },
      sound: { voice: "Dry clicks and soft taps.", inferred: false },
    },
    nightclub: {
      version: 1,
      name: "nightclub",
      title: "Nightclub",
      essence: "Black, with one acid signal.",
      fingerprint: { warmth: 2, volume: 5, density: 3, formality: 3, era: 5, craft: 3, ornament: 2 },
      seed: { accent: "#C6FF3D", chassis: "#0B0B0B", paper: "#F2F2F2" },
    },
  };
  const styleIndex = {
    styles: Object.values(styles).map(({ name, title, essence, fingerprint }) => ({ name, title, essence, fingerprint })),
  };

  /** A fetcher over the fixture, so the client's own verification runs. */
  const fetcher: Fetcher = async (url) => {
    if (url.includes("/styles/")) {
      const name = decodeURIComponent(url.split("/").pop()!).replace(/\.json$/, "");
      if (name === "index") return JSON.stringify(styleIndex);
      if (!styles[name]) throw new RegistryError(`404 Not Found for ${url}`);
      return JSON.stringify(styles[name]);
    }
    const path = decodeURIComponent(url.split("/").pop()!).replace(/\.json$/, "");
    if (path === "index") return JSON.stringify(index);
    // `{name}@{version}.json` is served only at the version the fixture has.
    const [name, version] = path.split("@");
    const item = items[name!];
    if (!item || (version && version !== item.version)) throw new RegistryError(`404 Not Found for ${url}`);
    return JSON.stringify(item);
  };

  return { index, items, styles, fetcher };
})();
