import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

import { HOSTED_MCP_URL, REGISTRY_HOMEPAGE, STYLE_LIBRARY, SUPPORT_EMAIL } from "@registry/agent/guidance";

import { CODEX_FOLDER, claudePlugin, localMarketplace, openaiMissing, openaiPlugin, pluginVersion, portalReport, SITE_DOWNLOADS, siteDownloads } from "./plugin";
import { TOOL_DEFINITIONS } from "./tools";
import { readZip } from "./zip";
import { parseStyle } from "@registry/agent/style-schema";

/**
 * Echo's plugin against the rules each directory publishes: what its upload
 * or validation would refuse, refused here first. The limits are OpenAI's
 * (plugin.json's fields, image rules) and Claude's (the plugin checklist);
 * each test says which.
 */
const claude = claudePlugin();
const openai = openaiPlugin();
const parse = (files: Record<string, string>, path: string) => JSON.parse(files[path]!) as Record<string, unknown>;

test("both folders carry the same skills, byte for byte, and the version is echo-ui-cli's", () => {
  const skills = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith("skills/")));
  assert.deepEqual(skills(claude), skills(openai));
  assert.deepEqual(Object.keys(skills(claude)).sort(), [
    "skills/echo-design-eye/SKILL.md",
    "skills/echo-design-eye/references/echo.md",
    "skills/echo-style-fit/SKILL.md",
    "skills/echo-ui/SKILL.md",
  ]);
  const cli = JSON.parse(readFileSync(new URL("../../packages/cli/package.json", import.meta.url), "utf8")) as { version: string };
  assert.equal(pluginVersion(), cli.version);
  assert.equal(parse(claude, ".claude-plugin/plugin.json").version, cli.version);
  assert.equal(parse(openai, "plugin.json").version, cli.version);
});

test("both point at the hosted server, each in its directory's own words", () => {
  assert.deepEqual(parse(claude, ".mcp.json"), { mcpServers: { "echo-ui": { type: "http", url: HOSTED_MCP_URL } } });
  const mcp = parse(openai, "mcp.json") as { mcpServers: Record<string, { type: string; url: string }> };
  // OpenAI: only one server per plugin.
  assert.deepEqual(Object.values(mcp.mcpServers), [{ type: "streamable-http", url: HOSTED_MCP_URL }]);
  assert.match(HOSTED_MCP_URL, /^https:\/\//);
});

test("Codex and ChatGPT desktop load the OpenAI folder, with its skills and its server", () => {
  // They read `.codex-plugin/plugin.json`, as every plugin in OpenAI's own catalog
  // carries it. Given only the root plugin.json, Codex 0.146 installed a plugin with
  // no skills, no server and no listing.
  const manifest = parse(openai, ".codex-plugin/plugin.json") as Record<string, unknown> & { interface: unknown };
  const root = parse(openai, "plugin.json") as { extensions: { "com.openai": { interface: unknown } } };
  assert.equal(manifest.name, "echo-ui");
  assert.equal(manifest.version, pluginVersion());
  assert.deepEqual(manifest.interface, root.extensions["com.openai"].interface);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.ok(Object.keys(openai).some((path) => path.startsWith("skills/")));
  // The same one server, in the words Codex reads.
  assert.deepEqual(parse(openai, ".mcp.json"), { mcpServers: { "echo-ui": { type: "http", url: HOSTED_MCP_URL } } });
});

test("the local marketplace lists the OpenAI folder, so Codex and ChatGPT desktop can install it unlisted", () => {
  const market = parse(localMarketplace(), ".agents/plugins/marketplace.json") as {
    plugins: { name: string; source: { source: string; path: string } }[];
  };
  assert.deepEqual(
    market.plugins.map((p) => [p.name, p.source]),
    [["echo-ui", { source: "local", path: "./openai" }]],
  );
  // The folder it names holds the manifest those two read.
  assert.ok(openai[".codex-plugin/plugin.json"]);
});

test("Claude's checklist: manifest, name, README of 40 words, licence, small text files, no system files", () => {
  const manifest = parse(claude, ".claude-plugin/plugin.json");
  for (const field of ["name", "displayName", "version", "description", "author", "license"]) assert.ok(manifest[field], `plugin.json needs ${field}`);
  const name = manifest.name as string;
  assert.match(name, /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);
  assert.ok(!["claude", "anthropic", "official", "plugin", "mcp", "test"].includes(name));
  const words = claude["README.md"]!.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 40, `the README has ${words} words outside code blocks`);
  assert.match(claude.LICENSE!, /^MIT License/);
  assert.ok(Object.keys(claude).length <= 512);
  for (const [path, content] of Object.entries(claude)) {
    // Claude holds a text file over 256 KiB for a reviewer.
    assert.ok(Buffer.byteLength(content) < 256 * 1024, `${path} is ${Buffer.byteLength(content)} bytes`);
    assert.doesNotMatch(path, /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX)$/);
  }
  // Nothing outside the plugin's own two folders in `.claude-plugin/`.
  assert.deepEqual(Object.keys(claude).filter((p) => p.startsWith(".claude-plugin/")), [".claude-plugin/plugin.json"]);
});

/** WCAG's relative luminance, for OpenAI's 2:1 rule on the brand colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

test("OpenAI's plugin.json: the Agent Plugins schema, and every listing field within its limit", () => {
  const manifest = parse(openai, "plugin.json") as {
    $schema: string;
    name: string;
    description: string;
    author: Record<string, string>;
    extensions: { "com.openai": { interface: Record<string, unknown> } };
  };
  assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  // The schema's own pattern, and no keys it doesn't define.
  assert.match(manifest.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
  assert.deepEqual(
    Object.keys(manifest).filter((k) => !["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"].includes(k)),
    [],
  );
  assert.deepEqual(Object.keys(manifest.author).filter((k) => !["name", "email", "url"].includes(k)), []);
  assert.ok(manifest.description.length <= 4000);
  assert.ok(manifest.author.name!.length <= 120);

  const ui = manifest.extensions["com.openai"].interface as Record<string, string & string[]>;
  const within: [string, number][] = [["displayName", 30], ["shortDescription", 30], ["longDescription", 4000], ["developerName", 80]];
  for (const [field, max] of within) {
    assert.ok(ui[field], `${field} is required`);
    assert.ok(ui[field]!.length <= max, `${field} is ${ui[field]!.length} characters, over ${max}`);
  }
  assert.ok(ui.category);
  assert.ok(ui.defaultPrompt!.length <= 3 && ui.defaultPrompt!.every((p) => p.length <= 128));
  assert.ok(ui.capabilities!.length <= 20 && ui.capabilities!.every((c) => c.length <= 120));
  for (const field of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    if (ui[field] !== undefined) assert.match(ui[field]!, /^https:\/\/\S{1,1016}$/, field);
  }
  for (const [field, ground] of [["brandColor", "#FFFFFF"], ["brandColorDark", "#212121"]] as const) {
    assert.match(ui[field]!, /^#[0-9A-F]{6}$/i);
    assert.ok(contrast(ui[field]!, ground) >= 2, `${field} is ${contrast(ui[field]!, ground).toFixed(2)}:1 on ${ground}`);
  }
});

test("OpenAI's images: every one the manifest names is in the folder, square, and under 5 MiB", () => {
  const ui = (parse(openai, "plugin.json") as { extensions: { "com.openai": { interface: Record<string, string> } } }).extensions["com.openai"].interface;
  for (const field of ["logo", "logoDark", "composerIcon"]) {
    const path = ui[field]!.replace(/^\.\//, "");
    const svg = openai[path];
    assert.ok(svg, `${field} names ${path}, which isn't in the folder`);
    assert.ok(Buffer.byteLength(svg) < 5 * 1024 * 1024);
    const [, , w, h] = /viewBox="([\d.\s-]+)"/.exec(svg)![1]!.trim().split(/\s+/).map(Number);
    assert.equal(w, h, `${path} isn't square`);
    // An SVG draws at any size; its own box still has to be the 48px OpenAI asks for, or more.
    assert.ok(w! >= 48, `${path} is ${w}px across`);
  }
});

test("the build says what's still missing for OpenAI, and the plugin holds no secret", () => {
  // A support URL is the maintainer's to choose; until it's set, the build says so rather than inventing one.
  const ui = (parse(openai, "plugin.json") as { extensions: { "com.openai": { interface: Record<string, string> } } }).extensions["com.openai"].interface;
  assert.equal(openaiMissing({ demoRecordingURL: "https://youtu.be/demo" }).length === 0, ui.supportURL !== undefined);
  for (const [path, content] of [...Object.entries(claude), ...Object.entries(openai)]) {
    assert.doesNotMatch(content, /clientSecret|api[_-]?key"\s*:|Bearer [A-Za-z0-9]/i, path);
  }
});

/** Every page the site serves, from `apps/www/app`: a folder with a page in it, route groups left out of the path. */
function sitePages(dir = new URL("../../apps/www/app/", import.meta.url), path = ""): Set<string> {
  const pages = new Set<string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (/^page\.(tsx|mdx)$/.test(entry.name)) pages.add(path || "/");
    if (!entry.isDirectory()) continue;
    const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
    for (const page of sitePages(new URL(`${entry.name}/`, dir), path + segment)) pages.add(page);
  }
  return pages;
}

/**
 * OpenAI's review takes a support page, a privacy policy and terms; Claude's
 * directory a privacy policy and a support contact. Each is a page on Echo's
 * site, and a listing that links to a page the site doesn't have fails review.
 * The downloads linked to /privacy and /terms for a day before either existed.
 */
test("the listing's support, privacy and terms links are pages the site has", () => {
  assert.equal(openaiMissing().some((m) => m.includes("SUPPORT_URL")), false);
  const ui = (parse(openai, "plugin.json") as { extensions: { "com.openai": { interface: Record<string, string> } } }).extensions["com.openai"].interface;
  const pages = sitePages();
  for (const field of ["supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    const url = new URL(ui[field]!);
    assert.equal(url.origin, REGISTRY_HOMEPAGE, field);
    assert.ok(pages.has(url.pathname), `${field} links to ${url.pathname}, which isn't a page on the site`);
  }
});

/**
 * Claude's security scan holds a plugin that does what its README doesn't say:
 * "describe in the README everything the plugin runs, sends, or fetches". And
 * Anthropic's directory terms ask for a way to report a security problem.
 */
test("the README says what the plugin sends, runs and writes, and where to write about it", () => {
  // Claude's names the files `init` writes for Claude Code; OpenAI's says the same without naming them.
  for (const [readme, files] of [[claude["README.md"]!, ".claude/settings.json"], [openai["README.md"]!, "agent settings"]] as const) {
    for (const needle of [HOSTED_MCP_URL, "Cloudflare", "npx echo-ui-cli", STYLE_LIBRARY, files, `${REGISTRY_HOMEPAGE}/privacy`, SUPPORT_EMAIL]) {
      assert.ok(readme.includes(needle), `the README doesn't say: ${needle}`);
    }
    // The server keeps nothing it's sent, but its host keeps request logs: "stores nothing" said less than that.
    assert.doesNotMatch(readme, /stores nothing/);
  }
});

/** OpenAI's listing as both manifests carry it. */
const openaiListing = () => [parse(openai, "plugin.json").extensions, parse(openai, ".codex-plugin/plugin.json")].map((m) => {
  const block = m as { interface?: { longDescription: string }; "com.openai"?: { interface: { longDescription: string } } };
  return (block["com.openai"]?.interface ?? block.interface)!;
});

/**
 * OpenAI's longDescription is "plain text, no markdown": the portal
 * showed the listing's bold, headings and code marks as typed.
 */
test("OpenAI's long description is plain text", () => {
  for (const { longDescription } of openaiListing()) {
    assert.doesNotMatch(longDescription, /\*\*|`|^#|^- /m, "markdown in the long description, which OpenAI shows as typed");
    assert.match(longDescription, /What it sends, runs and writes/, "the plain text still says what it sends");
  }
});

/**
 * OpenAI's review flags a listing that "references another AI
 * assistant, model, or platform", and the skills are the same bytes in both
 * folders, so neither folder's text names the other company's products.
 * Claude's README still names the files `init` writes for Claude Code, by
 * path: its security scan matches what a plugin does against what it says.
 */
test("neither folder names the other directory's assistants", () => {
  const text = (files: Record<string, string>) => Object.entries(files).filter(([path]) => /\.(md|json)$/.test(path));
  const others = { openai: /claude|anthropic|cursor|copilot|gemini|windsurf/i, claude: /openai|chatgpt|codex|cursor|copilot|gemini|windsurf/i };
  const named = [
    ...text(openai).filter(([, c]) => others.openai.test(c)).map(([p, c]) => `openai/${p}: ${c.match(others.openai)![0]}`),
    ...text(claude).filter(([p, c]) => others.claude.test(c.replaceAll(".codex-plugin", "")) && p !== "LICENSE").map(([p, c]) => `claude/${p}: ${c.match(others.claude)![0]}`),
  ];
  assert.deepEqual(named, [], "a directory's review flags a plugin that names another company's assistant");
});

interface ReviewCase {
  description: string;
  prompt: string;
  tools_triggered?: string;
  expected_behavior?: string;
  file_attachment_urls?: string[];
}
interface Review {
  test_cases: { positive: ReviewCase[]; negative: ReviewCase[] };
  commerce?: boolean;
  demo_recording_url?: string;
}

/**
 * OpenAI's review takes five cases that should work and three that shouldn't,
 * from the manifest as well as the portal. Each positive case names the tools
 * it triggers: one the server hasn't got is a case no reviewer can pass. And a
 * case that needs a file the reviewer doesn't have is one they can't run, so
 * the style the fifth case checks is in its prompt, and Echo reads it.
 */
test("OpenAI's review cases travel in the manifest: five that work, three that don't, each on a tool the server has", () => {
  const block = (parse(openai, "plugin.json").extensions as Record<string, { review?: Review }>)["com.openai"]!;
  const review = block.review!;
  assert.equal(review.test_cases.positive.length, 5);
  assert.equal(review.test_cases.negative.length, 3);
  const tools = new Set(Object.keys(TOOL_DEFINITIONS));
  for (const c of review.test_cases.positive) {
    for (const field of ["description", "prompt", "tools_triggered", "expected_behavior"] as const) assert.ok(c[field], `a case without ${field}: ${c.description}`);
    const unknown = c.tools_triggered!.split(/,\s*/).filter((tool) => !tools.has(tool));
    assert.deepEqual(unknown, [], `"${c.description}" names tools the server doesn't have`);
    assert.equal(c.file_attachment_urls, undefined, `"${c.description}" needs a file the reviewer may not have`);
  }
  for (const c of review.test_cases.negative) assert.ok(c.description && c.prompt);
  const pasted = review.test_cases.positive.find((c) => c.tools_triggered === "check_style")!.prompt;
  const style = parseStyle(JSON.parse(pasted.slice(pasted.indexOf("{"))));
  assert.deepEqual(style.problems, [], "the style in the check_style case is one Echo can't read");
  assert.equal(review.commerce, false);
});

/**
 * The portal can't edit review details that came in a ZIP, so the demo
 * video OpenAI's review asks for has to be in the manifest too. Without one the
 * build said "Nothing missing for OpenAI's portal", and the portal's own red
 * box was the first to say otherwise.
 */
test("the build says the demo video is missing, and the manifest carries it once it's given", () => {
  // "" is no video: undefined would fall back to DEMO_RECORDING_URL.
  assert.match(openaiMissing({ demoRecordingURL: "" }).join("; "), /demo video/);
  assert.deepEqual(openaiMissing({ demoRecordingURL: "https://youtu.be/demo" }), []);
  const review = (version: string, demoRecordingURL: string) =>
    (parse(openaiPlugin(version, { demoRecordingURL }), "plugin.json").extensions as Record<string, { review: Review }>)["com.openai"]!.review;
  assert.equal(review("9.9.9", "https://youtu.be/demo").demo_recording_url, "https://youtu.be/demo");
  assert.equal("demo_recording_url" in review("9.9.9", ""), false);
});

/**
 * The build ended every run with "Before either directory: the privacy
 * and terms pages live", a reminder written before the pages existed and never
 * taken back once they did. The pages are held to the site by the test above;
 * the build says only what's actually missing.
 */
test("with nothing missing, the build's report says nothing is missing", () => {
  assert.deepEqual(portalReport({ demoRecordingURL: "https://youtu.be/demo" }), ["Nothing missing for OpenAI's portal."]);
});

test("the site's downloads: the Claude folder as claude.ai uploads it, and a Codex marketplace that points at its plugin", () => {
  const downloads = siteDownloads("9.9.9");
  const claude = readZip(downloads[SITE_DOWNLOADS.claude]);
  assert.deepEqual(Object.keys(claude).sort(), Object.keys(claudePlugin("9.9.9")).sort());
  assert.equal(JSON.parse(claude[".claude-plugin/plugin.json"]!).version, "9.9.9");

  const codex = readZip(downloads[SITE_DOWNLOADS.codex]);
  const marketplace = JSON.parse(codex[`${CODEX_FOLDER}/.agents/plugins/marketplace.json`]!);
  const path = marketplace.plugins[0].source.path as string;
  assert.equal(path, "./openai");
  // Everything Codex and ChatGPT desktop read is there, beside the marketplace.
  for (const file of [".codex-plugin/plugin.json", ".mcp.json", "skills/echo-ui/SKILL.md"]) {
    assert.ok(codex[`${CODEX_FOLDER}/openai/${file}`], file);
  }
});
