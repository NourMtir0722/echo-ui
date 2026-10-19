/**
 * Under the crowd, the line said supporters leave their name and
 * links "on the payment page". That was a field on Stripe's page, taken off
 * the payment links so paying stays an email and a card; the name and links
 * are asked for on the thank-you page right after (supporters/Welcome.tsx).
 * Someone looking for the field on Stripe's page would find none, and think
 * they'd missed their chance to be on the island.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const crowd = readFileSync(new URL("./Crowd.tsx", import.meta.url), "utf8");

test("the crowd says a supporter names their Echo right after paying, not on the payment page", () => {
  assert.doesNotMatch(crowd, /on the payment page/, "the payment page asks for an email and a card, nothing more");
  assert.match(crowd, /right after paying/);
});
