/**
 * Stand-ins for the tests: Workers KV, the Workers cache, Stripe's API, Cloudflare Email Service, and
 * Stripe's signature on an event. Imported by the tests alone.
 */
import type { KV } from "./store";
import type { Env, Mailer } from "./worker";

/** Workers KV, as far as this server uses it: values with their metadata, listed by prefix a page at a time. */
export function kv(pageSize = 1000) {
  const store = new Map<string, string>();
  const meta = new Map<string, unknown>();
  const ttl = new Map<string, number | undefined>();
  const fake: KV & { store: typeof store; meta: typeof meta; ttl: typeof ttl } = {
    store,
    meta,
    ttl,
    get: async (k) => store.get(k) ?? null,
    put: async (k, v, options) => {
      store.set(k, v);
      ttl.set(k, options?.expirationTtl);
      if (options?.metadata === undefined) meta.delete(k);
      else meta.set(k, structuredClone(options.metadata));
    },
    list: async ({ prefix, cursor }) => {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const from = Number(cursor ?? 0);
      const done = from + pageSize >= names.length;
      return { keys: names.slice(from, from + pageSize).map((name) => ({ name, metadata: meta.get(name) })), list_complete: done, cursor: done ? undefined : String(from + pageSize) };
    },
  };
  return fake;
}

/** The Workers cache, as one data centre's: a response per address. */
export function memoryCache() {
  const kept = new Map<string, Response>();
  return {
    kept,
    match: async (r: Request) => kept.get(r.url)?.clone(),
    put: async (r: Request, response: Response) => void kept.set(r.url, response.clone()),
  };
}

/** Stripe's API, as far as this server asks it: one Checkout Session per ID. */
export function stripe(sessions: Record<string, object>) {
  const asked: { url: string; auth: string | null }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    asked.push({ url, auth: new Headers(init?.headers).get("authorization") });
    const s = sessions[url.split("/").pop()!];
    return s ? Response.json(s) : Response.json({ error: { message: "No such checkout.session" } }, { status: 404 });
  }) as unknown as typeof fetch;
  return { impl, asked };
}

/** A paid Checkout Session as Stripe holds it. */
export const session = (id: string, email: string, mode: "payment" | "subscription", created: number, more: object = {}) => ({
  id,
  object: "checkout.session",
  status: "complete",
  payment_status: "paid",
  mode,
  created,
  customer_details: { email },
  payment_intent: mode === "payment" ? `pi_${id.slice(-8)}` : null,
  invoice: mode === "subscription" ? `in_${id.slice(-8)}` : null,
  ...more,
});

/** Email Service, keeping what it's asked to send; `fail` makes it refuse. */
export function mailer(fail = false) {
  const sent: Parameters<Mailer["send"]>[0][] = [];
  const m: Mailer & { sent: typeof sent } = {
    sent,
    send: async (message) => {
      if (fail) throw Object.assign(new Error("no"), { code: "E_DELIVERY_FAILED" });
      sent.push(message);
      return { messageId: `m${sent.length}` };
    },
  };
  return m;
}

export const SECRET = "whsec_test_secret";
export const SITE = "https://site.example";

/** A Stripe-Signature header for `body`, as Stripe makes one. */
export async function sign(body: string, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** A whole environment, as the server reads it. */
export const env = (more: Partial<Env> = {}): Env => ({
  SITE,
  STRIPE_KEY: "rk_live_read_only",
  STRIPE_WEBHOOK_SECRET: SECRET,
  SUPPORTER_SALT: "salt_test",
  EMAIL: mailer(),
  SUBMISSIONS: kv(),
  ...more,
});
