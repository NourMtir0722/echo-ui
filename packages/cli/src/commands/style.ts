/**
 * `echo-ui style list | show <name> | fit --profile … | use <name> | set <setting> <value> … | check <file> | sample <image>`:
 * the looks a project can wear on top of Echo, and one setting at a time.
 *
 * A style changes Echo's vocabulary (colours, type, radius, finish, density),
 * never its grammar. Echo's own styles come from the registry; the builder's
 * come from their own library, private to them: `~/Documents/styles`, where
 * Design Eye writes a style's documents, or wherever `ECHO_STYLES_DIR` points.
 * In that library a style is a folder with a `style.json`; a folder with only
 * its foundation document is listed as needing a new read.
 *
 * `use` copies into the project only what it needs: the seed (to echo.json and
 * echo-theme.css) and the style's rules (to DESIGN.md), so any agent working
 * on it keeps to the style. The foundation document and the moodboard stay in
 * the library.
 *
 * `set` moves one setting of the seed, or several, in this project only: the
 * change an agent makes when it's asked for "rounder" or "denser". Every value
 * is checked before anything is written, the theme holds contrast as always,
 * and the output ends with the line that puts it back.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { RegistryClient, RegistryError, type EStyleSummary } from "@echo-ui/client";
import { SEED_DEFAULTS, createEchoTheme, devicePolarity, type EchoSeedInput } from "echo-ui-core/theme";
import { runCommand } from "@registry/agent/guidance";
import { DECISIONS, NUMBER_SETTINGS, SEED_SETTINGS, appliedStyle, parseStyle, seedProblems, undecided, type AppliedStyle, type DecisionKey, type EchoStyle, type SeedSetting } from "@registry/agent/style-schema";
import { policeStyle, type PoliceReport } from "@registry/agent/slop";
import { policeNotes, stoppedNotes, styleCheckCommand, themeNotes, type StyleNote } from "@registry/agent/style-notes";
import { AXIS_LETTERS, fingerprintText, fitStyles, parseProfile, parseTolerance, type FitCandidate } from "@registry/agent/style-fit";
import { DESIGN_EYE_REFERENCE } from "@registry/agent/skills/design-eye";

import { rewriteDesignMd } from "../agent-files";
import { CONFIG_FILE, DEFAULT_REGISTRY, readConfig, readLock, writeJson } from "../project";
import { THEME_FILE, writeTheme, type ThemeReport } from "../theme-file";
import { sample } from "../style-sample";
import { bold, dim, type Reporter } from "../output";

export interface StyleOptions {
  root: string;
  action?: string;
  args: string[];
  registry?: string;
  /** `sample`: where the evidence goes, which tile of a collage, how many values, which crops, how far to zoom them. */
  out?: string;
  region?: string;
  swatches?: number;
  crops?: string[];
  zoom?: number;
  maxWidth?: number;
  /** `fit`: the product's place on the seven axes, and how far a style may drift from it. */
  profile?: string;
  tolerance?: string;
}

/** The builder's own library. */
export const stylesDir = () => process.env.ECHO_STYLES_DIR ?? join(homedir(), "Documents", "styles");

/** A style in the builder's library: ready (it has a `style.json`), or only its document, waiting for a new read. */
interface YourStyle {
  name: string;
  path: string;
  style?: EchoStyle;
  problems?: string[];
  needsRead?: boolean;
}

const exists = (path: string) => stat(path).then(() => true, () => false);

/** Light plastic or dark, by the chassis: the same line the theme draws. */
const deviceOf = (seed: EchoStyle["seed"]) => devicePolarity(seed.chassis ?? SEED_DEFAULTS.chassis);
/** The library's own notes, not styles. */
const NOT_STYLES = /^(index|board-notes.*|readme)\.md$/i;

/** What a document-only style needs, in one wording. */
const NEEDS_ECHO_PART =
  "Echo's Design Eye can write its Echo part (Part IV and the style.json Echo applies) from the document, with no moodboard";

/**
 * Fingerprints and essences from the library's INDEX.md, for the styles that
 * are only their document: the index is where their fingerprint is, and it's
 * what lets Style Fit weigh them with the rest.
 */
async function indexed(dir = stylesDir()): Promise<Map<string, { fingerprint: EchoStyle["fingerprint"]; essence: string }>> {
  const found = new Map<string, { fingerprint: EchoStyle["fingerprint"]; essence: string }>();
  let text: string;
  try {
    text = await readFile(join(dir, "INDEX.md"), "utf8");
  } catch {
    return found;
  }
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    const name = /^\[([^\]]+)\]/.exec(cells[1] ?? "")?.[1];
    if (!name || !cells[2]) continue;
    try {
      found.set(name, { fingerprint: parseProfile(cells[2]), essence: cells[3] ?? "" });
    } catch {
      /* a row that isn't a style: the decisions table, a heading */
    }
  }
  return found;
}

async function yourStyles(dir = stylesDir()): Promise<YourStyle[]> {
  let entries: string[];
  try {
    entries = (await readdir(dir)).sort();
  } catch {
    return [];
  }
  const found: YourStyle[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path).catch(() => undefined);
    if (info?.isDirectory()) {
      const file = join(path, "style.json");
      if (await exists(file)) {
        let json: unknown;
        try {
          json = JSON.parse(await readFile(file, "utf8"));
        } catch (error) {
          found.push({ name: entry, path: file, problems: [`It isn't JSON: ${(error as Error).message}`] });
          continue;
        }
        const read = parseStyle(json);
        found.push(read.style ? { name: read.style.name, path: file, style: read.style } : { name: entry, path: file, problems: read.problems });
      } else if (await exists(join(path, `${entry}.md`))) {
        found.push({ name: entry, path, needsRead: true });
      }
    } else if (info?.isFile() && entry.endsWith(".md") && !NOT_STYLES.test(entry)) {
      found.push({ name: basename(entry, ".md"), path, needsRead: true });
    }
  }
  return found;
}

async function echoStyles(client: RegistryClient): Promise<{ styles: EStyleSummary[]; error?: string }> {
  try {
    return { styles: await client.styles() };
  } catch (error) {
    return { styles: [], error: error instanceof RegistryError ? error.message : String(error) };
  }
}

export async function style(options: StyleOptions, out: Reporter): Promise<number> {
  switch (options.action) {
    case "list":
      return list(options, out);
    case "use":
      return wear(options, out);
    case "set":
      return set(options, out);
    case "check":
      return check(options, out);
    case "sample":
      return sampleImage(options, out);
    case "fit":
      return fit(options, out);
    case "show":
      return show(options, out);
    default:
      out.error(
        `Which? \`${runCommand("style list")}\`, \`${runCommand("style show <name>")}\`, \`${runCommand('style fit --profile "W4 V2 D1 F2 E3 C3 O3"')}\`, \`${runCommand("style use <name>")}\`, \`${runCommand("style set <setting> <value>")}\`, \`${runCommand("style check <file>")}\` or \`${runCommand("style sample <image> --out <folder>")}\`.`,
      );
      return 2;
  }
}

async function list(options: StyleOptions, out: Reporter): Promise<number> {
  const config = await readConfig(options.root);
  const client = new RegistryClient(options.registry ?? config?.registry ?? DEFAULT_REGISTRY);
  const echo = await echoStyles(client);
  const yours = await yourStyles();
  const wearing = config?.style?.name;
  const mark = (name: string) => (name === wearing ? dim(" (this project)") : "");

  out.line(bold("Echo's"));
  if (echo.error) out.line(`  ${dim(`Couldn't reach Echo's library: ${echo.error}`)}`);
  for (const s of echo.styles) out.line(`  ${bold(s.name)}${mark(s.name)} — ${s.essence}`);
  out.line();
  out.line(`${bold("Yours")} ${dim(stylesDir())}`);
  if (yours.length === 0) out.line(`  ${dim("None yet. Give your agent a moodboard: Echo's Design Eye writes the style here.")}`);
  for (const s of yours) {
    if (s.style) out.line(`  ${bold(s.name)}${mark(s.name)} — ${s.style.essence} ${dim(`(${deviceOf(s.style.seed)})`)}`);
    else if (s.needsRead) out.line(`  ${s.name} ${dim(`— only its document: ${NEEDS_ECHO_PART}`)}`);
    else out.line(`  ${s.name} ${dim(`— its style.json has problems: ${runCommand(`style check ${s.path}`)}`)}`);
  }
  out.line();
  out.line(dim(`Wear one: ${runCommand("style use <name>")}`));
  out.result({
    command: "style list",
    echo: echo.styles,
    ...(echo.error ? { echoError: echo.error } : {}),
    yours: yours.map((s) => ({
      name: s.name,
      path: s.path,
      ready: !!s.style,
      ...(s.style ? { essence: s.style.essence, device: deviceOf(s.style.seed) } : {}),
      ...(s.needsRead ? { needsRead: true } : {}),
      ...(s.problems ? { problems: s.problems } : {}),
    })),
    ...(wearing ? { wearing } : {}),
  });
  return 0;
}

/** Echo's notes on a theme or a style, as the terminal shows them: a step, a warning, or a quiet line. */
function say(out: Reporter, notes: StyleNote[]) {
  for (const note of notes) {
    if (note.level === "step") out.step(note.text);
    else if (note.level === "warn") out.warn(note.text);
    else out.line(`  ${dim(note.text)}`);
  }
}

/** What the theme will correct, whether it moves the accent, and the fonts to get. */
function sayTheme(out: Reporter, report: ThemeReport, fonts: AppliedStyle["fonts"]) {
  say(out, themeNotes(report, fonts));
}

/**
 * What the slop police says about a style: the banned pairings it hasn't kept
 * (each with the question for the builder), what the builder kept, and what
 * the style leaves undecided. Returns the report.
 */
function sayPolice(out: Reporter, style: EchoStyle): PoliceReport {
  const { police, notes } = policeNotes(style);
  say(out, notes);
  return police;
}

async function wear(options: StyleOptions, out: Reporter): Promise<number> {
  const name = options.args[0];
  if (!name) {
    out.error(`Which style? \`${runCommand("style list")}\` shows them.`);
    return 2;
  }
  const config = await readConfig(options.root);
  if (!config) {
    out.error(`There's no ${CONFIG_FILE} here: set the project up with \`${runCommand("init")}\` first.`);
    return 1;
  }

  // Yours first: a name you gave your own style is the one you mean.
  const yours = (await yourStyles()).find((s) => s.name === name);
  let chosen: EchoStyle | undefined;
  let from: AppliedStyle["from"] = "yours";
  if (yours?.style) chosen = yours.style;
  else if (yours?.problems) {
    out.error(`Your ${name} can't be applied yet:\n  ${yours.problems.join("\n  ")}`);
    return 1;
  } else if (yours?.needsRead) {
    out.error(`Your ${name} is only its document (${yours.path}). ${NEEDS_ECHO_PART}.`);
    return 1;
  } else {
    const client = new RegistryClient(options.registry ?? config.registry ?? DEFAULT_REGISTRY);
    try {
      chosen = await client.style(name);
      from = "echo";
    } catch (error) {
      const available = [...(await echoStyles(client)).styles.map((s) => s.name), ...(await yourStyles()).filter((s) => s.style).map((s) => s.name)];
      out.error(`There's no style called ${name}.${available.length ? ` There's: ${available.join(", ")}.` : ""}${error instanceof RegistryError && !/404|ENOENT/.test(error.message) ? ` (${error.message})` : ""}`);
      return 1;
    }
  }

  const police = policeStyle(chosen);
  if (police.banned.length) {
    const [stops, ...rest] = stoppedNotes(chosen, police, styleCheckCommand(yours?.path ?? name));
    out.error(stops!.text);
    for (const note of rest) out.line(`  ${note.level === "note" ? dim(note.text) : note.text}`);
    out.result({ command: "style use", ok: false, style: chosen.name, police });
    return 1;
  }

  const applied = appliedStyle(chosen, from);
  const next = { ...config, seed: chosen.seed as Record<string, unknown>, style: applied };
  await writeJson(join(options.root, CONFIG_FILE), next);
  const report = await writeTheme(options.root, config.dir, chosen.seed as EchoSeedInput, chosen.name);
  const lock = await readLock(options.root);
  const design = await rewriteDesignMd(options.root, { dir: config.dir, seed: next.seed, style: applied, installed: Object.keys(lock?.items ?? {}) });

  out.step(`This project now wears ${bold(chosen.title)}, from ${from === "echo" ? "Echo's library" : `your library (${yours!.path})`}.`);
  out.step(`${join(config.dir, THEME_FILE)} written from its seed; ${CONFIG_FILE} records it.`);
  sayTheme(out, report, applied.fonts);
  out.step(design ? "DESIGN.md carries its rules for your agent." : `No DESIGN.md here (\`init --skip-agent\`); its rules are in ${CONFIG_FILE}.`);
  out.result({ command: "style use", style: applied, seed: chosen.seed, theme: join(config.dir, THEME_FILE), report, designMd: design });
  return 0;
}

/** What a setting is now: the seed's value, or what Echo uses when the seed doesn't say. */
function currentValue(seed: Record<string, unknown> | undefined, key: SeedSetting): string {
  const own = seed?.[key];
  if (own !== undefined) return String(own);
  if (key === "lcdTint") return "from the chassis";
  if (key === "pills") return `from the radius (${Number(seed?.radius ?? SEED_DEFAULTS.radius) >= 1 ? "true" : "false"})`;
  return String(SEED_DEFAULTS[key]);
}

/** A value as it's typed back on the command line: quoted when a shell would split it. */
const typed = (value: string) => (/[\s,"'()]/.test(value) ? `'${value.replace(/'/g, "'\\''")}'` : value);

/**
 * `style set <setting> <value> …`: this project's seed, one setting or several
 * at once, with the theme and DESIGN.md written again from it. A worn style
 * stays and records what moved. `default` gives a setting back to Echo.
 * With no pairs, the settings as they are.
 */
async function set(options: StyleOptions, out: Reporter): Promise<number> {
  const config = await readConfig(options.root);
  if (!config) {
    out.error(`There's no ${CONFIG_FILE} here: set the project up with \`${runCommand("init")}\` first.`);
    return 1;
  }
  const seed = config.seed as Record<string, unknown> | undefined;

  if (options.args.length === 0) {
    const settings = Object.fromEntries(SEED_SETTINGS.map((key) => [key, currentValue(seed, key)]));
    out.line(`${bold("This project's settings")} ${dim(`(${CONFIG_FILE}${config.style ? `, the ${config.style.title} style` : ""})`)}`);
    for (const key of SEED_SETTINGS) out.line(`  ${key.padEnd(12)}${settings[key]}${seed?.[key] === undefined ? dim("  Echo's default") : ""}`);
    out.line();
    out.line(dim(`Change one: ${runCommand("style set <setting> <value>")}. finish and radius run 0 to 1 (matte to glossy, crisp to soft); density is compact, default or comfortable; render is molded or drawn (lit plastic, or drawn in the ink); pills is true or false (buttons and segments as pills, whatever the radius); \`default\` gives any setting back to Echo.`));
    out.result({ command: "style set", settings, ...(config.style ? { style: config.style.name } : {}) });
    return 0;
  }

  if (options.args.length % 2 !== 0) {
    out.error(`Give each setting a value: \`${runCommand("style set radius 0.8 finish 0.7")}\`. The settings: ${SEED_SETTINGS.join(", ")}.`);
    return 2;
  }
  // `undefined` is `default`: the setting goes back to Echo's (for density,
  // "default" is also the name of Echo's own, so the two readings agree).
  const changes: Record<string, unknown> = {};
  for (let i = 0; i < options.args.length; i += 2) {
    const key = options.args[i]!;
    const raw = options.args[i + 1]!;
    changes[key] =
      raw === "default"
        ? undefined
        : NUMBER_SETTINGS.includes(key as SeedSetting) && /^-?\d*\.?\d+$/.test(raw)
          ? Number(raw)
          : key === "pills" && (raw === "true" || raw === "false")
            ? raw === "true"
            : raw;
  }
  // A value going back to Echo's needs no checking; an unknown setting is named whatever its value.
  const problems = seedProblems(Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)));
  for (const key of Object.keys(changes)) {
    if (changes[key] === undefined && !SEED_SETTINGS.includes(key as SeedSetting)) problems.push(...seedProblems({ [key]: "default" }));
  }
  if (problems.length) {
    out.error(`Nothing changed:\n  ${problems.join("\n  ")}`);
    return 1;
  }

  const keys = SEED_SETTINGS.filter((key) => key in changes);
  const before = Object.fromEntries(keys.map((key) => [key, currentValue(seed, key)]));
  const next: Record<string, unknown> = { ...(seed ?? {}) };
  for (const key of keys) {
    if (changes[key] === undefined) delete next[key];
    else next[key] = changes[key];
  }
  const after = Object.fromEntries(keys.map((key) => [key, currentValue(next, key)]));

  const changed = config.style ? SEED_SETTINGS.filter((key) => config.style!.changed?.includes(key) || keys.includes(key)) : undefined;
  const style: AppliedStyle | undefined = config.style ? { ...config.style, changed } : undefined;
  const nextConfig = { ...config, seed: next, ...(style ? { style } : {}) };
  await writeJson(join(options.root, CONFIG_FILE), nextConfig);
  const report = await writeTheme(options.root, config.dir, next as EchoSeedInput, style?.name, changed);
  const lock = await readLock(options.root);
  const design = await rewriteDesignMd(options.root, { dir: config.dir, seed: next, style, installed: Object.keys(lock?.items ?? {}) });

  const width = Math.max(...keys.map((key) => key.length)) + 3;
  for (const key of keys) out.line(`${key.padEnd(width)}${before[key]} → ${after[key]}`);
  out.step(`${join(config.dir, THEME_FILE)} written from the new seed; ${CONFIG_FILE} records it.`);
  sayTheme(out, report, undefined);
  const wasDevice = devicePolarity(currentValue(seed, "chassis"));
  const nowDevice = devicePolarity(currentValue(next, "chassis"));
  if (wasDevice !== nowDevice) {
    out.step(nowDevice === "light" ? "The chassis is pale now: this is a light device, with screens of paper glass printed in ink." : "The chassis is dark now: this is a dark device, with screens that glow.");
  }
  if (keys.some((key) => key.startsWith("font"))) out.line(`  ${dim("A font shows once it's on the page: load it in the app (next/font, a <link> or @font-face).")}`);
  out.step(design ? "DESIGN.md carries the new values for your agent." : `No DESIGN.md here (\`init --skip-agent\`); the values are in ${CONFIG_FILE}.`);
  if (style) out.line(`  ${dim(`Still wearing ${style.title}, changed: ${changed!.join(", ")}. \`${runCommand(`style use ${style.name}`)}\` puts it back whole.`)}`);
  const undo = runCommand(`style set ${keys.map((key) => `${key} ${seed?.[key] === undefined ? "default" : typed(String(seed[key]))}`).join(" ")}`);
  out.line(`  ${dim(`Put it back: ${undo}`)}`);
  out.result({
    command: "style set",
    changes: Object.fromEntries(keys.map((key) => [key, { from: before[key], to: after[key] }])),
    seed: next,
    ...(style ? { style } : {}),
    theme: join(config.dir, THEME_FILE),
    report,
    device: nowDevice,
    designMd: design,
    undo,
  });
  return 0;
}

async function check(options: StyleOptions, out: Reporter): Promise<number> {
  const given = options.args[0];
  if (!given) {
    out.error(`Which file? \`${runCommand("style check <path/to/style.json>")}\``);
    return 2;
  }
  const path = (await stat(given).catch(() => undefined))?.isDirectory() ? join(given, "style.json") : given;
  let json: unknown;
  try {
    json = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    out.error(`Couldn't read ${path}: ${(error as Error).message}`);
    return 1;
  }
  const read = parseStyle(json);
  if (!read.style) {
    out.error(`${path} isn't a style Echo can apply:`);
    for (const problem of read.problems) out.line(`  ${problem}`);
    out.result({ command: "style check", path, ok: false, problems: read.problems });
    return 1;
  }
  const { report } = createEchoTheme(read.style.seed as EchoSeedInput, { quiet: true });
  const device = deviceOf(read.style.seed);
  const banned = policeStyle(read.style).banned.length > 0;
  out.step(
    banned
      ? `${bold(read.style.title)} is a style Echo could apply, on its ${device} device, but the slop police stops it until the builder keeps or changes what it names.`
      : `${bold(read.style.title)} is a style Echo can apply, on its ${device} device.`,
  );
  sayTheme(out, report, read.style.fonts);
  const police = sayPolice(out, read.style);
  out.result({ command: "style check", path, ok: !banned, name: read.style.name, device, report, police, undecided: undecided(read.style) });
  return banned ? 1 : 0;
}

/** The evidence for a style read from one image: the plate, its dominant values, the crops a claim rests on. */
async function sampleImage(options: StyleOptions, out: Reporter): Promise<number> {
  const image = options.args[0];
  if (!image || !options.out) {
    out.error(`Which image, and where to? \`${runCommand("style sample <image> --out <assets folder>")}\``);
    return 2;
  }
  let result;
  try {
    result = await sample({ image, out: options.out, region: options.region, swatches: options.swatches, crops: options.crops, zoom: options.zoom, maxWidth: options.maxWidth });
  } catch (error) {
    out.error((error as Error).message);
    return 1;
  }
  out.line(bold("Dominant values (dark to light):"));
  for (const { hex, share } of result.values) out.line(`  ${hex}  ${(share * 100).toFixed(1).padStart(4)}% of pixels`);
  for (const file of result.files) out.step(file);
  out.result({ command: "style sample", image, size: { width: result.width, height: result.height }, values: result.values, files: result.files });
  return 0;
}


/**
 * Every style from both libraries, measured against a product's profile:
 * Style Fit's shortlist. The arithmetic orders; the agent reading the
 * foundations decides (registry/src/agent/style-fit.ts).
 */
async function fit(options: StyleOptions, out: Reporter): Promise<number> {
  if (!options.profile) {
    out.error(`Where does the product sit? \`${runCommand('style fit --profile "W4 V2 D1 F2 E3 C3 O3" [--tolerance "W1 V1 D1 F0 E2 C1 O1"]')}\`: warmth, volume, density, formality, era, craft, ornament, 1 to 5.`);
    return 2;
  }
  let target;
  let tolerance;
  try {
    target = parseProfile(options.profile);
    tolerance = parseTolerance(options.tolerance);
  } catch (error) {
    out.error((error as Error).message);
    return 2;
  }
  const config = await readConfig(options.root);
  const client = new RegistryClient(options.registry ?? config?.registry ?? DEFAULT_REGISTRY);
  const echo = await echoStyles(client);
  const library = await yourStyles();
  const index = await indexed();
  const yours: FitCandidate[] = library.flatMap((s): FitCandidate[] => {
    if (s.style) return [{ name: s.style.name, title: s.style.title, essence: s.style.essence, fingerprint: s.style.fingerprint, from: "yours", ready: true }];
    // Only its document: weighed on the fingerprint its index row gives, and marked, since it can't be worn yet.
    const row = s.needsRead ? index.get(s.name) : undefined;
    return row ? [{ name: s.name, title: s.name, essence: row.essence, fingerprint: row.fingerprint, from: "yours", ready: false }] : [];
  });
  const candidates: FitCandidate[] = [
    ...yours,
    // A name you gave your own style is the one you mean: Echo's of the same name steps aside, as in \`use\`.
    ...echo.styles.filter((e) => !yours.some((y) => y.name === e.name)).map((e) => ({ ...e, from: "echo" as const, ready: true })),
  ];
  if (candidates.length === 0) {
    out.error(`There are no styles to measure${echo.error ? ` (Echo's library: ${echo.error})` : ""}. Read a moodboard with Echo's Design Eye to make one.`);
    return 1;
  }
  const results = fitStyles(target, tolerance, candidates);
  // The police's word on each of your styles: a stopped one can still win, but only if the builder keeps what it bans.
  const stopped = new Map(library.filter((s) => s.style).map((s) => [s.style!.name, policeStyle(s.style!).banned.map((b) => b.name.toLowerCase())]));
  out.line(`${bold("The product")}  ${fingerprintText(target)}  ${dim(`tolerance ${fingerprintText(tolerance)}`)}`);
  out.line();
  results.forEach((r, i) => {
    const where = r.from === "echo" ? "Echo's" : r.ready === false ? "yours, only its document" : "yours";
    const past = (Object.keys(r.distance) as (keyof typeof r.distance)[])
      .filter((axis) => Math.abs(r.distance[axis]) > tolerance[axis])
      .map((axis) => `${AXIS_LETTERS[axis]}${r.distance[axis] > 0 ? "+" : ""}${r.distance[axis]}`);
    const verdict = r.locked.length
      ? `out: misses ${r.locked.join(", ")}, locked`
      : r.over === 0
        ? "inside every tolerance"
        : `${r.over} past tolerance: ${past.join(" ")}`;
    const police = stopped.get(r.name)?.length ? `; the slop police stops ${stopped.get(r.name)!.join(", ")}` : "";
    out.line(`  ${String(i + 1).padStart(2)}  ${bold(r.name)} ${dim(`(${where})`)}  ${fingerprintText(r.fingerprint)}  ${verdict}${police}`);
  });
  out.line();
  out.line(dim(`It orders; it doesn't decide. Read the best of them: ${runCommand("style show <name>")}.`));
  if (results.some((r) => r.ready === false)) out.line(dim(`A style that's only its document needs its Echo part before it's worn: ${NEEDS_ECHO_PART}.`));
  const policeResult = Object.fromEntries([...stopped].filter(([, names]) => names.length));
  out.result({ command: "style fit", profile: target, tolerance, results, ...(Object.keys(policeResult).length ? { police: policeResult } : {}), ...(echo.error ? { echoError: echo.error } : {}) });
  return 0;
}

/** One style in full, from either library, and where its foundation document is. */
async function show(options: StyleOptions, out: Reporter): Promise<number> {
  const name = options.args[0];
  if (!name) {
    out.error(`Which style? \`${runCommand("style list")}\` shows them.`);
    return 2;
  }
  const mine = (await yourStyles()).find((s) => s.name === name);
  let chosen: EchoStyle | undefined = mine?.style;
  let from: AppliedStyle["from"] = "yours";
  let foundation: string | undefined;
  if (mine?.style) {
    const doc = join(mine.path.replace(/style\.json$/, ""), `${name}.md`);
    if (await exists(doc)) foundation = doc;
  } else if (mine?.needsRead) {
    // Its document is the foundation, and its index row the fingerprint: show those, and what it needs.
    const row = (await indexed()).get(name);
    out.line(`${bold(name)} ${dim("(your library, only its document)")}`);
    if (row) out.line(`${row.essence}\n${dim("Fingerprint")}  ${fingerprintText(row.fingerprint)}`);
    out.line(`${dim("Foundation")}  ${mine.path}`);
    out.line(dim(`${NEEDS_ECHO_PART}.`));
    out.result({ command: "style show", name, from: "yours", ready: false, foundation: mine.path, ...(row ? { fingerprint: row.fingerprint, essence: row.essence } : {}) });
    return 0;
  } else if (mine?.problems) {
    out.error(`Your ${name} has problems: ${mine.path}. \`${runCommand(`style check ${mine.path}`)}\` says what.`);
    return 1;
  } else {
    const config = await readConfig(options.root);
    const client = new RegistryClient(options.registry ?? config?.registry ?? DEFAULT_REGISTRY);
    try {
      chosen = await client.style(name);
      from = "echo";
    } catch (error) {
      out.error(`There's no style called ${name}.${error instanceof RegistryError && !/404|ENOENT/.test(error.message) ? ` (${error.message})` : ""}`);
      return 1;
    }
    // Echo's own style is written as a foundation in Design Eye's reference.
    if (name === "echo" && (await exists(join(options.root, DESIGN_EYE_REFERENCE)))) foundation = DESIGN_EYE_REFERENCE;
  }
  const s = chosen!;
  const device = deviceOf(s.seed);
  out.line(`${bold(s.title)} ${dim(`(${from === "echo" ? "Echo's library" : "your library"}, a ${device} device)`)}`);
  out.line(s.essence);
  out.line(`${dim("Fingerprint")}  ${fingerprintText(s.fingerprint)}`);
  out.line(`${dim("Settings")}  ${Object.entries(s.seed).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  for (const rule of s.rules ?? []) out.line(`  ${dim("rule")}  ${rule}`);
  for (const r of s.refusals ?? []) out.line(`  ${dim("refused")}  ${r.wants}: instead, ${r.instead}`);
  for (const f of s.fonts ?? []) out.line(`  ${dim("font")}  ${f.family} (${f.role}), from ${f.source}${f.url ? `: ${f.url}` : ""}`);
  for (const key of Object.keys(DECISIONS) as DecisionKey[]) if (s.decisions?.[key]) out.line(`  ${dim("decision")}  ${DECISIONS[key]}: ${s.decisions[key]}`);
  for (const k of s.keeps ?? []) out.line(`  ${dim("kept")}  ${k.rule}: ${k.reason}`);
  for (const b of policeStyle(s).banned) out.line(`  ${dim("police")}  stops ${b.name.toLowerCase()}: ${b.ingredients.join("; ")}`);
  if (s.motion) out.line(`  ${dim("motion")}  ${s.motion.character}${s.motion.inferred ? dim(" (inferred)") : ""}`);
  if (s.sound) out.line(`  ${dim("sound")}  ${s.sound.voice}${s.sound.inferred ? dim(" (inferred)") : ""}`);
  out.line(foundation ? `${dim("Foundation")}  ${foundation}` : dim("No foundation document with it."));
  out.result({ command: "style show", style: s, from, device, ...(foundation ? { foundation } : {}) });
  return 0;
}
