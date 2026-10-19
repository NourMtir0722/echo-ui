import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { run } from "./index";
import { diffLines, diffStat, unifiedDiff } from "./diff";
import { hashContent, type EItem, type EIndex } from "@echo-ui/client";

/**
 * `diff` and `update`, run the way a user runs them.
 *
 * The fixture is the real `/e/` this repo builds, copied into a temp folder so
 * a version can be moved forward — which is the whole point. Nothing here
 * simulates a bump by patching the lock file: the registry genuinely serves a
 * newer item, the way it will the first time a fix lands after launch.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const registryDir = resolve(repoRoot, "apps/www/public/e");
const built = await access(join(registryDir, "index.json")).then(() => true, () => false);
/**
 * The core this workspace builds, which is what every built item declares. A
 * fixture that means "the core you already have" must say this, not a literal:
 * `^0.1.0` was right until 0.2.0 shipped and then broke two tests.
 */
const coreVersion: string = JSON.parse(await readFile(resolve(repoRoot, "packages/core/package.json"), "utf8")).version;
const exists = (path: string) => access(path).then(() => true, () => false);

/**
 * What the registry serves an item at today, and the release after it: what a
 * test installs, and what it publishes on top. Never literals: these said
 * 0.2.0 and 0.3.0, and the day the registry released 0.3.0 the "newer"
 * version was the one already installed.
 */
const served = (name: string): string =>
  built ? (JSON.parse(readFileSync(join(registryDir, `${name}.json`), "utf8")) as EItem).version : "0.0.0";
const releaseAfter = (version: string): string => {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return `${major}.${minor + 1}.0`;
};
const NOW = { badge: served("badge"), avatar: served("avatar") };
const NEXT = { badge: releaseAfter(NOW.badge), avatar: releaseAfter(NOW.avatar) };

/* ------------------------------------------------------------------ the diff */

test("a diff is the lines that changed, with the lines around them", () => {
  const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n") + "\n";
  const after = before.replace("line 10\n", "LINE 10\n");
  const text = unifiedDiff(before, after)!;
  assert.match(text, /^--- a\n\+\+\+ b\n@@ /);
  assert.ok(text.includes("-line 10"), "the line that left");
  assert.ok(text.includes("+LINE 10"), "the line that arrived");
  assert.ok(text.includes(" line 7"), "three lines of context above");
  assert.ok(text.includes(" line 13"), "three lines of context below");
  assert.ok(!text.includes(" line 6"), "and not a fourth");
  assert.ok(!text.includes(" line 14"), "on either side");
  assert.deepEqual(diffStat(before, after), { added: 1, removed: 1 });
});

test("identical files have no diff at all, not an empty one", () => {
  assert.equal(unifiedDiff("same\n", "same\n"), undefined);
  // CRLF is not a change: the registry hashes LF-normalised, so the diff must
  // agree or every Windows checkout reads as rewritten.
  assert.equal(unifiedDiff("a\r\nb\r\n", "a\nb\n"), undefined);
});

test("an insertion and a deletion are told apart", () => {
  assert.deepEqual(diffStat("a\nb\n", "a\nx\nb\n"), { added: 1, removed: 0 });
  assert.deepEqual(diffStat("a\nx\nb\n", "a\nb\n"), { added: 0, removed: 1 });
  assert.deepEqual(diffStat("", "a\n"), { added: 1, removed: 0 });
  assert.deepEqual(diffStat("a\n", ""), { added: 0, removed: 1 });
  assert.deepEqual(diffLines("a\n", "a\n"), [{ kind: "same", line: "a" }]);
});

test("two changes far apart are two hunks, not one", () => {
  const before = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n") + "\n";
  const after = before.replace("line 2\n", "LINE 2\n").replace("line 35\n", "LINE 35\n");
  const text = unifiedDiff(before, after)!;
  assert.equal((text.match(/^@@ /gm) ?? []).length, 2);
});

/* ------------------------------------------------------- a registry that moves */

/** A Next.js app with nothing in it, which is what `init` expects to meet. */
async function fixtureApp(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-update-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "18.3.1" } }, null, 2),
  );
  await writeFile(join(root, "tsconfig.json"), "{}\n");
  await mkdir(join(root, "src"), { recursive: true });
  return root;
}

/** A private copy of the real registry, so a test can move a version forward. */
async function fixtureRegistry(): Promise<{ dir: string; url: string }> {
  const dir = await mkdtemp(join(tmpdir(), "echo-registry-"));
  await cp(registryDir, dir, { recursive: true });
  return { dir, url: pathToFileURL(dir + "/").href.replace(/\/$/, "") };
}

/**
 * Publish a new version of one item: change its first file, re-hash it, and
 * move the version in both the item and the index. This is exactly the shape
 * of every real bump, which is why the test does it rather than faking it.
 */
async function bump(dir: string, name: string, to: string): Promise<string> {
  const path = join(dir, `${name}.json`);
  const item = JSON.parse(await readFile(path, "utf8")) as EItem;
  const file = item.files[0]!;
  file.content = `// a fix that landed after you installed\n${file.content}`;
  file.sha256 = hashContent(file.content);
  item.version = to;
  await writeFile(path, `${JSON.stringify(item, null, 2)}\n`);

  const indexPath = join(dir, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as EIndex;
  const entry = index.items.find((i) => i.name === name);
  if (entry) entry.version = to;
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  return file.path;
}

/**
 * The `--json` envelope, as far as these tests read it. Loose on purpose: the
 * point is to assert the fields the commands promise, not to restate the whole
 * shape in a second place that can drift from the first.
 */
interface JsonResult {
  items?: { name: string; state: string; latest?: string; files: { path: string; state: string }[] }[];
  updated?: { name: string; from: string; to: string }[];
  skipped?: { name: string; state: string }[];
  dryRun?: boolean;
}

/** The CLI, with stdout captured so `--json` can be read back. */
async function json(root: string, registry: string, args: string[]): Promise<{ code: number; out: JsonResult }> {
  const lines: string[] = [];
  const log = console.log;
  console.log = (...parts: unknown[]) => void lines.push(parts.join(" "));
  try {
    const code = await run([...args, "--json", "--cwd", root, "--registry", registry, "--skip-install"]);
    return { code, out: lines.length ? (JSON.parse(lines.join("\n")) as JsonResult) : {} };
  } finally {
    console.log = log;
  }
}

/** The CLI in human mode, with everything it printed. */
async function text(root: string, registry: string, args: string[]): Promise<{ code: number; out: string }> {
  const lines: string[] = [];
  const log = console.log;
  const warn = console.warn;
  console.log = (...parts: unknown[]) => void lines.push(parts.join(" "));
  console.warn = (...parts: unknown[]) => void lines.push(parts.join(" "));
  try {
    const code = await run([...args, "--cwd", root, "--registry", registry, "--skip-install"]);
    return { code, out: lines.join("\n") };
  } finally {
    console.log = log;
    console.warn = warn;
  }
}

/* --------------------------------------------------------------- the commands */

test("diff on a fresh install says everything is current", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "badge"]);
    const { code, out } = await json(app, registry.url, ["diff"]);
    assert.equal(code, 0);
    assert.ok(out.items!.length >= 1);
    for (const item of out.items!) assert.equal(item.state, "current", item.name);
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("diff before an install explains what to run first", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    assert.equal((await text(app, registry.url, ["diff"])).code, 1, "no echo.json");
    await json(app, registry.url, ["init", "--yes"]);
    const empty = await text(app, registry.url, ["diff"]);
    assert.equal(empty.code, 0);
    assert.match(empty.out, /Nothing installed yet/);
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test(
  "one item edited, one not, and a registry that moved",
  { skip: !built },
  async () => {
    const app = await fixtureApp();
    const registry = await fixtureRegistry();
    try {
      await json(app, registry.url, ["init", "--yes"]);
      await json(app, registry.url, ["add", "badge", "avatar"]);
      const dir = join(app, "src/components/echo");

      // The user changes one of them.
      const mine = join(dir, "badge/badge.tsx");
      const edited = `${await readFile(mine, "utf8")}\n// my change\n`;
      await writeFile(mine, edited);

      // Echo ships a fix for both. Note WHERE badge's lands: in its CSS, not
      // in the .tsx the user edited. That is the ordinary case — the user changes
      // one file of an item and Echo changes another — and it is the case a
      // single worst-state ranking gets wrong, so the test uses it on purpose.
      const badgeFile = await bump(registry.dir, "badge", NEXT.badge);
      const avatarFile = await bump(registry.dir, "avatar", NEXT.avatar);
      assert.notEqual(badgeFile, "badge/badge.tsx", "the fix is in a file the user did not touch");

      /* diff names the edited file and says what each item is */
      const listing = await json(app, registry.url, ["diff"]);
      const byName = Object.fromEntries(listing.out.items!.map((i) => [i.name, i]));
      assert.equal(byName.badge!.state, "edited-behind", "edited in one file, behind in another");
      assert.equal(byName.avatar!.state, "behind", "untouched, and Echo moved on");
      assert.equal(byName.badge!.latest, NEXT.badge);
      assert.ok(
        byName.badge!.files.some((f) => f.path === "badge/badge.tsx"),
        "the edited file is named",
      );

      const detail = await text(app, registry.url, ["diff", "badge"]);
      assert.match(detail.out, /badge\/badge\.tsx/, "the file the user edited is named");
      assert.match(detail.out, /-\/\/ my change/, "their line is shown as one that would go");
      assert.match(detail.out, /\+\/\/ a fix that landed after you installed/, "and Echo's as one that would arrive");

      /* update takes both: the edited item keeps its edit, and takes the fix in its other file */
      const updated = await json(app, registry.url, ["update"]);
      assert.equal(updated.code, 0);
      assert.deepEqual(
        updated.out.updated!.map((u) => u.name),
        ["avatar", "badge"],
      );
      assert.deepEqual(updated.out.skipped, []);

      assert.equal(await readFile(mine, "utf8"), edited, "the edited file is untouched, byte for byte");
      assert.match(
        await readFile(join(dir, badgeFile), "utf8"),
        /^\/\/ a fix that landed after you installed/,
        "and the file Echo fixed took the fix",
      );
      assert.match(
        await readFile(join(dir, avatarFile), "utf8"),
        /^\/\/ a fix that landed after you installed/,
        "the untouched item took the fix",
      );

      const lock = JSON.parse(await readFile(join(app, "echo-lock.json"), "utf8"));
      assert.equal(lock.items.avatar.version, NEXT.avatar, "the lock moved with the file");
      assert.equal(lock.items.badge.version, NEXT.badge, `and with the edited one, whose edit reads as an edit on ${NEXT.badge}`);
      const status = await json(app, registry.url, ["diff"]);
      assert.equal(status.out.items!.find((i) => i.name === "badge")!.state, "edited");

      /* a second run has nothing left to do */
      const again = await json(app, registry.url, ["update"]);
      assert.deepEqual(again.out.updated, []);
      assert.deepEqual(again.out.skipped, []);

      /* --overwrite is how you say "take it anyway" */
      const forced = await json(app, registry.url, ["update", "badge", "--overwrite"]);
      assert.deepEqual(
        forced.out.updated!.map((u) => u.name),
        ["badge"],
      );
      assert.doesNotMatch(await readFile(mine, "utf8"), /my change/, "their edit is gone, because they asked");
      assert.match(
        await readFile(join(dir, badgeFile), "utf8"),
        /^\/\/ a fix that landed after you installed/,
        "and Echo's fix is in",
      );
      const after = JSON.parse(await readFile(join(app, "echo-lock.json"), "utf8"));
      assert.equal(after.items.badge.version, NEXT.badge);
    } finally {
      await rm(app, { recursive: true, force: true });
      await rm(registry.dir, { recursive: true, force: true });
    }
  },
);

/* ----------------------------------------------- merging your edits with Echo's */

/** Echo's version of one item's file, changed by `edit`, published as a new version. */
async function publish(dir: string, name: string, to: string, path: string, edit: (content: string) => string): Promise<void> {
  const itemPath = join(dir, `${name}.json`);
  const item = JSON.parse(await readFile(itemPath, "utf8")) as EItem;
  const file = item.files.find((f) => f.path === path)!;
  file.content = edit(file.content);
  file.sha256 = hashContent(file.content);
  item.version = to;
  await writeFile(itemPath, `${JSON.stringify(item, null, 2)}\n`);
  const indexPath = join(dir, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as EIndex;
  index.items.find((i) => i.name === name)!.version = to;
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

interface Conflicts {
  conflicts?: { name: string; files: { path: string; hunks: { mine: { from: number; to: number } }[] }[] }[];
  updated?: { name: string; merged?: string[] }[];
  skipped?: { name: string; reason?: string; files?: string[] }[];
}

/** An app with badge installed, and the path of the file both sides are about to change. */
async function badgeApp(registryUrl: string) {
  const app = await fixtureApp();
  await json(app, registryUrl, ["init", "--yes"]);
  await json(app, registryUrl, ["add", "badge"]);
  const lock = JSON.parse(await readFile(join(app, "echo-lock.json"), "utf8"));
  const path = Object.keys(lock.items.badge.files).find((f) => f.endsWith(".tsx"))!;
  return { app, path, file: join(app, "src/components/echo", path) };
}

test("your edits and Echo's change in one file, far apart, merge", { skip: !built }, async () => {
  const registry = await fixtureRegistry();
  const { app, path, file } = await badgeApp(registry.url);
  try {
    await writeFile(file, `${await readFile(file, "utf8")}// mine, at the end\n`);
    await publish(registry.dir, "badge", NEXT.badge, path, (c) => `// Echo's, at the top\n${c}`);

    const { code, out } = await json(app, registry.url, ["update"]);
    assert.equal(code, 0);
    const result = out as JsonResult & Conflicts;
    assert.deepEqual(result.updated, [{ name: "badge", from: NOW.badge, to: NEXT.badge, merged: [path] }]);
    const merged = await readFile(file, "utf8");
    assert.match(merged, /^\/\/ Echo's, at the top\n/, "Echo's change is in");
    assert.match(merged, /\/\/ mine, at the end\n$/, "and yours stayed");

    const lock = JSON.parse(await readFile(join(app, "echo-lock.json"), "utf8"));
    const latest = JSON.parse(await readFile(join(registry.dir, "badge.json"), "utf8")) as EItem;
    assert.equal(lock.items.badge.version, NEXT.badge);
    assert.equal(lock.items.badge.files[path], latest.files.find((f) => f.path === path)!.sha256, "the lock has Echo's hash, so yours reads as an edit");
    assert.equal((await json(app, registry.url, ["diff"])).out.items![0]!.state, "edited");
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("where your edits and Echo's meet, nothing of the item is written, and the lines are shown until you bring them together", { skip: !built }, async () => {
  const registry = await fixtureRegistry();
  const { app, path, file } = await badgeApp(registry.url);
  try {
    const installed = await readFile(file, "utf8");
    const [first] = installed.split("\n");
    const mine = installed.replace(`${first}\n`, `${first} // mine\n`);
    await writeFile(file, mine);
    await publish(registry.dir, "badge", NEXT.badge, path, (c) => c.replace(`${first}\n`, `${first} // Echo's\n`));
    const lockBefore = await readFile(join(app, "echo-lock.json"), "utf8");

    const { code, out } = await json(app, registry.url, ["update"]);
    assert.equal(code, 0);
    const result = out as JsonResult & Conflicts;
    assert.deepEqual(result.updated, []);
    assert.equal(result.conflicts![0]!.name, "badge");
    assert.equal(result.conflicts![0]!.files[0]!.path, path);
    assert.deepEqual(result.conflicts![0]!.files[0]!.hunks[0]!.mine, { from: 1, to: 1, lines: [`${first} // mine\n`] });
    assert.equal(await readFile(file, "utf8"), mine, "your file is as you left it");
    assert.equal(await readFile(join(app, "echo-lock.json"), "utf8"), lockBefore, "and so is the lock");

    const shown = await text(app, registry.url, ["update"]);
    assert.match(shown.out, new RegExp(`<<<<<<< yours, line 1\\n.*\\/\\/ mine\\n +\\|{7} as installed, ${NOW.badge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n.*\\n +=======\\n.*\\/\\/ Echo's\\n +>>>>>>> Echo ${NEXT.badge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(shown.out, /run `npx echo-ui-cli update badge` again/);

    // Brought together by hand: Echo's line and yours.
    await writeFile(file, installed.replace(`${first}\n`, `${first} // Echo's\n// and mine\n`));
    const again = await json(app, registry.url, ["update"]);
    assert.deepEqual((again.out as Conflicts).updated, [{ name: "badge", from: NOW.badge, to: NEXT.badge, merged: [path] }]);
    assert.match(await readFile(file, "utf8"), /\/\/ Echo's\n\/\/ and mine\n/, "what you brought together is what stays");
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("with no copy of the installed version to merge against, update leaves the item and says why", { skip: !built }, async () => {
  const registry = await fixtureRegistry();
  const { app, path, file } = await badgeApp(registry.url);
  try {
    const mine = `${await readFile(file, "utf8")}// mine\n`;
    await writeFile(file, mine);
    await publish(registry.dir, "badge", NEXT.badge, path, (c) => `// Echo's\n${c}`);
    await rm(join(registry.dir, `badge@${NOW.badge}.json`));

    const { out } = await json(app, registry.url, ["update"]);
    const result = out as JsonResult & Conflicts;
    assert.deepEqual(result.updated, []);
    assert.deepEqual(result.skipped, [{ name: "badge", state: "edited-behind", reason: "nothing to merge against", files: [path] }]);
    assert.equal(await readFile(file, "utf8"), mine);
    const shown = await text(app, registry.url, ["update"]);
    assert.match(shown.out, /no copy of the version you installed to merge against/);
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("a merge puts back a file you deleted, and merges the one you edited", { skip: !built }, async () => {
  const registry = await fixtureRegistry();
  const { app, path, file } = await badgeApp(registry.url);
  try {
    const lock = JSON.parse(await readFile(join(app, "echo-lock.json"), "utf8"));
    const other = Object.keys(lock.items.badge.files).find((f) => f !== path)!;
    await rm(join(app, "src/components/echo", other));
    await writeFile(file, `${await readFile(file, "utf8")}// mine\n`);
    await publish(registry.dir, "badge", NEXT.badge, path, (c) => `// Echo's\n${c}`);

    const { out } = await json(app, registry.url, ["update"]);
    assert.deepEqual((out as Conflicts).updated, [{ name: "badge", from: NOW.badge, to: NEXT.badge, merged: [path] }]);
    assert.ok(await exists(join(app, "src/components/echo", other)), "the deleted file is back");
    assert.match(await readFile(file, "utf8"), /^\/\/ Echo's\n[\s\S]*\/\/ mine\n$/);
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("a dry-run update writes nothing at all", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "avatar"]);
    const file = await bump(registry.dir, "avatar", NEXT.avatar);
    const before = await readFile(join(app, "src/components/echo", file), "utf8");
    const lockBefore = await readFile(join(app, "echo-lock.json"), "utf8");

    const dry = await json(app, registry.url, ["update", "--dry-run"]);
    assert.equal(dry.code, 0);
    assert.equal(dry.out.dryRun, true);
    assert.deepEqual(
      dry.out.updated!.map((u) => u.name),
      ["avatar"],
    );
    assert.equal(await readFile(join(app, "src/components/echo", file), "utf8"), before, "the file is untouched");
    assert.equal(await readFile(join(app, "echo-lock.json"), "utf8"), lockBefore, "and so is the lock");
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("a file Echo wrote and the user deleted comes back", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "avatar"]);
    const file = await bump(registry.dir, "avatar", NEXT.avatar);
    const path = join(app, "src/components/echo", file);
    await rm(path);

    const listing = await json(app, registry.url, ["diff"]);
    const avatar = listing.out.items!.find((i) => i.name === "avatar");
    assert.ok(
      avatar!.files.some((f) => f.path === file && f.state === "missing"),
      "diff says it is gone",
    );

    await json(app, registry.url, ["update"]);
    assert.ok(await exists(path), "update put it back");
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("update refuses when the new version needs a core this project lacks", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    // The project declares the core it has today, the way a real one does
    // (this was a literal `^0.1.0`, stale from the day 0.2.0 shipped).
    const pkg = JSON.parse(await readFile(join(app, "package.json"), "utf8"));
    pkg.dependencies["echo-ui-core"] = `^${coreVersion}`;
    await writeFile(join(app, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "avatar"]);
    const file = await bump(registry.dir, "avatar", NEXT.avatar);

    // The new version wants a core nobody has.
    const path = join(registry.dir, "avatar.json");
    const item = JSON.parse(await readFile(path, "utf8")) as EItem;
    item.core = ">=9.0.0 <10.0.0";
    await writeFile(path, `${JSON.stringify(item, null, 2)}\n`);

    const before = await readFile(join(app, "src/components/echo", file), "utf8");
    const refused = await text(app, registry.url, ["update"]);
    assert.equal(refused.code, 1);
    assert.equal(
      await readFile(join(app, "src/components/echo", file), "utf8"),
      before,
      "nothing was written",
    );
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

test("a name that is not installed is a refusal, not a silent no-op", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  try {
    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "avatar"]);
    assert.equal((await text(app, registry.url, ["diff", "badge"])).code, 1);
    assert.equal((await text(app, registry.url, ["update", "badge"])).code, 1);
  } finally {
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
});

/**
 * The CLI told people to type `echo-ui update` and `echo-ui diff
 * badge`. The package installs `echo-ui` into `node_modules/.bin`, which no
 * shell has on its PATH, so the line it printed failed with "command not
 * found" for anyone who hadn't installed the CLI globally — including every
 * agent. Every command it prints is now the `npx echo-ui-cli` form.
 */
test("every command the CLI tells you to type is one that runs", { skip: !built }, async () => {
  const app = await fixtureApp();
  const registry = await fixtureRegistry();
  const printed: string[] = [];
  const saved = { log: console.log, warn: console.warn, error: console.error };
  try {
    await json(app, registry.url, ["init", "--yes"]);
    await json(app, registry.url, ["add", "badge", "avatar"]);
    const mine = join(app, "src/components/echo/badge/badge.tsx");
    await writeFile(mine, `${await readFile(mine, "utf8")}\n// my change\n`);
    await bump(registry.dir, "badge", NEXT.badge);
    await bump(registry.dir, "avatar", NEXT.avatar);

    for (const method of ["log", "warn", "error"] as const) {
      console[method] = (...parts: unknown[]) => void printed.push(parts.join(" "));
    }
    const cli = (args: string[]) => run([...args, "--cwd", app, "--registry", registry.url, "--skip-install"]);
    await cli(["diff"]);
    await cli(["update"]);
    await cli(["diff", "not-installed"]);
  } finally {
    Object.assign(console, saved);
    await rm(app, { recursive: true, force: true });
    await rm(registry.dir, { recursive: true, force: true });
  }
  const bare = printed.filter((line) => /(?<![\w./-])echo-ui (init|add|list|diff|update|which|docs|check|remove)\b/.test(line));
  assert.deepEqual(bare, [], "lines that tell you to run a command no shell can find");
  assert.ok(printed.some((line) => /npx echo-ui-cli (diff|update)/.test(line)), "the advice is still there");
});

test("the update tests install what the registry serves and publish the release after it", { skip: !built }, () => {
  for (const name of ["badge", "avatar"] as const) {
    assert.match(NOW[name], /^\d+\.\d+\.\d+$/);
    assert.notEqual(NEXT[name], NOW[name], `${name}'s published version is newer than the one installed`);
  }
});
