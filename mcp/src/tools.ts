/**
 * The tool contracts — search_components, get_component, get_tokens,
 * get_examples, get_accessibility, check_code, and the style tools in
 * style-tools.ts — as handlers that take their sources and return text. Kept
 * separate from the transport so they can be tested without standing up a
 * server.
 *
 * Every handler is a READER over two documents. The catalog says what a
 * component IS (props, examples, anti-patterns); the `/e/` registry says what
 * it SHIPS AS (version, core range, setup, what its accessibility was tested
 * against). Nothing here derives, ranks or rewrites either of them; when an
 * answer looks wrong the fix belongs in meta.ts or in the registry build, not
 * in this file.
 */
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  searchComponents,
  getComponent,
  getTokens,
  getExamples,
  type RegistryCatalog,
} from "@registry/agent/catalog";
import { notFound, resolveName } from "@registry/agent/names";
import { answerNeed } from "@registry/agent/which";
import { renderComponent } from "@registry/agent/render";
import { catalogProject } from "@registry/agent/check/catalog-project";
import { readCss } from "@registry/agent/check/css";
import { cssRules, tsxRules } from "@registry/agent/check/rules";
import { readTsx } from "@registry/agent/check/tsx";
import {
  ACCESSIBILITY_INSTRUCTIONS,
  ACCESSIBILITY_RULES,
  CONFORMANCE,
  IMPORT_PLACEHOLDER,
  installName,
} from "@registry/agent/guidance";

import type { EItem } from "@echo-ui/client";

import type { CatalogSource } from "./catalog-source";
import type { RegistrySource } from "./registry-source";
import { createStyleHandlers } from "./style-tools";

/**
 * Every tool only reads: Echo's published registry, or the code it's handed,
 * which it checks and keeps nothing of. Hosts use these hints to run a tool
 * without asking each time, and both the ChatGPT and the Claude directories
 * require them on every tool.
 */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

/**
 * The most check_code reads in one call: a large file is a few thousand lines,
 * and this is many times that. Anyone can reach the hosted server, so what it
 * parses has a ceiling the schema refuses past, before any parsing starts.
 */
export const MAX_CODE = 200_000;

export const TOOL_DEFINITIONS = {
  search_components: {
    title: "Search Echo UI components",
    annotations: READ_ONLY,
    description:
      "Find the Echo UI item for a job (\"a settings toggle\", \"confirm a delete\") or by name. Leads with the best fit, or says plainly that Echo has nothing for the job yet, then lists every match with its install command. The cheapest way to find out what exists, and the first call before writing Echo code.",
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe("A job in plain words, or a name. Omit to list everything."),
    },
  },
  get_component: {
    title: "Get an Echo UI component",
    annotations: READ_ONLY,
    description:
      "The full record for one component: description, install command, usage (imports + smallest working snippet), composition (part tree), examples, accessibility, motion & sound, prop table and anti-patterns. It's for before writing code that uses the component: the anti-patterns are the part a model gets wrong from priors.",
    inputSchema: {
      name: z
        .string()
        .describe('Registry name ("echo-hardware-button"), bare name ("hardware-button") or title ("HardwareButton").'),
    },
  },
  get_tokens: {
    title: "Get Echo UI tokens",
    annotations: READ_ONLY,
    description:
      "The token families: Layer-3 semantic colour roles (--echo-*), sound names, motion's whole vocabulary — the motion tokens, the spring presets, the morph feels and the CSS duration and ease steps — and the shadow recipes. Any name a component's record lists under Motion is here. Echo components are styled and moved only through these: a hex, a duration or a shadow written by hand, or a token name that isn't here, is off Echo's system.",
    inputSchema: {},
  },
  get_examples: {
    title: "Get usage examples",
    annotations: READ_ONLY,
    description:
      "Just the usage examples for one component, without the rest of its record. For when the component is already chosen and only its calling convention is needed.",
    inputSchema: {
      name: z.string().describe("Registry name, bare name or title."),
    },
  },
  get_accessibility: {
    title: "Get Echo UI accessibility rules",
    annotations: READ_ONLY,
    description:
      "The accessibility rules a consumer of Echo can still get wrong — names on controls, form errors, announcements, focus and target size — and, with a name, what that component's accessibility was actually tested against. Echo guarantees WCAG 2.2 AA; this is the part the guarantee cannot cover for you. It's for before building a form, a dialog or anything icon-only.",
    inputSchema: {
      name: z
        .string()
        .optional()
        .describe("A component, for its own tested/untested record. Omit for the rules that apply everywhere."),
    },
  },
  check_code: {
    title: "Check code against Echo",
    annotations: READ_ONLY,
    description:
      "Echo's check on a piece of code you've written or are about to write: colours, spacing, radii, shadows and timing off Echo's scales, raw elements where Echo has the component, props a component doesn't take, controls without a name, markup a keyboard or screen reader can't use, restyling Echo from outside, and the screen rules one file can show. The same rules as `npx echo-ui-cli check`, which runs on a whole project with its own theme; this one uses the default theme. Each finding says the Echo way to fix it.",
    inputSchema: {
      code: z.string().max(MAX_CODE).describe(`The file's contents: TSX, JSX or CSS, up to ${MAX_CODE.toLocaleString("en")} characters.`),
      file: z
        .string()
        .optional()
        .describe('Its file name, e.g. "app/settings/page.tsx" or "styles.css", which says what it is. TSX when left out.'),
    },
  },
  /*
   * The style tools: what `npx echo-ui-cli style …` does, for a builder with
   * no terminal, from the same functions. A builder's own styles live on their
   * machine or in their conversation, never on this server, so they come in
   * as arguments.
   */
  list_styles: {
    title: "List Echo UI styles",
    description:
      "Echo's own styles, the looks Echo publishes, each with its one line and its fingerprint on the seven axes styles are placed on; or, with a name, one of them in full: its settings, rules, refusals, fonts, decisions and the slop police's word. The builder's own styles aren't here: they're in their library or the conversation, and fit_styles weighs them with Echo's.",
    annotations: READ_ONLY,
    inputSchema: {
      name: z.string().optional().describe('One of Echo\'s styles, e.g. "echo". Omit to list them all.'),
    },
  },
  fit_styles: {
    title: "Rank styles for a product",
    description:
      "Style Fit's shortlist: Echo's styles, and the builder's own passed in, measured against where a product sits on the seven axes (warmth, volume, density, formality, era, craft, ornament) and put in order: a style that misses a locked axis last, then least past tolerance first, then nearest. The same arithmetic as `npx echo-ui-cli style fit`. It orders; it doesn't pick.",
    annotations: READ_ONLY,
    inputSchema: {
      profile: z.string().describe('Where the product sits, 1 to 5 on each axis: "W4 V2 D1 F2 E3 C3 O3".'),
      tolerance: z
        .string()
        .optional()
        .describe('How far a style may drift on each axis, 0 (locked) to 4: "W1 V1 D1 F0 E2 C1 O1". Left out, every axis may drift a point.'),
      yours: z
        .array(
          z.object({
            name: z.string().describe("The style's name, as its folder is called."),
            fingerprint: z.string().describe('Its fingerprint, as its style.json or the library\'s INDEX.md gives it: "W3 V2 D3 F3 E2 C4 O2".'),
            essence: z.string().optional().describe("Its one line."),
          }),
        )
        .max(50)
        .optional()
        .describe("The builder's own styles, from their library or this conversation."),
    },
  },
  check_style: {
    title: "Check a style",
    description:
      "Whether a style.json is one Echo can apply, as `npx echo-ui-cli style check` says it: what stops it, the device it makes (light or dark), what the theme corrects for AA contrast, what the slop police stops (with the question for the builder) or the builder kept, and the decisions it leaves open.",
    annotations: READ_ONLY,
    inputSchema: {
      style: z.record(z.string(), z.unknown()).describe("The style.json's contents, as a JSON object."),
    },
  },
  wear_style: {
    title: "Wear a style",
    description:
      "What a style gives a project: a link that makes the whole Echo site wear its colours, the commands that put it in a project, and, for a project without a terminal, its theme CSS and a DESIGN.md with its rules. One of Echo's styles by name, or the builder's own style.json. A style the slop police stops isn't worn; the answer says what to ask the builder.",
    annotations: READ_ONLY,
    inputSchema: {
      name: z.string().optional().describe('One of Echo\'s styles, e.g. "echo".'),
      style: z.record(z.string(), z.unknown()).optional().describe("The builder's own style.json, as a JSON object."),
      files: z
        .boolean()
        .optional()
        .describe("Include the theme CSS and DESIGN.md (the default). False when the builder will run the command in a project, which writes both itself."),
    },
  },
} as const;

/** One more family of motion names for get_tokens, or nothing if the catalog doesn't list it. */
function motionFamily(title: string, how: string, names: string[] | undefined): string[] {
  if (!names?.length) return [];
  return ["", `## ${title} (${names.length})`, "", how, "", names.map((n) => `\`${n}\``).join(", ")];
}

/** An import from Echo's snippet placeholder, which no project resolves as written. */
const PLACEHOLDER_IMPORT = /["']@\/echo\//;

/**
 * Every answer, and with code that imports from `@/echo`, what `@/echo` stands
 * for: over MCP there's no project to put the real path in its place, and
 * code copied as written broke the build.
 */
const text = (body: string, isError = false): CallToolResult => ({
  content: [{ type: "text", text: PLACEHOLDER_IMPORT.test(body) && !body.includes(IMPORT_PLACEHOLDER) ? `${body}\n\n${IMPORT_PLACEHOLDER}` : body }],
  ...(isError ? { isError: true } : {}),
});

/**
 * What an item ships as, from `/e/`: the lines that answer "will this work in
 * my project" rather than "what is this". Left out entirely when the registry
 * cannot be reached — a component's props are still worth having, and an
 * answer that is merely incomplete beats an error that loses all of it.
 */
function deliveryLines(item: EItem): string[] {
  const deps = Object.entries(item.dependencies).map(([name, range]) => `${name}@${range}`);
  return [
    `- Version: ${item.version} (\`echo-ui-core\` ${item.core})`,
    ...(deps.length ? [`- npm: ${deps.join(", ")}`] : []),
    ...(item.items.length ? [`- Brings with it: ${item.items.join(", ")}`] : []),
    ...(item.setup.length ? [`- Setup it needs: ${item.setup.join(", ")}`] : []),
  ];
}

/** An item's own accessibility record, as the registry published it. */
function a11yLines(item: EItem): string[] {
  return [
    `- Standard: ${item.a11y.standard}`,
    `- Tested: ${item.a11y.tested.join(", ")}`,
    ...(item.a11y.limits.length ? [`- Not covered: ${item.a11y.limits.join("; ")}`] : []),
  ];
}

export function createHandlers(catalogSource: CatalogSource, registrySource?: RegistrySource) {
  /** Every tool goes through here so a dead catalog reports once, clearly. */
  async function withCatalog(run: (catalog: RegistryCatalog) => string): Promise<CallToolResult> {
    try {
      return text(run(await catalogSource.get()));
    } catch (err) {
      return text(
        `${String(err instanceof Error ? err.message : err)}\n\n` +
          `Set ECHO_CATALOG to a catalog.json path or URL (currently: ${catalogSource.source}).`,
        true,
      );
    }
  }

  /** Every item's current version, by `/e/` name. Empty if the registry is unreachable. */
  async function currentVersions(): Promise<Map<string, string>> {
    if (!registrySource) return new Map();
    try {
      const index = await registrySource.index();
      return new Map(index.items.map((i) => [i.name, i.version]));
    } catch {
      return new Map();
    }
  }

  /**
   * The `/e/` record for a component, or nothing. A registry that is down must
   * not take get_component down with it, but a file that fails its hash is a
   * different matter: it comes back as the error to answer with (see
   * registry-source, which only throws for that).
   */
  async function shipsAs(name: string): Promise<EItem | CallToolResult | undefined> {
    if (!registrySource) return undefined;
    try {
      return await registrySource.item(installName(name));
    } catch (err) {
      return text(
        `${String(err instanceof Error ? err.message : err)}\n\n` +
          `The registry at ${registrySource.registry} served a file that is not what it published. Nothing it describes can be trusted until that is fixed.`,
        true,
      );
    }
  }

  return {
    ...createStyleHandlers(registrySource),

    search_components: async ({ query }: { query?: string }): Promise<CallToolResult> => {
      let catalog: RegistryCatalog;
      try {
        catalog = await catalogSource.get();
      } catch (err) {
        return text(
          `${String(err instanceof Error ? err.message : err)}\n\n` +
            `Set ECHO_CATALOG to a catalog.json path or URL (currently: ${catalogSource.source}).`,
          true,
        );
      }
      /*
       * The answer first, from the same function the CLI's `which` calls, so
       * the two never disagree: the items that do the job, or the plain fact
       * that Echo has nothing for it yet. The word matches follow, for an
       * agent that wants to look further.
       */
      const answer = query?.trim() ? answerNeed(catalog, query) : undefined;
      const fits = answer?.fits.map((f) => f.component) ?? [];
      const hits = [...new Map([...fits, ...searchComponents(catalog, query ?? "")].map((c) => [c.name, c])).values()];
      if (!hits.length) {
        return text(
          [
            ...(answer?.gap ? [`Nothing in Echo does this yet. ${answer.gap}`, ""] : []),
            `No Echo UI component matches "${query}". ${catalog.components.length} components exist; call search_components with no query to list them.`,
          ].join("\n"),
        );
      }
      // Versions come from the registry, the one place they're live. A catalog
      // built since it started carrying them has the version it was built at,
      // so a registry that cannot be read costs the column only for a catalog
      // older than that.
      const versions = await currentVersions();
      const lead = answer
        ? fits.length
          ? [`Best fit for "${query}": ${fits.map((c) => `\`${c.name}\``).join(", ")}.`, ""]
          : [`Nothing in Echo does "${query}" yet.${answer.gap ? ` ${answer.gap}` : ""} These only mention its words:`, ""]
        : [];
      return text(
        [
          ...lead,
          `${hits.length} of ${catalog.components.length} Echo UI components${query ? ` matching "${query}"` : ""}:`,
          "",
          ...hits.map((c) => {
            const version = versions.get(installName(c.name)) ?? c.version;
            return `- \`${c.name}\`${version ? ` v${version}` : ""} (${c.title}) — ${c.summary ?? c.description}\n  Install: ${c.install}`;
          }),
        ].join("\n"),
      );
    },

    get_component: async ({ name }: { name: string }): Promise<CallToolResult> => {
      let catalog: RegistryCatalog;
      try {
        catalog = await catalogSource.get();
      } catch (err) {
        return text(
          `${String(err instanceof Error ? err.message : err)}\n\n` +
            `Set ECHO_CATALOG to a catalog.json path or URL (currently: ${catalogSource.source}).`,
          true,
        );
      }
      const resolved = resolveName(catalog, name);
      if (!resolved) return text(notFound(catalog, name));
      const component = getComponent(catalog, resolved);
      if (!component) return text(notFound(catalog, name));

      const item = await shipsAs(resolved);
      if (item && "content" in item) return item;
      const record = renderComponent(component);
      if (!item) return text(record);
      return text(
        [
          record,
          "### Ships as",
          "",
          ...deliveryLines(item),
          "",
          "### Accessibility record",
          "",
          ...a11yLines(item),
          "",
        ].join("\n"),
      );
    },

    get_tokens: () =>
      withCatalog((catalog) => {
        const tokens = getTokens(catalog);
        return [
          "# Echo UI tokens",
          "",
          "Style Echo components only through these. Colour roles are CSS custom properties set by `createEchoTheme`; sound and motion names are passed to `useSound`, `useTactile` and the motion helpers.",
          "",
          `## Colour roles (${tokens.colorRoles.length})`,
          "",
          tokens.colorRoles.map((r) => `\`${r}\``).join(", "),
          "",
          `## Sound (${tokens.sound.length})`,
          "",
          tokens.sound.map((s) => `\`${s}\``).join(", "),
          "",
          `## Motion (${tokens.motion.length})`,
          "",
          tokens.motion.map((m) => `\`${m}\``).join(", "),
          // Left out, not printed empty, for a catalog built before they were listed.
          ...motionFamily(
            "Springs",
            "For a part the hand can redirect: `createSpring(value, springs.<name>, onUpdate)` from `echo-ui-core/tactile`, presets from `echo-ui-core/motion`. A record that says just `springs` moves on createSpring.",
            tokens.springs?.map((n) => `springs.${n}`),
          ),
          ...motionFamily(
            "Morph feels",
            "How a Morph's body divides and joins: its `feel` prop, `morphFeels` in `echo-ui-core/tactile`.",
            tokens.morphFeels?.map((n) => `morphFeels.${n}`),
          ),
          ...motionFamily("CSS durations", "For CSS transitions; the theme sets them.", tokens.durations),
          ...motionFamily("CSS eases", "Paired with the duration step of the same name.", tokens.eases),
          ...(tokens.shadows?.length
            ? [
                "",
                `## Shadows (${tokens.shadows.length})`,
                "",
                "The depths Echo's own parts use, set by the theme. For a part of your own, pick one: `box-shadow: var(--echo-shadow-well)`. Never write a box-shadow by hand.",
                "",
                ...tokens.shadows.map((s) => `- \`${s.token}\` (${s.kind}): ${s.use}`),
              ]
            : []),
        ].join("\n");
      }),

    get_examples: ({ name }: { name: string }) =>
      withCatalog((catalog) => {
        const resolved = resolveName(catalog, name);
        if (!resolved) return notFound(catalog, name);
        const examples = getExamples(catalog, resolved);
        if (!examples.length) {
          return `\`${resolved}\` has no examples in its meta.ts. Call get_component for its props and anti-patterns.`;
        }
        return [
          `# ${resolved} examples`,
          "",
          ...examples.flatMap((ex) => ["", `**${ex.title}** — ${ex.description}`, "", "```tsx", ex.code, "```"]),
        ].join("\n");
      }),

    /*
     * The brief carries these too, but `instructions` is advisory and
     * plenty of MCP clients never show it to the model. A rule the agent
     * cannot retrieve on purpose is a rule it will only follow by luck.
     */
    check_code: ({ code, file = "component.tsx" }: { code: string; file?: string }) =>
      withCatalog((catalog) => {
        const project = catalogProject(catalog);
        let result;
        try {
          result = /\.css$/i.test(file)
            ? { findings: cssRules(file, readCss(code, file), project), notes: [] }
            : tsxRules(file, readTsx(file, code), project);
        } catch (error) {
          return `Couldn't read it as ${/\.css$/i.test(file) ? "CSS" : "TSX"}: ${String((error as Error).message).split("\n")[0]}`;
        }
        if (!result.findings.length && !result.notes.length) return "No problems: nothing here goes against Echo's rules.";
        return [
          ...(result.findings.length
            ? [`${result.findings.length} problem${result.findings.length === 1 ? "" : "s"}, each with the Echo way to fix it:`, "", ...result.findings.map((f) => `- ${file}:${f.line}:${f.column} (${f.rule}) ${f.message}`)]
            : ["No problems."]),
          ...(result.notes.length ? ["", "Notes, not counted:", ...result.notes.map((n) => `- ${n.message}`)] : []),
        ].join("\n");
      }),

    get_accessibility: async ({ name }: { name?: string } = {}): Promise<CallToolResult> => {
      const general = ["# Echo UI accessibility", "", ACCESSIBILITY_RULES, "", ACCESSIBILITY_INSTRUCTIONS, "", CONFORMANCE];
      if (!name) return text(general.join("\n"));

      let catalog: RegistryCatalog;
      try {
        catalog = await catalogSource.get();
      } catch {
        // The general rules are the part that matters most, and they need no
        // catalog. Answer with them rather than with nothing.
        return text(general.join("\n"));
      }
      const resolved = resolveName(catalog, name);
      if (!resolved) return text(notFound(catalog, name));

      const component = getComponent(catalog, resolved);
      const item = await shipsAs(resolved);
      if (item && "content" in item) return item;
      return text(
        [
          `# ${resolved} accessibility`,
          "",
          ...(component?.a11y?.length ? [...component.a11y.map((line) => `- ${line}`), ""] : []),
          ...(item ? ["## What was tested", "", ...a11yLines(item), ""] : []),
          "## Rules that apply everywhere",
          "",
          ACCESSIBILITY_RULES,
          "",
          ACCESSIBILITY_INSTRUCTIONS,
        ].join("\n"),
      );
    },
  };
}

