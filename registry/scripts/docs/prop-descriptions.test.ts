/**
 * 252 of the catalog's 1,182 props said nothing about themselves, and
 * about 120 of them were Echo's own: `feel` on six of the morph buttons (whose
 * meaning Morph's own meta already gave), `size` and `variant` across the
 * library, `cells`, `defaultUsed`, every seed field on `echo-theme` (the docs
 * site had text for each, but the catalog an agent reads through
 * `get_component` and `docs` didn't). A person on the site got more than the
 * agent the docs are meant for.
 *
 * A prop may go without a description only when its meaning is the platform's:
 * an HTML attribute, an ARIA name, or React's controlled-state pair, which the
 * component passes through and every reader already knows.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ALL_METAS } from "../../src/agent/metas";
import { describeProps } from "../../src/agent/props";

const THE_PLATFORMS = new Set([
  // HTML attributes and events a control passes through.
  "id",
  "name",
  "form",
  "disabled",
  "required",
  "readOnly",
  "autoFocus",
  "placeholder",
  "maxLength",
  "minLength",
  "min",
  "max",
  "step",
  "className",
  "style",
  "children",
  "ref",
  "onBlur",
  "onFocus",
  "onKeyDown",
  "onClick",
  "onPointerUp",
  // ARIA.
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-current",
  // React's controlled-state pairs.
  "value",
  "defaultValue",
  "onValueChange",
  "checked",
  "defaultChecked",
  "onCheckedChange",
  "open",
  "defaultOpen",
  "onOpenChange",
]);

test("every prop of Echo's own says what it does", () => {
  const silent: string[] = [];
  for (const meta of ALL_METAS) {
    for (const prop of describeProps(meta.props)) {
      if (!prop.description && !THE_PLATFORMS.has(prop.name)) silent.push(`${meta.name}: ${prop.name}`);
    }
  }
  assert.deepEqual(silent, [], `\n${silent.length} prop(s) with no description:\n  ${silent.join("\n  ")}\n`);
});
