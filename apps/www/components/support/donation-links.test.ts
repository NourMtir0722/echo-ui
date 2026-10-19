import { test } from "node:test";
import assert from "node:assert/strict";
import { DONATION_LINKS, MANAGE_URL, amountsFor, donationsOpen, type Frequency } from "./donation-links";

const everyLink = () =>
  (Object.keys(DONATION_LINKS) as Frequency[]).flatMap((frequency) =>
    Object.entries(DONATION_LINKS[frequency]).map(([amount, url]) => ({ label: `${frequency} $${amount}`, url: url! })),
  );

test("every support link is a live Stripe payment link over https", () => {
  for (const { label, url } of everyLink()) {
    const u = new URL(url);
    assert.equal(u.protocol, "https:", `${label}: ${url}`);
    assert.equal(u.hostname, "buy.stripe.com", `${label} is not a Stripe payment link: ${url}`);
    // A link made in test mode takes no real money.
    assert.ok(!u.pathname.startsWith("/test_"), `${label} is a test-mode link: ${url}`);
  }
});

test("no two amounts share a link, so none charges another's price", () => {
  const seen = new Map<string, string>();
  for (const { label, url } of everyLink()) {
    assert.ok(!seen.has(url), `${label} and ${seen.get(url)} share ${url}`);
    seen.set(url, label);
  }
});

test("monthly supporters manage their support on Stripe's live customer portal", () => {
  const u = new URL(MANAGE_URL);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "billing.stripe.com");
  assert.ok(u.pathname.startsWith("/p/login/"), MANAGE_URL);
  assert.ok(!u.pathname.includes("test_"), `the portal link is test mode: ${MANAGE_URL}`);
});

test("an amount is offered only when it has a link", () => {
  const links = { once: { 10: "https://buy.stripe.com/a", 50: "https://buy.stripe.com/b" }, monthly: {} };
  assert.deepEqual(amountsFor("once", links), [10, 50]);
  assert.deepEqual(amountsFor("monthly", links), []);
  assert.equal(donationsOpen(links), true);
  assert.equal(donationsOpen({ once: {}, monthly: {} }), false);
});
