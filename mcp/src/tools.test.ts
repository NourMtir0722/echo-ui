import { test } from "node:test";
import assert from "node:assert/strict";

import { createCatalogSource } from "./catalog-source";
import { createRegistrySource } from "./registry-source";
import { IMPORT_PLACEHOLDER } from "@registry/agent/guidance";
import { resolveName } from "@registry/agent/names";

import { createHandlers, TOOL_DEFINITIONS } from "./tools";
import { sampleCatalog, sampleRegistry } from "./sample-catalog";

/**
 * The catalog alone, as an agent gets it when `/e/` cannot be reached. Most
 * assertions here are about the catalog half, and a missing registry must not
 * change any of them.
 */
function handlers(catalog: unknown = sampleCatalog) {
  const impl = (async () =>
    new Response(JSON.stringify(catalog))) as unknown as typeof fetch;
  return createHandlers(createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: impl }));
}

/** Both documents, joined — the server as it actually runs. */
function fullHandlers() {
  const impl = (async () =>
    new Response(JSON.stringify(sampleCatalog))) as unknown as typeof fetch;
  return createHandlers(
    createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: impl }),
    createRegistrySource({ registry: "https://example.test/e", registryFetcher: sampleRegistry.fetcher }),
  );
}

const body = (result: { content: { type: string; text?: string }[] }) =>
  result.content.map((c) => c.text ?? "").join("\n");

test("the published tool names are the ones registered", () => {
  // The first four names are the published contract; renaming one silently breaks every agent
  // config that already points at this server. get_accessibility and check_code are Echo's own
  // and were added at the end for the same reason, and the style tools after them.
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS), [
    "search_components",
    "get_component",
    "get_tokens",
    "get_examples",
    "get_accessibility",
    "check_code",
    "list_styles",
    "fit_styles",
    "check_style",
    "wear_style",
  ]);
});

test("check_code runs Echo's check on code handed over as text", async () => {
  const tsx = body(
    await handlers().check_code({
      code: `import { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <div style={{ color: "#ff0000" }}><button>Save</button><HardwareButton>Go</HardwareButton></div>;`,
      file: "app/page.tsx",
    }),
  );
  assert.match(tsx, /^2 problems, each with the Echo way to fix it:/);
  assert.match(tsx, /app\/page\.tsx:2:\d+ \(lookalike\) <button> where Echo has HardwareButton/);
  assert.match(tsx, /\(colour\) `#ff0000` is a colour written by hand/);

  const css = body(await handlers().check_code({ code: ".card { box-shadow: 0 4px 12px rgb(0 0 0 / 0.3); }", file: "card.module.css" }));
  assert.match(css, /\(shadow\) `box-shadow: 0 4px 12px rgb\(0 0 0 \/ 0\.3\)` is a shadow drawn by hand/);

  assert.match(body(await handlers().check_code({ code: `export const A = () => <p style={{ color: "var(--echo-text)" }}>Hi</p>;` })), /^No problems/);
  assert.match(body(await handlers().check_code({ code: ".a {", file: "a.css" })), /^Couldn't read it as CSS/);
});

test("resolveName accepts the registry name, the bare name and the title", () => {
  assert.equal(resolveName(sampleCatalog, "echo-hardware-button"), "echo-hardware-button");
  assert.equal(resolveName(sampleCatalog, "hardware-button"), "echo-hardware-button");
  assert.equal(resolveName(sampleCatalog, "HardwareButton"), "echo-hardware-button");
  assert.equal(resolveName(sampleCatalog, "  Modal  "), "echo-modal");
  assert.equal(resolveName(sampleCatalog, "nonexistent"), null);
});

test("search_components lists matches with their install command", async () => {
  const text = body(await handlers().search_components({ query: "button" }));
  assert.match(text, /echo-hardware-button/);
  assert.match(text, /npx echo-ui-cli add hardware-button/);
  assert.doesNotMatch(text, /echo-modal/);
});

test("search lists the one-line summary; get_component gives the full description", async () => {
  const listed = body(await handlers().search_components({ query: "button" }));
  assert.match(listed, /— A molded tactile button with press travel and sound\.\n/);
  assert.doesNotMatch(listed, /plastic colour/);
  const full = body(await handlers().get_component({ name: "hardware-button" }));
  assert.match(full, /plastic colour from the theme/);
});

test("search_components with no query lists everything", async () => {
  const text = body(await handlers().search_components({}));
  assert.match(text, /echo-hardware-button/);
  assert.match(text, /echo-modal/);
});

test("a search with no hits says how to list what exists", async () => {
  const text = body(await handlers().search_components({ query: "carburettor" }));
  assert.match(text, /No Echo UI component matches/);
  assert.match(text, /search_components/);
});

test("get_component returns props, examples and anti-patterns", async () => {
  const text = body(await handlers().get_component({ name: "hardware-button" }));
  assert.match(text, /HardwareButton/);
  assert.match(text, /Install: `npx echo-ui-cli add hardware-button`/);
  assert.match(text, /\| `variant` \|/);
  assert.match(text, /"primary" \| "neutral" \| "ghost"/);
  assert.match(text, /Anti-patterns/);
  assert.match(text, /aria-label/);
});

test("get_component says what the item weighs, when the catalog measured it", async () => {
  const [button, ...rest] = sampleCatalog.components;
  const catalog = { ...sampleCatalog, components: [{ ...button!, weight: { js: 1273, withDependencies: 35629, css: 814 } }, ...rest] };
  const text = body(await handlers(catalog).get_component({ name: "hardware-button" }));
  assert.match(text, /- Weight: 1\.2 KB; 34\.8 KB with what it imports; 814 B of CSS \(minified and gzipped, React not counted\)/);
  assert.doesNotMatch(body(await handlers().get_component({ name: "hardware-button" })), /Weight:/, "a catalog without weights says nothing");
});

test("get_component includes usage, composition, accessibility and motion & sound", async () => {
  const text = body(await handlers().get_component({ name: "hardware-button" }));
  assert.match(text, /### Usage\n\n```tsx\nimport \{ HardwareButton \} from "@\/components\/echo\/hardware-button";/);
  assert.match(text, /### Composition/);
  assert.match(text, /### Accessibility\n\n- Renders a native <button>/);
  assert.match(text, /- Reduced motion: The cap still travels/);
  assert.match(text, /- Sound: `press` on pointer down/);
});

test("get_component on a catalog without the docs fields prints no empty sections", async () => {
  const text = body(await handlers().get_component({ name: "modal" }));
  assert.match(text, /Base UI Dialog/);
  assert.doesNotMatch(text, /Usage|Composition|Accessibility|Motion & sound|undefined/);
});

/* ------------------------------------------------ the `/e/` half --- */

test("get_component says what the component ships as, from the registry", async () => {
  const text = body(await fullHandlers().get_component({ name: "hardware-button" }));
  // The catalog half is unchanged.
  assert.match(text, /\| `variant` \|/);
  // The registry half: the version, the core range, and what comes with it.
  assert.match(text, /### Ships as/);
  assert.match(text, /- Version: 0\.2\.0 \(`echo-ui-core` >=0\.1\.0 <0\.2\.0\)/);
  assert.match(text, /- npm: gsap@\^3\.13\.0, echo-ui-core@>=0\.1\.0 <0\.2\.0/);
  assert.match(text, /- Setup it needs: theme-css, client-boundary, sound-provider/);
});

test("get_component carries the item's own accessibility record", async () => {
  const text = body(await fullHandlers().get_component({ name: "hardware-button" }));
  assert.match(text, /### Accessibility record/);
  assert.match(text, /- Standard: WCAG 2\.2 AA/);
  assert.match(text, /- Tested: axe, keyboard, focus-visible, forced-colors, target-size/);
  // The limit is the point: an agent that cannot see it assumes there is none.
  assert.match(text, /- Not covered: screen-reader: not yet verified by a person/);
});

test("an item with nothing outstanding prints no empty limits line", async () => {
  const text = body(await fullHandlers().get_component({ name: "modal" }));
  assert.match(text, /- Tested: axe, keyboard/);
  assert.doesNotMatch(text, /Not covered/);
});

test("with the registry down, search falls back to the version the catalog was built at", async () => {
  const versioned = {
    ...sampleCatalog,
    catalogVersion: 1,
    components: sampleCatalog.components.map((c) => (c.name === "echo-hardware-button" ? { ...c, version: "0.2.0" } : c)),
  };
  const catalogImpl = (async () =>
    new Response(JSON.stringify(versioned))) as unknown as typeof fetch;
  const handlers_ = createHandlers(
    createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: catalogImpl }),
    createRegistrySource({
      registry: "https://example.test/e",
      registryFetcher: async () => {
        throw new Error("ENOTFOUND");
      },
    }),
  );
  assert.match(body(await handlers_.search_components({ query: "button" })), /`echo-hardware-button` v0\.2\.0/);
});

test("search lists the version the registry serves", async () => {
  const text = body(await fullHandlers().search_components({ query: "button" }));
  assert.match(text, /`echo-hardware-button` v0\.2\.0/);
});

/**
 * The registry is a second network dependency, and a component's props are
 * still worth having when it is down. Losing the version column is the whole
 * cost — get_component must not fail because `/e/` did.
 */
test("an unreachable registry costs the version, not the answer", async () => {
  const catalogImpl = (async () =>
    new Response(JSON.stringify(sampleCatalog))) as unknown as typeof fetch;
  const half = createHandlers(
    createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: catalogImpl }),
    createRegistrySource({
      registry: "https://example.test/e",
      registryFetcher: async () => {
        throw new Error("ENOTFOUND");
      },
    }),
  );

  const component = await half.get_component({ name: "hardware-button" });
  assert.notEqual(component.isError, true);
  assert.match(body(component), /\| `variant` \|/);
  assert.doesNotMatch(body(component), /Ships as/);

  const search = await half.search_components({ query: "button" });
  assert.notEqual(search.isError, true);
  assert.match(body(search), /echo-hardware-button/);
  assert.doesNotMatch(body(search), /v0\.2\.0/);
});

test("get_accessibility answers with the rules when asked for nothing in particular", async () => {
  const text = body(await fullHandlers().get_accessibility({}));
  assert.match(text, /aria-label/);
  assert.match(text, /Toaster/);
  assert.match(text, /24×24px/);
  // The floor, and the one thing it does not cover.
  assert.match(text, /WCAG 2\.2 AA/);
  assert.match(text, /Not covered: screen-reader/);
});

test("get_accessibility for one component joins its notes, its tests and the rules", async () => {
  const text = body(await fullHandlers().get_accessibility({ name: "HardwareButton" }));
  assert.match(text, /# echo-hardware-button accessibility/);
  assert.match(text, /- Renders a native <button>/);
  assert.match(text, /## What was tested/);
  assert.match(text, /screen-reader: not yet verified/);
  assert.match(text, /## Rules that apply everywhere/);
});

test("get_accessibility still answers when the catalog is unreadable", async () => {
  const impl = (async () => {
    throw new Error("ENOTFOUND");
  }) as unknown as typeof fetch;
  const dead = createHandlers(createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: impl, retryDelays: [] }));
  const result = await dead.get_accessibility({ name: "hardware-button" });
  // These rules need no catalog, and they are the ones a model most needs.
  assert.notEqual(result.isError, true);
  assert.match(body(result), /aria-label/);
});

test("an unknown component suggests near matches instead of failing blank", async () => {
  const text = body(await handlers().get_component({ name: "hardwarebutton-xl" }));
  assert.match(text, /No component named/);
  assert.match(text, /search_components/);
});

test("get_tokens returns all three families", async () => {
  const text = body(await handlers().get_tokens());
  assert.match(text, /--echo-surface/);
  assert.match(text, /press/);
  assert.match(text, /Colour roles \(2\)/);
});

test("get_tokens lists motion's whole vocabulary: springs, morph feels, CSS durations and eases", async () => {
  const catalog = {
    ...sampleCatalog,
    tokens: {
      ...sampleCatalog.tokens,
      springs: ["track", "bouncy"],
      morphFeels: ["cell"],
      durations: ["--echo-duration-swap"],
      eases: ["--echo-ease-swap"],
    },
  };
  const text = body(await handlers(catalog).get_tokens());
  assert.match(text, /## Springs \(2\)/);
  assert.match(text, /`springs\.bouncy`/);
  assert.match(text, /createSpring/);
  assert.match(text, /## Morph feels \(1\)\n\n.*\n\n`morphFeels\.cell`/);
  assert.match(text, /`--echo-duration-swap`/);
  assert.match(text, /`--echo-ease-swap`/);
});

test("get_tokens on a catalog that predates them prints no empty motion families", async () => {
  const text = body(await handlers().get_tokens());
  assert.doesNotMatch(text, /Springs|Morph feels|CSS durations|CSS eases|Shadows/);
});

test("get_tokens lists the shadow recipes, each with what it's for", async () => {
  const catalog = {
    ...sampleCatalog,
    tokens: {
      ...sampleCatalog.tokens,
      shadows: [{ token: "--echo-shadow-well", kind: "recessed" as const, use: "Set into the body: a field, a tray." }],
    },
  };
  const text = body(await handlers(catalog).get_tokens());
  assert.match(text, /## Shadows \(1\)/);
  assert.match(text, /- `--echo-shadow-well` \(recessed\): Set into the body/);
  assert.match(text, /Never write a box-shadow by hand/);
});

test("a component's group is in its record, and a search for the group lists it", async () => {
  const catalog = {
    ...sampleCatalog,
    components: sampleCatalog.components.map((c) => (c.name === "echo-modal" ? { ...c, group: "Overlays" } : c)),
  };
  assert.match(body(await handlers(catalog).get_component({ name: "modal" })), /- Group: Overlays/);
  assert.match(body(await handlers(catalog).search_components({ query: "overlays" })), /echo-modal/);
});

test("get_examples returns the examples, and says so when there are none", async () => {
  const withExamples = body(await handlers().get_examples({ name: "echo-hardware-button" }));
  assert.match(withExamples, /```tsx/);
  assert.match(withExamples, /variant="primary"/);

  // An empty examples array is a gap in that component's meta.ts, and the
  // answer should point at what to call instead rather than return nothing.
  const without = body(await handlers().get_examples({ name: "echo-modal" }));
  assert.match(without, /no examples/);
  assert.match(without, /get_component/);
});

test("an unreadable catalog is one clear error, not a crash", async () => {
  const impl = (async () => {
    throw new Error("ENOTFOUND");
  }) as unknown as typeof fetch;
  const dead = createHandlers(
    createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: impl, retryDelays: [] }),
  );

  const result = await dead.get_tokens();
  assert.equal(result.isError, true);
  assert.match(body(result), /Could not read the Echo UI catalog/);
  // The recovery instruction has to name the knob and the current value.
  assert.match(body(result), /ECHO_CATALOG/);
  assert.match(body(result), /https:\/\/example\.test\/catalog\.json/);
});

/**
 * An unreachable registry costs the "Ships as" section. A registry serving a
 * file that fails its hash is a different answer — the component record would
 * describe something other than what was published — and has to be said.
 */
test("a registry file that fails its hash is reported, not dropped", async () => {
  const catalogImpl = (async () =>
    new Response(JSON.stringify(sampleCatalog))) as unknown as typeof fetch;
  const tampered = createHandlers(
    createCatalogSource({ source: "https://example.test/catalog.json", fetchImpl: catalogImpl }),
    createRegistrySource({
      registry: "https://example.test/e",
      registryFetcher: async (url) => {
        const served = await sampleRegistry.fetcher(url);
        if (url.endsWith("index.json")) return served;
        const item = JSON.parse(served);
        item.files[0].content += "// changed after publishing\n";
        return JSON.stringify(item);
      },
    }),
  );

  for (const result of [
    await tampered.get_component({ name: "hardware-button" }),
    await tampered.get_accessibility({ name: "hardware-button" }),
  ]) {
    assert.equal(result.isError, true);
    assert.match(body(result), /does not match its hash/);
  }
});

/**
 * Echo's snippets import from `@/echo`, a placeholder: the CLI's
 * `docs` puts the project's own path in its place, but over MCP
 * there's no project, and `@/echo` resolves in none (a default Next.js app
 * imports `@/components/echo`). Code copied from a chat broke the build. Every
 * answer that carries the placeholder says what it stands for.
 */
test("an answer whose code imports from @/echo says what @/echo stands for", async () => {
  const catalog = structuredClone(sampleCatalog);
  const button = catalog.components.find((c) => c.name === "echo-hardware-button")!;
  button.usage!.imports = 'import { HardwareButton } from "@/echo/hardware-button";';
  button.examples[0]!.code = 'import { HardwareButton } from "@/echo/hardware-button";\n\n<HardwareButton variant="primary">Record</HardwareButton>';
  for (const tool of ["get_component", "get_examples"] as const) {
    const text = body(await handlers(catalog)[tool]({ name: "hardware-button" }));
    assert.match(text, /"@\/echo\/hardware-button"/);
    assert.ok(text.includes(IMPORT_PLACEHOLDER), `${tool} leaves @/echo unexplained`);
  }
  assert.ok(!body(await handlers().get_component({ name: "hardware-button" })).includes(IMPORT_PLACEHOLDER), "said where there's no placeholder");
});
