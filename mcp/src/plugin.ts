/**
 * Echo's plugin, as files: one source, two folders.
 *
 * ChatGPT (and Codex) and Claude each take a plugin as skills plus a remote
 * MCP server, but each reads its own manifest: OpenAI's `plugin.json` at the
 * root, on the open Agent Plugins schema with an `extensions.com.openai`
 * block, and Claude's `.claude-plugin/plugin.json`. Each directory validates
 * its own, so each folder carries only its own manifest; the skills in both
 * are the same bytes. OpenAI's folder also carries the manifest Codex and
 * ChatGPT desktop read today, `.codex-plugin/plugin.json`.
 *
 * Everything here is generated: the skills from the registry (the same
 * builders `init` writes from, in their plugin copies), the server's address
 * from HOSTED_MCP_URL, the version from echo-ui-cli's. `build-plugin.ts`
 * writes them to disk; `plugin.test.ts` holds them to each directory's rules.
 */
import { readFileSync } from "node:fs";

import { HOSTED_MCP_URL, REGISTRY_HOMEPAGE, SKILL_NAME, STYLE_LIBRARY, SUPPORT_EMAIL } from "@registry/agent/guidance";
import { DESIGN_EYE_NAME, designEyeSkill } from "@registry/agent/skills/design-eye";
import { echoFoundation } from "@registry/agent/skills/echo-foundation";
import { echoUiAnywhereSkill } from "@registry/agent/skills/echo-ui-anywhere";
import { STYLE_FIT_NAME, styleFitSkill } from "@registry/agent/skills/style-fit";
import { CODEX_FOLDER, LOCAL_MARKETPLACE, PLUGIN_NAME, SITE_DOWNLOADS } from "./plugin-downloads";
import { zip } from "./zip";

export { CODEX_FOLDER, LOCAL_MARKETPLACE, PLUGIN_NAME, SITE_DOWNLOADS };

const repoFile = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** The plugin's name, everywhere: the identity people install it by, never changed after release. */
export const DISPLAY_NAME = "Echo UI";
/** OpenAI's short description: at most 30 characters. */
export const SHORT_DESCRIPTION = "Tactile components, your style";
export const DEVELOPER = "Nawwara Studio";
/** Echo's purple, the default seed: 3.8:1 on white and 4.3:1 on ChatGPT's dark (#212121); OpenAI asks for 2:1. */
export const BRAND_COLOR = "#8B6FE8";

/**
 * Where the builder gets help: the site's contact page, which gives
 * SUPPORT_EMAIL. OpenAI's review takes a support page, not an address. Typed
 * as optional so the build can still say when the OpenAI folder isn't ready.
 */
export const SUPPORT_URL: string | undefined = `${REGISTRY_HOMEPAGE}/contact`;

/**
 * The video of the plugin at work that OpenAI's review asks for: the maintainer records
 * it, and its link goes here. The portal can't edit review details a ZIP
 * brings, so the manifest is the only place it can go.
 */
export const DEMO_RECORDING_URL: string | undefined = "https://youtu.be/eM4pKsdU5Gc";

export const PRIVACY_URL = `${REGISTRY_HOMEPAGE}/privacy`;
export const TERMS_URL = `${REGISTRY_HOMEPAGE}/terms`;

/** echo-ui-cli's version: the skills come from its sources, so the plugin moves with it. */
export const pluginVersion = () => (JSON.parse(repoFile("packages/cli/package.json")) as { version: string }).version;

const DESCRIPTION =
  "Echo UI's design system in your chat and your code: turn a mood board into a style, pick the style that fits your product, feel it on Echo's own site, and build screens from tactile React components that press, click and move, checked against Echo's rules as they're written.";

/**
 * What the listing says at length: OpenAI's long description, and the start
 * of the README. It names no assistant: both folders share it, and OpenAI's
 * review flags a listing that names another company's.
 */
const ABOUT = [
  "Echo UI is a design system for React: components that press, click and move, all made from one material, with your own style on top. This plugin brings its workflow to your agent.",
  "",
  "- **Make a style.** Share a mood board and ask for a style. Echo's Design Eye reads it as a designer would and hands back the style: a foundation document and a `style.json` you keep and reuse.",
  "- **Pick one.** Ask which style fits your product. Echo's Style Fit places the product on seven axes, ranks Echo's styles and yours against it, and makes a pick it can argue for.",
  `- **Feel it.** Wearing a style gives a link that makes ${REGISTRY_HOMEPAGE} wear its colours, every component pressing and moving in them.`,
  "- **Build with it.** In a project with a terminal, where your agent runs commands, `npx echo-ui-cli init --style <name>` sets the project up in that style and your agent builds from Echo's components. In a chat, the agent writes the code with them and runs Echo's check on it before handing it over.",
];

/**
 * Where `init` writes for the builder's agent. Claude's security scan holds a
 * plugin that does something its README doesn't say, so Claude's names each
 * file; OpenAI's says the same without naming Claude Code's.
 */
const AGENT_FILES = {
  claude: "`init` also adds Echo's block to `CLAUDE.md` or `AGENTS.md`, and Echo's check as a hook in `.claude/settings.json`",
  openai: "`init` also adds Echo's block to the project's agent instructions, and Echo's check as a hook in its agent settings",
} as const;
type Directory = keyof typeof AGENT_FILES;

/** Everything the plugin sends, runs and writes, so a reader knows each one. */
const data = (directory: Directory) => [
  "## What it sends, runs and writes",
  "",
  `- **The server.** The plugin's tools are Echo's MCP server, at ${HOSTED_MCP_URL}. It receives what a tool is called with: a search, a component's name, a style's settings, or code to check. It needs no account and keeps none of what it's sent: code is checked and forgotten. It reads Echo's published catalog and registry from ${REGISTRY_HOMEPAGE}. Cloudflare, which hosts it, keeps request logs, including the address a request came from, for up to 7 days.`,
  `- **In a project with a terminal**, the skills run Echo's CLI, \`npx echo-ui-cli\`, which npm downloads and which reads Echo's registry from ${REGISTRY_HOMEPAGE}. \`init\`, \`add\` and \`style use\` write into the project. ${AGENT_FILES[directory]}; \`npx echo-ui-cli agent off\` removes both. Design Eye and Style Fit save styles and decisions in the builder's style library, \`${STYLE_LIBRARY}\`, on their own computer.`,
  "- **In a chat**, nothing is saved anywhere: styles and decisions come back as files to keep.",
  "",
  `Privacy policy: ${PRIVACY_URL}. Help, privacy questions and security reports: ${SUPPORT_EMAIL}.`,
];

/**
 * OpenAI's long description is "plain text, no markdown": its listing shows a
 * mark as typed. Bullets become "•", and bold, code and headings
 * their words.
 */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/^- /gm, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function readme(directory: Directory): string {
  return [
    `# ${DISPLAY_NAME}`,
    "",
    ...ABOUT,
    "",
    "## Use it",
    "",
    '- "Turn the images I\'ve shared into a style I can reuse."',
    '- "Which style fits a budgeting app for students?"',
    '- "Build a settings screen with Echo UI, and check it."',
    "",
    ...data(directory),
    "",
    `Docs: ${REGISTRY_HOMEPAGE}/docs. MIT licensed.`,
    "",
  ].join("\n");
}

/** The skills, under the paths both directories read: `skills/<name>/SKILL.md`, and Design Eye's one reference. */
function skills(): Record<string, string> {
  return {
    [`skills/${SKILL_NAME}/SKILL.md`]: echoUiAnywhereSkill(),
    [`skills/${DESIGN_EYE_NAME}/SKILL.md`]: designEyeSkill({ anywhere: true }),
    [`skills/${DESIGN_EYE_NAME}/references/echo.md`]: echoFoundation(),
    [`skills/${STYLE_FIT_NAME}/SKILL.md`]: styleFitSkill({ anywhere: true }),
  };
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const author = { name: DEVELOPER, url: REGISTRY_HOMEPAGE };
const keywords = ["design-system", "react", "components", "ui", "styles", "accessibility"];

/** The folder Claude's directory reads from a public GitHub repository. */
export function claudePlugin(version = pluginVersion()): Record<string, string> {
  return {
    ".claude-plugin/plugin.json": json({
      name: PLUGIN_NAME,
      displayName: DISPLAY_NAME,
      version,
      description: DESCRIPTION,
      author,
      homepage: REGISTRY_HOMEPAGE,
      license: "MIT",
      keywords,
    }),
    ".mcp.json": json({ mcpServers: { [PLUGIN_NAME]: { type: "http", url: HOSTED_MCP_URL } } }),
    ...skills(),
    "README.md": readme("claude"),
    LICENSE: repoFile("LICENSE"),
  };
}

/** The logo both of OpenAI's themes show: Echo's mark, the site's own icon. */
export const LOGO = "assets/logo.svg";

/** OpenAI's listing: what its directory, ChatGPT and Codex show for the plugin. */
function openaiInterface() {
  return {
    displayName: DISPLAY_NAME,
    shortDescription: SHORT_DESCRIPTION,
    longDescription: plainText([...ABOUT, "", ...data("openai")].join("\n")),
    developerName: DEVELOPER,
    category: "Developer Tools",
    capabilities: ["Read"],
    websiteURL: REGISTRY_HOMEPAGE,
    ...(SUPPORT_URL ? { supportURL: SUPPORT_URL } : {}),
    privacyPolicyURL: PRIVACY_URL,
    termsOfServiceURL: TERMS_URL,
    defaultPrompt: [
      "Turn the images I've shared into an Echo style I can reuse.",
      "Which Echo style fits a budgeting app for students?",
      "Build a settings screen with Echo UI, and check it.",
    ],
    brandColor: BRAND_COLOR,
    brandColorDark: BRAND_COLOR,
    composerIcon: `./${LOGO}`,
    logo: `./${LOGO}`,
    logoDark: `./${LOGO}`,
  };
}

/**
 * What OpenAI's reviewers run: five prompts that should use the plugin and
 * three that shouldn't. In the manifest, they're the same on every upload and
 * held to the server's tools by plugin.test.ts. The fifth carries its style in
 * the prompt, so no reviewer needs a file. The portal can't edit what the
 * manifest brings, so the demo video comes with them once there is one.
 */
const review = (demoRecordingURL: string | undefined) => ({
  test_cases: {
    positive: [
      {
        description: "Find the component for a job",
        prompt: "Which Echo UI component should I use for a settings toggle?",
        tools_triggered: "search_components, get_component",
        expected_behavior: "Recommends echo-switch (Switch), reads its record, and gives its install command, npx echo-ui-cli add switch.",
      },
      {
        description: "Check code against Echo's rules",
        prompt: "Check this against Echo UI's rules: <button style={{ color: '#ff0000' }}>Save</button>",
        tools_triggered: "check_code",
        expected_behavior: "Reports two problems, each with Echo's fix: a raw <button> where Echo has HardwareButton (npx echo-ui-cli add hardware-button), and a colour written by hand, to be replaced with a theme role, var(--echo-*).",
      },
      {
        description: "Pick a style for a product",
        prompt: "Which Echo style fits a calm meditation app for adults?",
        tools_triggered: "fit_styles, list_styles",
        expected_behavior: "Places the product on Echo's seven axes, ranks Echo's styles against it, reads the best, and recommends one with its reasons.",
      },
      {
        description: "Wear a style without a terminal",
        prompt: "Wear Echo's own style, for a project with no terminal.",
        tools_triggered: "wear_style",
        expected_behavior: "Gives the link that makes Echo's site wear the style's colours, the npx echo-ui-cli init --style echo command for later, and the theme CSS and DESIGN.md to add to the project by hand.",
      },
      {
        description: "Check a style of the builder's own",
        prompt: `Is this a style Echo can apply? {"version":1,"name":"night-desk","title":"Night Desk","essence":"A dark desk lamp over warm orange controls.","fingerprint":{"warmth":2,"volume":3,"density":3,"formality":3,"era":3,"craft":3,"ornament":2},"seed":{"accent":"#E8743B","chassis":"#1C1B22"}}`,
        tools_triggered: "check_style",
        expected_behavior: "Says Night Desk is a style Echo can apply, on its dark device; how Echo adjusts its accent; its readability notes; and what it hasn't decided yet (no decisions, no typeface).",
      },
    ],
    negative: [
      { description: "Weather", prompt: "What's the weather in Paris tomorrow?" },
      { description: "Code that isn't an interface", prompt: "Write a Python script that renames my photos by date." },
      { description: "A booking", prompt: "Book me a table for two tonight." },
    ],
  },
  commerce: false,
  commerce_description: "Echo UI's plugin sells nothing and takes no payments.",
  ...(demoRecordingURL ? { demo_recording_url: demoRecordingURL } : {}),
});

/** The folder OpenAI's portal takes as a ZIP, for ChatGPT and Codex. */
export function openaiPlugin(version = pluginVersion(), { demoRecordingURL = DEMO_RECORDING_URL } = {}): Record<string, string> {
  const about = { name: PLUGIN_NAME, version, description: DESCRIPTION, author, homepage: REGISTRY_HOMEPAGE, license: "MIT", keywords };
  return {
    // What OpenAI's plugin docs describe: the open Agent Plugins schema.
    "plugin.json": json({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      ...about,
      extensions: { "com.openai": { interface: openaiInterface(), review: review(demoRecordingURL) } },
    }),
    "mcp.json": json({
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: { [PLUGIN_NAME]: { type: "streamable-http", url: HOSTED_MCP_URL } },
    }),
    // What Codex and ChatGPT desktop read, as every plugin in OpenAI's own
    // catalog carries it. Without it they install the plugin empty.
    ".codex-plugin/plugin.json": json({ ...about, skills: "./skills/", mcpServers: "./.mcp.json", interface: openaiInterface() }),
    ".mcp.json": json({ mcpServers: { [PLUGIN_NAME]: { type: "http", url: HOSTED_MCP_URL } } }),
    ...skills(),
    [LOGO]: repoFile("apps/www/app/icon.svg"),
    "README.md": readme("openai"),
    LICENSE: repoFile("LICENSE"),
  };
}

/**
 * A marketplace of one, beside the two folders, for trying the plugin before
 * it's listed: `codex plugin marketplace add` reads it, and Codex and ChatGPT
 * desktop install from it, in the same shape OpenAI's own catalog uses.
 */

export function localMarketplace(): Record<string, string> {
  return {
    ".agents/plugins/marketplace.json": json({
      name: LOCAL_MARKETPLACE,
      interface: { displayName: `${DISPLAY_NAME} (local build)` },
      plugins: [
        {
          name: PLUGIN_NAME,
          source: { source: "local", path: "./openai" },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Developer Tools",
        },
      ],
    }),
  };
}

/** What still stands between the OpenAI folder and a submission, in words. Empty when nothing does. */
export function openaiMissing({ supportURL = SUPPORT_URL, demoRecordingURL = DEMO_RECORDING_URL } = {}): string[] {
  return [
    ...(supportURL ? [] : ["a support URL (SUPPORT_URL in mcp/src/plugin.ts): OpenAI's review requires one"]),
    ...(demoRecordingURL ? [] : ["the demo video's link (DEMO_RECORDING_URL in mcp/src/plugin.ts): OpenAI's review requires one, and the portal can't add it to a ZIP's review details"]),
  ];
}

/** What the build says is left before the directories, from what's actually missing. */
export function portalReport(options: Parameters<typeof openaiMissing>[0] = {}): string[] {
  const missing = openaiMissing(options);
  return [missing.length ? `Before OpenAI's portal: ${missing.join("; ")}.` : "Nothing missing for OpenAI's portal."];
}

/**
 * The plugin as the site serves it, so it can be installed before either
 * directory lists it: `/docs/plugin` links them, and `pnpm build:registry`
 * writes them into the site's `public/` (ignored by git, like `/e/`).
 * - the Claude ZIP is the folder Claude's directory reads, at the archive's
 *   root: claude.ai's Upload plugin takes it as it is, and Claude Code takes it
 *   unzipped (`claude --plugin-dir`);
 * - the Codex ZIP is a folder holding a marketplace of one and the OpenAI
 *   plugin it points at: `codex plugin marketplace add` it, then install.
 */

export function siteDownloads(version = pluginVersion()): Record<(typeof SITE_DOWNLOADS)[keyof typeof SITE_DOWNLOADS], Buffer> {
  const codex = Object.fromEntries(
    Object.entries({ ...localMarketplace(), ...prefix("openai/", openaiPlugin(version)) }).map(([path, content]) => [`${CODEX_FOLDER}/${path}`, content]),
  );
  return { [SITE_DOWNLOADS.claude]: zip(claudePlugin(version)), [SITE_DOWNLOADS.codex]: zip(codex) } as Record<
    (typeof SITE_DOWNLOADS)[keyof typeof SITE_DOWNLOADS],
    Buffer
  >;
}

const prefix = (dir: string, files: Record<string, string>) => Object.fromEntries(Object.entries(files).map(([path, c]) => [`${dir}${path}`, c]));
