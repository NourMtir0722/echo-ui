/**
 * Where the site serves the plugin, relative to its root. Apart from
 * plugin.ts, which builds them, so the docs page can link them without
 * importing the builder (siteDownloads in plugin.ts).
 */
export const SITE_DOWNLOADS = { claude: "plugin/echo-ui-claude.zip", codex: "plugin/echo-ui-codex.zip" } as const;

/** The folder the Codex download unzips to: a marketplace of one, and the plugin beside it. */
export const CODEX_FOLDER = "echo-ui-codex";

/** The plugin's name, and the local marketplace the Codex download carries: `codex plugin add echo-ui@echo-ui-local`. */
export const PLUGIN_NAME = "echo-ui";
export const LOCAL_MARKETPLACE = "echo-ui-local";

/** Echo's listing in ChatGPT's plugin directory: one click in the app, where the downloads above need a terminal. */
export const CHATGPT_LISTING_URL = "https://chatgpt.com/plugins/plugin_asdk_app_6acf038ad1d0819195d18068c127b032";
