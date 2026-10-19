import { test } from "node:test";
import assert from "node:assert/strict";

import { asCheckout, checkSession, happened, signedByStripe } from "./stripe";
import { SECRET, session, sign, stripe } from "./testing";

const A = "cs_live_aaaaAAAAaaaaAAAA0001";

test("only what Stripe signed, recently, with this endpoint's secret, is read", async () => {
  const body = JSON.stringify({ type: "checkout.session.completed" });
  assert.equal(await signedByStripe(body, await sign(body), SECRET), true);
  assert.equal(await signedByStripe(body, `v1=deadbeef,${await sign(body)}`, SECRET), true, "one good signature among several is enough");
  assert.equal(await signedByStripe(body, await sign(body, "whsec_someone_else"), SECRET), false);
  assert.equal(await signedByStripe(`${body} `, await sign(body), SECRET), false, "a changed body");
  assert.equal(await signedByStripe(body, await sign(body, SECRET, Math.floor(Date.now() / 1000) - 600), SECRET), false, "ten minutes old");
  assert.equal(await signedByStripe(body, null, SECRET), false);
  assert.equal(await signedByStripe(body, "t=abc,v1=00", SECRET), false);
});

test("a checkout is one payment: a one-time one known by its PaymentIntent, a monthly one by its first invoice", () => {
  assert.deepEqual(asCheckout(session(A, "a@x.dev", "payment", 100)), { session: A, email: "a@x.dev", payment: { ref: "pi_AAAA0001", at: 100_000, plan: "once" } });
  assert.deepEqual(asCheckout(session(A, "a@x.dev", "subscription", 100))?.payment, { ref: "in_AAAA0001", at: 100_000, plan: "monthly" });
  assert.equal(asCheckout({ id: A }), undefined, "no email: nobody to thank");
});

test("Stripe's events, read for what they mean to the island, and nothing more", () => {
  const ev = (type: string, object: object) => happened({ type, data: { object: object as Record<string, unknown> } });
  assert.equal(ev("checkout.session.completed", session(A, "a@x.dev", "payment", 1))?.kind, "checkout");
  assert.equal(ev("checkout.session.completed", { ...session(A, "a@x.dev", "payment", 1), payment_status: "unpaid" }), undefined, "paid later, by bank");
  assert.equal(ev("checkout.session.async_payment_succeeded", { ...session(A, "a@x.dev", "payment", 1), payment_status: "unpaid" })?.kind, "checkout");
  const renewal = ev("invoice.paid", { id: "in_1", object: "invoice", customer_email: "a@x.dev", billing_reason: "subscription_cycle", status_transitions: { paid_at: 10 }, lines: { data: [{ period: { end: 20 } }, { period: { end: 30 } }] } });
  assert.deepEqual(renewal, { kind: "renewal", email: "a@x.dev", payment: { ref: "in_1", at: 10_000, plan: "monthly", periodEnd: 30_000 } });
  assert.equal(ev("invoice.paid", { id: "in_2", object: "invoice", customer_email: "a@x.dev", billing_reason: "manual" }), undefined, "not a subscription's");
  assert.deepEqual(ev("charge.refunded", { object: "charge", refunded: true, payment_intent: "pi_1", billing_details: { email: "a@x.dev" } }), { kind: "refund", email: "a@x.dev", ref: "pi_1" });
  assert.equal(ev("charge.refunded", { object: "charge", refunded: false }), undefined, "a partial refund");
  assert.deepEqual(ev("charge.dispute.created", { object: "dispute", payment_intent: "pi_1" }), { kind: "dispute", ref: "pi_1" });
  assert.equal(ev("customer.created", { object: "customer" }), undefined);
});

test("checkSession reads a paid session as its payment, and a Stripe that doesn't answer as unreachable", async () => {
  const s = stripe({ [A]: session(A, "a@x.dev", "payment", 5) });
  const paid = await checkSession(A, "k", s.impl);
  assert.ok(paid.ok && paid.payment.plan === "once" && paid.email === "a@x.dev");
  const down = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  assert.deepEqual(await checkSession(A, "k", down), { ok: false, status: 502, reason: "unreachable" });
  assert.deepEqual(await checkSession(A, undefined, s.impl), { ok: false, status: 503, reason: "unconfigured" });
});
