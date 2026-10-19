/**
 * The Stripe key had been added in the Worker's settings as a text
 * variable, not a secret, and `wrangler deploy` replaces a Worker's variables
 * with wrangler.jsonc's, so the next deploy erased it. Every supporter after
 * that got "can't reach Echo's server" on the thank-you page. Secrets survive a
 * deploy; the deploy now refuses until the key is one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { missing } from "./deploy";

test("a deploy refuses while STRIPE_KEY isn't one of the Worker's secrets", () => {
  const all = ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET", "SUPPORTER_SALT"].map((name) => ({ name, type: "secret_text" }));
  assert.deepEqual(missing([]), ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET", "SUPPORTER_SALT"]);
  assert.deepEqual(missing([{ name: "OTHER", type: "secret_text" }, ...all.slice(1)]), ["STRIPE_KEY"]);
  assert.deepEqual(missing("not a list"), ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET", "SUPPORTER_SALT"]);
  assert.deepEqual(missing(all), []);
  // The one way to deploy goes through the check.
  const scripts = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> }).scripts;
  assert.equal(scripts["deploy:worker"], "tsx src/deploy.ts");
});
