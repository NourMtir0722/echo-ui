/**
 * The CLI's commands and flags, as data: `echo-ui-cli` parses its arguments
 * with `CLI_OPTIONS`, and the docs render their flags table from
 * `CLI_FLAG_ABOUT`, so a flag can't exist in one and not the other.
 * `CLI_FLAG_ABOUT` is a Record over the real keys: add a flag and nothing
 * compiles until it says what it does.
 */

/** Every command, in the order the CLI's usage lists them. */
export const CLI_COMMANDS = ["init", "which", "docs", "check", "test", "style", "agent", "add", "list", "diff", "update"] as const;
export type CliCommand = (typeof CLI_COMMANDS)[number];

/** Every option any command takes, as `node:util`'s `parseArgs` reads them. */
export const CLI_OPTIONS = {
  dir: { type: "string" },
  seed: { type: "string" },
  style: { type: "string" },
  out: { type: "string" },
  region: { type: "string" },
  profile: { type: "string" },
  tolerance: { type: "string" },
  swatches: { type: "string" },
  crop: { type: "string", multiple: true },
  zoom: { type: "string" },
  "max-width": { type: "string" },
  registry: { type: "string" },
  cwd: { type: "string" },
  yes: { type: "boolean", default: false },
  json: { type: "boolean", default: false },
  "dry-run": { type: "boolean", default: false },
  overwrite: { type: "boolean", default: false },
  "skip-install": { type: "boolean", default: false },
  refresh: { type: "boolean", default: false },
  hook: { type: "boolean", default: false },
  stop: { type: "boolean", default: false },
  url: { type: "string" },
  width: { type: "string" },
  ci: { type: "boolean", default: false },
  "skip-agent": { type: "boolean", default: false },
  help: { type: "boolean", default: false, short: "h" },
  version: { type: "boolean", default: false },
} as const;

export type CliFlag = keyof typeof CLI_OPTIONS;

/** The flags every command reads. */
export const CLI_EVERYWHERE: readonly CliFlag[] = ["json", "cwd", "help", "version"];

/** What each flag takes, which commands read it, and what it does. */
export const CLI_FLAG_ABOUT: Record<CliFlag, { takes?: string; commands: readonly CliCommand[] | "every command"; about: string }> = {
  dir: { takes: "<path>", commands: ["init"], about: "Where components go. Defaults to `src/components/echo`, or `components/echo` without a `src/`." },
  seed: {
    takes: "<hex>",
    commands: ["init"],
    about: "The theme from your own accent colour, or the whole seed as `accent,chassis,paper`, recorded in `echo.json`. Not with `--style`.",
  },
  style: { takes: "<name>", commands: ["init"], about: "Wear a style from the start, yours or Echo's: the same as `style use` right after." },
  ci: { commands: ["init"], about: "Also write `.github/workflows/echo-design.yml`, a GitHub Actions job that runs `test` on every pull request. Never over a file that's there." },
  "skip-agent": { commands: ["init"], about: "Leave out the Echo block, `DESIGN.md`, the hooks and the skills." },
  yes: { commands: ["init", "add", "update"], about: "Take the defaults and ask nothing. On `init`, write `echo.json` again over an existing one." },
  "dry-run": { commands: ["init", "add", "update"], about: "Say what would happen; write nothing." },
  overwrite: { commands: ["add", "update"], about: "Replace files you've edited with Echo's." },
  "skip-install": { commands: ["init", "add", "update"], about: "Write the files without calling your package manager." },
  registry: {
    takes: "<url>",
    commands: ["init", "add", "list", "which", "docs", "check", "diff", "update", "style"],
    about: "Read another registry: a staging copy, or a local build (`file://…`).",
  },
  refresh: { commands: ["which", "docs", "check"], about: "Fetch the catalog again before answering, instead of reading the copy `init` kept." },
  hook: { commands: ["check"], about: "Check the one file a Claude Code hook's JSON names, for the hook `init` writes: findings on stderr, exit 2." },
  stop: { commands: ["check"], about: "Run Echo's tests as Claude Code's Stop hook: the Stop gate." },
  url: { takes: "<url>", commands: ["check", "test"], about: "On `check`, the running page to check headless. On `test`, where the app runs." },
  width: { takes: "<px>", commands: ["test"], about: "Test each page at this one width (`test.widths` in `echo.json` gives several)." },
  out: { takes: "<folder>", commands: ["style"], about: "Where `style sample` writes the plate, its values and its crops." },
  region: { takes: "x,y,w,h", commands: ["style"], about: "One tile of a collage, in the board's pixels: `style sample` reads it as its own plate." },
  swatches: { takes: "<n>", commands: ["style"], about: "How many dominant values `style sample` reports. Default 8." },
  crop: { takes: "x,y,w,h:name", commands: ["style"], about: "A magnified crop for `style sample`, in the board's pixels. Repeat it for more than one." },
  zoom: { takes: "<n>", commands: ["style"], about: "How many times `style sample` magnifies a crop. Default 6." },
  "max-width": { takes: "<px>", commands: ["style"], about: "The widest `style sample` keeps a plate, in pixels. Default 1600." },
  profile: { takes: '"W4 V2 D1 F2 E3 C3 O3"', commands: ["style"], about: "For `style fit`: the product's place on the seven axes (warmth, volume, density, formality, era, craft, ornament)." },
  tolerance: { takes: '"W1 V1 D1 F0 E2 C1 O1"', commands: ["style"], about: "For `style fit`: how far a style may drift on each axis. 0 locks one." },
  json: { commands: "every command", about: "Machine-readable output: one `{ \"ok\": … }` object, for scripts and agents." },
  cwd: { takes: "<path>", commands: "every command", about: "Run against another folder." },
  help: { commands: "every command", about: "The usage. `-h` too." },
  version: { commands: "every command", about: "The CLI's version." },
};
