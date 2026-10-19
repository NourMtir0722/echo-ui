/**
 * The server behind Echo's island (wrangler.jsonc binds its address).
 *
 * Right after paying, Stripe brings a supporter to /supporters/welcome with
 * their Checkout Session's ID in the address. The page asks here whether that's
 * a completed, paid session, then sends the name and links for their Echo. Both
 * calls check the session with Stripe (stripe.ts), and what's sent is on the
 * island from that moment: the island, the crowd on /support and the heap at
 * the foot of the homepage read the list from here as they open.
 *
 * Stripe also tells this server about every payment, refund and dispute
 * (POST /stripe/webhook): a first payment gets a thank-you email with the
 * supporter's own link to the page (thanks.ts), in case they never reached it,
 * and every payment, refund and dispute changes how long their Echo stays
 * awake (store.ts). Payments with the same email are one supporter, one Echo.
 *
 * The session's ID is the proof: Stripe makes it, it's long and random, and
 * only the person who paid is sent to the page with it. Nothing is kept but
 * what they chose to show and when and how they paid: no email (a fingerprint
 * of it, store.ts), no card, no amount. Nothing here logs a body. Noor takes
 * anyone off with `pnpm supporters hide` (src/supporters.ts).
 *
 * - GET /supporters: the island's list, everyone shown, in number order.
 * - POST /supporter/session {session}: what the page needs to know to greet them.
 * - POST /supporter/save {session, name, links}: their Echo's name and links.
 * - POST /stripe/webhook: Stripe's signed word about a payment.
 */
import { clean, freeId, islandOf, type Profile } from "../../www/components/supporters/submission";
import { KEY, markDisputed, markRefunded, personOf, readProfile, readProfiles, readStandings, recordPayment, writeProfile, type KV } from "./store";
import { checkSession, happened, signedByStripe, type StripeEvent } from "./stripe";
import { thankYou, thankYouAgain } from "./thanks";

export type { KV } from "./store";

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Where the island's list is kept between reads, for a while (the Workers cache of the data centre that answers). */
export interface ListCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/** Cloudflare Email Service, as far as the thank-you email uses it. */
export interface Mailer {
  send(message: { to: string; from: { email: string; name: string }; subject: string; text: string; html: string }): Promise<{ messageId: string }>;
}

export interface Env {
  /** A Stripe restricted key with Checkout Sessions: Read, and nothing else. */
  STRIPE_KEY?: string;
  /** The signing secret of the Stripe webhook endpoint that calls /stripe/webhook. */
  STRIPE_WEBHOOK_SECRET?: string;
  /** What an email's fingerprint is made with (store.ts, personOf): long, random, and never changed. */
  SUPPORTER_SALT?: string;
  /** Sends the thank-you email, from the site's own domain. */
  EMAIL?: Mailer;
  /** The site that may call this, as an origin. */
  SITE: string;
  SUBMISSIONS: KV;
  LIMITER?: RateLimit;
}

/** The largest body worth reading: a name and two links, with room to spare. */
const MAX_BODY = 4 * 1024;
/**
 * How long a data centre answers the island's list from its cache, in seconds.
 * A new supporter is in it at once where they saved (the save puts them in);
 * everywhere else, and after `pnpm supporters`, within this and KV's own minute.
 */
const LIST_TTL = 30;
/** The KV metadata an entry can carry, serialized: the most a name and two links can come to fits. */
const METADATA_MAX = 1024;
/** The largest Stripe event worth reading: a Checkout Session is a few kilobytes. */
const MAX_EVENT = 64 * 1024;
/** How long a session is remembered as thanked, in seconds: past Stripe's three days of retries. */
const THANKED_TTL = 7 * 24 * 3600;

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  Response.json(body, { status, headers: { ...headers, "cache-control": "no-store" } });

async function readBody(request: Request): Promise<Record<string, unknown> | undefined> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return undefined;
  const text = await request.text();
  if (text.length > MAX_BODY) return undefined;
  try {
    const body: unknown = JSON.parse(text);
    return body && typeof body === "object" ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** The island's list, as the page draws it, read from KV. */
async function island(kv: KV, now: number) {
  const [profiles, standings] = await Promise.all([readProfiles(kv), readStandings(kv)]);
  return islandOf(profiles, standings, now);
}

export function createWorker(fetchImpl: typeof fetch = fetch, cache: () => ListCache | undefined = defaultCache, clock: () => number = Date.now) {
  /** The list for this data centre's cache. */
  const listResponse = (body: unknown) => Response.json(body, { headers: { "cache-control": `max-age=${LIST_TTL}` } });

  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const { pathname } = new URL(request.url);
      const origin = request.headers.get("origin") ?? "";
      // Only the site calls this (a copy of it elsewhere asks its own origin: apps/www/components/supporters/api.ts);
      // a browser on any other page is refused by CORS before it reads a word.
      const allowed = origin === env.SITE;
      const cors: Record<string, string> = allowed
        ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" }
        : {};

      if (pathname === "/") {
        return new Response("Echo UI's supporters server: Echo's island, and /supporters/welcome right after a payment.\n", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      if (pathname === "/supporters") {
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        if (request.method !== "GET") return json({ ok: false, reason: "get-only" }, 405, { ...cors, allow: "GET" });
        const store = cache();
        const key = listKey(request);
        let list = await store?.match(key);
        if (!list) {
          list = listResponse(await island(env.SUBMISSIONS, clock()));
          await store?.put(key, list.clone());
        }
        // The browser asks every time: someone back from saving sees themselves, not the list from before.
        return new Response(list.body, { headers: { ...cors, "content-type": "application/json", "cache-control": "no-cache" } });
      }

      if (pathname === "/stripe/webhook") return webhook(request, env);

      if (pathname !== "/supporter/session" && pathname !== "/supporter/save") return json({ ok: false, reason: "not-found" }, 404, cors);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "POST") return json({ ok: false, reason: "post-only" }, 405, { ...cors, allow: "POST" });

      const address = request.headers.get("cf-connecting-ip") ?? "unknown";
      if (env.LIMITER && !(await env.LIMITER.limit({ key: address })).success) {
        return json({ ok: false, reason: "too-many" }, 429, { ...cors, "retry-after": "60" });
      }

      const body = await readBody(request);
      if (!body || typeof body.session !== "string") return json({ ok: false, reason: "bad-request" }, 400, cors);
      if (!env.SUPPORTER_SALT) return json({ ok: false, reason: "unconfigured" }, 503, cors);
      const paid = await checkSession(body.session, env.STRIPE_KEY, fetchImpl);
      if (!paid.ok) return json({ ok: false, reason: paid.reason }, paid.status, cors);
      const kv = env.SUBMISSIONS;
      const person = await personOf(paid.email, env.SUPPORTER_SALT);
      // The payment counts from here too, should Stripe's own word of it still be on its way.
      const { standing } = await recordPayment(kv, person, paid.payment);
      await kv.put(KEY.session(paid.session), person);
      const before = await readProfile(kv, person);
      const shown = (p: Profile | undefined) => !p?.hidden && !standing?.disputed;
      const asleep = !!standing && standing.until < clock();
      const plan = standing?.plan ?? paid.payment.plan;

      if (pathname === "/supporter/session") {
        const saved = before && !before.removed ? { name: before.name, links: before.links, id: before.id } : null;
        return json({ ok: true, plan, saved, shown: shown(before), times: standing?.times ?? 1, asleep }, 200, cors);
      }

      const sent = clean(body);
      if (!sent.ok) return json({ ok: false, reason: "invalid", problems: sent.problems }, 422, cors);
      const profiles = await readProfiles(kv);
      // Their link is theirs from the first name they send: changing the name later keeps it, so a shared link still finds them.
      const taken = new Set(profiles.filter((p) => p.person !== person).map((p) => p.profile.id));
      const id = before && !before.removed && before.id ? before.id : freeId(sent.value.name, taken);
      const profile: Profile = {
        ...sent.value,
        id,
        joinedAt: before?.joinedAt ?? clock(),
        ...(before?.hidden ? { hidden: true } : {}),
        ...(before?.founding ? { founding: true } : {}),
      };
      if (new TextEncoder().encode(JSON.stringify(profile)).length > METADATA_MAX) {
        return json({ ok: false, reason: "invalid", problems: ["Shorter links: these are too long to keep."] }, 422, cors);
      }
      await writeProfile(kv, person, profile);
      // This data centre's list, with them in it, before KV's own copy has caught up: back on the island, they're there.
      const standings = await readStandings(kv);
      if (standing) standings.set(person, standing);
      await cache()?.put(listKey(request), listResponse(islandOf([...profiles.filter((p) => p.person !== person), { person, profile }], standings, clock())));
      return json({ ok: true, plan, saved: { ...sent.value, id }, shown: shown(profile), times: standing?.times ?? 1, asleep }, 200, cors);
    },
  };
}

/**
 * Stripe's word about a payment, a refund or a dispute. Answered 200 once
 * it's kept (and a first payment's email sent), and with an error when it
 * couldn't be, so Stripe tries again, for up to three days. Not counted
 * against the limit per address: Stripe calls from a few addresses, and its
 * signature is the gate.
 */
async function webhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, reason: "post-only" }, 405, { allow: "POST" });
  if (!env.STRIPE_WEBHOOK_SECRET || !env.EMAIL || !env.SUPPORTER_SALT) return json({ ok: false, reason: "unconfigured" }, 503, {});
  if (Number(request.headers.get("content-length") ?? 0) > MAX_EVENT) return json({ ok: false, reason: "too-large" }, 413, {});
  const body = await request.text();
  if (body.length > MAX_EVENT) return json({ ok: false, reason: "too-large" }, 413, {});
  if (!(await signedByStripe(body, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return json({ ok: false, reason: "unsigned" }, 400, {});
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return json({ ok: false, reason: "bad-request" }, 400, {});
  }
  const what = happened(event);
  // Another kind of event, or a checkout not paid yet: nothing to do, and nothing for Stripe to retry.
  if (!what) return json({ ok: true, done: "nothing" }, 200, {});
  const kv = env.SUBMISSIONS;
  const salt = env.SUPPORTER_SALT;

  if (what.kind === "renewal") {
    await recordPayment(kv, await personOf(what.email, salt), what.payment);
    return json({ ok: true, done: "counted" }, 200, {});
  }
  if (what.kind === "refund" || what.kind === "dispute") {
    // Whose payment it was: from the payment itself where it's known, else from the refund's email.
    const known = what.ref ? await kv.get(KEY.pay(what.ref)) : null;
    const person = known ?? (what.kind === "refund" && what.email ? await personOf(what.email, salt) : null);
    if (!person) return json({ ok: true, done: "unknown" }, 200, {});
    if (what.kind === "refund") await markRefunded(kv, person, what.ref);
    else await markDisputed(kv, person);
    return json({ ok: true, done: what.kind }, 200, {});
  }

  const { checkout } = what;
  const person = await personOf(checkout.email, salt);
  const before = await readProfile(kv, person);
  const prior = (await readStandings(kv)).get(person);
  const { standing } = await recordPayment(kv, person, checkout.payment);
  await kv.put(KEY.session(checkout.session), person);
  const marker = KEY.thanked(checkout.session);
  if (await kv.get(marker)) return json({ ok: true, done: "counted" }, 200, {});
  const host = new URL(env.SITE).host;
  // Someone who'd supported before, and whose Echo is on the island, hears what this did for it; anyone else (a
  // first payment, even one whose Echo was named before this word of it came) gets the way to put it there.
  const named = before && !before.removed && before.name && standing && standing.times > 1;
  const mail = named
    ? thankYouAgain(env.SITE, checkout.session, {
        name: before.name,
        id: before.id,
        plan: standing.plan,
        times: standing.times,
        woke: !!prior && prior.until < checkout.payment.at,
      })
    : thankYou(env.SITE, checkout.session, checkout.payment.plan);
  try {
    await env.EMAIL.send({
      to: checkout.email,
      // Echo's one address: a reply lands where every other question does.
      from: { email: `support@${host}`, name: "Echo UI" },
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (e) {
    // The reason, never the address.
    console.log("thank-you email not sent:", (e as { code?: string }).code ?? "unknown");
    return json({ ok: false, reason: "not-sent" }, 502, {});
  }
  await kv.put(marker, "1", { expirationTtl: THANKED_TTL });
  return json({ ok: true, done: "thanked" }, 200, {});
}

/** The cache's key for the list: its own address on this server, whichever call is asking. */
const listKey = (request: Request) => new Request(new URL("/supporters", request.url));

/** The Workers cache where there is one (on the server's own address); none under test. */
function defaultCache(): ListCache | undefined {
  return typeof caches === "undefined" ? undefined : (caches as unknown as { default: ListCache }).default;
}

export default createWorker();
