# Contributing to Echo UI

Thanks for looking. This document is the working agreement: how to run the project, and what a
change has to be true of before it lands.

## The one rule that overrides the others

**Echo's architecture is locked.** Each decision below was made with the tradeoffs weighed, and
each has consequences reaching through every component. If a change requires re-deciding one of
them, **open an issue and stop** rather than deciding it inside a pull request. Everything else in
this document is negotiable; this is not.

| Locked | Not open to substitution |
| --- | --- |
| **Behaviour primitives: Base UI** (`@base-ui/react`, per-component imports) | Not Radix, not Headless UI. Base UI's manual-unmount contract is what lets a GSAP exit finish before the node goes. |
| **Motion: GSAP**, as a peer dependency | Not Framer Motion, not CSS-only. Easing is serializable data here, which is what makes motion a *token family* rather than a prop. |
| **Sound: a zero-dependency WebAudio synthesizer** | Not audio files. No assets, no licensing, and a sound an agent can edit as data. |
| **Styling: real CSS with custom properties.** JavaScript sets variable values, never style objects | Not CSS-in-JS, not Tailwind classes in the components. Copied files have to stay readable and editable by the person who owns them. |
| **Three token layers.** Components consume only Layer 3 (`var(--echo-*)`); users touch only Layer 1 (the seed) | A component that reaches past Layer 3 breaks retheming for everyone. |
| **Distribution: components are copied into the user's tree** by `echo-ui-cli`, not imported from an npm package | The one published package is `echo-ui-core`, the grammar they all share. |
| **One device, dark or light: the chassis decides.** | Not a light/dark mode switch. A light device is its own ladder of plastic with paper-glass screens, derived from the same seed and held to the same contrast: the accent is lit on it at 3:1, lit text is its ink at AA, and the primary cap is the same as the dark device's; a dark screen on a light body is refused, because one text colour can't serve both. |
| **WCAG 2.2 AA is the floor**, not a review step | A component that cannot meet it does not ship. |

`PRINCIPLES.md` covers the layer below this one: what a component may expose, and why the API is
as small as it is.

## Getting set up

**This repo uses pnpm** (pinned by `packageManager`). `npm run <script>` mostly works but will
warn about pnpm-only config in `.npmrc`, and `npm install` will not respect the workspace.

```bash
pnpm install
pnpm dev            # the docs site on :3000  (alias of dev:www)
pnpm check          # typecheck + lint + build:registry + test — what CI runs
```

> **If the dev server reports import errors after pulling**, restart it. Next's dev server caches a
> module graph, and a refactor that moves an export between files (splitting `SiteTopBar`
> into `Wordmark` and `TopNavLinks`, say) leaves it resolving against the old one. A cold start is the
> fix; `pnpm check` tells you whether the code is actually broken.

| Command | What it does |
| --- | --- |
| `pnpm build:registry` | the `/e/` registry and the agent artifacts (`llms.txt`, `llms-full.txt`, `/r/catalog.json`) |
| `pnpm typecheck` | `tsc` across every package |
| `pnpm lint` | eslint |
| `pnpm test` | per-package unit tests (`node:test`) |
| `pnpm test:e2e` | Playwright: axe, keyboard, visual regression, console cleanliness |

CI builds and runs `pnpm check` on every push and pull request. The browser suite takes about two
hours of runner time, so it runs on a pull request once it's ready for review (open a draft while
you iterate), on `main` unless the merge brings code it already passed on, and by hand with
`gh workflow run CI --ref <branch>`. Dependabot's pull requests get the build; their updates meet
the suite when they merge, or before, by hand.

Two things the matrix harness does that nothing else can, both run by hand:

```bash
node scripts/matrix/install-app.mjs --framework vite --pm npm --serve
node scripts/matrix/install-app.mjs --framework vite --pm npm --sizes
```

`--serve` installs Echo into a real app, builds it, serves it and opens it in a browser. Every
other test here renders components from the source tree, so none of them can see a theme that did
not load — and a theme that did not load is a page of colourless controls with a green suite.

`--sizes` is where the figures on the installation page come from. Re-run it when a dependency
moves and update the table; a size quoted in docs and never re-measured is a number that used to
be true.

The e2e suite needs the registry built and then a production build (`pnpm build:registry`, then `pnpm --filter @echo-ui/www build`): the docs read what the registry writes. It runs two
servers — a `next start` for most specs and a `next dev` for the console specs, because React's
unknown-prop and hydration warnings are development-only and a production build silently strips a
bad prop.

> **If you already have a `next dev` running, give any build its own dist directory**
> (`NEXT_DIST_DIR=.next-build`). A dev server and a build sharing `apps/www/.next` corrupt each
> other, and the corruption is silent until the next restart, when the dev server answers 500
> everywhere.
>
> The trap is that this is not only `pnpm --filter @echo-ui/www build`. **`pnpm build` and
> `pnpm -r build` at the workspace root build the docs site too** — the site is a package like any
> other — so the innocent-looking "build the packages so I can check the tarballs" does it as well.
> If you catch it after the fact, restart the dev server; it rebuilds `.next/dev` from scratch.

## Repository layout

```
registry/           Source of truth. registry.json + per-item sources.
  src/echo/<item>/  One folder per item: sources, CSS, index.ts, and meta.ts
                    (zod props, examples, anti-patterns). This mirrors the install
                    target so relative cross-item imports resolve identically
                    in-repo and after `npx echo-ui-cli add`.
  src/agent/        The agent layer: catalog shapes, prop extraction, guidance.
apps/www/           Docs site (Next.js App Router). Also the SSR smoke app.
packages/core/      echo-ui-core: the grammar, published to npm.
packages/cli/       echo-ui-cli: the installer. packages/client/ is what it reads with.
mcp/                MCP server over the published catalog and the /e/ registry.
tests/              Playwright specs.
```

## What a new component has to do

A component is not done when it renders. It is done when all of this is true:

1. **It is one registry item**, under `registry/src/echo/<name>/`, with `meta.ts` carrying a zod prop
   schema, examples, and anti-patterns. The prop schema is not optional — it generates both the
   docs prop table and the agent catalog, from one source.
2. **It composes `var(--echo-*)` only.** A hardcoded hex is a defect: it is the one thing that will
   not relight when the seed changes.
3. **It is axe-clean, keyboard-operable, and screenshot-tested.** All states, not just the default.
4. **It rethemes correctly**, including its sound.
5. **It is used by `apps/www` itself.** A component that only appears on its own doc page has been
   displayed, not used — and the difference is where the defects are.
6. **It is registered in all four places**: `registry.json`, the meta list in
   `registry/src/agent/metas.ts`, a group in `registry/src/agent/groups.ts` (named for what you're
   building: Buttons, Forms, Objects…), and a live preview in `docs-previews.tsx`. The test suite
   will tell you if you miss one.

### Things that are defects here, and may not be elsewhere

- **A hex literal in app or component code.** Use the roles.
- **Synthesising a text colour with alpha** (`color-mix(… var(--echo-text) 47%, transparent)`). It
  bypasses the theme's contrast guardrail by construction. That shipped once and failed AA on every
  seed for eight milestones.
- **Accent as running text.** `--echo-accent` on `--echo-surface` is 3.70:1. Carry the label in
  `--echo-text` and let the accent be the rail.
- **Severity as red/amber/green.** Tone comes from the accent ramp, so a reseeded device stays
  coherent instead of sprouting a hue the seed never defined.
- **Smoothly easing a screen readout.** LCD and dot-matrix surfaces step; they do not tween.
- **A second `<main>`, `<h1>`, or live region.** Whole-screen blocks own the page's heading and
  landmark structure; embedding one inside another page needs `embedded`.

## Tests are the argument, not the paperwork

Write the assertion that would have caught the bug, not the one that restates the code. Some of the
suite's most useful tests exist because a feature passed every behavioural check while being
unusable — a modal with no keyboard exit, an overlay painted behind the sticky nav, a slider
rendered 0px wide.

Two specific habits:

- **Never assert on a timer.** If an assertion depends on hover-intent or an animation delay, it will
  be green until CI is loaded and then teach everyone to re-run the suite. Prefer the deterministic
  path — which is usually the keyboard one, and usually the one accessibility depends on anyway.
- **Measure before deciding.** Contrast, LCP, layout collapse: the repo has small scripts and tests
  for all three. A number settles an argument that taste will not.

## Changing the registry's identity

The host (`https://echo-ui.com`) is printed in the homepage hero, in `llms.txt`, in
`catalog.json`, on every doc page, in every install line and in the CLI's default `--registry`. It
is declared once in `registry/registry.json` and `registry/src/agent/guidance.ts`, and
`registry/src/agent/identity.test.ts` enumerates every other file that spells it out — so changing
it fails that test with the list of files to update. It is a checklist, not a search.

## Working on the MCP server

`mcp/` is published to npm as `echo-ui-mcp`. It reads `catalog.json` and the `/e/` registry, both
of which `pnpm build:registry` generates, so a change to what an agent is told belongs in a
`meta.ts` or in `registry/src/agent/`, not in `mcp/`. It reads `/e/` with `packages/client`, the
same client the CLI uses, so the two can never describe an item differently.

Run it against this repo's own catalog, from TypeScript source:

```sh
pnpm build:registry
ECHO_CATALOG=apps/www/public/r/catalog.json node mcp/bin/echo-ui-mcp.js
```

`node mcp/build.mjs` bundles the published file, `mcp/dist/index.js`; `mcp/src/package.test.ts`
builds it and drives it through a real MCP client, so a package that would not start fails CI.
Publishing is `npm publish` from `mcp/` (it rebuilds first). Bump `version` in
`mcp/package.json` — the server reports it to clients.

## Releasing

A release is the maintainer's to run, with npm 2FA. The steps, in the order that matters (bump, freeze
the registry's pins, cut the changelog, check, publish, record, merge, deploy, tag), are in
[`packages/core/published-core.md`](./packages/core/published-core.md#releasing); the archive of
released registry files and its rules are in [`registry/e-released/`](./registry/e-released/).
Once the repository is public, `.github/workflows/release.yml` runs the publish, the deploy and the
tag. When a release goes wrong, the same file says what to do for each part
([When something goes wrong](./packages/core/published-core.md#when-something-goes-wrong-after-a-release)).

## Commits and pull requests

Say **why**, not just what. The commit log is the project's design record: the reason a component
works the way it does usually lives in a commit message or a comment, not in a doc nobody updates.
If a change was forced by a measurement, put the number in.

## Code of conduct

Be decent. Assume good faith, disagree about the work rather than the person, and take the
disagreement to the evidence where evidence exists.
