import { test } from "node:test";
import assert from "node:assert/strict";

import type { CatalogComponent } from "./catalog";
import { renderComponent } from "./render";

const bare: CatalogComponent = {
  name: "echo-tabs",
  title: "Tabs",
  description: "Base UI Tabs skinned as a hardware segmented control.",
  type: "registry:component",
  dependencies: ["@base-ui/react"],
  registryDependencies: [],
  install: "npx echo-ui-cli add tabs",
  props: [{ name: "size", type: '"sm" | "md"', required: false, defaultValue: '"md"' }],
  examples: [{ title: "Basic", description: "Two tabs.", code: '<Tabs defaultValue="a" />' }],
  antiPatterns: ["Every Tabs.Tab needs a matching Tabs.Panel."],
};

const full: CatalogComponent = {
  ...bare,
  feel: "A lit cap slides under the tab you pick, with a soft click.",
  usage: { imports: 'import { Tabs } from "@/echo/tabs";', code: '<Tabs defaultValue="a">…</Tabs>' },
  composition: "Tabs\n  Tabs.List\n    Tabs.Tab\n  Tabs.Panel",
  a11y: ["Arrow keys move between tabs; Tab moves into the panel.", "Tabs.List needs an aria-label."],
  motion: { tokens: ["slide"], reducedMotion: "The cap jumps instead of sliding." },
  sound: ["`select` when the active tab changes"],
};

const headings = (text: string) => text.split("\n").filter((l) => /^#{3} /.test(l));

test("every docs field is rendered", () => {
  const text = renderComponent(full);
  assert.match(text, /\*Feel:\* A lit cap slides/);
  assert.match(text, /```tsx\nimport \{ Tabs \} from "@\/echo\/tabs";\n\n<Tabs defaultValue="a">…<\/Tabs>\n```/);
  // The indentation is the tree, so it has to survive verbatim.
  assert.ok(text.includes("```text\nTabs\n  Tabs.List\n    Tabs.Tab\n  Tabs.Panel\n```"));
  assert.match(text, /- Tabs\.List needs an aria-label\./);
  assert.match(text, /- Motion tokens: `slide`/);
  assert.match(text, /- Reduced motion: The cap jumps instead of sliding\./);
  assert.match(text, /- Sound: `select` when the active tab changes/);
});

test("sections come in the component page's order", () => {
  assert.deepEqual(headings(renderComponent(full)), [
    "### Usage",
    "### Composition",
    "### Examples",
    "### Accessibility",
    "### Motion & sound",
    "### Props",
    "### Anti-patterns",
  ]);
});

test("a component without docs fields renders no empty sections", () => {
  // A catalog.json published before these fields existed is still what the MCP
  // server reads until the next deploy; it has to render cleanly.
  const text = renderComponent(bare);
  assert.deepEqual(headings(text), ["### Examples", "### Props", "### Anti-patterns"]);
  assert.doesNotMatch(text, /Feel|undefined/);
});

test("motion without sound, and sound without motion, each render alone", () => {
  const motionOnly = renderComponent({ ...bare, motion: { tokens: [], reducedMotion: "No movement." } });
  assert.match(motionOnly, /### Motion & sound\n\n- Reduced motion: No movement\.\n/);
  assert.doesNotMatch(motionOnly, /Motion tokens/);

  const soundOnly = renderComponent({ ...bare, sound: ["`press` on pointer down"] });
  assert.match(soundOnly, /### Motion & sound\n\n- Sound: `press` on pointer down\n/);
});
