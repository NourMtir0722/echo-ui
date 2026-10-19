# Security

## Why this file is not a formality

Echo is a **registry**. `npx echo-ui-cli add field` fetches source code over the network and
writes it into your application, where your build compiles it and your users run it. That is the
same trust model as a package manager, and it fails the same way: whoever controls what the
registry serves controls what runs in every application that installs from it.

So a vulnerability here is not "a bug in a component library". It is a supply-chain issue, and it
is treated as one.

## Reporting a vulnerability

**Do not open a public issue.**

Email **support@echo-ui.com**, the one address Echo is reached at (help and privacy questions go
there too). Say in the subject that it's a security report.

Once this repository is public, GitHub's private vulnerability reporting works as well: the
**Security** tab → **Report a vulnerability**, which opens a thread only the maintainers see.

Please include:

- what an attacker can do, not only what is wrong;
- the smallest reproduction you have — a URL, a registry response, a crafted item, a command;
- which part it affects: the published packages (`echo-ui-core`, `echo-ui-cli`, `echo-ui-mcp`),
  the registry at `https://echo-ui.com/e/`, the hosted MCP server at `https://mcp.echo-ui.com/mcp`,
  the supporters server at `https://api.echo-ui.com`, the plugin for ChatGPT, Codex and Claude, the
  components themselves, or the docs site.

### What to expect

| | |
| --- | --- |
| First reply | within 3 working days |
| An assessment, with a severity and a plan | within 10 working days |
| Fix released | as fast as the severity warrants; critical issues take priority over everything else |

You will be credited in the advisory and in `CHANGELOG.md` unless you ask not to be. Echo has no
bug-bounty budget; it has attention and it moves fast.

## What is in scope

- **The published packages** — `echo-ui-core`, `echo-ui-cli`, `echo-ui-mcp`.
- **The registry** at `https://echo-ui.com/e/` — its contents, its integrity, and the
  headers it is served under.
- **The installed components** — anything a copied Echo component does to an application that
  uses it as documented. XSS through a documented prop is a vulnerability.
- **The hosted MCP server** at `https://mcp.echo-ui.com/mcp`. Anyone can call it, and it's handed
  people's code (`check_code`) and styles. It promises to keep none of it: its logs hold a request's
  path, status and timing, never a body. Anything that makes it keep, log, leak or hand one
  caller's input to another is in scope, and so is a way past its request ceiling.
- **The supporters server** at `https://api.echo-ui.com`, behind the thank-you page a payment leads
  to (`/supporters/welcome`) and the island's list. It takes a name and two links only for a
  completed, paid Stripe Checkout Session, reads Stripe with a key that can do nothing but read
  sessions, and serves everyone's name and links, which go on the island at once. A way to send an
  entry without a paid session, to change someone else's, to read a session's ID or anything else
  that isn't shown, to put on the island what the thank-you page wouldn't accept (markup, a link
  that isn't https), to make it send its thank-you email for a payment Stripe didn't sign, or to
  make it reach Stripe for anything else is in scope.
- **The plugin** for ChatGPT, Codex and Claude: its skills and manifests. Anything in them that
  sends a builder's data somewhere its README doesn't say, or runs something it doesn't say, is in
  scope.
- **The CLI's behaviour against a hostile registry.** This is the interesting one; see below.

## What is out of scope

- The docs site's content, styling, or a broken link. Those are ordinary issues.
- A component misused in a way the docs warn against — for example passing unsanitised HTML into
  something the props do not treat as text.
- Denial of service against the docs site, the registry or the hosted MCP server by volume. (The
  server has a limit per address; a single request that takes it down is in scope.)
- Findings from an automated scanner with no demonstrated impact.
- Vulnerabilities in a dependency, unless Echo's use of it is what makes the issue reachable.
  Report those upstream; tell us too, and we will bump.

## What the CLI already assumes about the registry

These are deliberate defences, and defeating one is a valid report:

- **Only https, and `file:` or `localhost` when asked for explicitly by `--registry`.** A remote
  `http` registry is refused rather than quietly downgraded.
- **Every file carries a SHA-256, and it is verified before the file is written.** A registry that
  serves something other than what it published is refused, not installed.
- **Every path is checked before anything is opened.** An item cannot write outside the one folder
  `echo.json` names — not through `..`, not through an absolute path, not through a drive letter.
- **The CLI never edits your source code.** It prints the lines you paste. There is no code path
  that modifies a root layout, a global stylesheet, or a component you have since changed — `add`
  and `update` refuse a file you edited unless you pass `--overwrite`. The only files of yours it
  writes into are `CLAUDE.md` or `AGENTS.md`, between `<!-- echo-ui:start -->` and
  `<!-- echo-ui:end -->`, and `.claude/settings.json`, two hook entries that run the CLI from your
  own `node_modules` (`check --hook` after each edit, and `check --stop`, the Stop gate, when the
  agent finishes); a settings file that isn't valid JSON is left alone. `agent off` removes them.
  `init --ci` adds a GitHub Actions workflow only when asked, and never over one that's there.
- **Installed dependencies come from the item's declared ranges**, installed by your own package
  manager, in one call you can see.

If you find a way to write outside the Echo folder, to get an unverified file onto disk, to make
the CLI execute registry-controlled content, or to have it install a package the item did not
declare — that is the report we most want.

## The `/e/` immutability promise

A published `/e/` item is never rewritten. `{name}@{version}.json` is served with a long
`immutable` cache lifetime, which means a compromised or corrected file **cannot be recalled** —
a new version is published instead. Treat any finding that depends on rewriting a published
version as high severity, because the mitigation is not "fix the file".
