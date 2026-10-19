# `published-core.json` — what npm holds, as data

`/e/` tells every user which `echo-ui-core` their components need. The range is computed from
**this repository's** `packages/core/package.json`, which is a statement about the future: it is
whatever the next publish will be called. npm is a statement about the present.

When those two disagree and `/e/` is public, `echo-ui-cli add` fails for **every** user with
*"echo-ui-core X is outside what Y needs"* (`packages/cli/src/commands/add.ts`). It is not a
degraded install; it is no install at all, and it lands the moment the registry is deployed
rather than the moment the version is bumped.

So the present is written down here, and `registry/src/registry/core-version.test.ts` holds the
two apart until they are meant to meet.

## Releasing

A release is the three packages on npm and a registry release at `/e/`, and it isn't finished until
the two records here say what npm holds. 0.3.0 was released by hand, in this order; once the
repository is public, `release.yml` runs steps 4, 7 and 8 itself, with the smoke check.

1. **Bump** `packages/core`, `packages/cli` (and its `src/version.ts`) and `mcp` (and the
   `__ECHO_MCP_VERSION__` define in `mcp/wrangler.jsonc`) to the new version. Leave
   `published-core.json` and `packages/cli/published-cli.json` alone: they record what npm holds, and
   npm doesn't hold it yet. (`release.yml` refuses to run if the core record already says it.)
2. **Release the registry, in this order.** With every entry still under `[Unreleased]`:
   - `ECHO_RELEASING=<version> pnpm build:registry`. A release that needs a new core is a new version
     of every item, whose files changed or not.
   - Copy each new pin, `apps/www/public/e/*@<version>.json`, into `registry/e-released/`. From now on
     the build serves them as they are, so what anyone installed stays served byte for byte.
   - Then cut the changelog: `[Unreleased]` becomes `## [<version>] — <date>`, and a new `[Unreleased]`
     opens above it holding `Nothing yet.`. Cut first and the build refuses: nothing unreleased says
     why the items changed.
   - If production already serves the version you're freezing (`/e/index.json`), freeze what it
     serves, not today's build: files people installed can't change under them. 0.3.0 had to do this
     for 0.2.0, public since 2026-10-04 while 80 of its items changed.
3. **Check.** `ECHO_RELEASING=<version> pnpm check`, the release's own allowance through the core
   gate. Then `pnpm -r build`, `npm pack` each package (core from
   `packages/core/dist`, the CLI from `packages/cli/dist`, the MCP server from `mcp`), install the
   tarballs in a fresh app and run them.
4. **Publish** those tarballs, core first, since the CLI needs it: `npm publish <tarball> --access
   public`, with your 2FA.
5. **Record** in the next commit: `version` and `verified` here, with `exports` regenerated from the
   published tarball (`exports-how` says how); and `packages/cli/published-cli.json`'s `version`,
   `verified` and `commands` (from `npx -y echo-ui-cli@<version>`'s "Which command?" line). A version
   with the right number and the wrong contents is the same failure as a range npm satisfies with a
   core missing half of what the components import. `pnpm check` is now green
   without the variable.
6. **Merge** by pull request. The changelog check counts the new release heading as the change
   being recorded.
7. **Deploy** the site (`pnpm deploy:site`) right after the publish, then the MCP server (`pnpm
   --filter echo-ui-mcp deploy:worker`). `deploy:site` refuses while any item is at a version no
   release has frozen, so between releases a component change waits for the next release. The new core is npm's `latest` the moment it's published, and
   until the site serves the registry release, `add` refuses every item for a new user. Then
   `pnpm smoke`: 5/5.
8. **Tag** the merge `v<version>`, with a GitHub release.

Through `release.yml`, steps 1 to 3 are the pull request it asks for, and that pull request's CI is
red on the core gate until npm holds the core: that's the gate doing its job, not a reason to bump the
record early.

Step 5 is not bookkeeping. Until it happens, the only record of what is installable is someone's
memory, and that is how `/e/` ends up declaring a core nobody can install.

## When something goes wrong after a release

What breaks, what it reaches, and the fastest way back. Each package and both Workers can be put back
in a minute; the registry's pinned files can't, by design, so a bad component is fixed forward.

- **The CLI on npm is broken.** `npx echo-ui-cli` takes npm's `latest`, so every new project meets it
  at once. Point `latest` back first, `npm dist-tag add echo-ui-cli@<last good> latest`, which takes
  effect in minutes; then `npm deprecate echo-ui-cli@<bad> "<what's wrong>; use <good>"`, and publish
  the fix as the next patch. A project that installed the bad version keeps it until it updates, so
  the deprecation message is what reaches those.
- **`echo-ui-mcp` on npm is broken.** The same three steps: clients run `npx -y echo-ui-mcp`, which
  takes `latest`.
- **`echo-ui-core` is broken.** Moving `latest` doesn't help here: a project asks for `^<version>`,
  and npm gives it the highest version in range, tag or no tag. Publish the fix as the next patch at
  once, and deprecate the bad one. Unpublishing isn't open to it, since the CLI depends on it.
- **The hosted MCP server is broken.** It keeps nothing between calls, so going back is always safe:
  `pnpm --filter echo-ui-mcp exec wrangler deployments list`, then `pnpm --filter echo-ui-mcp exec
  wrangler rollback <version-id>`. Never take its route away instead: its address is the plugin's,
  for good.
- **The site is broken.** If the deploy carried no registry release, roll it back the same way, from
  `apps/www` (`pnpm --filter @echo-ui/www exec wrangler rollback <version-id>`). If it did, don't:
  going back takes the new pinned files off the site, and every project that installed them can no
  longer `diff` or `update`. Fix forward and deploy again.
- **A component is broken.** Its pinned version is never rewritten. Release the fix as a new version
  of the item (a `patch` entry in the changelog); projects take it with `update`.
- **The hosted server's bill climbs.** A budget alert in Cloudflare's billing settings says so by
  email. The server's metrics show whether it's one address or many; block what's sending it with a
  WAF custom rule (an address, a network, a country), and lower the limits in
  `mcp/wrangler.jsonc` if they're what let it through.
- **Echo's site is down** (Cloudflare itself). Nothing to deploy: the CLI tries each read three times
  and says what failed, and the hosted server answers from what it last read. Say so where people
  follow Echo.
- **A security report.** It arrives as a private advisory (`SECURITY.md`). Fix it on a private fork
  of the advisory, release, then publish the advisory with the fixed versions.
- **The plugin's tools.** ChatGPT's listing was reviewed with the tools as they are. Add tools and
  optional fields freely; don't rename or remove one, or change what one returns in a way the skills
  rely on, without reading OpenAI's current rules for listed plugins first.

## Why a file and not a network call

A test that runs `npm view` is a test that fails on a plane, in a sandboxed CI job, and on the day
npm has an outage — and a release check that cannot run offline gets skipped, or worse, disabled.
The registry solved this once already for the domain (`registry/src/agent/identity.test.ts`) and
once for the release state (`registry/src/agent/release-state.test.ts`): write the fact down, and
make a test enumerate every place that has to change with it.

`how` records the command that produced `version`, so re-verifying is one line rather than a
search.

## What this file cannot do, and where that is caught

`version` is a number a person typed. Bump it to `0.1.0` and skip the `npm publish`, and every
check in this repository goes green while `/e/` declares a core npm does not have. No offline test can see that, and pretending otherwise would be worse than the
gap.

So exactly one check goes to the network, and it runs where the network already is: the
production smoke check (`registry/scripts/smoke.ts`) resolves the `core` range in the deployed `/e/index.json` against
npm and fails if nothing published satisfies it. Existence is not the test — `echo-ui-core` has
been on npm the whole time. The test is whether a published version satisfies what every item
declares.
