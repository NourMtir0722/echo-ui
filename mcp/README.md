# echo-ui-mcp

An [MCP](https://modelcontextprotocol.io) server for [Echo UI](https://echo-ui.com). It gives
a coding agent ten tools over the Echo UI registry, so the agent can look up a component's props,
usage, accessibility notes and anti-patterns before it writes code with it, check what it wrote,
and find and wear a style.

## Install

Every client runs the same command:

```json
{
  "mcpServers": {
    "echo-ui": {
      "command": "npx",
      "args": ["-y", "echo-ui-mcp"]
    }
  }
}
```

- **Claude Code:** `claude mcp add echo-ui -- npx -y echo-ui-mcp`
- **Codex:** add it to `~/.codex/config.toml` as `[mcp_servers.echo-ui]`, with
  `command = "npx"` and `args = ["-y", "echo-ui-mcp"]`.
- **Cursor:** add the block above to `.cursor/mcp.json`.
- **VS Code:** add it to `.vscode/mcp.json`, under `servers` instead of `mcpServers`.
- **Other clients:** any client that runs a stdio MCP server takes the same command.

Requires Node.js 20 or later.

### Hosted

For tools that only connect to a server on the web (ChatGPT, claude.ai, Lovable, v0, Bolt,
Claude Design), the same tools run at `https://mcp.echo-ui.com/mcp`: nothing to install, no
account. Add it as a custom connector (a remote MCP server) with that address, or:

- **Claude Code:** `claude mcp add --transport http echo-ui https://mcp.echo-ui.com/mcp`
- **Cursor:** `{ "mcpServers": { "echo-ui": { "url": "https://mcp.echo-ui.com/mcp" } } }`

It reads the same published documents as the package, and keeps nothing it's sent: `check_code`
reads your code and forgets it, and its request logs hold the path, the status and the timing, never
a body. Cloudflare, which hosts it, keeps those logs, with the address a request came from, for up
to 7 days ([privacy policy](https://echo-ui.com/privacy)). `check_code` takes up to 200,000 characters, a request past what that needs is refused with
`413` before it's read, and one address can send 300 requests in ten seconds and about 2 MB of large
code a minute, each whole 16 KB of a request counting (`429` past either, with `Retry-After`).

### In Claude and ChatGPT, with Echo's skills

Echo's plugin carries the hosted server and Echo's three skills (Echo UI, Design Eye and Style Fit)
in one install: [echo-ui.com/docs/plugin](https://echo-ui.com/docs/plugin). In ChatGPT it's in the
[plugin directory](https://chatgpt.com/plugins/plugin_asdk_app_6acf038ad1d0819195d18068c127b032).
Until Claude's directory lists it too, it installs from the docs: [the Claude ZIP](https://echo-ui.com/plugin/echo-ui-claude.zip)
for claude.ai and Claude Code, and [the Codex ZIP](https://echo-ui.com/plugin/echo-ui-codex.zip) for
Codex and ChatGPT desktop.

## Tools

| Tool | Takes | Answers with |
| --- | --- | --- |
| `search_components` | `query?` | The item for a job ("a settings toggle", "confirm a delete"), or a plain "Echo has nothing for this yet", then one line per matching component with its install command. The same answer as the CLI's `which`. With no query, every component. |
| `get_component` | `name` | The full record: description, install command, usage, composition, examples, accessibility, motion & sound, props and anti-patterns. Accepts `echo-hardware-button`, `hardware-button` or `HardwareButton`. |
| `get_tokens` | — | The colour roles (`--echo-*`), sound names and motion names. |
| `get_examples` | `name` | Just the examples for one component. |
| `get_accessibility` | `name?` | The rules a consumer of Echo can still get wrong. With a name, that component's own record of what was tested and what is not. |
| `check_code` | `code`, `file?` | Echo's check on a piece of code: the same rules as `npx echo-ui-cli check`, against the default theme, each finding with the Echo way to fix it. For a tool with no terminal to run the CLI in. |
| `list_styles` | `name?` | Echo's own styles, each with its one line and fingerprint; with a name, that style in full. |
| `fit_styles` | `profile`, `tolerance?`, `yours?` | Echo's styles and the builder's own (by fingerprint), ranked against where the product sits on the seven axes. The same arithmetic as `npx echo-ui-cli style fit`. |
| `check_style` | `style` | Whether a `style.json` is one Echo can apply, as `npx echo-ui-cli style check` says it. |
| `wear_style` | `name` or `style`, `files?` | A link that makes the Echo site wear the style's colours, the command that puts it in a project, and, for a project with no terminal, its theme CSS and `DESIGN.md`. |

When it connects, the server also sends instructions: how to set the project up, how to wire the
theme and sound, and the corrections agents most often need (Base UI's package is
`@base-ui/react`; Echo components are installed with `npx echo-ui-cli add`, not `npm install`).

`get_component` returns the same text as the component's page in the Echo UI docs and its entry
in [`llms-full.txt`](https://echo-ui.com/llms-full.txt), plus what the component ships as:
its version, the `echo-ui-core` range it needs, and its accessibility record. That half is read
from the same registry `echo-ui-cli` installs from, with the same client, so the two cannot
disagree.

## Configuration

The server reads two published documents and re-reads them after five minutes: the catalog at
`https://echo-ui.com/r/catalog.json` and the registry at `https://echo-ui.com/e`.
To point it at a fork or a local build, set either:

```json
{
  "mcpServers": {
    "echo-ui": {
      "command": "npx",
      "args": ["-y", "echo-ui-mcp"],
      "env": {
        "ECHO_CATALOG": "/absolute/path/to/catalog.json",
        "ECHO_REGISTRY": "https://example.com/e"
      }
    }
  }
}
```

If the registry cannot be reached the server still answers from the catalog, with the versions the
catalog was built at. A copy it has already read keeps answering while its source can't be read,
and is tried again every minute. If a file does not match the hash the registry published for it,
the server says so rather than answering.

## License

MIT
