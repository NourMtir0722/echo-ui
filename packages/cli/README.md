# echo-ui-cli

Installs [Echo UI](https://echo-ui.com) components into your project, and checks what an agent
builds with them. Its command is `echo-ui`.

```sh
npx echo-ui-cli init                         # set the project up
npx echo-ui-cli which "a settings toggle"    # which item does a job
npx echo-ui-cli docs switch field            # how to use them, in one answer
npx echo-ui-cli add field                    # copy a component in, with what it needs
npx echo-ui-cli check                        # what your code gets wrong about Echo
npx echo-ui-cli test                         # Echo's tests on your app's pages
npx echo-ui-cli style use <name>             # wear a style: its colours, type and rules
npx echo-ui-cli style set radius 0.8         # move one setting of the look
npx echo-ui-cli agent off                    # take out what init wrote for agents
npx echo-ui-cli list                         # everything in the registry
npx echo-ui-cli diff                         # what has changed since you installed
npx echo-ui-cli update                       # bring items forward, your edits kept
```

Echo's components are **copied into your source tree**, not imported from a package: they are
yours to read and edit. The grammar they share — the theme, sound, motion and tactile tokens —
stays in the `echo-ui-core` package, which `init` installs.

## What `init` does

- Checks the project is one Echo supports: Next.js (App Router) or Vite, React 18 or later,
  TypeScript, Node 20+. Outside that it stops and says what's missing.
- Installs `echo-ui-core`, and this CLI as a dev dependency, so `npx echo-ui-cli` runs the
  project's own copy without downloading anything.
- Writes `echo.json` (where components go, which registry, and the seed when you pass `--seed` or
  the style when you pass `--style`), an empty `echo-lock.json`, and a static `echo-theme.css`, and
  keeps a copy of Echo's catalog in `node_modules/.cache/echo-ui/`.
- Writes what an agent reads, so one working in the project knows it's an Echo project: a marked
  Echo block in `CLAUDE.md` or `AGENTS.md` (whichever you have, or a new `AGENTS.md`); a
  `DESIGN.md` with this project's look in Echo's terms, read when a screen is built rather than in
  every session; two hooks in `.claude/settings.json`, one that runs `check` after every edit and
  the Stop gate, which runs Echo's tests on the pages the agent changed before it finishes; and
  three skills: Echo's in `.claude/skills/echo-ui/`, Design Eye's in
  `.claude/skills/echo-design-eye/`, which reads a moodboard into a style the project can wear, and
  Style Fit's in `.claude/skills/echo-style-fit/`, which picks the style it wears. A Cursor project
  whose block went to `CLAUDE.md` alone also gets `.cursor/rules/echo-ui.mdc` (Cursor reads
  `AGENTS.md` itself). Nothing outside the markers or the hook entries is touched,
  `npx echo-ui-cli agent off` takes it all out, and `--skip-agent` leaves it out. `add` and
  `update` keep Echo's marked files current, and `check` says when one was written by another
  version or from another seed.
- With `--ci`, also writes `.github/workflows/echo-design.yml`, a GitHub Actions job that runs
  `test` on every pull request.
- Prints the lines you paste yourself, and one line naming everything it added. **It never edits
  your source code.**

## What `which` and `docs` do

They answer the questions an agent asks before it writes UI, from the catalog `init` kept, so they
answer in milliseconds and offline. Both take several questions in one call.

- `which "<need>" […]` names the Echo item that does each job ("a settings toggle", "confirm a
  delete"), with a one-line reason and the install command. When nothing in Echo does the job
  (an image carousel, today), it says so instead of offering the nearest word match.
- `docs <name> […]` prints each item's props, the smallest working use, what it needs for
  accessibility and what not to do. Imports are written the way this project resolves its Echo
  folder, and an item you installed at an older version says so.

`add` and `update` refresh the kept catalog; `--refresh` fetches it again on demand.

## What `check` does

It reads your own `.tsx`, `.jsx` and `.css` (never Echo's folder, whose files are the components)
and reports, one line each with the Echo way to do it:

- colours written by hand, named by the role in your theme they're nearest ("`#8B6FE8` is your
  accent: use `var(--echo-accent)`"), and Tailwind palette classes (`text-red-500`) that never went
  through your theme;
- spacing and radii off Echo's scales, and the ones that are a step written as a number, with the
  token to write (`padding: 13px` → `var(--echo-space-6)`); page layout past 32px is yours;
- shadows drawn by hand, pointed to the shadow recipe that fits (`var(--echo-shadow-panel)`), and
  focus rings drawn by hand, pointed to Echo's ring;
- invented timing in transitions (`300ms` → `var(--echo-duration-sweep)`), and a second animation
  library imported next to Echo;
- restyling Echo from outside: `className` or `style` on a closed component, your CSS reaching into
  Echo's classes, and theme tokens set anywhere but the theme;
- raw elements where Echo has the component (`<button>`, `<select>`, `<input type="checkbox">`,
  a `role="switch"`), and Echo's own classes borrowed onto a raw element;
- props an Echo component doesn't take, values its variants don't have, props it can't go without,
  and controls missing the name their type requires — read from the component's own types, so it
  agrees with the compiler;
- markup a keyboard or a screen reader can't use: `onClick` on a `div`, an `<img>` without `alt`, a
  field without a label, an error that's only a colour (`aria-invalid` with no words tied to it), a
  focus ring removed, a positive `tabIndex`, `aria-hidden` on something focusable;
- motion written outside Echo's: GSAP used straight in a file that uses Echo but not its motion, and
  an animation with no reduced-motion fallback;
- the screen rules one file can show: another library's parts on an Echo screen, two primary caps
  in one form or dialog, something destructive on one press, and a confirmation that says "OK"
  instead of what happens. Three more rules only hint, as notes;
- a heavy part loaded with the page (one that draws with WebGL, or has a lot of its own code), with
  the lazy import to write for your framework;
- what reads as made by AI (the slop police): gradient text, an emoji as an icon, the sparkle for
  "AI", labels that don't say what happens ("Get started"), an arrow stapled to a label, stand-in
  names and photos. What the style you wear keeps on purpose isn't counted.

Props are checked against the version you installed; an item that's behind says so and points at
`diff`. Checking the whole project also says, without counting them, which Echo items were edited
since they were installed and which are behind the registry, with the `update` line to run. It exits `1` when it finds something, so it can run in CI; nothing requires that.
`--hook` is the same check on one file, for an editor or agent hook: findings on stderr with exit
`2`, silence with `0`, and `1` if the check itself fails. An edit inside Echo's own folder isn't
checked; the agent is told what it means instead, as context, and the edit goes through.

### A running page

`check --url http://localhost:3000/settings` loads a running page headless and runs the check
`<EchoCheck />` runs in development: colours as the browser paints them, controls with no name, text
under WCAG AA against what's behind it, a missing theme, ground or `SoundProvider`, the screen rules
that need a render, and the design tests (below). Then axe-core scans it for WCAG A and AA. It
renders the page in the Chrome already on your machine, over its DevTools protocol, or in your
project's own Playwright when there's no Chrome, and installs nothing; with neither, it says how to
get one.

### Your team's own rules

Nothing needs configuring. A `check` section in `echo.json` only adds: turn one of the rules
`off`, or to `info` (said, not counted); ban an import, in your own words; allow brand colours the
seed doesn't produce.

```json
{
  "check": {
    "rules": { "space": "info" },
    "ban": [{ "import": "lucide-react", "message": "our icons are in @/icons." }],
    "colours": ["#FF5A1F"]
  }
}
```

A rule name that isn't one, or a value it doesn't take, stops the check with what's wrong, rather
than quietly turning nothing off. The schema `echo.json` points to describes every rule, and
[echo-ui.com/docs/echo-json](https://echo-ui.com/docs/echo-json) lists them.

## What `test` does

`test` runs Echo's tests on your app's pages, the way a test suite runs: each page loaded headless,
then measured for what a designer checks on a screen an agent built, and scanned by axe.

- **contrast**: text under WCAG AA against what's behind it;
- **alignment**: text cut off with "…", cards side by side whose actions sit at different heights,
  a lone action off its column's edge, a grid that leaves columns empty;
- **depth**: a control that glows at rest, a raised surface on a raised one with no well between;
- **corners**: parts of one kind with different corners, a corner inside a corner that doesn't
  follow it;
- **icons**: one group's icons at different sizes, strokes or styles;
- **axe**: axe-core's WCAG 2.0, 2.1 and 2.2 A and AA rules, for what's written outside Echo's parts.

Each finding says what it measured and the one change that fixes it, ending with what to leave
alone. The pages are the ones you name (`test /pricing /settings`), else `test.routes` in
`echo.json`, else every route your app has; the app is `--url`, else `test.url`, else the port its
dev script runs on. `--width` tests at one width, `test.widths` at several. A report with a picture
of each finding goes to `.echo/report/index.html`, and what only a person can check is listed under
each page, never counted. It exits `1` when it finds something.

**The Stop gate.** In Claude Code, the second hook `init` writes runs these tests when the agent
tries to finish, on the pages its change touched, and hands back what they find until they pass
(three rounds at most; it lets the agent stop when the app isn't running, and says so). It tells
you when `echo.json` lets more through than at the last commit. `"test": { "stop": false }` turns
it off; `check --stop` is the hook itself.

## What `add` does

Resolves the items you asked for plus the Echo items they need, checks every file against the hash
the registry published, and writes them under the folder in `echo.json`. It records what it wrote
in `echo-lock.json`, so a later version can tell your edits from Echo's code and never silently
replace yours.

A file you've edited stops the install. Pass `--overwrite` if you mean it.

## What `diff` and `update` do

Copied files drift. `diff` with no arguments is a roll call — every installed item is up to date,
behind, edited, or edited *and* behind — and `diff <name>` prints the actual lines that changed
between your copy and the version the registry serves.

`update` brings items forward, merging Echo's change into files you've edited against the version
you installed. Where your edits and Echo's change meet in the same lines, it leaves that item as it
is and prints them between git's conflict markers; bring them together in the file and run `update`
again. An item moves whole or not at all, and nothing you wrote is replaced without `--overwrite`.

## What `style` does

A style is a look the project wears on top of Echo: colours, type, radius, finish, density, and
whether its parts are molded or drawn, never the grammar. Your styles live in your own library
(`~/Documents/styles`, or wherever `ECHO_STYLES_DIR` points), which stays private to you.

- `style list` shows Echo's styles and yours; `style show <name>` prints one in full.
- `style fit --profile "W4 V2 D1 F2 E3 C3 O3"` measures every style against a product's place on
  the seven axes (`--tolerance`, where 0 locks an axis). Echo's Style Fit, the skill `init`
  installs, uses it to pick the style a product wears.
- `style use <name>` writes the style's seed to `echo.json` and `echo-theme.css`, says what the
  theme corrected for contrast and which fonts to get, and puts the style's rules in `DESIGN.md`
  for your agent; the style's documents stay in your library.
- `style set <setting> <value> …` moves one setting of the project's seed, or several (`accent`,
  `chassis`, `paper`, `lcdTint`, `finish`, `radius`, `pills`, `density`, `render`, and the four font
  stacks), checks every value first, writes the theme and `DESIGN.md` again, and prints the line
  that puts it back. `default` gives one back to Echo; alone, it lists them.
- `style check <file>` says whether a `style.json` is one Echo can apply, which device it makes,
  what contrast corrects, what's hard to read, and what the slop police stops.
- `style sample <image> --out <folder>` is the evidence for reading a style from a moodboard: the
  image's dominant values with their share of the pixels (`--swatches`), magnified crops
  (`--crop x,y,w,h:name`, `--zoom`), and one tile of a collage as its own plate
  (`--region x,y,w,h`). No Python needed. Echo's Design Eye, the skill `init` installs, uses it.

## Flags

| Flag | What it does |
| --- | --- |
| `--yes` | Take the defaults, ask nothing (`init`, `add`, `update`) |
| `--json` | Machine-readable output, for agents and scripts |
| `--dry-run` | Say what would happen; write nothing (`init`, `add`, `update`) |
| `--overwrite` | Replace files you've edited (`add`, `update`) |
| `--dir <path>` | Where components live (`init`) |
| `--seed <hex>` | The accent to build the theme from, or the whole seed as `accent,chassis,paper` (`init`) |
| `--style <name>` | Wear a style from the start (`init`) |
| `--ci` | Also write the GitHub Actions job that runs `test` on pull requests (`init`) |
| `--skip-agent` | Leave out the Echo block, `DESIGN.md`, the hooks and the skills (`init`) |
| `--registry <url>` | A local or staging registry |
| `--cwd <path>` | Run against another folder |
| `--skip-install` | Write files, don't call your package manager |
| `--refresh` | Fetch the catalog again before answering (`which`, `docs`, `check`) |
| `--hook` | Check the one file a Claude Code hook's JSON names (`check`) |
| `--stop` | Echo's tests as Claude Code's Stop hook (`check`) |
| `--url <url>` | The running page to check (`check`), or where the app runs (`test`) |
| `--width <px>` | Test each page at this width (`test`) |
| `--profile`, `--tolerance` | A product's place on the seven axes, and how far a style may drift (`style fit`) |
| `--out`, `--region`, `--swatches`, `--crop`, `--zoom`, `--max-width` | Where and how `style sample` reads an image |
| `--help`, `--version` | The usage, and this CLI's version |

Exit codes: `0` it worked, `1` it refused and said why (or found something), `2` the command line
was wrong. With `--hook`, `check` exits `2` with the findings, for the agent, and `1` only if the
check itself fails.

Every flag, with the commands that read it, is at
[echo-ui.com/docs/cli](https://echo-ui.com/docs/cli#flags).
