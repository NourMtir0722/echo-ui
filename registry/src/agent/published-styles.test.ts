import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEchoTheme } from "echo-ui-core/theme";

import { PUBLISHED_STYLES } from "./published-styles";
import { policeStyle } from "./slop";
import { parseStyle } from "./style-schema";

const folder = join(dirname(fileURLToPath(import.meta.url)), "../../styles");

test("the site's styles are every file the registry publishes, Echo's own first", () => {
  const files = readdirSync(folder).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  assert.deepEqual([...PUBLISHED_STYLES.map((s) => s.name)].sort(), files.sort());
  assert.equal(PUBLISHED_STYLES[0]!.name, "echo");
});

/**
 * A published style is a promise to everyone who wears it, so each one is
 * held to what `style check` asks of a builder's: it reads as a style, the
 * slop police lets it through, and nothing in its theme is hard to read.
 */
test("every published style is one Echo can apply, that the police lets through, with nothing hard to read", () => {
  for (const style of PUBLISHED_STYLES) {
    const read = parseStyle(JSON.parse(JSON.stringify(style)));
    assert.deepEqual(read.problems, [], style.name);
    assert.deepEqual(policeStyle(style).banned.map((b) => b.name), [], style.name);
    const { report } = createEchoTheme(style.seed, { quiet: true });
    assert.deepEqual(report.readability.filter((n) => n.level === "fail").map((n) => n.message), [], style.name);
  }
});
