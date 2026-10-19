import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SCHEMA_VERSION,
  coreRange,
  eName,
  hashContent,
  hashItemFiles,
  isSafeItemPath,
  pendingVersion,
  rangeAdmits,
  resolveItemVersion,
} from "./e-format";

/**
 * The `/e/` format is the public contract: once a URL is out
 * there it stays, and what a user installed has to stay resolvable. These are
 * the rules the build depends on, tested apart from the build.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = resolve(root, "apps/www/public/e");

test("hashes ignore line endings, so a CRLF checkout matches a LF one", () => {
  assert.equal(hashContent("a\r\nb\r\n"), hashContent("a\nb\n"));
  assert.notEqual(hashContent("a\nb"), hashContent("a\nc"));
});

test("an item's hash covers its paths as well as its contents", () => {
  const a = [{ path: "tabs/tabs.tsx", content: "x" }];
  const b = [{ path: "tabs/other.tsx", content: "x" }];
  assert.notEqual(hashItemFiles(a), hashItemFiles(b));
  // Order doesn't matter: the same files listed differently are the same item.
  const two = [
    { path: "a.tsx", content: "1" },
    { path: "b.tsx", content: "2" },
  ];
  assert.equal(hashItemFiles(two), hashItemFiles([...two].reverse()));
});

test("a file path that escapes the Echo folder is refused", () => {
  for (const bad of ["../secrets.txt", "/etc/passwd", "C:\\Windows\\system32", "tabs/../../x", "", "a/./b", "a//b"]) {
    assert.equal(isSafeItemPath(bad), false, `${bad} should be refused`);
  }
  for (const good of ["tabs/tabs.tsx", "theme/index.ts", "a-b/c_d.css"]) {
    assert.equal(isSafeItemPath(good), true, `${good} should be allowed`);
  }
});

test("the pending version follows the changelog's DECLARED bumps", () => {
  const added = [{ category: "Added", entries: [{ bump: "minor" as const }] }];
  const fixedOnly = [{ category: "Fixed", entries: [{ bump: "patch" as const }] }];
  const breaking = [{ category: "Changed", entries: [{ bump: "breaking" as const }] }];
  // 0.x: a breaking change bumps the minor, not the major.
  assert.equal(pendingVersion("0.1.0", added), "0.2.0");
  assert.equal(pendingVersion("0.1.0", fixedOnly), "0.1.1");
  assert.equal(pendingVersion("0.1.0", breaking), "0.2.0");
  assert.equal(pendingVersion("1.4.2", fixedOnly), "1.4.3");
  assert.equal(pendingVersion("1.4.2", added), "1.5.0");
  assert.equal(pendingVersion("1.4.2", breaking), "2.0.0");
  // Nothing unreleased, nothing pending: the release main deploys is the last one.
  assert.equal(pendingVersion("0.3.0", []), "0.3.0");
  assert.equal(pendingVersion("0.3.0", [{ category: "Fixed", entries: [] }]), "0.3.0");
});

/**
 * The classification is DECLARED, so prose that merely describes a
 * breaking change no longer causes one, and a `minor` entry filed under Fixed
 * is still a minor. Both of these were wrong before: the old version ran
 * `/\*\*breaking/i` over the joined text of the whole section.
 */
test("the bump comes from the declaration, not from the prose", () => {
  const describesOne = [
    { category: "Fixed", entries: [{ bump: "patch" as const, text: "Undoes the **Breaking** change from 0.1.0." }] },
  ];
  assert.equal(pendingVersion("0.1.0", describesOne), "0.1.1");

  const minorUnderFixed = [{ category: "Fixed", entries: [{ bump: "minor" as const }] }];
  assert.equal(pendingVersion("0.1.0", minorUnderFixed), "0.2.0");
});

/**
 * The release takes the STRONGEST bump any entry declares — one breaking entry
 * among twenty patches is a breaking release. What it must not do any more is
 * the reverse: apply that classification to items the entry never named.
 */
test("the release takes the strongest bump declared", () => {
  const mixed = [
    { category: "Fixed", entries: [{ bump: "patch" as const }, { bump: "patch" as const }] },
    { category: "Changed", entries: [{ bump: "patch" as const }, { bump: "breaking" as const }] },
  ];
  assert.equal(pendingVersion("1.4.2", mixed), "2.0.0");
});

test("an unchanged item keeps the version it was published under", () => {
  const recorded = { version: "0.1.0", hash: "abc" };
  assert.deepEqual(resolveItemVersion("tabs", "abc", recorded, "0.2.0", false), {
    version: "0.1.0",
    changed: false,
  });
});

test("a changed item with nothing in the changelog is refused", () => {
  const result = resolveItemVersion("tabs", "new-hash", { version: "0.1.0", hash: "old" }, "0.2.0", false);
  assert.equal(result.changed, true);
  assert.match(result.error ?? "", /CHANGELOG/);
  // …and is fine once the changelog says what changed.
  const told = resolveItemVersion("tabs", "new-hash", { version: "0.1.0", hash: "old" }, "0.2.0", true);
  assert.deepEqual(told, { version: "0.2.0", changed: true });
});

test("the core range is the 0.x band the item was built against", () => {
  assert.equal(coreRange("0.1.0"), ">=0.1.0 <0.2.0");
  assert.equal(coreRange("0.4.2"), ">=0.4.2 <0.5.0");
  assert.equal(coreRange("1.2.0"), ">=1.2.0 <2.0.0");
});

/**
 * Reviewing the smoke check raised `rangeAdmits` stripping prereleases as a bug: no
 * plain semver range admits `0.1.0-rc.1`. It is not one, and this is the test
 * that says so before someone "fixes" it into a false alarm.
 *
 * The question this helper answers is not "what would node-semver say" — it is
 * "would `echo-ui-cli add` accept this core". That answer belongs to
 * `satisfies` in `packages/client/src/index.ts`, whose `parseVersion` reads
 * `^(\d+)\.(\d+)\.(\d+)` and ignores the suffix the same way. Measured
 * 2026-09-20: the two agree on `0.1.0-rc.1`, `0.2.0-rc.1`, `0.1.5` and `0.0.1`
 * against `>=0.1.0 <0.2.0`. Diverging here would make the smoke check report a
 * broken install that installs fine.
 */
test("the core range answers what the CLI would accept, prereleases included", () => {
  const range = coreRange("0.1.0");
  assert.equal(rangeAdmits(range, "0.1.0-rc.1"), true, "the CLI's `satisfies` installs this; so must this say so");
  assert.equal(rangeAdmits(range, "0.2.0-rc.1"), false, "the upper bound still holds against a prerelease");
  assert.equal(rangeAdmits(range, "0.1.5"), true);
  assert.equal(rangeAdmits(range, "0.0.1"), false);
});

test("`echo-` is not part of a name in /e/", () => {
  assert.equal(eName("echo-tabs"), "tabs");
  assert.equal(eName("use-gsap-presence"), "use-gsap-presence");
});

/* ------------------------------------------------------- the built output */

const built = existsSync(resolve(outDir, "index.json"));
const read = (file: string) => JSON.parse(readFileSync(resolve(outDir, file), "utf8"));

test("every item in the index resolves, at its own version, with verifiable files", { skip: !built }, () => {
  const index = read("index.json");
  assert.equal(index.schemaVersion, SCHEMA_VERSION);
  assert.ok(index.items.length > 40, `only ${index.items.length} items in the index`);

  for (const entry of index.items) {
    const item = read(`${entry.name}.json`);
    const pinned = read(`${entry.name}@${entry.version}.json`);
    assert.equal(item.version, entry.version, `${entry.name}: index and item disagree on the version`);
    assert.deepEqual(pinned, item, `${entry.name}@${entry.version} differs from the latest file`);

    for (const file of item.files) {
      assert.ok(isSafeItemPath(file.path), `${entry.name}: unsafe path ${file.path}`);
      assert.equal(hashContent(file.content), file.sha256, `${entry.name}: ${file.path} does not match its hash`);
    }
    for (const dep of item.items) {
      assert.ok(
        index.items.some((i: { name: string }) => i.name === dep),
        `${entry.name} needs ${dep}, which is not in the index`,
      );
    }
    assert.match(item.core, /^>=\d+\.\d+\.\d+ <\d+\.\d+\.\d+$/, `${entry.name}: core range looks wrong`);
    assert.equal(item.a11y.standard, "WCAG 2.2 AA");
  }
});

test("item-versions.json matches what was built", { skip: !built }, () => {
  const versions = JSON.parse(readFileSync(resolve(root, "registry/item-versions.json"), "utf8"));
  const index = read("index.json");
  for (const entry of index.items) {
    const record = versions.items[`echo-${entry.name}`] ?? versions.items[entry.name];
    assert.ok(record, `${entry.name} has no recorded version`);
    assert.equal(record.version, entry.version, `${entry.name}: recorded version differs from the built one`);
  }
});
