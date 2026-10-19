import { HOSTED_MCP_URL } from "@registry/agent/guidance";

/**
 * What the homepage tells someone whose tool has no terminal, as /docs/ai
 * ("Which way in") does, under the AI piece's first step (Add Echo in
 * ChatGPT): in Claude or Codex, the same plugin; in any other tool, the hosted
 * server. Never a command: there's nowhere to run one.
 * `url` comes last so a page can set it as code.
 */
export const NO_TERMINAL = {
  text: "Claude and Codex take the same plugin from Echo's plugin page. Any other tool with no terminal connects to Echo's server:",
  url: HOSTED_MCP_URL,
} as const;
