import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { personOf } from "./store";
import { env as baseEnv, kv, mailer, memoryCache, session, sign, SITE, stripe } from "./testing";
import { createWorker, type Env } from "./worker";

const DAY = 24 * 3600 * 1000;
const now = () => Math.floor(Date.now() / 1000);
const A = "cs_live_aaaaAAAAaaaaAAAA0001";
const B = "cs_live_bbbbBBBBbbbbBBBB0002";
const C = "cs_live_ccccCCCCccccCCCC0003";

/** The server with Stripe holding `sessions`, and everything else standing in. */
function setUp(sessions: object[], more: Partial<Env> = {}) {
  const s = stripe(Object.fromEntries(sessions.map((x) => [(x as { id: string }).id, x])));
  const cache = memoryCache();
  const store = kv();
  const email = mailer();
  const env = baseEnv({ SUBMISSIONS: store, EMAIL: email, ...more });
  // A clock that moves on a millisecond each time it's read: who joined first is never a tie.
  let t = Date.now();
  const worker = createWorker(s.impl, () => cache, () => ++t);
  const call = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
    const r = await worker.fetch(
      new Request(`https://api.site.example${path}`, { method: "POST", headers: { "content-type": "application/json", origin: SITE, ...headers }, body: JSON.stringify(body) }),
      env,
    );
    return { status: r.status, headers: r.headers, body: (await r.json()) as Record<string, unknown> };
  };
  /** The list as a visitor gets it once the cache's 30 seconds are up (the stand-in cache otherwise keeps it for good). */
  const island = async () => {
    cache.kept.clear();
    const r = await worker.fetch(new Request("https://api.site.example/supporters", { headers: { origin: SITE } }), env);
    return { headers: r.headers, body: (await r.json()) as { supporters: Record<string, unknown>[]; next: number } };
  };
  const deliver = async (type: string, object: object) => {
    const body = JSON.stringify({ type, data: { object } });
    const r = await worker.fetch(new Request("https://api.site.example/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": await sign(body) } }), env);
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  };
  return { call, island, deliver, worker, env, store, email, cache: cache.kept, asked: s.asked };
}

test("a paid session is greeted, and the name sent from it is that supporter's Echo, kept without their email", async () => {
  const { call, store, asked } = setUp([session(A, "Ana@Example.com", "subscription", now())]);
  const hello = await call("/supporter/session", { session: A });
  assert.equal(hello.status, 200);
  assert.deepEqual(hello.body, { ok: true, plan: "monthly", saved: null, shown: true, times: 1, asleep: false });
  assert.equal(hello.headers.get("access-control-allow-origin"), SITE);
  assert.equal(asked[0]!.auth, "Bearer rk_live_read_only");

  const saved = await call("/supporter/save", { session: A, name: " Ana ", links: ["x.com/ana"] });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.saved, { name: "Ana", links: [{ kind: "x", href: "https://x.com/ana" }], id: "ana" });
  const person = await personOf("ana@example.com", "salt_test");
  assert.equal(JSON.parse(store.store.get(`supporter:${person}`)!).name, "Ana");
  assert.equal(store.store.get(`session:${A}`), person);
  // Nothing kept holds the address, the amount, or (outside its own key) the session.
  for (const [k, v] of store.store) assert.doesNotMatch(`${k} ${v}`, /@|amount/i, k);
  // Back on the page later, what they sent is there to change.
  assert.deepEqual((await call("/supporter/session", { session: A })).body.saved, { name: "Ana", links: [{ kind: "x", href: "https://x.com/ana" }], id: "ana" });
});

test("one Echo per person: a second payment with the same email adds to it, and the island counts both", async () => {
  const { call, island } = setUp([session(A, "ana@example.com", "payment", now() - 60), session(B, " ANA@example.com ", "payment", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  const back = await call("/supporter/session", { session: B });
  assert.deepEqual(back.body.saved, { name: "Ana", links: [], id: "ana" });
  assert.equal(back.body.times, 2);
  const list = (await island()).body;
  assert.deepEqual(list.supporters.map((s) => [s.no, s.id, s.times]), [[1, "ana", 2]]);
  assert.equal(list.next, 2);
});

test("the island lists everyone shown in the order they joined, asleep once their time has run out, and never a session", async () => {
  const { call, island, cache } = setUp([
    session(A, "ana@example.com", "subscription", now()),
    session(B, "bo@example.com", "payment", now() - 45 * 24 * 3600),
    session(C, "cy@example.com", "payment", now()),
  ]);
  for (const [s, name] of [[A, "Ana"], [B, "Ana"], [C, "Cy"]] as const) await call("/supporter/save", { session: s, name, links: [] });
  const { headers, body } = await island();
  assert.deepEqual(
    body.supporters.map((s) => [s.no, s.id, s.plan, s.asleep ?? false]),
    [
      [1, "ana", "monthly", false],
      [2, "ana-2", "once", true],
      [3, "cy", "once", false],
    ],
  );
  assert.doesNotMatch(JSON.stringify(body), /cs_live|joinedAt|until|@/);
  assert.equal(headers.get("cache-control"), "no-cache");
  assert.equal(cache.size, 1);
});

test("the list is read from the records' metadata, every page of it", async () => {
  const SUBMISSIONS = kv(2);
  for (let n = 1; n <= 5; n++) {
    const profile = { id: `s${n}`, name: `S${n}`, links: [], joinedAt: n };
    await SUBMISSIONS.put(`supporter:p${n}`, JSON.stringify(profile), { metadata: profile });
    const st = { until: Date.now() + DAY, plan: "once", times: 1, since: Date.now() };
    await SUBMISSIONS.put(`paid:p${n}`, "{}", { metadata: st });
  }
  const r = await createWorker(stripe({}).impl, () => undefined).fetch(new Request("https://api.site.example/supporters"), baseEnv({ SUBMISSIONS }));
  assert.deepEqual(((await r.json()) as { supporters: { id: string }[] }).supporters.map((s) => s.id), ["s1", "s2", "s3", "s4", "s5"]);
});

test("changing a name keeps the link and the number, and Noor's hiding stays when they send again", async () => {
  const { call, island, store } = setUp([session(A, "ana@example.com", "payment", now()), session(B, "bo@example.com", "payment", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  await call("/supporter/save", { session: B, name: "Bo", links: [] });
  await call("/supporter/save", { session: A, name: "Ana Silva", links: ["ana.dev"] });
  assert.deepEqual((await island()).body.supporters.map((s) => [s.no, s.id, s.name]), [
    [1, "ana", "Ana Silva"],
    [2, "bo", "Bo"],
  ]);
  const key = `supporter:${await personOf("ana@example.com", "salt_test")}`;
  const hidden = { ...JSON.parse(store.store.get(key)!), hidden: true };
  await store.put(key, JSON.stringify(hidden), { metadata: hidden });
  assert.equal((await call("/supporter/save", { session: A, name: "Ana", links: [] })).body.shown, false);
  assert.deepEqual((await island()).body.supporters.map((s) => s.id), ["bo"]);
});

test("an unpaid, expired or unknown session is refused, and nothing is kept", async () => {
  const open = "cs_live_openOpenOpenOpen1";
  const { call, store } = setUp([{ id: open, status: "open", payment_status: "unpaid", mode: "payment" }]);
  assert.equal((await call("/supporter/save", { session: open, name: "Ana", links: [] })).status, 402);
  assert.equal((await call("/supporter/save", { session: "cs_live_neverMadeByStripe1", name: "Ana", links: [] })).status, 404);
  assert.equal(store.store.size, 0);
});

test("something that isn't a session ID never reaches Stripe", async () => {
  const { call, asked } = setUp([]);
  for (const s of ["", "cs_live_", "pi_123", "cs_live_../../v1/charges", "cs_live_a b c d e f g h"]) assert.equal((await call("/supporter/session", { session: s })).status, 404, s);
  assert.equal((await call("/supporter/session", {})).status, 400);
  assert.equal(asked.length, 0);
});

test("without its key or its salt the server says it isn't set up, rather than failing every supporter in silence", async () => {
  assert.equal((await setUp([session(A, "a@x.dev", "payment", now())], { STRIPE_KEY: undefined }).call("/supporter/session", { session: A })).status, 503);
  assert.equal((await setUp([session(A, "a@x.dev", "payment", now())], { SUPPORTER_SALT: undefined }).call("/supporter/session", { session: A })).status, 503);
});

test("what's wrong with a name or a link is said, all of it, and no Echo is made", async () => {
  const { call, store } = setUp([session(A, "a@x.dev", "payment", now())]);
  const r = await call("/supporter/save", { session: A, name: "", links: ["javascript:alert(1)"] });
  assert.equal(r.status, 422);
  assert.equal((r.body.problems as string[]).length, 2);
  assert.ok(![...store.store.keys()].some((k) => k.startsWith("supporter:")));
});

test("another site's page gets no CORS answer, and each address takes only its own method", async () => {
  const { call, worker, env } = setUp([session(A, "a@x.dev", "payment", now())]);
  for (const origin of ["https://evil.example", "http://localhost:3000"]) assert.equal((await call("/supporter/session", { session: A }, { origin })).headers.get("access-control-allow-origin"), null, origin);
  assert.equal((await worker.fetch(new Request("https://api.site.example/supporter/session", { headers: { origin: SITE } }), env)).status, 405);
  assert.equal((await worker.fetch(new Request("https://api.site.example/supporters", { method: "POST", headers: { origin: SITE } }), env)).status, 405);
  const pre = await worker.fetch(new Request("https://api.site.example/supporter/save", { method: "OPTIONS", headers: { origin: SITE } }), env);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
});

test("past the limit an address waits a minute, Stripe isn't asked, and a body bigger than a name and two links is refused unread", async () => {
  const limited = setUp([session(A, "a@x.dev", "payment", now())], { LIMITER: { limit: async () => ({ success: false }) } });
  const r = await limited.call("/supporter/session", { session: A });
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("retry-after"), "60");
  assert.equal(limited.asked.length, 0);
  assert.equal((await setUp([session(A, "a@x.dev", "payment", now())]).call("/supporter/save", { session: A, name: "A".repeat(5000), links: [] })).status, 400);
});

/* --- Stripe's word -------------------------------------------------------------------------------- */

test("a first payment is counted and thanked once, with the supporter's own link, however often Stripe tells it", async () => {
  const { deliver, email, island, call } = setUp([session(A, "ana@example.com", "payment", now())]);
  const s = session(A, "ana@example.com", "payment", now());
  assert.deepEqual((await deliver("checkout.session.completed", s)).body, { ok: true, done: "thanked" });
  assert.deepEqual((await deliver("checkout.session.completed", s)).body, { ok: true, done: "counted" });
  assert.equal(email.sent.length, 1);
  assert.equal(email.sent[0]!.to, "ana@example.com");
  assert.deepEqual(email.sent[0]!.from, { email: "support@site.example", name: "Echo UI" });
  assert.equal(email.sent[0]!.subject, "Thank you for supporting Echo");
  assert.ok(email.sent[0]!.text.includes(`${SITE}/supporters/welcome?session_id=${A}`));
  // Counted, but not on the island until it has a name; then once, not twice.
  assert.equal((await island()).body.supporters.length, 0);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  assert.equal((await island()).body.supporters[0]!.times, 1);
});

test("supporting again thanks them for it: what it did for their Echo, and how many times they've supported now", async () => {
  const { deliver, email, call } = setUp([session(A, "ana@example.com", "payment", now() - 40 * 24 * 3600)]);
  await deliver("checkout.session.completed", session(A, "ana@example.com", "payment", now() - 40 * 24 * 3600));
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  await deliver("checkout.session.completed", session(B, "ana@example.com", "payment", now()));
  const again = email.sent[1]!;
  assert.equal(again.subject, "Thank you for supporting Echo again");
  // Forty days on, Ana had fallen asleep: this woke her.
  assert.match(again.text, /Ana just woke up/);
  assert.match(again.text, /supported Echo twice/);
  assert.ok(again.text.includes(`${SITE}/supporters#ana`));
});

test("a first payment whose Echo was named before Stripe's word of it came still gets the first email", async () => {
  const { deliver, email, call } = setUp([session(A, "ana@example.com", "payment", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  await deliver("checkout.session.completed", session(A, "ana@example.com", "payment", now()));
  assert.equal(email.sent[0]!.subject, "Thank you for supporting Echo");
});

test("monthly support stays awake to the end of each month it pays for, and its first invoice isn't a second payment", async () => {
  const { deliver, call, island } = setUp([session(A, "ana@example.com", "subscription", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  const invoice = (id: string, end: number) => ({ id, object: "invoice", customer_email: "ana@example.com", billing_reason: "subscription_cycle", status_transitions: { paid_at: now() }, lines: { data: [{ period: { start: now(), end } }] } });
  // The checkout's own invoice, told again as invoice.paid: still one payment.
  await deliver("invoice.paid", invoice(`in_${A.slice(-8)}`, now() + 30 * 24 * 3600));
  assert.equal((await island()).body.supporters[0]!.times, 1);
  assert.deepEqual((await deliver("invoice.paid", invoice("in_renewal_1", now() + 60 * 24 * 3600))).body, { ok: true, done: "counted" });
  const ana = (await island()).body.supporters[0]!;
  assert.equal(ana.times, 2);
  assert.equal(ana.plan, "monthly");
  assert.equal(ana.asleep, undefined);
});

test("a refunded payment stops counting, so an Echo with nothing else leaves the island; a partial refund changes nothing", async () => {
  const { deliver, call, island } = setUp([session(A, "ana@example.com", "payment", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  const charge = (refunded: boolean) => ({ id: "ch_1", object: "charge", refunded, payment_intent: `pi_${A.slice(-8)}`, billing_details: { email: "ana@example.com" } });
  await deliver("charge.refunded", charge(false));
  assert.equal((await island()).body.supporters.length, 1);
  assert.deepEqual((await deliver("charge.refunded", charge(true))).body, { ok: true, done: "refund" });
  assert.equal((await island()).body.supporters.length, 0);
});

test("a disputed payment takes the Echo off the island, whatever else they paid", async () => {
  const { deliver, call, island } = setUp([session(A, "ana@example.com", "payment", now()), session(B, "ana@example.com", "payment", now())]);
  await call("/supporter/save", { session: A, name: "Ana", links: [] });
  await call("/supporter/session", { session: B });
  await deliver("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: `pi_${B.slice(-8)}` });
  assert.equal((await island()).body.supporters.length, 0);
  assert.equal((await call("/supporter/session", { session: A })).body.shown, false);
});

test("an unsigned or forged event changes nothing; an email that couldn't be sent is retried; an unready server says so", async () => {
  const { worker, env, store } = setUp([]);
  const body = JSON.stringify({ type: "checkout.session.completed", data: { object: session(A, "a@x.dev", "payment", now()) } });
  for (const signature of ["t=1,v1=00", await sign(body, "whsec_forged")]) {
    const r = await worker.fetch(new Request("https://api.site.example/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": signature } }), env);
    assert.equal(r.status, 400);
  }
  assert.equal(store.store.size, 0);
  const failing = setUp([], { EMAIL: mailer(true) });
  assert.equal((await failing.deliver("checkout.session.completed", session(A, "a@x.dev", "payment", now()))).status, 502);
  assert.ok(![...failing.store.store.keys()].some((k) => k.startsWith("thanked:")));
  for (const missing of ["STRIPE_WEBHOOK_SECRET", "EMAIL", "SUPPORTER_SALT"] as const) {
    assert.equal((await setUp([], { [missing]: undefined }).deliver("checkout.session.completed", session(A, "a@x.dev", "payment", now()))).status, 503, missing);
  }
});

test("wrangler.jsonc binds what the server reads, keeps it off workers.dev, and holds no secret", () => {
  const text = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const config = JSON.parse(text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")) as Record<string, unknown>;
  assert.equal(config.main, "src/worker.ts");
  assert.deepEqual((config.kv_namespaces as { binding: string }[]).map((k) => k.binding), ["SUBMISSIONS"]);
  assert.deepEqual((config.ratelimits as { name: string }[]).map((r) => r.name), ["LIMITER"]);
  assert.deepEqual((config.send_email as { name: string }[]).map((r) => r.name), ["EMAIL"]);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.ok(!/rk_live|sk_live|whsec_/.test(text), "the Stripe key and the webhook's secret are secrets, never in the config");
});
