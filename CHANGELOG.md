# Changelog

Notable changes to Echo UI. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**What a version means for a copy-paste registry.** Installed components live in *your* source
tree, so an upgrade is never automatic — `npx echo-ui-cli add` overwrites a file you may have
changed. Versions here describe the *registry*: what a fresh install of a given item gives you,
and whether re-adding an item you already have can change its behaviour.

**Every entry declares what it is.** Above each bullet sits a line the build reads and markdown
hides: `<!-- bump: breaking; items: echo-toast, echo-count-badge -->`.

`bump` is `patch`, `minor` or `breaking`. `items` is the registry names the entry changes, `all`
for a change that genuinely sweeps the library, or `none` for one that touches no installable
item — the CLI, the MCP server, the docs. The build refuses a changelog with an entry that
declares neither, and refuses one naming an item that does not exist.

This is not ceremony. A `/e/` version is published once and never rewritten, so the number an
item ships under cannot be taken back, and reading it from the prose would let the wording decide
it. Write the prose for a reader; declare the facts for the build.

**What each bump means.**

- **`patch`** — fixes that do not change an item's API or its rendered semantics.
- **`minor`** — new items, new props, new tokens. Re-adding an existing item is safe.
- **`breaking`** — a prop, a CSS class, a token name, or the registry namespace changed.
  Re-adding an item may require edits on your side; the entry will say which.

**Breaking does not mean major, while Echo is 0.x.** Semver leaves `0.y.z` to the project, and
Echo follows the common reading: a breaking change bumps the **minor**. So `breaking` and
`minor` both produce the next minor today, and they are still declared separately — they say
different things to a reader, and they will produce different numbers the day Echo reaches 1.0.

## [Unreleased]

### Fixed

<!-- bump: patch; items: none -->
- **`wear_style`'s link wears a style Echo publishes, whole** (`echo-ui-mcp`). For Drafting Index it
  carried only the three colours, so the site opened on Echo's molded parts in black and white. It
  now opens the site's Styles page on that style, drawn, in its own corners and type. A builder's
  own style still travels as its colours.

## [0.3.3] — 2026-10-19

### Changed

<!-- bump: patch; items: echo-accordion, echo-alert-dialog, echo-app-shell, echo-badge, echo-creature, echo-engraved-plate, echo-field, echo-hardware-button, echo-keypad, echo-lcd-chip, echo-led-key, echo-menu, echo-meter, echo-modal, echo-morph, echo-number-field, echo-otp-field, echo-pagination, echo-panel, echo-popover, echo-progress, echo-pull-cord, echo-quick-tile, echo-radio-group, echo-receipt, echo-segmented, echo-select, echo-sheet, echo-shortcut-map, echo-slider, echo-stat-tile, echo-status-dot, echo-status-island, echo-steps, echo-stopwatch, echo-tabs, echo-tag, echo-textarea, echo-throw-stack, echo-toast, echo-tooltip, echo-voice-note, echo-week-strip -->
- **Comments in 43 components, reworded.** Comments only: no behaviour, prop, class or token
  changed, so re-adding one gives you the same component.

<!-- bump: patch; items: none -->
- **Comments in `echo-ui-core`, `echo-ui-cli` and `echo-ui-mcp`, reworded the same way**, for their
  next release. One rule of the slop police (`style check`) now names its source "Echo's own review
  of light devices".

## [0.3.2] — 2026-10-19

### Changed

<!-- bump: patch; items: none -->
- **`test` runs axe-core 4.14** (`echo-ui-cli`), the version Echo's own accessibility tests use, so a
  page the CLI passes is one the repository's own tests pass too. It adds one rule to the A level:
  `label-content-name-mismatch` (WCAG 2.5.3), a control's name holds the words it shows, which
  `echo.json` can name as `axe:label-content-name-mismatch`.

<!-- bump: patch; items: echo-creature -->
- **Creature's frame no longer sets a pose it always replaces** (`echo-creature`). The code scan and
  ESLint 10 both caught a starting value every mood overwrote; it's gone. No change in behaviour.

### Fixed

<!-- bump: patch; items: echo-status-island -->
- **StatusIsland's pill reads the words of its name** (`echo-status-island`). Its label and its
  reading sat against each other, so it read "Exporting42%" while named "Exporting 42%", and voice
  control couldn't press it by what it shows (WCAG 2.5.3). A space now sits between them, which the
  pill doesn't draw.

<!-- bump: patch; items: none -->
- **A registry address or a version range can't stall the CLI** (`echo-ui-cli`, `echo-ui-mcp`). A
  registry address is trimmed of its trailing slashes by counting them, and a range is read in one
  pass: an address with a long run of slashes in it used to hold the CLI for minutes.

## [0.3.1] — 2026-10-18

### Changed

<!-- bump: patch; items: none -->
- **The slop police's own tells are Echo's** (`echo-ui-cli`, `echo-ui-mcp`). `style check --json` marks the
  pairings from Echo's own audits `"from": "echo"`, where it said `"noor"`, and "a mid-grey ground" is
  confirmed: its source no longer calls it a draft. They still come first, before the ones the sources
  name.

<!-- bump: patch; items: none -->
- **Comments say why, not who said so** (`echo-ui-core`, `echo-ui-cli`, `echo-ui-mcp`). Comments only:
  the reasons stay, and the dates and quotes from the reviews they came out of go. No behaviour changes.

<!-- bump: patch; items: none -->
- **The plugin's install says it's in ChatGPT's directory** (`echo-ui-mcp`'s README and
  `/docs/plugin`). Both still said it was in neither directory, so a ChatGPT user was sent to unzip a
  download and run Codex commands. They now link the listing, where it's one click; the downloads
  stay for Claude and Codex.

<!-- bump: patch; items: none -->
- **The hosted server counts large code, not only requests** (`echo-ui-mcp`'s Worker). A call's cost is
  the code it carries, and one address sending the largest `check_code` bodies at the request limit
  could have run up a large bill. Each whole 16 KB of a body now draws on a second budget per address,
  about 2 MB a minute (`429` with `Retry-After: 60` past it); a call under 16 KB, nearly every call,
  never touches it. Any one call is also stopped past a second of CPU, where the largest check takes
  about a tenth of that.

<!-- bump: patch; items: none -->
- **The MCP server says what `@/echo` stands for** (`echo-ui-mcp`). Its code imports from `@/echo/…`,
  a placeholder no project resolves; code copied from a chat didn't build. An answer with such an
  import now ends with the real path: `@/components/echo` in a Next.js app, `./components/echo` from
  `src/` in a Vite app.

<!-- bump: patch; items: none -->
- **`docs` gives imports that resolve in a project with no import alias** (`echo-ui-cli`). In a Vite
  app, which has no `@/` alias, it printed `@/echo/switch`, and code copied from it didn't build. It
  now writes the import from the folder your app's files are in (`./components/echo/switch` from
  `src/`) and says which.

<!-- bump: patch; items: none -->
- **The plugin carries OpenAI's review cases** (the plugin's `plugin.json`, built by `echo-ui-mcp`):
  five prompts that should use it and three that shouldn't, each held to the server's tools. The
  one that checks a style carries the style in its prompt, so a reviewer needs no file.

<!-- bump: patch; items: none -->
- **The plugin names no one else's assistant** (the plugin's listing, README and skills, built by
  `echo-ui-mcp`). The skills said where they run by product name, and the listing named the files
  `init` writes for one agent; OpenAI's review flags a plugin that names another company's
  assistant. They now say "in a project with a terminal" and "in a chat". Claude's README still
  names each file `init` writes.

<!-- bump: patch; items: none -->
- **OpenAI's listing is plain text** (the plugin's `plugin.json`, built by `echo-ui-mcp`). Its long
  description was the README's markdown, which OpenAI's listing shows as typed; it now reads as
  plain text, with the same words.

<!-- bump: patch; items: none -->
- **Echo's tools describe themselves, and leave the rules to the instructions** (`echo-ui-mcp`).
  Five tool descriptions told the model what to do ("Call this first", "never hardcode a hex");
  Claude's directory rejects a description that does. Each now says what it returns and when it's
  the one to call, and a test holds every description to that. The rules themselves are unchanged,
  in the server's instructions and the skills.

<!-- bump: patch; items: none -->
- **The plugin says everything it sends, runs and writes, and where to write** (the plugin's
  README, built by `echo-ui-mcp`). It said the server "stores nothing"; the server keeps nothing
  it's sent, but Cloudflare, which hosts it, keeps request logs for up to 7 days, and the README
  now says so. It also names the CLI the skills run, the hook `init` adds, and the style library
  Design Eye and Style Fit save to, and gives support@echo-ui.com for help, privacy and security
  reports. Its listing links to the new `/contact`, `/privacy` and `/terms` pages.

<!-- bump: patch; items: none -->
- **In a chat, Design Eye and Style Fit take the styles the builder shares** (the plugin's skills).
  They looked for the builder's styles in the chat's project on their own; now they use the ones
  the builder shares or points to, and ask once when there are none.

### Fixed

<!-- bump: patch; items: echo-app-shell -->
- **AppShell's rail is as tall as `--echo-shell-rail-h` says** (`app-shell`). Its hairline was drawn
  outside the declared height on a page without a border-box reset: a 57px rail for 56px, so the
  sidebar's sticky top, its max height and anything a page placed by the variable sat a pixel under
  it. The hairline now counts inside the height.

<!-- bump: patch; items: echo-app-shell -->
- **A key in AppShell's rail keeps its hit area when it's the current page** (`app-shell`). The rail
  lit its current link with a mark drawn in the link's `::after`, and a HardwareButton link uses its
  `::after` as its hit area: marked `aria-current="page"`, the key's hit area shrank to 2px and showed
  as a glowing line across the top of the cap. The rail's mark now leaves keys alone.

<!-- bump: patch; items: none -->
- **A theme scoped to one element stays in it on older browsers** (`echo-ui-core`). Below Echo's
  browser baseline, `createEchoTheme(seed, { selector })` painted the page's `body` in its colours
  even when the theme was scoped to one element, so a scoped preview recoloured the whole page. It
  now paints only its own element; a theme for the whole page (`:root`) still paints `body`.

<!-- bump: patch; items: none -->
- **`init` stops where Echo can't work, as its README said it did** (`echo-ui-cli`). It set up a
  Next.js Pages Router app, whose build then refused every component (each imports its own CSS, which
  the Pages Router takes only from `pages/_app`), and went on with React 17 and Node 18. Each is now
  refused before anything is written, with what to do; an app with both routers is set up, for its
  App Router's pages.

<!-- bump: patch; items: none -->
- **A read of the registry that meets a blip tries again** (`echo-ui-cli`, `echo-ui-mcp`). One reset
  connection or one 502 ended a whole `add` or `init`, and the hosted server's catalog read failed every
  tool for the call, with only "fetch failed" said. A read is now tried again after a dropped
  connection or a 408, 429 or 5xx, after half a second and then a second and a half; a 404 isn't asked
  twice, a host that stops answering is still given up on at the time limit, and the error names the
  cause (`fetch failed (ECONNRESET), after 3 tries`).

<!-- bump: patch; items: none -->
- **The supply-chain claim says what's true today** (the docs, the README, what agents read). It said
  the release workflow publishes every package with npm provenance; 0.3.0 was published by hand,
  since provenance needs the public repository, and has none. The claim now says provenance comes
  with the public repository.

## [0.3.0] — 2026-10-12

### Added

<!-- bump: minor; items: none -->
- **Drafting Index, Echo's second style** (Echo's library, read by `echo-ui-cli`'s `style list`,
  `style fit`, `style show` and `style use`). Beside Echo's own, Echo publishes a style drawn in one
  black ink on white paper, hollow until it's on: `render: "drawn"`, pill keys on crisp boxes
  (`radius` 0.3, `pills`), Inter Tight for sentences and IBM Plex Mono for labels and values, with
  its rules and decisions for the agent. `npx echo-ui-cli style use drafting-index` wears it, no
  board needed. It passes `style check` and the slop police, and a test holds every published
  style to both and to a theme with nothing hard to read.

<!-- bump: minor; items: none -->
- **The MCP server, hosted** (`echo-ui-mcp`). The same tools as `npx echo-ui-mcp`, over HTTP at
  `https://mcp.echo-ui.com/mcp`, for the tools that only connect to a remote server: ChatGPT,
  claude.ai, Lovable, v0, Bolt and Claude Design. It needs no account, reads what echo-ui.com
  publishes (so it answers what the CLI installs), and keeps nothing it's sent: `check_code`
  reads your code and forgets it. One address can send up to 300 requests in ten seconds.
  - Every tool now declares that it only reads (`readOnlyHint`), so a client can run it without
    asking each time.
  - `check_code` takes up to 200,000 characters, and says so. A request larger than that needs is
    refused with `413` before its body is read, so no one call can take the server's memory.

<!-- bump: minor; items: none -->
- **Echo's plugin installs from echo-ui.com before it's listed** (`echo-ui-mcp`'s plugin build).
  `/docs/plugin` says what the plugin adds to the hosted server (Echo's three skills, which know
  the workflow) and links two downloads that every deploy now carries: `echo-ui-claude.zip`, for
  claude.ai's Upload plugin and `claude --plugin-dir`, and `echo-ui-codex.zip`, a marketplace of one
  for `codex plugin marketplace add` in Codex and ChatGPT desktop. The ZIPs are written in Node, so
  `pnpm build:registry` writes them on any machine, Windows included, and the same files always
  make the same bytes.

<!-- bump: minor; items: none -->
- **Echo's plugin, for ChatGPT, Codex and Claude** (`pnpm --filter echo-ui-mcp build:plugin`). One
  source, two folders: Claude's (`.claude-plugin/plugin.json`, `.mcp.json`) and OpenAI's
  (`plugin.json` on the Agent Plugins schema, `mcp.json`, and a ZIP for its portal; with
  `.codex-plugin/plugin.json` and `.mcp.json` beside them, which Codex and ChatGPT desktop read,
  so the same folder installs there too). Both carry the hosted server and three skills that work
  in a chat as well as a project: Echo UI, which routes (a project with Echo follows its own
  skill, one without runs `init`, a chat makes the style and hands the build to the code tool),
  and Design Eye and Style Fit, each the project's skill plus what every step becomes without a
  terminal. The skills `init` writes into a project are unchanged.

<!-- bump: minor; items: none -->
- **Styles in the MCP server** (`echo-ui-mcp`). Four tools do what `npx echo-ui-cli style` does,
  for a builder in a chat with no terminal, from the same code, so the two give the same answers:
  - `list_styles`: Echo's styles, or one in full.
  - `fit_styles`: Echo's styles and the builder's own (passed in by their fingerprints), ranked
    against where the product sits on the seven axes, as `style fit` ranks them.
  - `check_style`: a `style.json` read the way `style check` reads it, the slop police included.
  - `wear_style`: what a style gives a project. A link that makes the whole Echo site wear its
    colours, the `init --style` or `style use` command for the builder's code tool, and, for a
    project with no terminal, the theme CSS and a `DESIGN.md` with the style's rules. A style
    the police stops isn't worn: it says what to ask the builder.

  A builder's own styles never live on the server: they come in with the call. A standalone
  `DESIGN.md` made from a style now opens with `init --style <name>`, so a project set up from it
  keeps the style's rules, not only its colours.

<!-- bump: minor; items: none -->
- **Design tests, and the gates that run them** (`echo-ui-core`, `echo-ui-cli`). The page check
  now measures what a designer checks on a screen an agent built: **alignment** (text cut off with
  "…", cards side by side whose actions sit at different heights, a lone action off its column's
  edge, a grid that leaves columns empty), **depth** (a control that glows at rest, a raised
  surface on a raised one with no well), **corners** (parts of one kind with different corners, a
  corner inside a corner that doesn't follow it) and **icons** (one group's icons at different
  sizes, strokes or styles), beside contrast. Each finding carries what it measured and the one
  change that fixes it, ending with what to leave alone. Three ways to run them:
  - `npx echo-ui-cli test` runs them on the app's pages (its routes, or `test.routes` in echo.json)
    and exits 1 on a finding, with a report and a picture of each in `.echo/report/`. `.echo/`
    ignores itself; nothing else in the project changes.
  - In Claude Code, a **Stop gate**: when the agent tries to finish, the tests run on the pages it
    changed, and it keeps working until they pass (three rounds at most; it lets the agent stop
    when the app isn't running, a page can't be loaded, or a page shows the dev server's error
    overlay instead of itself, and says which). `init` and `agent on`
    add it beside the check hook;
    `"test": { "stop": false }` in echo.json turns it off.
  - `init --ci` writes a GitHub Actions job that runs them on every pull request.

  `check --url`, `test` and the gate render pages in the Chrome already on the machine, over its
  DevTools protocol, and fall back to the project's Playwright: no project needs Playwright to run
  them. Echo's own gallery and every docs page pass them; on the page an agent built in the blind
  runs that passed every check Echo had, they find all four of its layout problems.

<!-- bump: minor; items: none -->
- **axe on every page, with nothing to set up** (`echo-ui-cli`, `echo-ui-core`). `test`,
  `check --url`, the Stop gate and the `init --ci` job now run axe-core on each page they load,
  after Echo's own checks: its WCAG 2.0, 2.1 and 2.2 A and AA rules, which catch what an agent
  writes outside Echo's parts (an image with no `alt`, a target under 24px, `aria-hidden` over
  something focusable, an ARIA value that isn't one). On a page planted with fourteen common
  mistakes, Echo's checks found none and axe found eleven.
  - Each finding is in Echo's shape: the rule and its WCAG criterion, the element as Echo names
    it, a picture in the report, and Echo's answer where one of its parts or props is it
    (`/settings  axe  button "Bold": target-size (WCAG 2.5.8, AA): this target is 14px by 14px …`).
    A control with no name is said once, by Echo's `name`. Contrast stays Echo's own.
  - It counts like any rule. `"check": { "rules": { "axe": "info" } }` says without counting,
    `"axe": "off"` turns it off, and `"axe:target-size": "info"` does either for one rule, which is
    how a project keeps the problems it already has without hiding new ones. An `axe:` name axe
    doesn't run fails loudly.
  - The report lists, under each page, what only a person can check, never counted: what axe
    couldn't decide, each iframe (axe doesn't look inside frames), and a page axe couldn't run on.
    axe failing on a page never costs it Echo's own findings, and it has 10 seconds.
  - The Stop gate tells you when `echo.json` lets more through than at the last commit (a rule
    turned `off` or to `info`, or the gate turned off), and tells the agent never to mute what it
    can't fix.
  - `axe-core` is a dependency of `echo-ui-cli`, pinned exactly (4.13.0) and kept as its own
    package (it's MPL-2.0). `echo-ui-core` doesn't run axe, and `<EchoCheck />` is unchanged,
    except that an element with no words of its own (an icon key, a field) is now named by its
    `aria-label` in what it says: `input#code "Code"`.

<!-- bump: minor; items: none -->
- **A display size, and pills on their own** (`echo-ui-core`, `echo-ui-cli`). The type scale gains
  `3xl` (40px) and a `display` text style (the sans, bold, tight), for the one large line a screen
  carries: a headline, an entry's index number. Both Paperlab moodboard runs reached for one and
  found the scale stopped at 26px. And a seed's new `pills` makes buttons and segments pills
  whatever the radius (`style set pills true`), so a style can have pill keys on crisp boxes, or
  soft boxes and square keys; `radius` is the corners of boxes, panels and fields. Unset, pills
  come with radius 1 as before, so every seed renders as it did. Design Eye reads `radius` from the
  boxes and `pills` from the buttons; at radius 1 both runs had pill keys and 29px panels.

<!-- bump: minor; items: echo-alert-dialog, echo-annunciator, echo-app-shell, echo-avatar, echo-badge, echo-banner, echo-calendar, echo-card, echo-chart, echo-chat, echo-checkbox, echo-choice-cards, echo-combobox, echo-command, echo-console, echo-count-badge, echo-creature, echo-date-field, echo-date-tile, echo-description-list, echo-divider, echo-empty-state, echo-engraved-plate, echo-field, echo-file-upload, echo-fill-slider, echo-filter-tray, echo-form, echo-hardware-button, echo-item, echo-jog-wheel, echo-kbd, echo-keypad, echo-knob, echo-lcd-chip, echo-led-key, echo-level-meter, echo-link, echo-menu, echo-meter, echo-now-playing, echo-number-field, echo-otp-field, echo-pagination, echo-panel, echo-patch-bay, echo-popover, echo-progress, echo-pull-cord, echo-quick-tile, echo-radio-group, echo-receipt, echo-ripple, echo-scope, echo-scroll-area, echo-segment-display, echo-segmented, echo-select, echo-sheet, echo-shortcut-map, echo-side-nav, echo-skeleton, echo-slider, echo-split-flap, echo-stat-tile, echo-status-dot, echo-status-island, echo-steps, echo-switch, echo-tab-bar, echo-table, echo-tabs, echo-tag, echo-textarea, echo-toast, echo-toggle, echo-toolbar, echo-tooltip, echo-tuner -->
- **The drawn device** (`echo-ui-core`, `echo-ui-cli`, every component that draws its own material).
  A seed's new `render` setting is `molded` (Echo as it has always been: plastic lit by one key
  light) or `drawn`: the same parts drawn in the ink, the way a spec sheet draws a key. Every part
  is outlined at one weight (`--echo-line`, `--echo-line-width`), hollow on the body; a raised part
  stands on a hard ink edge as deep as it rises and travels down it when pressed; a recess is an
  outline drawn inside; something floating stands on a deeper edge. There's no light, so no gloss,
  no soft shadow and no glow: what a molded device lights (an LED, the rail, a readout, the focus
  ring, a fader's knob, a radio's pip) is solid ink, and a low-emphasis action is its label
  underlined. In black and white (the accent the ink) "on" is solid ink and what's drawn on it
  inverts: a switch's thumb turns paper, a fader's knob is knocked out with a paper ring. The
  primary key is the paper key that stands highest, on an ink edge twice as deep as a neutral
  one's, the way a spec sheet draws its CTA. The accent stays the seed's own colour as a flat
  fill for what's on (a chosen segment, a checked box, a slider's travel, a switch that's on), so
  an acid highlighter is acid, not the olive a molded device holds it to; what's drawn on it is the
  ink, or the body when the accent is too deep for the ink. Pressing, travel, sound, what each material is for and every contrast guarantee are
  unchanged. `npx echo-ui-cli style set render drawn` turns it on; a style sets it in its seed; the
  published style and config schemas describe it, and `DESIGN.md` says how a drawn device builds.
  A molded device renders exactly as before: every line is 0px wide there, and each drawn value a
  component reads (`--echo-drawn-fill`, `-on-fill`, `-ink`, `-rule`, `-glass`, `-hollow`,
  `-decoration`) is
  `initial`, so it falls back to what the component always drew. HardwareButton's bed is the one
  new hand-tuned shadow: a drawn key stands on its own edge instead of being drawn in a recess.

<!-- bump: minor; items: none -->
- **Style Fit reads an earlier decision as questions, not rules** (`echo-ui-cli`'s echo-style-fit
  skill). An earlier decision for the same product in the library is read first, for what it knows
  that the brief doesn't, but each of its constraints is carried as a question: what it protected,
  whether it still holds, a suggested answer. A constraint that holds is written as the need ("the
  sheet must stand off its surround"), never as one style's fix for it ("a darker frame"), and a
  new decision for the product is dated and says what it changes.

<!-- bump: minor; items: none -->
- **Design Eye reads the board, then asks, before it writes a style** (`echo-ui-cli`'s
  echo-design-eye skill). Builders don't make clean boards. Between the reading and the writing the
  skill now sends one message, at most three questions, each with its suggested answer: the colour,
  said as what the board agrees on counted in tiles ("eight of ten tiles are black ink on paper;
  the acid is on one"), with black and white as an answer; each tile that doesn't share the
  board's logic, and whether to leave it out, read it as its own style or take one thing from it;
  and the one reading the board supports both ways (which part is the main action). The answers go
  in the foundation under `BUILDER'S ANSWERS`. The accent is the builder's answer, never one tile's
  loudest swatch.

<!-- bump: minor; items: none -->
- **Design Eye reads outlined, hollow parts as a setting, not a refusal** (`echo-ui-cli`'s
  echo-design-eye skill and its `echo.md` reference). The skill's grammar used to say "parts are
  molded and lit, and caps travel when pressed" in one breath, and both its examples taught that
  flat or outlined means refuse, so a board drawn in line, outlined pills that still look
  pressable, came out as Echo's molded plastic in the board's colours. Pressing is the grammar; how
  a part is rendered is `render`, molded or drawn. Before refusing, the skill reads its own
  distillation again, and if a refusal would drop the style's character it looks for the setting
  or asks the builder. A decision comes from a part doing that job on the board, never from a
  neighbouring one. The reference marks which of Echo's rules are its own look (the light, seams,
  no borders, the glow) and which are the grammar. `check` still catches a shadow recipe written
  out as a molded device draws it.

### Changed

<!-- bump: minor; items: all -->
- **Every item needs `echo-ui-core` 0.3.0** (all components). The drawn device, readability past
  AA and the design tests live in core, and the components that use them are built against it, so
  each item now declares `echo-ui-core >=0.3.0 <0.4.0`. Update core with the items: `npm install
  echo-ui-core@^0.3.0` (or your package manager's), then `npx echo-ui-cli update`. An item whose
  files didn't change is the same code under a new version; the 0.2.0 files stay published.

<!-- bump: patch; items: none -->
- **`echo-ui-mcp` needs `@modelcontextprotocol/sdk` 1.32.1 or later** (`echo-ui-mcp`). 1.30 and the
  versions of `hono`, `fast-uri`, `ip-address`, `qs` and `proxy-addr` it brought in had published
  security advisories; none was reachable through Echo's server, which uses none of the parts they
  sit in, and the hosted server runs the fixed versions from its next deploy.

<!-- bump: patch; items: none -->
- **The MCP server keeps answering while echo-ui.com can't be read** (`echo-ui-mcp`, local and
  hosted). A catalog, registry index or style it has already read is trusted for five minutes; past
  that, a read that fails used to fail every tool. Now the copy it has keeps answering, and the
  source is tried again every minute until it reads.

<!-- bump: patch; items: none -->
- **Every prop of Echo's own says what it does** (the catalog, `llms-full.txt`, `get_component` and
  `npx echo-ui-cli docs`). 74 had no description, among them `feel`, `size` and `align` on the morph
  buttons, HardwareButton's `variant`, `loading` and `caption`, `useTactile`'s phases and every seed
  field, which only the docs site described. A prop goes without one now only when its meaning is
  the platform's: an HTML attribute, an ARIA name, or a controlled-state pair.

<!-- bump: patch; items: none -->
- **`echo.json`'s schema says what each check rule finds** (`echo-ui-cli`). The schema `init` points
  `echo.json` at now describes every name `check.rules` takes, so an editor shows what `space`,
  `restyle` or `alignment` is as you type it. The docs list them on a new page, `/docs/echo-json`,
  from the same text, and the CLI guide's flags table now comes from the flags the CLI parses, all
  27 of them.

<!-- bump: patch; items: none -->
- **The MCP server runs on zod 4** (`echo-ui-mcp`). Its tools take and answer what they did, and
  every prop table they answer with reads exactly as before. What a client is shown of each tool's
  arguments loses one line: zod 4's converter leaves out `"additionalProperties": false`, so a
  schema no longer says that the tool takes nothing else. It never refused anything else: an
  argument a tool doesn't take was dropped before, and still is.

### Fixed

<!-- bump: patch; items: none -->
- **A release that needs a new `echo-ui-core` is a new version of every item** (the registry). An item
  whose files hadn't changed kept its version, so its released file and its latest pointer could
  declare different cores, and `add` could refuse a project on the new one. `/e/{name}.json` is now
  always the pinned file it names.

<!-- bump: patch; items: none -->
- **Right after a release, the registry index names that release** (the registry). With nothing
  unreleased, `/e/index.json` called itself the next patch, and every released pin is now served as
  it was released, never rebuilt.

<!-- bump: patch; items: none -->
- **`echo-ui-cli` and `echo-ui-mcp` ship their licenses** (`echo-ui-cli`, `echo-ui-mcp`). Each
  package now carries Echo's MIT `LICENSE` and a `THIRD-PARTY-NOTICES.md` with the license of every
  package bundled into it.

<!-- bump: patch; items: none -->
- **`init --ci` writes a pnpm job that runs** (`echo-ui-cli`). Unless `package.json` named pnpm's
  version, the job's first step stopped with "No pnpm version is specified" on every pull request.
  It now names the pnpm the project runs.

<!-- bump: patch; items: none -->
- **`SoundProvider` closes its audio context when it unmounts** (`echo-ui-core`). It opened one on
  the first press and never closed it, so a provider inside a page left an audio thread running for
  every visit, until the browser made no more. A provider near the root, as the docs advise, was
  never affected.

<!-- bump: patch; items: none -->
- **In a monorepo, the Stop gate tests the page that changed** (`echo-ui-cli`). Git names changed
  files from the repository's root and Echo named pages from the app's folder, so in an app at
  `apps/web` no edit ever matched its page, and the gate tested the first ten pages of the app
  instead. A change outside the app's folder still counts for every page.

<!-- bump: patch; items: none -->
- **A pinned `/e/` version is cached for good again, and read in one request** (the registry,
  `echo-ui-cli`, `echo-ui-mcp`). Cloudflare redirects `{name}@{version}.json` to its `%40` spelling,
  and the immutable cache rule only reached the redirect, so the file itself was revalidated on every
  read. The rule now covers the file as it's served, and the CLI and the MCP server ask for that
  spelling directly.

<!-- bump: patch; items: none -->
- **`--json` output is the result alone when `init` or `add` installs** (`echo-ui-cli`). The
  package manager printed on the CLI's stdout, so pnpm's progress and npm's "added 2 packages" came
  before `{ "ok": true, … }` and an agent couldn't parse it. What the package manager says now goes
  to stderr.

<!-- bump: patch; items: none -->
- **A registry that stops answering is given up on after 30 seconds** (`echo-ui-cli`,
  `echo-ui-mcp`). Reads of `/e/` and the catalog had no time limit of their own, so a host that took
  the connection and never answered held `init`, `add` and every MCP tool for Node's five minutes,
  saying nothing. Now the command or the tool stops with the address that didn't answer.

<!-- bump: patch; items: none -->
- **An `echo.json` with a syntax error stops the CLI instead of being written over**
  (`echo-ui-cli`). One stray comma used to read as no `echo.json` at all: `add` said to run `init`,
  `init` wrote a fresh file over your seed, style and rules, and the check hook and the Stop gate
  passed every edit without a word. Now every command stops with the file's name and what the
  parser said, and nothing is written; the same goes for `echo-lock.json`.

<!-- bump: patch; items: none -->
- **The accessibility claim reads as a sentence.** It ended "Not covered yet: screen-reader: not yet
  verified by a person." in the README, on the site and wherever the claims are quoted; it now ends
  "Still open: screen-reader, not yet verified by a person." Each item's published record of what
  is still open is unchanged.

<!-- bump: patch; items: none -->
- **`check` names the role a colour is for when several roles are that colour** (`echo-ui-cli`,
  the MCP server's `check_code`). A drawn device in one black is its text, its seam, its glow and
  its lit ink at once, and a hairline typed as `#050505` was told to use `var(--echo-accent-glow)`,
  the first of them the theme lists; on a molded device that line would glow. The property now
  decides: a border or outline is the seam, a text colour the text, a background the surface.

<!-- bump: patch; items: none -->
- **`which` finds Segmented for a choice "among a few"** (`echo-ui-cli`, the MCP server's
  `search_components`). "One choice among a few" and "pick one among a few paper stocks" answered
  nothing; only "one of a few" and "among a few options" were known.

<!-- bump: patch; items: echo-layout, echo-choice-cards, echo-shortcut-map -->
- **Grid, ChoiceCards and ShortcutMap no longer leave columns empty**. Fewer items than
  fit share the row (`auto-fit`), so two cards in a row with room for three are two wide cards,
  not two cards and a gap.

<!-- bump: minor; items: echo-card, echo-item -->
- **A row of Cards lines up, and Item shows its whole title**. A Card alone in a list
  item fills it, so `<Grid as="ul">` of cards is one height a row; the footer sits at the bottom and
  starts at the content's edge instead of the far end (a `fullWidth` key spans it). Item's title and
  description wrap onto more lines instead of ending in "…"; the new `truncate` keeps one line each.

<!-- bump: patch; items: none -->
- **`which` knows the jobs three blind-run agents asked for** (`echo-ui-cli`, the MCP server's
  `search_components`). Site navigation, FAQs, a monthly/annual toggle, abandoning with a
  confirmation, an empty screen of any kind and a level that fills like liquid name SideNav,
  Accordion, Segmented, ConfirmButton, EmptyState and Meter; "heading text" points at the heading and
  display text styles, and "an icon set" at Lucide.

<!-- bump: patch; items: none -->
- **`which` knows more of the ways a second agent says a job** (`echo-ui-cli`, the MCP server's
  `search_components`). "Announce that the code was copied" and "a numeric value readout" answered
  nothing, "one of many options in a dropdown" answered RadioGroup and "switch between two
  formats" Switch. They name Toast, LcdChip, Select and Segmented now, and "a section label"
  says to print it in the machine-label text style.

<!-- bump: patch; items: none -->
- **`which` finds the part when it's asked by the job** (`echo-ui-cli`, the MCP server's
  `search_components`). The echo-ui skill tells an agent to ask by job, and "a setting from 0 to
  100", "the one main action", "a choice of one among a few options", "a label and value table",
  "a row with a label and a control" and "the app's frame" answered nothing (or Badge and Table),
  though "a slider" or "a button" found the part. They name Slider, HardwareButton, Segmented,
  DescriptionList, Item and AppShell now; a possessive reads as one word; and "a block of code"
  says Echo has none, and what to build it from.

## [0.2.0] — 2026-10-04

### Added

<!-- bump: minor; items: echo-hardware-button, echo-segmented -->
- **At roundness 1, buttons and segments are pills** (`echo-ui-core`, HardwareButton, Segmented).
  The theme writes `--echo-cap-round` (1 at `radius` 1, 0 below it), and a cap's and a segment's
  corners reach half their height when it's 1. Under 1 nothing moves: the corner is
  `max(the molding, 0)`, the same pixels as before. A style whose board shows pill buttons sets
  `radius` 1; Design Eye's table says so. Before, the softest molding stopped at about 14px on a
  48px cap, and a style that asked for pills couldn't get them.

<!-- bump: minor; items: none -->
- **Readability, past AA** (`echo-ui-core`, `echo-ui-cli`). The theme's report gains
  `readability`: every text role on every ground it sits on, in APCA; a dark device's cap against
  its body and its lit rim against the cap; and lit text and the lit cap as people with protanopia,
  deuteranopia and tritanopia see them. What's hard to read for anyone (under APCA Lc 45) is a
  warning in `style check`, `style use` and `style set`, and fails `style check`; what's under
  comfortable (Lc 60) is a note. The page check (`<EchoCheck />`, `check --url`) says small text
  that passes AA and reads under Lc 45. `apcaContrast`, `readability` and `simulate` are exported
  from `echo-ui-core/theme`.

<!-- bump: minor; items: none -->
- **The slop police** (`echo-ui-cli`, the MCP server's `check_code`). Some combinations read as made
  by AI the moment they appear: a cream ground with a terracotta or orange accent; near-black with one
  acid colour; cream, brass or oxblood and a serif for anything "premium"; indigo or violet on white
  in a stock sans; one stock face for everything. Each ingredient is fine alone. `style check` now
  stops a style whose own settings make one of these pairings, names the ingredients, prints the
  question for the builder, and exits 1; `style use` won't wear it; `style fit` marks it on the list.
  A builder keeps one on purpose with the style's new `keeps` (`{ rule, reason }`, in their words),
  and the agent skills say an agent never adds one. `check` gains a `slop` rule for the code an agent
  writes around Echo's parts: gradient text, an emoji as an icon, the sparkle for "AI", labels that
  don't say what happens ("Get started"), an arrow stapled to a label, a headline that could front any
  product, a stripe down one edge, spaced capitals made by hand, `A · B · C` strings, and stand-in
  names or photos, which can never be kept. A number that looks invented is said, not counted. Every
  finding says what to do instead. The chart is dated and credits its sources.
  **Decisions in a style.** `style.json` gains `decisions`: one short line each for how something is
  made important, the main, second and destructive actions, "you are here", how a state is said, what
  each type size is for, how a screen is composed, surfaces, what each colour is for, icons, imagery,
  how the product talks, and an empty screen. `style use` carries them and the builder's `keeps` into
  `echo.json` and `DESIGN.md`, which lists what the style leaves undecided; `style check` and
  `style show` say them too. Design Eye reads a board as three systems (type, buttons, surfaces and
  colour), treats each colour as a job with its sampled value as evidence, leaves the board's own tells
  out and names them, and writes the decisions. Style Fit weighs the police and the decisions. All
  three skills ask the builder when they aren't sure (one message, at most three questions, a
  suggested answer first) instead of reaching for a default, and the Echo block says so in one line.
  The published style and config schemas describe the new fields.

<!-- bump: minor; items: none -->
- **`style set`: one setting, one line** (`echo-ui-cli`). `npx echo-ui-cli style set radius 0.8
  finish 0.7` moves one setting of the project's seed, or several: the change an agent makes when
  it's asked for "rounder", "denser", "glossier", another accent or another typeface. The settings
  are the seed's own (`accent`, `chassis`, `paper`, `lcdTint`, `finish`, `radius`, `density` and the
  four font stacks). Every value is checked before anything is written, and every problem is said at
  once, with the same check `style check` uses. The theme and `DESIGN.md` are written again, contrast
  is held as always, a pale chassis is said to make a light device, and the output ends with the
  line that puts it back. `default` gives a setting back to Echo; `style set` alone lists them all. A
  project that wears a style keeps it, marked with what moved (`style.changed` in `echo.json`, which
  the published config schema now describes), and `style use` puts the style back whole. The Echo
  block names the command, and the skill maps words ("rounder", "roomier") to settings. The check
  hook, when an agent edits the theme file by hand, now points it at `style set`; it used to tell it
  to move its components out of Echo's folder.

<!-- bump: minor; items: echo-accordion, echo-alert-dialog, echo-annunciator, echo-app-shell, echo-avatar, echo-badge, echo-banner, echo-breadcrumb, echo-calendar, echo-card, echo-chart, echo-chat, echo-checkbox, echo-choice-cards, echo-collapsible, echo-combobox, echo-command, echo-console, echo-count-badge, echo-creature, echo-date-field, echo-date-tile, echo-description-list, echo-empty-state, echo-engraved-plate, echo-field, echo-file-upload, echo-fill-slider, echo-filter-tray, echo-form, echo-hardware-button, echo-item, echo-jog-wheel, echo-kbd, echo-keypad, echo-knob, echo-lcd-chip, echo-led-key, echo-level-meter, echo-link, echo-menu, echo-meter, echo-modal, echo-now-playing, echo-number-field, echo-otp-field, echo-pagination, echo-panel, echo-patch-bay, echo-popover, echo-progress, echo-pull-cord, echo-pull-to-refresh, echo-quick-tile, echo-radio-group, echo-receipt, echo-ripple, echo-scope, echo-scroll-area, echo-segment-display, echo-segmented, echo-select, echo-sheet, echo-shortcut-map, echo-side-nav, echo-skeleton, echo-slider, echo-split-flap, echo-stat-tile, echo-status-dot, echo-status-island, echo-steps, echo-switch, echo-tab-bar, echo-table, echo-tabs, echo-tag, echo-textarea, echo-textures, echo-throw-stack, echo-ticket, echo-toast, echo-toggle, echo-toolbar, echo-tooltip, echo-tuner, echo-widget-grid -->
- **The light device** (`echo-ui-core`, `echo-ui-cli`). Echo can be light: a pale chassis makes a
  device molded in light plastic, like a white calculator or a cream radio, and a dark one makes the
  device Echo has always been. There's no setting and no mode to switch; the chassis decides
  (`devicePolarity`, and `values.polarity` on the theme). On a light device the page is light: its
  ground, the well, is the body barely set in. Caps get their own ladder, a step lighter than the
  body with a lit rim that stops short of white, so they keep their bevel; undersides and seams are
  shaded darker; dim text moves toward the ground by the same step as on a dark device, and reads
  about 6:1 on it. Screens are paper glass printed in ink, because a glow on a pale body is a smudge.
  What's lit (an LED, the current rail) is still the accent, held to 3:1 on every ground, so on is
  brighter than off; the text it prints (a readout, a count, a current tab) and the focus ring are
  the accent's ink, a step deeper and held to AA, in the new `accent-ink` role. The primary cap is the
  same cap as a dark device's, the accent with a light label: its label is the new `primary-cap-ink`
  role, and progress cells, loader dots and a meter's fill, the same plastic, read 3:1 on the page.
  A neutral cap or a slider that fills with it under its own dark label fills with the new `pour-*`
  roles, the accent's pale stops. Shadows are drawn at half their weight, in a deep colour of the
  body's own hue (`--echo-cast-ink`) instead of black. Every guarantee holds as it does on a dark
  device, and the contrast sweep now runs on light bodies too. A dark seed makes exactly the theme
  it did before, and the new roles equal the ones they stand for there. The components that mixed
  a recess toward black, painted paper in the text colour or lit a pillow of light with it read the
  theme's new `--echo-shade-ink`, `--echo-paper-stock` and `--echo-paper-ink` instead, with the old
  value as the fallback, and a reflective screen reads `--echo-screen-*`; the components that print
  a lit label read `--echo-primary-cap-ink` and `--echo-accent-ink` the same way; every rail is drawn
  in the glow, and every focus ring, the `ring` recipes included, in the ink. `style use` wears a light style now, and `style check` says which
  device a style makes. A dark screen tint on a light body is still refused: one text colour can't
  serve both, and the theme says so.

<!-- bump: minor; items: none -->
- **Echo's Style Fit** (`echo-ui-cli`). `init` and `agent on` write a third skill,
  `.claude/skills/echo-style-fit/`: ask your agent which style the product should wear, and it
  reads what the project says about itself (asking only what's missing), places the product on the
  seven axes with how far a style may drift on each, has `style fit` order every style in your
  library and Echo's against that, reads the best of them, and argues for one in a decision saved to
  your library; then it wears it with `style use`, and keeps what it adapted for this product in
  `DESIGN.md`. `style fit --profile "W4 V2 D1 F2 E3 C3 O3" [--tolerance …]` is the arithmetic (a
  tolerance of 0 locks an axis, and a style that misses a locked one is out), and `style show
  <name>` prints one style in full with where its foundation is. A style that's only its foundation
  document, written before Echo, is measured from the library's index, and Design Eye writes its
  Echo part from the document, with no moodboard. `init --style <name>` sets a project up wearing a style from the
  start, and a new Styles guide (`/docs/styles`) says what a style changes, what it can't, and the
  ways in.

<!-- bump: minor; items: none -->
- **Echo's Design Eye** (`echo-ui-cli`). `init` and `agent on` now write a second skill,
  `.claude/skills/echo-design-eye/`: give your agent a moodboard and ask for the product to look
  like it, and it reads each style on the board into a design foundation (what the style is made
  of, the rules underneath it, the products it fits) and a `style.json` Echo can apply, with the
  board's real colours and magnified details as evidence from `style sample`. Before it writes
  rules, it reads what the project is for, and asks only what's missing: who it's for, their age,
  what they come to do, where. It saves each style to your own library, never into the project,
  checks it with `style check`, and offers `style use`. It comes with one reference, Echo's own
  style written as a foundation, so the agent has a finished example to write to. `agent off`
  takes it out with the rest.

<!-- bump: minor; items: none -->
- **Styles: `echo-ui style list | use | check`** (`echo-ui-cli`). A style is a look a project wears
  on top of Echo: it changes the vocabulary (colours, type, radius, finish, density), never the
  grammar. `style list` shows Echo's own styles (the first is Echo's device, `echo`) and yours, from
  your own library (`~/Documents/styles`, or `ECHO_STYLES_DIR`), private to you. `style use <name>`
  writes the style's seed to `echo.json` and `echo-theme.css`, says what the theme corrected for
  contrast and which fonts to get, and puts the style's rules in `DESIGN.md` for your agent; the
  style's documents stay in your library. `style check <file>` says whether a `style.json` is one
  Echo can apply, listing every problem. Editors read the file's schema from `/e/schema/style.json`.
  `init` keeps a project's style when it runs again, and a new `--seed` replaces it.
  `style sample <image> --out <folder>` is the evidence for reading a style from a moodboard, with
  no Python: the plate, its dominant values (the real hex, dark to light, with each one's share of
  the pixels) as a strip, and magnified crops of the surfaces a claim rests on (`--crop
  x,y,w,h:name`, `--zoom`). A collage, as a moodboard exported from a canvas is, gives each tile its
  own plate with `--region x,y,w,h`. It reads PNG and JPEG. A style with a light body is worn on
  Echo's light device (above).

<!-- bump: minor; items: none -->
- **`createEchoTheme` says what it corrected** (`echo-ui-core`). The result carries
  `report.corrected` (each role the contrast guarantee moved, and the ratio it reached),
  `report.unsatisfiable`, and `report.accent` when the accent was moved into Echo's lightness band
  (an acid yellow comes out olive), so a tool can say it rather than leave it to the console.
  `init`, `style use` and `style check` say all three.

<!-- bump: minor; items: echo-file-upload -->
- **FileUpload** (`echo-file-upload`). A recessed tray you press to choose files, or drop them on,
  its inner edge lighting while files are over it; it's a real button, so the keyboard opens the
  file dialog. Each file becomes a row with its name, what's happening to it, a slim Progress strip
  while it goes up, and a key to cancel, retry or remove it. It has no upload code of its own: give
  it `upload(file, report, signal)` and it shows the progress your handler reports and the message
  it throws; without one, it holds the files and a form submits them under `name`. `accept`,
  `maxSize` and `maxFiles` refuse a file in words, and what happens to each file is said aloud. `which`
  answers "a file upload" with it.

<!-- bump: minor; items: echo-date-field, echo-calendar, echo-date-picker -->
- **Dates: DateField, Calendar and DatePicker** (`echo-date-field`, `echo-calendar`,
  `echo-date-picker`). DateField types a date into wheels, day, month and year in the order the
  locale writes them, each a row of small flaps that turn over to the value, in Field's well and on
  its size scale: type the digits and a wheel moves on by itself, or step it with the arrows. On a
  phone it opens the numeric keyboard, and a pasted ISO date fills every wheel. Calendar is a month
  on a device screen: one Tab stop, the calendar keys (arrows, Home and End, Page Up and Page Down),
  the chosen day lit, today on a lit rail, and days that can't be chosen struck through. DatePicker is
  the two together: a calendar key in the field's well (or Alt+↓ on a wheel) opens the Calendar under
  it, and choosing a day closes it and turns the flaps. All three take `min`, `max` and
  `unavailable`, write the value as an ISO date (`2026-09-28`) so no time zone moves a day, follow the
  locale's order, names, digits and first weekday (Arabic runs right to left, Hebrew left to right),
  and put the date in a form with `name`. A date outside the limits is said in words under the field.

<!-- bump: minor; items: echo-popover -->
- **Popover can be opened and closed from outside** (`echo-popover`). `open` and `onOpenChange`
  make it controlled, and a close from outside still animates out. `initialFocus` says what takes
  focus as it opens, `anchor` places it against something other than its trigger (a whole field
  rather than the key in it), and `aria-label` names a popup that has no `title`.

<!-- bump: patch; items: none -->
- **`which` knows the date parts, and what's coming soon** (`echo-ui-cli`, `echo-ui-mcp`). "A date
  picker" gets DatePicker and DateField, "a booking calendar" gets Calendar, and a job that's coming
  soon says so: "an image slider" gets "A carousel is coming soon" rather than Slider.

<!-- bump: minor; items: echo-table -->
- **Table sorts, selects, filters and windows its rows** (`echo-table`). Give it `columns` and `rows`
  (and `getRowId`) and it draws the head and body itself: a sortable column's header is a button
  whose LED pips light the direction, with `aria-sort`; `selectable` adds a Checkbox to every row and a
  select-all that reads "some"; `filter` is a query from your own search Field; `size` sets the row
  height from the control scale; a table with its own `height` keeps its header at the top, and with
  `virtual` draws only the rows in view, so two thousand rows cost a screenful. `loading` and `empty`
  rows, `rowActions`, and `onRowPress` (a real button in the label cell) round it out. Sort and
  selection work controlled or not. Rows that move slide to their new place, new ones fade in, and a
  pressed row gives; under reduced motion, none of them move. The sort, a filter's count and loading are said
  aloud. A table laid out by hand works as before.

<!-- bump: minor; items: none -->
- **`DESIGN.md` for a tool with no terminal, and the whole seed for `init`** (`echo-ui-cli`). The
  generator downloads `DESIGN.md` for the seed you're looking at, for Lovable's Project knowledge or a
  Claude Design upload. It opens by telling an agent that has a terminal to run `init` instead, with
  that seed, so it never stands in for the components. `init --seed` takes the whole seed as the
  generator shows it, `accent,chassis,paper`, as well as the accent alone, and refuses anything else
  with the form it takes. `/docs/ai` says what works in v0, Bolt, Lovable and Claude Design.

<!-- bump: minor; items: none -->
- **`update` merges your edits with Echo's change** (`echo-ui-cli`). A file you edited used to hold its
  whole item back forever. Now a file you edited and Echo didn't stays yours, and one you both
  changed is merged against the version you installed, which the registry keeps. Where your edits and
  Echo's change meet in the same lines, nothing is guessed: the item is left as it is and the lines
  are printed between git's conflict markers (and in `--json`). Bring them together in your file and
  run `update` again: it merges once your file carries Echo's change. With no copy of the installed
  version to merge against, the item is left as it is, and `update` says why. `--overwrite` still
  takes Echo's whole.

<!-- bump: minor; items: none -->
- **`check --url` checks a running page** (`echo-ui-cli`). It loads the page headless with the
  project's own Playwright and runs the check `<EchoCheck />` runs in development, printing its
  findings the way `check` prints the source's, with the team's rules applied, `--json`, and exit `1`
  when it finds something. It installs nothing: a project with no Playwright is told how to add one.
  `echo.json` can turn the two rules only a page has, `setup` and `contrast`, off or to `info`.

<!-- bump: minor; items: none -->
- **`<EchoCheck />`: the running page, checked in development** (`echo-ui-core`, `echo-ui-cli`).
  Put once in the root layout, it looks at the page whenever it changes and says in the console what
  `check` can't see in the source: a colour the app paints that the seed doesn't make (a theme colour
  at any opacity, or a mix of two, counts as the seed's), a control with no name, text under WCAG AA
  against what's really behind it (gradients sampled where the text sits), a missing theme, ground or
  `SoundProvider`, and the screen rules that need a render (two primary caps in one form, "you are
  here" lit twice, an invalid field with no words). `overlay` lists the findings in a corner panel.
  A production build gets a component that renders nothing, through the `development` export
  condition, so none of it ships. `init` prints it as the third setup step, and the agent guidance
  asks for it.

<!-- bump: minor; items: none -->
- **`init` writes `DESIGN.md`, and Echo keeps what it writes for agents current** (`echo-ui-cli`).
  `DESIGN.md` is this project's look in Echo's terms (the colours its seed makes, type, spacing,
  depth, motion, sound, do's and don'ts) in the sections Google's DESIGN.md format uses, and it opens
  by telling an agent in the codebase to build with Echo's components rather than from the file. It's
  read when a screen is built, not in every session, and stays under 8,000 characters. It sits
  between Echo's markers, so a `DESIGN.md` of your own keeps everything else. The Echo block points to
  it. A Cursor project whose block went to `CLAUDE.md` alone also gets a Cursor rule. `init --seed`
  records the seed in `echo.json`, and every file Echo writes for agents records the CLI version (and
  seed) that wrote it: `add` and `update` bring Echo's marked files up to date, `check` says when one
  is another version's or another seed's, and `agent on` writes them again. `agent off` takes it all
  out.

<!-- bump: minor; items: none -->
- **The MCP server can check code** (`echo-ui-mcp`). A sixth tool, `check_code`, runs Echo's check on
  a file's code handed over as text (TSX, JSX or CSS) and answers with the same findings as
  `npx echo-ui-cli check`, each with the Echo way to fix it, against the default theme. For an agent
  with no terminal to run the CLI in. The check's rules now live in one place both bundle, so the
  two can't disagree.

<!-- bump: minor; items: none -->
- **The team's own rules, in `echo.json`** (`echo-ui-cli`). An optional `check` section turns a rule
  `off` or to `info` (said, not counted), bans an import with the team's own message ("our icons are
  in @/icons"), and allows brand colours the seed doesn't produce. Nothing needs it; it only adds. A
  rule name that isn't one, or a value it doesn't take, stops the check with what's wrong, and the
  hook reports it as the check failing, never as the agent's mistake. The published `echo.json`
  schema describes it.

<!-- bump: minor; items: none -->
- **`check` says when a heavy part loads with the page** (`echo-ui-cli`). A part that draws with
  WebGL (ShaderField, today), or one with a lot of code of its own, imported at the top of a file
  holds up the first paint; the line gives the lazy import for the project's framework
  (`next/dynamic` with `ssr: false`, or `React.lazy` in Vite). The catalog's weights now say which
  parts draw with WebGL.

<!-- bump: minor; items: none -->
- **Every item has a fact card** (`echo-ui-cli`, `echo-ui-mcp`). What it weighs (its own code, with
  what it imports, and its CSS, minified and gzipped, measured when the registry is built), what it
  needs, which keys do what, what reduced motion does to it and the sounds it makes: "At a glance"
  on its docs page, a `Weight:` line in `npx echo-ui-cli docs` and the MCP server's
  `get_component`, and `weight` in `catalog.json`. Every part you can operate now says which keys do
  what; sixteen that didn't (Receipt, Ticket, NowPlaying, OtpField, Tag, Banner, Pagination, Card,
  QuickTile, PatchBay, TagsInput, Form, SaveButton, Stopwatch, AddToBag, useTactile) gained the line.

<!-- bump: minor; items: none -->
- **`check` knows how an Echo screen is put together** (`echo-ui-cli`). The screen rules one file
  can show: another library's parts on an Echo screen, two primary caps in one form, dialog or
  toolbar, something destructive (delete, remove, discard, reset…) on one press with no
  ConfirmButton, HoldButton or AlertDialog in the way, and a confirmation that says "OK" or its
  default "Confirm" instead of what happens. Each line quotes its rule by number. Three more rules
  are only hinted at, as notes that don't count: an AlertDialog for something that isn't destructive,
  a cap whose only job is to navigate, a field that's always read-only.

<!-- bump: minor; items: none -->
- **`check` finds what a keyboard, a screen reader or a request for less motion loses**
  (`echo-ui-cli`). It reports a field with no label (no `aria-label`, no `<label>` around it or
  pointing at it), an error that's only a colour (`aria-invalid` with no words tied to it; on an Echo
  field, the line says to use its `error`), GSAP used straight in a file that uses Echo but not its
  motion, and an animation with no reduced-motion fallback. Tailwind palette classes (`text-red-500`,
  `bg-black/40`) now count as colours written by hand, since they never went through the theme.

<!-- bump: minor; items: none -->
- **`check` catches Echo restyled from outside, and says what `update` needs to know**
  (`echo-ui-cli`). It reports `className` or `style` on a closed component, a stylesheet of yours
  reaching into Echo's classes, and a theme token set anywhere but the theme (a colour set there skips
  the contrast check). Checking the whole project also lists, without counting them, the Echo items
  edited since they were installed and the ones behind the registry, with the `update` line to run;
  `--json` carries them as `info`. Offline, from the lock and the kept catalog. An edit inside Echo's
  own folder, which the check never reads, now tells the agent what it means (Echo's own file, or a
  new file of theirs in the wrong place) as hook context, and never blocks it.

<!-- bump: minor; items: none -->
- **`check` holds the rest of the material to Echo's scales** (`echo-ui-cli`). It now reports
  spacing and radii off Echo's scales, or on them but written as a number, with the token to write
  (`padding: 13px` → `var(--echo-space-6)`, `p-[13px]` → `p-[var(--echo-space-6)]`); shadows drawn
  by hand, pointed to the shadow recipe that fits, and hand-drawn focus rings to Echo's ring;
  durations and eases a transition invents (`300ms` → `var(--echo-duration-sweep)`); and a second
  animation library imported in a file that uses Echo. Page layout past 32px, Tailwind's own utility
  classes and `ease`-style keywords stay yours. A shadow is one finding, not one per colour inside
  it.

<!-- bump: minor; items: none -->
- **Haptics: on a phone, the moments that matter buzz** (`echo-ui-core`). The sound tokens that mark
  a moment carry a haptic: `select` a short tick when a choice changes, `notify` and `celebrate` a
  success, `caution` a warning, `error` an error. So every component that plays one (checkboxes,
  radios, tabs, menus, dialogs) buzzes with no change of its own. A tap or a press never buzzes.
  Haptics don't wait for sound to be turned on, stay still in a hidden tab and before the first
  touch, and `<SoundProvider haptics={false}>` turns them off. `play` takes `{ haptic }` to name
  another or none, `useSound().buzz` plays one on its own, and `useTactile`'s phases take `haptic`
  in the slot kept for it. Android browsers vibrate; iPhones can't, from a web page.

<!-- bump: patch; items: none -->
- **What Echo needs from a Content Security Policy, written down and tested.** The installation
  guide now says it exactly: Echo adds no scripts, evaluates no strings, starts no workers and loads
  nothing from another origin, so a strict policy works with `style-src-attr 'unsafe-inline'` (a
  slider's position, a meter's level and Base UI's own parts ride on style attributes), plus
  `img-src data:` for Textures and `media-src blob:` for VoiceNote. The guide prints a whole policy.
  A test holds the list to the code Echo ships, and every docs page is loaded under a report-only
  policy to catch anything the list doesn't cover.

<!-- bump: minor; items: none -->
- **Shadow recipes: Echo's depths, by name** (`echo-ui-core`). `createEchoTheme` now declares 20
  `--echo-shadow-*` recipes next to the finish they read: wells (`well`, `well-screen`,
  `well-deep`, `groove`), raised parts (`edge`, `hairline`, `chip`, `key`, `cap`, `cap-lit`,
  `panel`, `lifted`, `chassis`), things that float (`tooltip`, `popover`, `toast`, `modal`), and
  focus and glow (`ring`, `ring-inset`, `glow`). For a part of your own, take one instead of writing
  a shadow: `box-shadow: var(--echo-shadow-well)`. They're exported as `SHADOW_RECIPES`, listed in
  the theming guide, in `llms.txt`, in `catalog.json` and by the MCP server's `get_tokens`, and
  `material.css`'s recipe classes read them.

<!-- bump: minor; items: none -->
- **`init` tells an agent this is an Echo project** (`echo-ui-cli`). It writes three things, and
  `npx echo-ui-cli agent off` takes all three back out: a short Echo block, between
  `<!-- echo-ui:start -->` and `<!-- echo-ui:end -->`, in `CLAUDE.md` or `AGENTS.md` (whichever the
  project has, both when it has both, once when `CLAUDE.md` imports `AGENTS.md`, and a new
  `AGENTS.md` when it has neither), with the exact package names, how to ask `which` and `docs`,
  styling only with `var(--echo-*)`, the accessibility floor and running `check`; a Claude Code hook
  in `.claude/settings.json` that runs `check` on every file the agent writes and hands what it finds
  straight back; and an Echo skill with the procedures for building a screen from Echo's reference
  screens, adding a component, fixing what the check reports and updating Echo. Nothing outside the
  markers or the one hook entry is touched, a settings file that isn't valid JSON is left alone,
  `--skip-agent` leaves all three out, and `agent on` puts them in later. `init` still never edits
  your source code, and the docs now say that instead of "never edits your files".

<!-- bump: minor; items: none -->
- **`check`: what an agent gets wrong about Echo, caught in its own code** (`echo-ui-cli`).
  `npx echo-ui-cli check` reads the project's `.tsx`, `.jsx` and `.css`, never Echo's own folder, and
  reports colours written by hand (named by the theme role they're nearest), raw elements where Echo
  has the component, Echo's classes borrowed onto raw elements, props a component doesn't take or
  can't go without, controls without the name their type requires, and markup a keyboard or screen
  reader can't use. Each line says the Echo way. It exits 1 when it finds something; `--hook`
  checks the one file an agent just edited. `catalog.json` gains what it reads: each component's
  API from its types (`api`), the standard HTML attributes, and the material recipe classes
  anyone may use.

<!-- bump: minor; items: none -->
- **`which` and `docs`: the CLI answers an agent's questions** (`echo-ui-cli`, `echo-ui-mcp`).
  `npx echo-ui-cli which "a settings toggle" "confirm a delete"` names the item for each job, with a
  one-line reason and the install command, and says plainly when Echo has nothing for it yet (a
  date picker, today) rather than offering the nearest word match. `npx echo-ui-cli docs switch
  field` prints each item's props, smallest working use, accessibility needs and anti-patterns in
  one answer, with imports written the way the project resolves its Echo folder. Both answer
  offline from a copy of the catalog that `init` keeps in `node_modules/.cache/echo-ui/` and that
  `add` and `update` refresh. `init` now also installs `echo-ui-cli` as a dev dependency, so
  `npx echo-ui-cli` runs the project's own copy without downloading anything. The MCP server's
  `search_components` leads with the same answer `which` gives, from the same function.

<!-- bump: minor; items: none -->
- **`init` says what it added, in one line** (`echo-ui-cli`): "Added echo.json, echo-lock.json,
  components/echo/echo-theme.css, echo-ui-core." `--json` lists the same things with where each
  landed. The line comes from one list of everything `init` puts in a project and how each thing
  comes out, which the docs will print too, and a test fails if `init` writes a file the list
  doesn't name.

<!-- bump: minor; items: none -->
- **`catalog.json` says its format and each item's version.** `catalogVersion` comes first, so a
  tool that keeps a copy can tell a format it knows from one it doesn't, and every item carries
  its `/e/` version, the one `add` would install today. Only fields were added: nothing was renamed
  or removed. The MCP server's `search_components` shows that version when `/e/` can't be reached.

<!-- bump: minor; items: echo-segment-display -->
- **`SegmentDisplay`: a seven-segment readout that looks like a real one.** The segments a reading
  doesn't light stay faintly visible under the glass, and zeros that only pad a reading out print
  dim instead of vanishing, so `88.5` on a four-digit face reads as a dim `0` and a lit `88.5`.
  Digits, a minus, a decimal point, a colon and the few letters a segment face can draw; `roll`
  steps through the digits in between. It sits in its own dark well, or `flush` inside a screen you
  already have. Screen readers hear the reading once, as it is, with its unit.

<!-- bump: minor; items: echo-tuner -->
- **`Tuner`: a number picked the way a radio is tuned.** A scale printed on the screen slides under
  a fixed, lit needle and a `SegmentDisplay` reading follows it. Drag it with your hand, flick it
  and it coasts onto a step; every tick that passes the needle clicks, and past either end it gives
  a little and springs back. It fits a big range into a small width: weight, height, a tip, a zoom
  level, a frequency. A slider for assistive tech, with the reading and its `unit` in words and
  every slider key; the wheel only turns it once it has focus.

<!-- bump: minor; items: echo-keypad -->
- **`Keypad`: a payment terminal's keys under its screen.** `amount` fills from the right the way
  a till does (1, 2, 4, 0 reads 12.40) with its unused digits dim; `pin` lights a socket per digit
  and never shows or says them; `digits` shows a code in its cells. An amount set from outside is
  read as a number, however many places it's written with. Type on a real keyboard and the key on
  screen goes down with your finger. One Tab stop with arrow keys between the keys (focusing the pad
  hands focus to one), the reading announced after each one, and `action` for the button under
  the keys.

<!-- bump: minor; items: echo-filter-tray -->
- **`FilterTray`: filter pads in one long well, with the action at its end.** A pad that's on is
  a lit cap with its name engraved under it; the action carries the count. Apply, and the lit pads
  fold into the action (Morph) and it becomes one key saying how many are on, their names engraved
  on the tray's floor beside it; press it, or Escape, and they come back out.

<!-- bump: minor; items: echo-status-island -->
- **`StatusIsland`: background work in one small floating slab.** At rest a pill with a lit socket
  and a readout; pressed, it blooms open wider first and then taller into a title, progress cells,
  a line of detail and small actions, and closes the other way round. It announces when the work
  starts, finishes or fails, never every percent. `placement="top"` or `"bottom"` floats it at the
  centre of that edge of the screen, clear of the notch and the home bar.

<!-- bump: minor; items: echo-creature -->
- **`Creature`: Echo, as a companion that reports what's happening.** `idle`, `busy`, `done`,
  `error` and `sleep`. As a vector it breathes, drifts, blinks and watches the pointer, and a new
  mood carries on from wherever it is; with `variant="dots"` it's the same creature on a dot-matrix
  screen, moving in steps. Bring your own `character`: path data for a body, the whites of its eyes
  and its pupils (and optionally rows of dots, or they're drawn from the paths). Echo supplies the
  materials, so any character relights with the theme. Hidden from assistive tech: the words beside
  it carry the state.

<!-- bump: minor; items: echo-receipt -->
- **`Receipt`: the device prints.** A summary feeds out of a slot in the chassis a line at a time,
  each with a small tick, in dark ink on the paper colour (held to AA under every theme), and waits
  to be torn off. Lines with dotted leaders, a total, a reference as a barcode, a footer. It prints
  when it arrives after the page has loaded, or again when `printKey` changes; everything on it is
  text in the page from the start, so a screen reader never waits for the paper.

<!-- bump: minor; items: echo-date-tile -->
- **`DateTile`: the page of a desk calendar.** The weekday and month engraved small on a raised
  tile, the day huge on the screen set into it; with `roll`, a new date turns over to its day.
  `sm` sits in a list row (as an `Item`'s media), `md` on a card, `lg` on its own. It's one `time`
  element read as a full date, worked in UTC from the ISO date you pass, so the day is the same on
  the server and in every browser.

<!-- bump: minor; items: echo-week-strip -->
- **`WeekStrip`: a week you tap through.** Seven days in a large `Segmented`, each with its weekday
  and date, the chosen one lit and the light travelling there as a drop. Today carries a lit rail,
  a day with something on it has a pip, and the keys at either end go a week back or forward,
  keeping the weekday. A radio group of days, each named with its full date.

<!-- bump: minor; items: echo-description-list -->
- **`DescriptionList`: things and their values.** `plain` sets the terms as machine labels over
  their values with the one separator between rows; `screen` puts the list on a dark screen with the
  values in the readout face, like a home screen's glance list. `inline` sets them side by side. A
  real `dl`.

<!-- bump: minor; items: echo-switch-bank -->
- **`SwitchBank`: settings that come in a grid.** A `Table` of `Switch`es, one where each row meets
  each column (notifications by channel, permissions by role), with a `Checkbox` in each column's
  header that flips the whole column and shows a dash when it's mixed. Every Switch is named by its
  column and row.

<!-- bump: minor; items: echo-jog-wheel -->
- **`JogWheel`: a knob with no ends.** Knob's own cap, well and pointer, larger, with a ring engraved
  on the cap: turn slowly for a step per click, spin it and the steps grow with the speed. The
  wheel turns it by how far it scrolled, either axis, once it has focus; over the hub, where a
  hair's move is a quarter turn, dragging waits for the hand to leave. A spin button for assistive
  tech; `min` and `max` are optional.

<!-- bump: minor; items: echo-quick-tile -->
- **`QuickTile`: a quick-settings tile.** A big molded key with a glyph, a name and a line of
  state; on, it's the lit cap and its socket glows. It presses like every Echo key. A `switch`, with
  details on a separate key (`onMore`), never behind a long press.

<!-- bump: minor; items: echo-fill-slider -->
- **`FillSlider`: the tall slider of a control centre.** Meter's tube and its lit plastic, standing
  up, following your finger anywhere on it; the top of the fill is the handle. Base UI's slider,
  vertical, with every slider key.

<!-- bump: minor; items: echo-patch-bay -->
- **`PatchBay`: connecting things to things.** Sockets down each side and a cable between every
  connected pair, for mapping an import's columns to fields or routing events to channels. Each
  source has a `Select` that says where it goes, and that's the control; the cables draw what the
  Selects say, drop into place and sway once, and can be dragged from socket to socket. On a narrow
  screen only the Selects stay.

<!-- bump: minor; items: echo-annunciator -->
- **`Annunciator`: the marks printed on a screen's glass.** REC, SYNC, MUTE: every mark is always
  there, dark until what it names is happening, then lit. It says which are on, in words; `live`
  announces changes.

<!-- bump: minor; items: echo-ticket -->
- **`Ticket`: a paper pass with a stub.** What it's for on the main part, the code as a barcode on a
  stub across a perforation; use it and the stub tears off and drops away, leaving "Used". The same
  paper and ink as `Receipt`; on a narrow screen the stub goes under.

<!-- bump: minor; items: echo-now-playing -->
- **`NowPlaying`: a small player.** A screen with the source, the title and the time in lit
  segments, a `Slider` to scrub, and previous, play and next in one `ButtonGroup`. Leave out
  `duration` (or pass an `<audio>`'s `Infinity`) for a live stream; its `NaN` before the metadata
  loads reads "--:--". You own the audio; this is the device you control it with.

<!-- bump: minor; items: echo-perch -->
- **`Perch`: a creature on a card's top edge.** It sits there watching, or hides behind the edge
  and peeks up when you're near (on hover and when focus is inside). The room it needs above the
  edge is kept, so it never covers content.

<!-- bump: minor; items: echo-shortcut-map -->
- **`ShortcutMap`: the "Keyboard shortcuts" sheet.** The list of shortcuts in `Kbd` caps and, above
  it, a keyboard drawn in Kbd that lights the keys of the shortcut you point at and presses with your
  real keys. The list is the content; the board is a picture of it.

<!-- bump: minor; items: echo-widget-grid -->
- **`WidgetGrid`: widgets people arrange.** Fixed footprints (1×1, 2×1, 2×2, 4×2) on a grid that
  narrows to two columns on a phone. Arrange it and each widget gets a Move key (drag it, or use the
  arrow keys, and the new place is said) and, with `onRemove`, a Remove key; the others slide out of
  the way.

<!-- bump: minor; items: echo-scope, echo-hardware-button, echo-quick-tile, echo-knob -->
- **`Scope`: a colour per item, and softer plastic.** `accent` gives what's inside a colour of its
  own for identity (a category, a filter pad, a person): the theme engine run on your colour, so
  its lit caps, glow and LEDs are derived and held to AA like your main accent, and every component
  inside picks them up. It says which one, never how it is. `molding="soft"` rounds the caps
  inside and fills them out with a pillow of light and a fuller shade; `HardwareButton`,
  `QuickTile` and `Knob` carry the pillow, and look exactly as before outside a soft Scope.

<!-- bump: minor; items: echo-segment-display, echo-tuner, echo-keypad, echo-date-tile, echo-now-playing, echo-annunciator, echo-description-list -->
- **Reflective screens.** `screen="reflective"` gives a screen the paper glass of a pocket
  calculator, printed in ink: digits, labels and ghost segments in the chassis colour, nothing
  glowing. The ink is held to AA on the glass under every theme. On `SegmentDisplay`, `Tuner`,
  `Keypad`, `DateTile`, `NowPlaying`, `Annunciator` and `DescriptionList`'s screen.

<!-- bump: minor; items: echo-filter-tray, echo-creature -->
- **A colour per pad, and per creature.** A `FilterTray` option and a `Creature` take `accent`:
  the pad lights in its own colour, the creature is a family of colours, each through a `Scope`.

<!-- bump: minor; items: echo-segmented -->
- **A `Segmented` option can show more than a word.** Give an option `{ label, content }` and the
  segment shows `content` (a day and its date, a glyph and a pip) while `label` stays its
  accessible name. The lit cap still travels between them the same way.

<!-- bump: minor; items: echo-empty-state -->
- **`EmptyState` takes an `illustration`.** `icon` is for a small line icon and draws it quiet, at
  28px; `illustration` keeps a picture at its own size and colour (a `Creature`, a drawing) and
  takes the icon's place when both are given.

<!-- bump: minor; items: echo-hardware-button -->
- **`HardwareButton`: `held`.** Holds the cap down from outside, with its click, the way a real key
  going down would, without firing the button or sending any event. For a drawn keyboard that
  follows the typing; `Keypad` uses it for the key you type on a hardware keyboard.

<!-- bump: minor; items: echo-pull-to-refresh -->
- **`PullToRefresh`**: a list you pull down from the top to reload. The content follows your finger
  on the library's rubber band, a molded key turns as you pull and clicks at the detent, and the
  list holds there with the Loader's lights until `onRefresh` settles. The gesture is never the only
  way: the region's first tab stop is a real Refresh button, and one status says what happened.

<!-- bump: minor; items: echo-tabs -->
- **`Tabs` join the size scale.** `size` on `Tabs.List` makes each tab 32, 44 or 60px tall, the
  same as a field or a button of that size, and it follows a surrounding `SizeProvider`. The
  default is 44px, a full target; `sm` suits a card's own views and grows to 44px on a touch screen.

<!-- bump: minor; items: echo-side-nav, echo-tab-bar, echo-notification-center -->
- **App navigation: `SideNav`, `TabBar` and `NotificationCenter`.**
  - **`SideNav`**: an app's sidebar from data: named groups, icons, count badges and nested
    sections that fold. The current page carries a rail that travels to it; `collapsed` shrinks it
    to icons, each with its name as a tip. `renderLink` hands the links to your router.
  - **`TabBar`**: the bottom bar of a phone app, three to five destinations with icons, a count
    badge and a pip under the current one. `fixed` pins it to the bottom, clear of the home
    indicator.
  - **`NotificationCenter`**: a bell with an unread count that opens a list of notifications,
    unread ones marked, with "Mark all read" and an empty state.

<!-- bump: minor; items: echo-combobox, echo-tags-input, echo-fieldset, echo-checkbox-group, echo-form, echo-hold-button, echo-choice-cards -->
- **Choosing: `Combobox`, `TagsInput`, `ChoiceCards`, `CheckboxGroup`, `Fieldset`, `Form` and
  `HoldButton`.**
  - **`Combobox`**: a Select you can type into. `multiple` keeps choices as tags that bud out of
    the text line; `creatable` offers to add what you typed. Built on Base UI Combobox.
  - **`TagsInput`**: free-form tags in Field's well (Enter or a comma adds, Backspace takes the
    last back, a paste becomes several), with `normalize` to clean or refuse each one.
  - **`ChoiceCards`**: options that need more than a word, as cards; the chosen one lights a rail
    and drops its pip. One choice is a radio group, `multiple` a group of checkboxes.
  - **`CheckboxGroup`**: a named set of checkboxes with an optional parent that shows a dash when
    only some are on.
  - **`Fieldset`**: a named group of fields with a legend.
  - **`Form`**: fails well. Pass `errors` to it and to each field; after a failed submit a summary
    at the top takes focus, counts the problems and links each to its field.
  - **`HoldButton`**: confirm by holding; the cap fills while pressed and drains if let go. A
    press that can't hold (assistive tech) arms it and a second press confirms.

<!-- bump: minor; items: echo-toggle, echo-toolbar, echo-meter, echo-range-slider, echo-knob, echo-level-meter, echo-field -->
- **The rest of the inputs: `Toggle`, `Toolbar`, `Meter`, `RangeSlider`, and two instruments,
  `Knob` and `LevelMeter`.** Plus `start` and `end` on `Field`.
  - **`Toggle` / `ToggleGroup`**: the quiet toolbar key. On is the cap held down in its well, not a
    light; a group shares one well, with arrow keys between its keys, `multiple` or at most one.
  - **`Toolbar` / `ButtonGroup`**: caps sharing one long well. A Toolbar is one tab stop with the
    arrow keys, Home and End along it, and `sm` controls; Toggles and ToggleGroups inside join
    its order by themselves. A ButtonGroup is the look alone.
  - **`Field` `start` / `end`**: a search icon or a currency sign engraved into the well before the
    text; a unit or a small key (clear, show password) after it.
  - **`Meter`**: a measurement in a range (storage, battery), a tube of lit plastic that settles to
    its level with a small slosh; `marks` engrave a limit without a second colour.
  - **`RangeSlider`**: two of Slider's knobs on one rail for a span, named "…, minimum" and
    "…, maximum"; they never cross.
  - **`Knob`**: a rotary cap with a lit scale. Drag it, wheel it once focused, or use the slider
    keys; it clicks at each step and settles onto each detent on a spring.
  - **`LevelMeter`**: a live level as LED cells with real ballistics and a held peak. It draws
    without re-rendering, stops once it's still, and tells a screen reader its level at most once a
    second.

<!-- bump: minor; items: echo-card, echo-item, echo-layout, echo-collapsible, echo-scroll-area, echo-link -->
- **Six containers: `Card`, `Item`, `Stack` & `Grid`, `Collapsible`, `ScrollArea` and `Link`.**
  The pieces every screen is laid out with, so nobody spaces a card by hand. All six are closed:
  their slots and spacing are props, not a `className`.
  - **`Card`** is a Panel with an anatomy (media, a header with one action, a body, a footer whose
    controls are `sm`) and `size` for its padding. With `href` or `onClick` the whole card is one
    link or button, named by its title, with one focus ring; it lifts as you reach for it, sinks a
    pixel as you press and sends Panel's ripple out from your finger.
  - **`Item`** is the list row: media, title, description, trailing content, ruled by a hairline.
    `swipeActions` sit behind it: swipe it and they slide into view, and Tab reaches each one,
    sliding the row open the same way, so the gesture is never the only way in.
  - **`Stack` & `Grid`** (`echo-layout`) take gaps as steps on the space scale; a row wraps and a
    Grid's columns never get wider than the screen.
  - **`Collapsible`** is one disclosure on its own, in Accordion's ruled style; closed content
    stays findable with find-in-page, which opens it.
  - **`ScrollArea`** scrolls inside itself with a groove and a molded thumb, shades whichever
    edge has more to see, and is a named region the keyboard can scroll.
  - **`Link`** keeps the words in the text colour and draws the accent as the underline (accent
    text on the chassis is under AA); `external` says it opens a new tab; `render` takes your
    router's link.

<!-- bump: minor; items: echo-size, echo-field, echo-select, echo-number-field, echo-otp-field, echo-segmented, echo-avatar -->
- **One `size` on everything with a height.** `Field`, `Select`, `NumberField`, `OtpField` and `Segmented` take
  `size="sm" | "md" | "lg"` (32, 44 or 60px), matching `HardwareButton`, and all of them read a
  `SizeProvider` around them. `md` is exactly what they were. `Avatar` gains `xs` (inline with a
  line of text) and `xl` (a profile header).

<!-- bump: minor; items: echo-field, echo-select -->
- **A new error shakes the field; a Select unrolls from its cap.** When a `Field`'s `error`
  appears or changes, the field is shoved sideways and swings back through to rest on a spring,
  the way a latch that won't take the key bounces back. A `Select`'s list now grows out of the edge
  of the trigger it drops from, rather than scaling up from its own middle. Neither moves under
  reduced motion.

<!-- bump: minor; items: echo-pull-cord -->
- **`PullCord` pulls a real `Switch`.** Its cap used to be a switch of its own. Now an Echo
  `Switch` sits at the top as the fitting the cord hangs from, and it is the control: the state,
  the name (`label`), the focus ring, the keyboard, and a form value through the new `name` prop
  (with `id`, `disabled` and `required`). Pulling the cord past the detent flips that Switch;
  flipping the Switch any other way gives the cord a tug. The cap is now a handle for the hand,
  hidden from assistive tech, so a screen reader meets one switch instead of a switch that
  looked like a bead. It installs `echo-switch` with it. If a test of yours found the switch by
  its role and name, it still does; if it dragged the switch, drag `.echo-pull-cord__bead`.

<!-- bump: minor; items: echo-panel, echo-ripple -->
- **`<Panel pressable>`: any Panel can give like water.** Press the surface and a wave of dots
  runs out from where you pressed, bigger for a longer press; Enter or Space on a control on it
  sends one from that control. At rest it looks exactly like any Panel, it adds no role, and under
  reduced motion no wave runs. It's `Ripple`'s wave, which now lives in Panel as
  `useRippleSurface`; `Ripple` is that surface with its dots always out, and installs Panel with
  it. Two things change for `Ripple` itself: it only draws while something moves (a wave, a press,
  the pointer), where it used to redraw every frame for as long as it was on the page, and a press
  on a button on it no longer thuds on top of the button's own sound.

<!-- bump: minor; items: echo-toast -->
- **The Toaster piles its toasts and you can flick one away.** Toasts used to stand in a plain
  column. They now pile like `ThrowStack`'s cards, the newest in front and each one behind a step
  higher and a little smaller, and fan out into the column while the pointer is on them or focus
  is in them (F6), with their timers paused. Drag one sideways and it turns from where you hold it;
  let go past the swipe and it leaves at the speed you threw it, still turning, instead of
  snapping back to fade. Under reduced motion nothing turns and a flicked toast fades where it
  was let go. Every dismiss button is still reachable from the keyboard.

<!-- bump: minor; items: echo-roll, echo-lcd-chip, echo-stat-tile, echo-number-field, echo-split-flap -->
- **Digits that roll: `roll` on `LcdChip`, `StatTile` and `NumberField`, and the `useRoll` hook
  under them.** Pass `roll` and a new value steps each digit through the ones in between, all
  together, fast when it's far and slowest on the last step: 18 → 21 shows 29, 20, 21. A falling
  number rolls back, 99 → 100 turns the nines over and puts a 1 in front, and anything that isn't a
  digit (a comma, a colon) swaps at once. The digits in between are drawn but hidden from assistive
  technology, so the value is still read once, as it is; under reduced motion it doesn't roll.
  On `NumberField` it replaces the slide a step used to give the whole number, and typing never
  rolls. It's off by default, so nothing changes until you pass it. `SplitFlap` now turns on the
  same drum (`echo-roll`, which each of these installs with it); it looks and sounds the same.

<!-- bump: minor; items: none -->
- **The MCP server knows Echo's motion.** `get_component` lists the motion names a component
  moves on, and 13 of them were names `get_tokens` had never heard of: `morphFeels.cell`,
  `springs`, the `--echo-duration-*` steps, and three that were not tokens at all (Ripple's
  `waves`, SplitFlap's `flap`, AddToBag's `useBudOff`). `get_tokens` now lists motion's whole
  vocabulary (the motion tokens, the spring presets, the morph feels, and the CSS duration and ease
  steps), and a test fails if a record names anything else. Ripple and SplitFlap now list none,
  because they time themselves; AddToBag lists `springs`.

  Every entry carries its docs `group`, so `search_components("motion")` finds the sixteen motion
  components rather than Modal and Skeleton, whose descriptions happen to say "motion". Search also
  reads each entry's one-line summary. `useTactile`'s record now covers the physics its entry
  exports, with examples for `createSpring` and `useCapPhysics` and what to do with a spring
  under reduced motion. `llms.txt` lists the same vocabulary.

<!-- bump: minor; items: echo-save-button, echo-timer, echo-stopwatch, echo-voice-note, echo-add-to-bag, echo-bud-off, echo-morph -->
- **Six more that change shape as you use them, all on `Morph`.** `SaveButton` narrows into its
  own progress while your save runs, widens into a lit "Saved" and flows back. `Timer` opens into
  durations; the others run into the one you pick, which drains as the time runs and rings.
  `Stopwatch` buds a Lap button from Start, and every lap is a drop that lands in the lap count.
  `VoiceNote` records from the microphone: your voice swells the Stop button, and the take
  becomes a note that fills as it plays. `AddToBag` sends a drop from the button into the count
  beside it. `useBudOff` is that drop on its own, from any element into any other. `Morph` now
  keeps a button's identity across states when it has the same `data-morph` name, and draws
  filled caps as levels.

<!-- bump: minor; items: echo-pull-cord, echo-split-flap, echo-light-source, echo-magnetic, echo-throw-stack, echo-ripple -->
- **Six other kinds of physics.** `PullCord` is a switch you pull: the cord stretches, clicks at a
  detent and changes as you let go. `SplitFlap` is a readout that turns over flap by flap.
  `LightSource` makes your pointer the light the HardwareButtons inside it are lit by. `Magnetic`
  makes the buttons inside lean toward your hand before you touch them. `ThrowStack` is a stack of
  Panels you flick away with the speed you gave them. `Ripple` is a surface that sends a wave from
  where you press. All of them are built from Echo's own caps, panels and roles, have a keyboard
  path, and hold still under reduced motion.

<!-- bump: minor; items: echo-hardware-button -->
- **HardwareButton `fill`.** A cap can be a quantity: `fill` (0–1) pours the primary plastic into
  it from the start edge, under the label. The Timer and VoiceNote use it.

<!-- bump: minor; items: echo-morph, echo-done-button, echo-confirm-button, echo-action-fan -->
- **The Motion gallery's first four: your own buttons, flowing into the buttons you need next.**
  `Morph` is the base. Wrap your HardwareButtons in it and render whatever state you like with
  plain React: when the buttons inside change, the old ones flow into the new ones as one liquid
  body. One becoming several pinches at the waist and comes apart; several becoming one folds;
  the same number move and resize in place, so a label that changes width flows to its new size.
  At rest there is nothing but your buttons; the body is drawn only during the change, in the
  cap's own material, with the labels riding on it, and it fades off the real buttons when it
  lands. Built on it: `DoneButton` ("Mark as done" becomes a lit Done and an Undo),
  `ConfirmButton` (Delete becomes Cancel and a primary Delete, then "Deleted", which flows back)
  and `ActionFan` (Share becomes its choices and a × that folds them in). Focus moves to the
  first new button when the one it was on goes away, Escape calls `onEscape`, the new state is
  announced, and reduced motion swaps the buttons in place. They need `echo-ui-core` 0.2.0, which
  adds the morph engine (`MorphSurface`, `morphFeels`, `outline`, `apart`) to
  `echo-ui-core/tactile`. They're live at `/motion`.

<!-- bump: patch; items: none -->
- **The site asks not to be indexed until the packages resolve.** `robots.txt` served
  `Disallow: /`, and every page carries `noindex` — both tied to the same release flag as the
  "not released yet" banner, so they come off together the day the install works. Until then the
  install lines a search engine would pick up are lines that cannot run.

<!-- bump: patch; items: none -->
- **The installation page says what Echo costs.** Five real builds of the same Vite + React app
  with different amounts of Echo in it, each measured as every asset the production build emits,
  gzipped, against the same app with no Echo at all. A component's own code and CSS, with the
  theme and `echo-ui-core`, is **1.9 kB**; a button is 31.5 kB because it brings GSAP; a form is
  80.5 kB because it brings Base UI; all fifty items together are 194 kB. The page leads with the
  first figure, because the others are mostly two libraries it already names and quoting them
  without saying so would be true and useless.

<!-- bump: minor; items: none -->
- **`echo-ui diff` and `echo-ui update` — the upgrade path.** Echo copies components into your
  source tree, which means that from the moment you install one, your copy and Echo's diverge and
  every later fix is invisible to you. Until now the only way to take one was `add --overwrite`,
  which throws away whatever you changed without showing you what it is throwing away.

  `npx echo-ui-cli diff` reports every installed item as **up to date**, **behind**, **edited** or
  **edited and behind**; name an item and it prints the unified diff between your copy and the
  version the registry serves. `npx echo-ui-cli update` moves the items nobody edited and stops at
  the ones somebody did, naming them and the two commands that resolve them. An item moves whole
  or not at all, so you are never left with half a component at one version and half at another,
  and nothing you wrote is replaced without `--overwrite`.

  Edited and behind is counted per item, not per file: change `field.tsx` while a fix lands in
  `field.css` and the item is *edited and behind*, not merely *edited* — which is the case that
  would otherwise leave the fix sitting in the registry unread.

  `update` does not merge, deliberately. A merge that goes wrong leaves broken source in a file
  you were told you own, so `update` moves only what it can move cleanly and stops everywhere
  else. `diff` plus `--overwrite` gives you the same information and leaves the decision yours.

<!-- bump: minor; items: echo-otp-field -->
- **`echo-otp-field`** — the one-time code a sign-in asks for, as a row of lit digit windows. A
  pasted code fills the row, arrow keys and Backspace walk it, and `autocomplete="one-time-code"`
  lets a phone offer the code it just received.

<!-- bump: minor; items: echo-chat -->
- **`echo-chat`** — a template block: a chat screen wired through one `onSend` callback.

<!-- bump: minor; items: echo-radio-group -->
- **`RadioGroupProps`** is now exported from `echo-radio-group`, like every other component's props
  type.

<!-- bump: minor; items: none -->
- **The MCP server is publishable as `echo-ui-mcp`.** It bundles the agent layer instead of importing
  a private workspace package, runs compiled JavaScript instead of TypeScript through tsx, and reports
  its real version instead of `0.0.0`.

<!-- bump: minor; items: none -->
- **Usage, composition, accessibility and motion & sound in the agent layer.** `catalog.json`,
  `llms-full.txt` and the MCP server's `get_component` now carry these sections for every item
  whose docs have them. Sections follow the component page's order, so **Props now comes after
  Examples**. A catalog built before this change still renders; it just has no new sections.

<!-- bump: minor; items: echo-tabs -->
- **`echo-tabs` is fully documented** — usage, composition, accessibility, motion & sound and a
  one-line feel — the first item written to the new component page template.

<!-- bump: minor; items: none -->
- **Every item is documented to the component page template** — usage, composition, accessibility,
  motion & sound and a one-line feel, in the docs, `llms-full.txt` and the MCP server.

<!-- bump: minor; items: none -->
- **Setup an agent can follow on its own.** The MCP server's instructions and `llms.txt` now say
  what a fresh app needs beyond the install: inject `createEchoTheme().css` (components are
  colourless without it), add a `SoundProvider`, and mark pages that pass callbacks `"use client"`.
  The template usage snippets wrap the screen in `<main>`.

<!-- bump: minor; items: none -->
- **`echo-ui-mcp` is ready to install from npm** — `npx -y echo-ui-mcp` — with a README written for
  the people installing it.

<!-- bump: minor; items: none -->
- **Docs guides.** Installation, Components, CLI, Registry, Theming, Typeset, Motion & sound, MCP
  server, For AI agents and this Changelog each have a page, grouped in the sidebar by reader
  (developers, designers, AI-assisted builders). Token tables, tool lists and install lines on them
  are rendered from the registry, not copied.

<!-- bump: minor; items: none -->
- **Text styles.** Six named styles (`machine-label`, `body`, `body-sm`, `caption`, `heading`,
  `readout`) as `--echo-type-*` tokens, plus weight, line-height and letter-spacing scales. See
  [Typeset](/docs/typeset).

<!-- bump: minor; items: none -->
- **Layering, border, icon and breakpoint scales**: `--echo-z-*`, `--echo-border-*`,
  `--echo-icon-*`, and `BREAKPOINTS` for JavaScript. See [Theming](/docs/theming).

<!-- bump: minor; items: none -->
- **Right-to-left.** Every component mirrors under `dir="rtl"` with Base UI's `DirectionProvider`;
  the light stays at the top left. See [Installation](/docs/installation#right-to-left) and the
  [right-to-left gallery](/gallery/rtl).

<!-- bump: minor; items: echo-field, echo-textarea -->
- **Help text and errors on `Field` and `Textarea`**: `description` and `error` props, linked to
  the control with `aria-describedby`, with `aria-invalid` while there's an error. The error is
  words and a square pip, not a colour. Both now build on Base UI's `Field`, so re-adding them also
  installs `@base-ui/react`.

<!-- bump: breaking; items: echo-toast -->
- **`Toaster` and `useToast()`.** Mount `<Toaster>` once; `toast({ title, body, tone })` shows and
  announces a toast. The live region is there before anything is said, so it's heard. Built on
  Base UI's Toast: queue, timeout, a dismiss button, and `priority: "high"` for what can't wait.
  **Breaking:** `Toast` on its own is now a display slab without `role="status"`; to announce
  something, use `useToast()`.

<!-- bump: minor; items: echo-segmented -->
- **`Segmented` can switch off one segment**: pass `{ label, disabled: true }` in `options`.

<!-- bump: minor; items: none -->
- **The agent brief carries the accessibility rules.** The MCP server's instructions and
  `llms.txt` now say what a consumer can still get wrong: names on controls, `description` and
  `error` on fields, one `Toaster` for announcements, `autoComplete` on sign-in, and that state is
  never colour alone.

### Changed

<!-- bump: patch; items: echo-accordion, echo-alert-dialog, echo-app-shell, echo-badge, echo-banner, echo-breadcrumb, echo-card, echo-checkbox, echo-choice-cards, echo-collapsible, echo-combobox, echo-console, echo-count-badge, echo-creature, echo-date-tile, echo-description-list, echo-divider, echo-field, echo-fill-slider, echo-hardware-button, echo-item, echo-keypad, echo-level-meter, echo-link, echo-loader, echo-menu, echo-meter, echo-now-playing, echo-number-field, echo-otp-field, echo-pagination, echo-panel, echo-popover, echo-progress, echo-quick-tile, echo-scope, echo-scroll-area, echo-segment-display, echo-segmented, echo-select, echo-sheet, echo-shortcut-map, echo-side-nav, echo-slider, echo-split-flap, echo-status-island, echo-switch, echo-tabs, echo-textarea, echo-toast, echo-toggle, echo-toolbar, echo-tooltip, echo-tuner -->
- **Components whose shadow is a recipe read it by name.** 71 shadows in 54 items now say
  `var(--echo-shadow-<name>, <the same shadow>)`, so they look exactly as they did (every docs page
  was compared before and after) and follow a theme's recipes. Scope declares the recipes that read
  the accent again, so a Scope's own colour still reaches its focus rings and glows, and reflective
  screens do the same for theirs. Shadows that move with their part (a cap's drop as it's pressed)
  stay in the component.

<!-- bump: minor; items: none -->
- **Sound starts off until someone turns it on** (`echo-ui-core`). `SoundProvider` starts muted
  for anyone with no stored choice, so a first visit makes no sound nobody asked for; the choice
  they make is remembered as before, and always wins. Give people a switch (`useSound().setMuted`),
  or pass the new `defaultMuted={false}` where sound is the point from the first press. An app that
  relied on sound playing by default now stays silent until the person asks for it.

<!-- bump: patch; items: none -->
- **Echo's two sentences, where people meet it first** (`echo-ui-core`, `echo-ui-cli`,
  `echo-ui-mcp`). "Tactile components you can feel. The design system that keeps your AI on-brand."
  leads the README and the site's link preview, and opens each package's npm description. The
  README and the installation page also say, in one wording, what Echo already does: updates keep
  your edits, `init` doesn't touch your CSS, few dependencies, first-party code only, and
  accessibility tested against WCAG 2.2 AA and kept by `check`, with what isn't covered yet.

<!-- bump: patch; items: none -->
- **The catalog's groups say what you're building.** The `group` on each component, which the
  docs sidebar, `llms.txt` and the MCP server's `search_components` share, is now one of
  Foundations, Buttons, Forms, Overlays, Navigation, Layout, Data display, Feedback, Objects,
  Motion, Creature, Texture and Templates. Controls, Structure, Surfaces and Primitives are gone:
  their items moved to the group you'd look in, and the hardware only Echo has (Knob, Tuner,
  Keypad, Receipt and the rest) is together under Objects. Nothing you install changes.

<!-- bump: patch; items: none -->
- **`npm fund` leads somewhere.** `echo-ui-core`, `echo-ui-cli` and `echo-ui-mcp` name
  [echo-ui.com/support](https://echo-ui.com/support) as their funding page, where Echo takes one-time
  and monthly donations. Nothing about installing or using them changes.

<!-- bump: minor; items: none -->
- **Echo's default colour is purple.** `createEchoTheme()` with no accent, `npx echo-ui-cli init`
  without `--seed`, the seed schema's defaults and the site all start from `#8B6FE8`, on a
  purple-tinted chassis (`#232130`) and paper (`#EFEBFA`). The raspberry the device was first drawn
  in is one seed away: `{ accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" }`. The site's
  theme presets are the Nawwara seed (the purple), Raspberry, Coral and Sky; Teal and Amber are
  gone. Every comment in the components that called the accent "raspberry" or "pink" now calls it
  the accent.

<!-- bump: breaking; items: none -->
- **One way to install.** Items are served in Echo's own format under `/e/`, which `npx echo-ui-cli`
  and the MCP server read. The older per-item files under `/r/` are gone; `/r/catalog.json` stays
  where it was.

<!-- bump: patch; items: echo-tab-bar -->
- **`TabBar` is a dock.** It was a flat strip whose current place only changed its icon's colour.
  It is now a molded slab floating clear of the screen's edges, with a recessed track and one
  raised cap seated under where you are; every destination has an LED socket and only the current
  one is lit. Go somewhere else and the cap lifts, travels there on a spring and settles in. Same
  props; under reduced motion the cap moves straight there.

<!-- bump: patch; items: echo-accordion, echo-chat, echo-hardware-button, echo-radio-group -->
- **Comments only.** A few source comments used screens that are no longer in the library as their
  example; they now make the point without them. Nothing these components render or do changes.

<!-- bump: patch; items: echo-meter -->
- **A `Meter` asked for a percent reads its share of the range.** `format={{ style: "percent" }}`
  formatted the raw value, so 78 read "7,800%", on screen and to a screen reader. It now reads
  "78%", with your other format options kept.

<!-- bump: patch; items: echo-item -->
- **A control at the start of an `Item` can be pressed.** A done box in `media` sat under the
  row's link, so pressing it opened the row instead. It is now its own target, like a control in
  `trailing`; an avatar or icon there still opens the row.

<!-- bump: breaking; items: echo-hardware-button, echo-led-key -->
- **Breaking: HardwareButton's sizes are the control heights, so a button lines up with a field.**
  A button's outer height, well included, is now `sm` 32px, `md` 44px, `lg` 60px, the same as a
  `Field`, `Select`, `NumberField` or `OtpField` of that size. Before, the default button was 60px
  beside a 44px field, and no size of button lined up with any input, so a search bar, a filter
  row or an inline "invite" form never looked right.

  What to do: the old default look (60px) is now `size="lg"`. Give it to the one action a screen
  is built around (sign in, checkout, an empty state's call to action) and leave the rest at the
  new `md`. The old `lg` (68px) has no equivalent; it becomes 60px. `sm` goes from 48px to 32px,
  for toolbars and table rows. A press lands anywhere on the button, well included, so `md` is a
  44px target, and on a touch screen `sm` grows to 44px. `LedKey` joins the same scale, which
  takes its default from 40px to 44px.

  New with it: `fullWidth`, so a button can take its row without reaching into the button's CSS,
  and `SizeProvider` (`echo-size`), which sets the
  size for everything inside a toolbar, a filter bar or a card footer. A `size` passed to a control
  wins.

<!-- bump: patch; items: echo-morph -->
- **A morph's text no longer blinks out at the handover.** As one set of labels gave way to the
  next, the new ones started a moment late, so for a frame both were faint and the button read as
  blank. They now start together; the words cross-fade without a gap. Everything built on `Morph`
  (DoneButton, ConfirmButton, ActionFan, SaveButton, Timer, Stopwatch, VoiceNote) gets it.

<!-- bump: patch; items: echo-pull-cord -->
- **`PullCord` stops working when it isn't moving.** Its cord was simulated every frame for as long
  as it was on the page, hanging still or scrolled out of sight. It now sleeps once the cord comes
  to rest and wakes when it's pulled, tugged or resized: the same cord, without the battery cost.

<!-- bump: patch; items: echo-pagination -->
- **Pagination's current page no longer spills past its cap as it lights.** Landing on a page
  flashes the key light out from its middle; the flash grew to 1.4 times the cap, so for a quarter
  of a second the page was wider than its box. It now blooms to the cap's edge and fades there.

<!-- bump: patch; items: echo-field -->
- **`Field` is the same height as `Select` and `NumberField`.** Its input kept the browser's own
  1px padding above and below on top of its 44px, so a Field stood 46px tall beside a 44px Select
  and the two never lined up in a row. It is now exactly 44px; everything below a Field moves up
  2px.

<!-- bump: patch; items: echo-toast -->
- **A toast's title and body no longer sit apart.** In the toaster they are an `h2` and a `p`, and
  the browser's own margins opened a 21px gap between them that `<Toast>` on its own doesn't
  have. They now sit together, and the toast is as compact as the slab.

<!-- bump: patch; items: echo-pull-cord -->
- **`echo-pull-cord` no longer pushes a narrow screen sideways before it loads.** The cord's
  drawing was rendered at the width the cord would like to swing in (348px at the default length)
  and only narrowed to its container once the script ran, so on a phone the page scrolled sideways
  until then, and for good without JavaScript. The drawing now takes the cord's own box from the
  start. Nothing changes once it has loaded.

<!-- bump: patch; items: none -->
- **`echo-ui-core` 0.2.0 is on npm.** Components installed since the motion engine landed imported
  names 0.1.0 doesn't have (`useCapPhysics`, `usePressable`, `useWellMotion`, `createSpring` and
  more), so a fresh install failed to build. 0.2.0 exports every name the components use, and it
  adds the morph engine the motion items (`DoneButton`, `ConfirmButton`, `ActionFan` and the rest)
  are built on. If an install failed for you, `npm install echo-ui-core@^0.2.0` fixes it.

<!-- bump: patch; items: all -->
- **Comments only, no behaviour change.** Comments in the component source used to cite
  documents, milestones and ticket numbers from Echo's own planning, none of which exist in your
  project. The citations are gone and the sentences
  around them stay. Where a comment was only a citation, it now says what it meant. Three
  development warnings (`HardwareButton`'s `engraved`/`caption` checks and `StatusDot`'s
  missing-label check) also dropped the ticket code at the end of the message. `echo-ui diff`
  will show changes in most items; none of them are to code.

<!-- bump: patch; items: all -->
- **An item's version is now a function of declared data, not of how the changelog is
  formatted.** The version an item ships under is published once and never rewritten, and it used
  to be inferred from prose: a regex for a bolded "Breaking" run across the whole unreleased
  section, and attribution by "does a bullet mention this name in backticks". One breaking entry
  therefore moved every item that changed that cycle, and an entry explaining that *"`Menu` and
  `Sheet` are unchanged here"* filed itself as a change to Menu and Sheet — which it really had.

  Every entry now carries a `<!-- bump: …; items: … -->` line that markdown hides and the build
  reads, and the build refuses a changelog with an entry that declares neither or that names an
  item which does not exist. The bump is `patch`, `minor` or `breaking`; turning that into a
  number is still code, because it depends on Echo being 0.x.

  What you can see in `/e/`: each item's `changes` list is now the entries that DECLARE it, so
  several items gained entries that always applied to them and a few lost entries that never did.
  The `breaking` flag comes from the declaration. No item's files changed, so no item's version
  moved.

<!-- bump: breaking; items: echo-toast, echo-count-badge, echo-banner -->
- **Breaking: `tone` means one thing now.** It meant three. `echo-banner` used it for semantic
  status (`info`/`active`/`warn`/`danger`), `echo-toast` for activity state
  (`"default" | "active"`), and `echo-count-badge` for a colour choice (`"accent" | "neutral"`).
  Learning `tone` on one component taught you nothing about the next, and Toast's `"active"` and
  Banner's `"active"` were not the same idea.

  There is now one vocabulary, `EchoTone` in `echo-ui-core/types`: `info` (the neutral default),
  `active` (happening now), `warn` (needs attention), `danger` (something is wrong). `tone` is what
  a thing *means*; `variant` is what it is made of — the split Echo already used for
  `PanelVariant`, `SkeletonVariant` and `HardwareButtonVariant`.

  Changed: `echo-toast`, `echo-count-badge`, `echo-banner`.

  **What breaks.** On `echo-toast`, `tone="default"` is now `tone="info"` — rename it; it is the
  same slab. On `echo-count-badge`, the `tone` prop is now `variant` and the exported
  `CountBadgeTone` type is now `CountBadgeVariant` — it was never a status, and `variant` is what
  a colour choice is called everywhere else in Echo. `echo-banner` is unchanged for callers: its
  four values were already the right ones, and `BannerTone` stays as an alias of `EchoTone`.

  A component may implement a *subset* of the vocabulary, the way `size` is `"sm" | "md" | "lg"`
  on some components and `"sm" | "md"` on others. Toast takes `info` and `active` only: its slab
  renders one LED, and accepting `danger` while rendering it identically to `info` would be a
  worse lie than not accepting it. Widening it is a design change, not a rename.

<!-- bump: breaking; items: echo-hardware-button, echo-select, echo-switch, echo-checkbox, echo-slider, echo-segmented, echo-field, echo-textarea, echo-led-key, echo-radio-group, echo-otp-field, echo-number-field, echo-chat -->
- **Breaking: every control takes a `ref`, an `onBlur` and an `onFocus` — and the two that were
  wide open are now closed.** Four of 49 components could receive a ref, and `onBlur` appeared in
  zero public prop types, so `react-hook-form`'s uncontrolled `register()` — which needs exactly
  `ref`, `onBlur` and `name` — could not work with any Echo control.

  All twelve controls now accept the declared interop set from `PRINCIPLES.md`: `ref`, `id`,
  `name`, `disabled`, `required`, `readOnly`, `autoFocus`, `onBlur`, `onFocus`, `onKeyDown`,
  `aria-*` and `data-*`. Text inputs also take `placeholder`, `autoComplete`, `inputMode`,
  `maxLength`, `minLength` and `pattern`; buttons also take `onClick`, `type`, `form`, `value`,
  `title`, `onPointerDown` and `onPointerUp`. The set lives in `echo-ui-core/types` as
  `EchoInterop`, `EchoTextInterop` and `EchoPressInterop`, so it cannot drift between components.

  Added to: `echo-field`, `echo-textarea`, `echo-select`, `echo-checkbox`, `echo-switch`,
  `echo-radio-group`, `echo-slider`, `echo-segmented`, `echo-number-field`, `echo-otp-field`,
  `echo-hardware-button`, `echo-led-key`.

  **What breaks.** `echo-textarea`, `echo-hardware-button`, `echo-led-key` and `echo-radio-group`
  used to extend their DOM element's attributes wholesale and accept `className`. They no longer
  do — that is the closed-API policy in `PRINCIPLES.md`, and those four were the exception, not
  the model. **If you passed `className` to one of them**, style it from the parent through the
  component's own class instead (`.your-row .echo-textarea { … }`); Echo's own `echo-chat`
  template was changed the same way. If you passed some other DOM attribute, check the interop
  list above — if it is genuinely plumbing and missing, that is a bug worth reporting.

  `ref` is implemented with `forwardRef` rather than as a plain prop, deliberately: on React 18 a
  function component never receives `ref` through props, so the plain-prop version would have
  type-checked, worked on React 19, and populated nothing for React 18 users. Echo supports both.

<!-- bump: breaking; items: echo-switch, echo-checkbox, echo-slider, echo-number-field, echo-radio-group, echo-alert-dialog, echo-command, echo-modal, echo-popover, echo-select, echo-tooltip -->
- **Breaking: Echo's public API names Echo's own types, not Base UI's.** Eleven items put a
  `@base-ui/react` type straight into a signature you write against — `BaseSwitch.Root.ChangeEventDetails`
  on a change handler, `ComponentProps<typeof BaseSelect.Portal>["container"]` on a portal target.
  That made Echo's API a downstream of Base UI's internals: an upstream rename would have been a
  breaking Echo release triggered by somebody else's refactor.

  `echo-ui-core/types` now holds the Echo-named equivalents — `EchoChangeEvent`,
  `EchoSliderChangeEvent`, `EchoNumberFieldChangeEvent`, `EchoDismissEvent` and
  `EchoPortalContainer`. They are structural subsets of what Base UI passes, so the same object
  still arrives at runtime and nothing is wrapped or copied; only the name you write down changes.
  Base UI remains the implementation.

  Changed: `echo-switch`, `echo-checkbox`, `echo-slider`, `echo-number-field`, `echo-radio-group`,
  `echo-alert-dialog`, `echo-command`, `echo-modal`, `echo-popover`, `echo-select`, `echo-tooltip`.

  **If you annotated a handler's second argument with the Base UI type**, change it to the Echo
  one; if you let it infer, nothing to do. `Menu` and `Sheet` still pass Base UI props through and
  are unchanged here — that is a separate piece of work.

<!-- bump: patch; items: all -->
- **The agent brief says Echo has not shipped.** `llms.txt` and the MCP server's instructions led
  with `npx echo-ui-cli init`, and that name on npm is a reserved stub with no executable — so a
  model following the brief wrote an install step that fails with npx's own error. The brief now
  opens with the caveat, and the docs carry it on every surface that shows a command. One switch
  (`CLI_RELEASED`) silences all of them at launch, and a test refuses to let one move without the
  others. Affects `all components` only in what the brief says about installing them; no item's
  props, CSS or rendered semantics change.

<!-- bump: minor; items: none -->
- **Echo is released.** `echo-ui-core`, `echo-ui-cli` and `echo-ui-mcp` are on npm at `0.1.0`, and
  the commands the docs have always shown now do what they say:

  ```sh
  npx echo-ui-cli init
  npx echo-ui-cli add hardware-button
  ```

  Until today those lines carried a notice saying they could not work — `echo-ui-cli` was a
  reserved name with no executable, and the published `echo-ui-core` was older than every registry
  item required. Both are fixed, the notice is gone, and the registry at `https://echo-ui.com/e`
  is live and serving all 50 items.

<!-- bump: patch; items: all -->
- **Echo's home is `echo-ui.com`.** The registry, the docs and the packages all move to it from
  `echo.nawwara.studio`. Nothing was published under the old host, so no `echo.json` anywhere
  points at it and there is nothing to migrate — this is the last release where that is true.

  What it changes for you: `npx echo-ui-cli init` writes
  `"registry": "https://echo-ui.com/e"`, and every install line, the MCP server's catalog and the
  `llms.txt` files name the new host.

<!-- bump: breaking; items: echo-hardware-button, echo-select, echo-switch, echo-checkbox, echo-slider, echo-segmented, echo-field, echo-textarea, echo-progress, echo-radio-group -->
- **Controls must have an accessible name, or they don't compile.** `Switch`, `Checkbox`, `Slider`,
  `Segmented`, `Select`, `RadioGroup` and `Progress` need `aria-label` or `aria-labelledby`; `Field`
  and `Textarea` need `label`, `aria-label` or `aria-labelledby`; an `iconOnly` `HardwareButton`
  needs `aria-label` or `aria-labelledby`. **Breaking** for code that left them out: add the name.
  A control inside a `<label>` points `aria-labelledby` at the label's text.

<!-- bump: patch; items: none -->
- **Tag and Banner name their buttons after their content**: "Remove Loop", "Dismiss Offline mode",
  instead of a row of identical "Remove" or "Dismiss" buttons. `removeLabel` and `dismissLabel`
  still override.

<!-- bump: patch; items: none -->
- **One scale per dimension.** Radius, type, spacing, duration and control height each come from a
  single theme scale, and component CSS may no longer hardcode any of them. Re-adding an item picks
  up the new values; a local edit that hardcoded one of these will be overwritten.

<!-- bump: patch; items: none -->
- **Templates reworked**: every template is usable at 390px.

<!-- bump: patch; items: none -->
- **One description per item, everywhere.** `get_component`, `llms-full.txt` and `catalog.json` now
  use the same description as the item's docs page; they used to use a shorter copy that had
  drifted from it in 49 of 54 items. The short form rides along as `summary`, which `llms.txt`
  and `search_components` list.

<!-- bump: patch; items: echo-select, echo-tabs, echo-segmented, echo-field, echo-badge -->
- **Descriptions that described an older look.** `Tabs` (a lit rail, not a lit cap), `Select` (CSS
  fades, not a GSAP exit), and `Badge`, `Segmented`, `Select` and `Field`, which named the default
  seed's raspberry instead of the accent.

<!-- bump: patch; items: echo-status-dot, echo-banner -->
- **Status is carried by shape, not only colour.** `StatusDot` states and `Banner` tones differ by
  luminance and form on every shipped seed and under colour-vision deficiencies.

<!-- bump: patch; items: all -->
- **Weights, line heights, letter-spacing, z-index, border widths and icon sizes come from the
  theme scales** in `all components`, with the old value as a fallback, so components keep working with
  `echo-ui-core@0.0.1`. Strays moved to the nearest step: most by under a pixel;
  HardwareButton icons are 14/16/20px (were 15/17/19).

<!-- bump: patch; items: none -->
- **HardwareButton's hover glint** is a background sweep inside the cap instead of an element
  outside it. It looks the same.

### Fixed

<!-- bump: patch; items: echo-segmented -->
- **Segmented's unchosen options read** (Segmented). Their labels were the text at half strength
  over the well, 5.8:1 by WCAG 2 and APCA Lc 36 on Echo's own device, a colour the theme never
  checked. They're the theme's dim text now, held to AA on the well.

<!-- bump: patch; items: none -->
- **Small lit text reads, and a button on a Panel has an edge, on a dark device** (`echo-ui-core`).
  Lit text (`--echo-accent-ink`) was the glow itself, and passed WCAG 2 at 5:1 while reading at
  APCA Lc 30 to 43 on every seed; on a deep cobalt a "Checked in" badge hurt to read. It's now the
  glow lifted, same hue, until a small label reads at Lc 60 on every dark ground; LEDs, rails and
  halos keep the glow. On a near-black body a cap stood off the body at 1.19:1 and its
  rim off the cap at 1.34:1, so a button on a Panel had no edge; a darker body now steps its caps
  further until they clear what every body Echo was tuned on clears, and those bodies keep their
  values exactly. Dim text reads at Lc 48 to 56 on a dark device and is reported, not
  moved.

<!-- bump: patch; items: none -->
- **`which` names the part for more of the ways people say a job** (`echo-ui-cli`, the MCP
  server's `search_components`). "A row of choices where one is chosen", "a status word", "group
  related content", "a departure time that flips" and "a person's initials in a round chip" used to
  answer "Nothing in Echo does this yet", or Tag, and an agent told that draws its own lookalike. They
  name Segmented, Badge, Panel, SplitFlap and Avatar now, and "a photo frame" says to put the image
  in a Panel.

<!-- bump: patch; items: echo-accordion, echo-alert-dialog, echo-annunciator, echo-avatar, echo-badge, echo-banner, echo-breadcrumb, echo-calendar, echo-chart, echo-chat, echo-checkbox, echo-collapsible, echo-combobox, echo-command, echo-console, echo-date-field, echo-description-list, echo-engraved-plate, echo-field, echo-file-upload, echo-hardware-button, echo-item, echo-knob, echo-lcd-chip, echo-led-key, echo-level-meter, echo-menu, echo-meter, echo-modal, echo-notification-center, echo-number-field, echo-otp-field, echo-progress, echo-pull-to-refresh, echo-quick-tile, echo-radio-group, echo-receipt, echo-scope, echo-scroll-area, echo-segment-display, echo-segmented, echo-select, echo-sheet, echo-side-nav, echo-skeleton, echo-slider, echo-stat-tile, echo-status-dot, echo-status-island, echo-steps, echo-switch, echo-tab-bar, echo-table, echo-tabs, echo-textarea, echo-ticket, echo-toast, echo-tuner, echo-week-strip -->
- **A light device's recesses keep the body's hue in Chromium** (`echo-ui-core`). Chromium
  drops the hue of a colour under 0.02 chroma when it mixes in oklch, and draws the mix at hue 0,
  a rose. A light device's plastic is that grey, so on a lilac body every field, track and rail
  was pink. A mix made only of greys is made in oklab now, which has no hue to lose; a mix with an
  accent in it stays in oklch. On a dark device nothing you can see changes.

<!-- bump: patch; items: none -->
- **The page's ground gives it Echo's type too** (`echo-ui-cli`, `echo-ui-core`). `init`,
  the setup line in the agent files and the page check's advice gave `body` a background and a
  text colour but no typeface, where the installation guide gives all three. Pasted as printed,
  the page's own words fell back to the browser's serif, and a style's type never reached them.
  All of them now give `font-family: var(--echo-font-sans)` with the ground.

<!-- bump: patch; items: none -->
- **`init` prints a theme import that works** (`echo-ui-cli`). It said to paste
  `import "./echo-theme.css"`, which resolves only from inside the Echo folder, so in the root
  layout it was "Module not found". It now names the file (`app/layout.tsx`, `src/app/layout.tsx`,
  or Vite's `src/main.tsx`) and gives the import that resolves from it: through the project's
  alias when it has one (`@/components/echo/echo-theme.css`), relative to that file when it doesn't.

<!-- bump: patch; items: none -->
- **The page check stops asking for AA on a disabled field's label** (`echo-ui-core`). A
  disabled control's label and help text sit beside it, not in it, so `<EchoCheck />` and
  `check --url` measured them as live text and said to fix them. WCAG exempts text that is part of
  an inactive control, and what names or describes a disabled control now counts as part of it.

<!-- bump: patch; items: echo-hardware-button -->
- **A primary cap's label is readable under a Scope's soft molding**. The pillow of light
  across the top reached behind the tops of the label's letters and took them to 4.2:1. On the
  primary cap it's as bright and fades out sooner, so the label keeps the 4.5:1 the lit plastic has.

<!-- bump: patch; items: echo-week-strip -->
- **WeekStrip's weekday letters are readable**. Faded on top of the unchosen segment's
  dimmer text, the letters measured 3.6:1 on the screen behind them, and the chosen day's 3.9:1, under
  the 4.5:1 that text their size needs. They're quieter than the date by size alone now.

<!-- bump: patch; items: echo-quick-tile -->
- **A lit QuickTile's status line is readable**. Faded to 80% on the lit plastic it
  measured 4.4:1. On a lit tile it's at full strength now; an unlit tile's is unchanged.

<!-- bump: patch; items: none -->
- **`echo.json`'s `$schema` pointed at nothing**. `init` writes
  `"$schema": "<registry>/schema/config.json"`, and no build published it, so an editor couldn't
  check the file. The registry now publishes it: each field, the values `framework` and
  `packageManager` take, and which fields every project has.

<!-- bump: patch; items: echo-accordion, echo-app-shell, echo-banner, echo-breadcrumb, echo-card, echo-choice-cards, echo-collapsible, echo-console, echo-hardware-button, echo-item, echo-link, echo-modal, echo-perch, echo-radio-group, echo-scroll-area, echo-segmented, echo-sheet, echo-side-nav, echo-tab-bar, echo-table, echo-tabs, echo-tag, echo-toast -->
- **On a phone, a tapped part no longer stays lit**. A phone leaves what you tapped under
  `:hover` until the next tap, so a table row stayed shaded and a trigger stayed lit after the finger
  lifted. Hover styles now apply only where there's a pointer that can hover
  (`@media (hover: hover)`), in all 23 components that had one. Checked, active and focus styles
  that shared a rule with them still apply everywhere.

<!-- bump: patch; items: none -->
- **Every command the CLI prints is one you can run** (`echo-ui-cli`). `diff`, `update`
  and a lookup of an item that isn't installed told you to type `echo-ui update`, `echo-ui diff
  <name>` and `echo-ui list`. `echo-ui` is on no shell's PATH unless the CLI is installed
  globally, so each of those was "command not found". They now say `npx echo-ui-cli <command>`,
  like every install line.

<!-- bump: patch; items: none -->
- **RadioGroup's and HardwareButton's docs list the name their types require**. A
  RadioGroup without `aria-label` or `aria-labelledby`, and an `iconOnly` HardwareButton without
  one, are type errors, but neither name was in the prop table, `llms-full.txt` or the MCP's
  `get_component`, so an agent reading the docs was never told the control needs a name. Both now
  document `aria-label` and `aria-labelledby`. Only the docs changed; no installed file did.

<!-- bump: patch; items: none -->
- **AlertDialog's destructive confirm reads on every accent** (`echo-ui-core`). Its label
  is the accent ramp's palest stop on its two deepest, and on green accents it read 4.38:1: about
  one accent in ten, whatever the chassis and paper. The theme now lifts `--echo-accent-1` just
  far enough for that label to clear AA; an accent that already did keeps its ramp exactly.

<!-- bump: patch; items: none -->
- **`ensureContrast` and `ensureBackgroundContrast` head for the side that can pass** (`echo-ui-core`).
  Both chose between lightening and darkening at luminance 0.5, but black and
  white give a colour the same contrast at about 0.18. A mid grey ground was pushed toward white and
  stopped at 3.48:1 when black would have reached 5.9:1. In a theme with a mid-tone paper, the
  primary cap was lightened into its own label and read 1.00:1.

<!-- bump: patch; items: none -->
- **A seed with a darker paper no longer puts unreadable labels on the caps** (`echo-ui-core`).
  `createEchoTheme` fitted the primary cap to the paper as you typed it and only
  then corrected the text against the chassis, so a dark paper on a dark chassis got a cap fitted for
  dark text under a label that had been turned light: the primary button, the accent Badge and the
  selected Segmented option read 1.00:1, with no warning. The text is now corrected first, against
  the neutral caps as well as the chassis, and the caps are fitted to the text the theme emits. The
  four shipped seeds produce exactly the same theme as before.

<!-- bump: patch; items: echo-hardware-button, echo-badge, echo-tag, echo-lcd-chip, echo-stat-tile, echo-shortcut-map -->
- **A component held to its container's width stays inside it, padding and all**.
  `HardwareButton`, `Badge`, `Tag`, `LcdChip`, `StatTile` and `ShortcutMap`'s board are capped at
  their container so a long label truncates or wraps, but the cap left out their own padding: a
  `HardwareButton` with `href` could reach 36px past a narrow column. The cap now counts the
  padding. A `<button>` cap looked right already; a link cap now matches it.

<!-- bump: patch; items: echo-keypad -->
- **A key typed on the keyboard stays down while it's held**. A Keypad key typed on a
  real keyboard went down on screen for 90ms, however long the finger stayed on it. It now comes
  up when that key is let go, or when focus leaves the pad, and a quick tap still shows.

<!-- bump: patch; items: echo-hardware-button -->
- **A small `HardwareButton` with a short label is a 44px target on a touch screen**.
  It grew to 44px tall but stayed as wide as its label, so "$5" or "OK" was 40px wide. It's now
  at least 44px wide on a coarse pointer too.

<!-- bump: patch; items: echo-receipt -->
- **A `Receipt` always comes out whole**. When its effects ran a second time while it
  was printing (every effect does in development under StrictMode, and `<Activity>` does it when a
  hidden part is shown), the print stopped with the paper still in the slot, so a Receipt in a dev
  build arrived blank. A print that's interrupted now ends with the paper resting whole.

<!-- bump: patch; items: echo-app-shell -->
- **An `AppShell` inside a `bare` one keeps its own sidebar**. The bare shell's rule
  that hides its sidebar reached every shell inside it, so an `embedded` screen framed on a bare
  page (a template in a landing page, say) lost its sidebar and its content fell into the
  sidebar's narrow column. The rule now applies to the bare shell's own sidebar only.

<!-- bump: patch; items: echo-hardware-button -->
- **`HardwareButton` no longer cuts off what's in its icon slot**. The label's
  truncation rule also clipped the icon, so a digit or letter used as a key's icon lost its bottom
  edge, and so did any icon drawn to the edge of its box. The icon slot now centres what's in it
  and clips nothing; the label still truncates.

<!-- bump: patch; items: none -->
- **The MCP server's `search_components` understands a query in several words**. "radio
  tuning scale" found nothing, because the whole query had to appear as one phrase; it now finds
  Tuner. A phrase match still ranks first.

<!-- bump: patch; items: echo-lcd-chip -->
- **`LcdChip` renders a `span`**, so it's valid inside a button, a label or a line of text. Inside
  `StatusIsland`'s pill it was a `div` in a `button`, and its own name hid the reading from the
  pill's. Its look and its props are unchanged; event handlers now receive an
  `HTMLSpanElement`.

<!-- bump: patch; items: echo-stopwatch -->
- **`Stopwatch`: Pause takes on every press in Safari**. The running time is the cap's
  label and was rewritten every frame by replacing its text, so a press that began on the old text
  and ended on the new one was sometimes dropped. The time now changes in place.

<!-- bump: patch; items: echo-stopwatch, echo-bud-off -->
- **`Stopwatch`: a lap still in flight when you Reset no longer comes back**. Its drop
  landed after the reset and put the old count back, so the next first lap briefly read "2 laps".
  To do it, `budOff(…)` from `useBudOff` now returns a function that calls the drop off before it
  lands; ignoring it changes nothing.

<!-- bump: patch; items: echo-hardware-button -->
- **`HardwareButton` stays a cap when something passes it a class or a style**. Menu's
  own example, `<Menu.Trigger render={<HardwareButton>…</HardwareButton>} />`, rendered a bare
  button: Base UI hands the trigger's class to the element it renders, and it replaced the cap's.
  A `style` replaced the `fill` the same way. Both are now added to the cap's own.

<!-- bump: patch; items: echo-pull-cord -->
- **`PullCord`: holding Space is one tug**. Each auto-repeat of a held Space or Enter
  tugged the cord again, so the switch flipped on and off for as long as the key was down.

<!-- bump: patch; items: echo-ripple -->
- **`Ripple` under reduced motion shows its dots**. The still surface was drawn once and
  then cleared by the canvas being sized, so it was blank from the start and after any resize.

<!-- bump: patch; items: echo-throw-stack -->
- **`ThrowStack` under reduced motion puts a thrown card back straight**. A card thrown
  by dragging went to the back still shifted and tilted by the drag.

<!-- bump: patch; items: echo-voice-note -->
- **`VoiceNote` never leaves the microphone open**. Two presses on the microphone
  before the browser granted it opened two streams and closed only one, so the recording light
  stayed on; leaving the page while it was still asking did the same. The second press is now
  ignored, and a stream granted after the component let go is closed straight away.

<!-- bump: patch; items: none -->
- **The MCP server sees a new release without a restart**. The registry index was meant
  to be read again every five minutes, but the client under it kept every document it had read,
  the index included, and each component's record was kept for as long as the server ran. A
  server started before a release kept describing the old one (its versions, its
  `echo-ui-core` ranges, its dependencies) while `npx echo-ui-cli add` installed the new one.
  The index now really expires, and a component's record is read at the version the index names.

<!-- bump: patch; items: none -->
- **The MCP server says so when the registry serves a file that fails its hash**.
  `get_component` and `get_accessibility` dropped the "Ships as" section, the same as when the
  registry could not be reached, so a tampered registry looked like one that was down. They now
  answer with an error naming the file.

<!-- bump: patch; items: echo-checkbox -->
- **`Checkbox` keeps your `onBlur` and `onKeyDown` and its own**. The caller's handlers
  replaced the cap's instead of running before them. With react-hook-form's `register()`, holding
  Space and tabbing away left the cap sunk, and a caller's `onKeyDown` stopped Space from pressing
  the cap at all. Select, RadioGroup and HardwareButton already merged them.

<!-- bump: patch; items: echo-app-shell -->
- **Focus is scrolled clear of the rail, not under it** (WCAG 2.4.11 Focus Not Obscured).
  Tabbing backwards up a long page scrolled the newly focused element to the top of the
  scrollport, which is behind a rail that is `position: sticky; top: 0` — so on a long docs page
  the thing you had just tabbed to was invisible. `echo-app-shell` now sets
  `scroll-margin-block-start` on `.echo-shell__content` and its focusables, derived from
  `--echo-shell-rail-h`, so a consumer who retunes the rail's height moves the offset with it.

  Found by running the suite on a second engine for the first time, and it took that second engine
  to see: Chromium's backward-tab scroll happened to land clear of the rail, which was alignment
  luck rather than a contract — the same page fails on Chromium once reproduced in isolation.

<!-- bump: patch; items: none -->
- **`/e/` served files that a fresh clone would not have**. The registry build wrote over
  its output directory and never removed anything, so an item that had been renamed or deleted
  kept resolving — but only from the machine that built it. Since the deploy runs from a working
  copy, that machine's leftovers were what the world got, and the URL would have 404'd the first
  time anyone built from a clean checkout. The build now clears `/e/` first, which is safe because
  everything it serves is either regenerated from the sources or copied from the released archive.

<!-- bump: patch; items: none -->
- **The Playwright fixture routes are no longer published.** `/checks/*` and `/stress` exist so
  specs have something to drive; they were prerendered into the deployed site along with the docs
  and the registry. The static export drops them, and refuses to produce a deployable directory
  whose `/e/index.json` is missing or unusable. `/gallery`, `/audition` and `/tactile` stay —
  they are linked from the nav and the guides, so they are documentation, not scaffolding.

<!-- bump: patch; items: echo-modal, echo-hardware-button, echo-popover, echo-tooltip, echo-slider, echo-number-field -->
- **Props the docs did not list.** `HardwareButton` (`icon`, `trailingIcon`, `target`, `rel`),
  `Modal` (`trigger`, `title`, `description`, `footer`), `Popover` (`trigger`, `title`), `Tooltip`
  (`trigger`), `Slider` (`value`, `onValueChange`, `aria-label`, `aria-labelledby`), `NumberField`
  (`onValueChange`), `SoundProvider` (`backend`) and `Textured` (`dither`, `noise`) now appear in the
  prop tables, `llms-full.txt` and the MCP server.

<!-- bump: patch; items: echo-field -->
- **Sign-in fields had no `autocomplete`** (WCAG 1.3.5). `Field` takes an `autoComplete` prop
  (`email`, `current-password`, `one-time-code`), so autofill and password managers fill a sign-in.

<!-- bump: patch; items: echo-checkbox -->
- **An indeterminate `Checkbox` looked checked.** It drew the same checkmark as a checked box, so
  "some selected" and "all selected" differed only in `aria-checked`. It now draws a dash.

<!-- bump: patch; items: echo-command, echo-app-shell -->
- **Examples that did not compile.** The motion example passed strings to `useTactile` instead of
  `{ motion }` phases; the `useGsapPresence` example omitted the `actionsRef` cast Base UI needs; the
  `Command` keywords example and the `AppShell` metrics example were not valid code.

<!-- bump: patch; items: echo-modal, echo-menu, echo-sheet, echo-popover, echo-tooltip, echo-select -->
- **Popups opened inside a dialog appeared behind it.** A `Select`, `Popover`, `Tooltip` or `Menu`
  inside a `Modal` or `Sheet` opened under the dialog's backdrop. They now stack above it.

<!-- bump: patch; items: echo-modal, echo-alert-dialog, echo-popover, echo-tooltip -->
- **A trigger element from a server component was wrapped in a second button** on a Next.js dev
  server, for `Modal`, `AlertDialog`, `Popover` and `Tooltip`. It now becomes the trigger itself.

<!-- bump: patch; items: echo-segmented -->
- **`Segmented` in right-to-left, and with an out-of-range `value`.** Arrow keys were hard-coded
  left-to-right, and a `value` that matched no segment left no tab stop, so the control couldn't be
  reached by keyboard. It now builds on Base UI's RadioGroup, so re-adding it also installs
  `@base-ui/react`.

<!-- bump: patch; items: none -->
- **Field, Textarea and NumberField's focus ring was too faint** (2.6:1, under WCAG's 3:1 for a
  focus indicator). It's a 2px inner edge in the full accent glow now.

<!-- bump: patch; items: all -->
- **Content now reflows into a 320px screen (400% zoom) and survives a doubled browser text
  size** (WCAG 1.4.10, 1.4.4), across `all components`. `Select`'s 180px floor, `NumberField`'s readout, `Segmented` and
  `Steps` as flex items, `EmptyState`'s grid columns, and `Avatar`'s fixed-pixel disc
  all gave way; `Panel` counts its padding inside a width you set (`box-sizing: border-box`), so a
  `<Panel style={{ width: 220 }}>` is now 220px wide overall rather than 260px.

<!-- bump: patch; items: echo-segmented -->
- **`echo-segmented` lost a segment when two shared a label.** Segments were keyed by their label,
  so a control with a repeated label — `["Draft", "Sent", "Draft"]` — had two React children with
  the same key: changing the options left a stale segment in the DOM, and Home and End read its
  index. They are keyed by position now, which is what a segment's `value` already is.

<!-- bump: patch; items: none -->
- **`echo-ui init`, run a second time, emptied `echo-lock.json`.** Changing the theme's seed is
  documented as running `init` again, and that threw away the record of which files Echo wrote — so
  the next `add` read every installed file as one you had edited and refused to write anything.

<!-- bump: patch; items: none -->
- **A dependency range the CLI could not read stopped `add`.** A project declaring
  `"echo-ui-core": "^1"` (or `workspace:*`, or `latest`) either failed every `add` with
  `Not a version: 1`, or skipped the core-version check silently and wrote the empty string into
  `echo-lock.json` as the installed core version.

<!-- bump: patch; items: none -->
- **On Windows, an item whose dependencies carry a comparator range failed to install.** The
  install ran through cmd.exe with the command line unquoted, so the `<` in `>=1.6.0 <2.0.0` was a
  redirect. The line is quoted now, and a spec that is not a package name and a range is refused
  before it is built.

<!-- bump: patch; items: none -->
- **`--json` with no command said `{ "ok": true }` while exiting 2.** A missing command is now a
  refusal on stderr like any other; `--help` is still a result and still exits 0.

## [0.1.0] — 2026-09-11

First public release.

### Added

<!-- bump: minor; items: none -->
- **Theme engine** (`echo-theme`) — every Layer-3 `--echo-*` role derived in OKLCH from a ~3-value
  seed, a 7-stop accent ramp, dual `{ css, values }` output, and WCAG-AA contrast guardrails that
  solve each text role against *every* ground it is used on and report seeds they cannot satisfy.
<!-- bump: minor; items: none -->
- **Sound engine** (`echo-sound`) — sound tokens as serializable synth recipes over a zero-dependency
  WebAudio backend. No audio assets. Lazy AudioContext, persisted mute, blur guard, reduced-motion
  coupling.
<!-- bump: minor; items: none -->
- **Motion** (`echo-motion`, `use-tactile`, `use-gsap-presence`) — GSAP motion tokens with
  reduced-motion collapses, one hook that fuses motion and sound per interaction phase, and a bridge
  that lets a GSAP exit finish before Base UI unmounts a popup.
<!-- bump: minor; items: echo-menu, echo-sheet, echo-alert-dialog, echo-command, echo-textarea, echo-chart, echo-app-shell -->
- **45 components** across controls, overlays, structure, surfaces, primitives, navigation and
  texture — including `Command` (a dot-matrix command palette), `AppShell`, `Sheet` (on Base UI's
  Drawer, with swipe-to-dismiss), `AlertDialog`, `Menu` + `ContextMenu`, `Textarea`, and `Chart`.
<!-- bump: minor; items: echo-console -->
- **Templates** as installable blocks — `echo-console`.
<!-- bump: minor; items: none -->
- **An agent layer** — `catalog.json`, `llms.txt`, `llms-full.txt`, and an MCP server exposing
  `search_components`, `get_component`, `get_tokens`, `get_examples`. Props, examples and
  anti-patterns are generated from each item's zod schema, so the docs and the agent read one source.
<!-- bump: minor; items: none -->
- **Docs site** — a live theme generator, a sound audition bench, per-component pages with generated
  prop tables, ten composed galleries, and a running page per template.

### Known limitations

<!-- bump: patch; items: none -->
- **Dark-only by design.** The emissive half of the material language does not survive a light
  chassis; a light theme needs a separate on-screen text role.
<!-- bump: patch; items: echo-field -->
- **No OTP field.** A one-time code is a mono `Field`. A six-digit code wants per-digit boxes and
  paste-splitting.
<!-- bump: patch; items: echo-select -->
- **Base UI focus guards trip `aria-hidden-focus`** on any open non-dialog popup (e.g. `Select`).
  That markup is upstream and not Echo's to fix; re-checked on each Base UI bump.
<!-- bump: patch; items: none -->
- **Sound recipes are unturned by ear.** They are plausible defaults; the audition bench at
  `/audition` exists to replace them with chosen values.

[Unreleased]: https://github.com/NourMtir0722/echo-ui/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NourMtir0722/echo-ui/releases/tag/v0.1.0
