/**
 * How the supporters server keeps the island in KV (SUBMISSIONS).
 *
 * A supporter is a person, known by a fingerprint of their email: an HMAC of
 * the address with the server's own secret (SUPPORTER_SALT), so the same email
 * always comes to the same person, and nothing kept can be turned back into
 * the address. Under that fingerprint:
 *
 * - `supporter:<person>`: their Echo (submission.ts, Profile), written by the
 *   thank-you page and by `pnpm supporters`; its metadata is the whole of it.
 * - `paid:<person>`: their payments, written as Stripe tells of them; its
 *   metadata is what they come to (Standing), so one list reads the island.
 * - `session:<id>`, `pay:<ref>`: which person a Checkout Session, or a payment,
 *   belongs to, for the thank-you page and for refunds and disputes.
 * - `thanked:<id>`: that a session's thank-you email went out.
 *
 * The two records are written by different hands (the page, and Stripe's
 * notices), so a notice arriving while someone saves their name can't undo it.
 */
import { standing, withPayment, type Payment, type Profile, type Standing } from "../../www/components/supporters/submission";

/** The part of Workers KV this server uses. */
export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { metadata?: unknown; expirationTtl?: number }): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{ keys: { name: string; metadata?: unknown }[]; list_complete: boolean; cursor?: string }>;
}

export const KEY = {
  profile: (person: string) => `supporter:${person}`,
  paid: (person: string) => `paid:${person}`,
  session: (id: string) => `session:${id}`,
  pay: (ref: string) => `pay:${ref}`,
  thanked: (id: string) => `thanked:${id}`,
};

/** The person an email belongs to: the same address, however it's written, is the same person. */
export async function personOf(email: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(mac)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Every key under a prefix, with its metadata, a page of a thousand at a time. */
async function listAll(kv: KV, prefix: string): Promise<{ name: string; metadata?: unknown }[]> {
  const out: { name: string; metadata?: unknown }[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, cursor });
    out.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

/** Everyone's Echo, by person, from the records' metadata. */
export async function readProfiles(kv: KV): Promise<{ person: string; profile: Profile }[]> {
  return (await listAll(kv, "supporter:"))
    .filter((k) => {
      const p = k.metadata as Profile | undefined;
      return p && typeof p.id === "string" && typeof p.joinedAt === "number";
    })
    .map((k) => ({ person: k.name.slice("supporter:".length), profile: k.metadata as Profile }));
}

/** What everyone's payments come to, by person. Someone with no payment that counts isn't in it. */
export async function readStandings(kv: KV): Promise<Map<string, Standing>> {
  const out = new Map<string, Standing>();
  for (const k of await listAll(kv, "paid:")) {
    const st = k.metadata as Standing | undefined;
    if (st && typeof st.until === "number") out.set(k.name.slice("paid:".length), st);
  }
  return out;
}

const parse = <T>(text: string | null): T | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
};

export async function readProfile(kv: KV, person: string): Promise<Profile | undefined> {
  return parse<Profile>(await kv.get(KEY.profile(person)));
}

export async function writeProfile(kv: KV, person: string, profile: Profile): Promise<void> {
  await kv.put(KEY.profile(person), JSON.stringify(profile), { metadata: profile });
}

interface Paid {
  payments: Payment[];
  disputed?: boolean;
}

export async function readPaid(kv: KV, person: string): Promise<Paid> {
  return parse<Paid>(await kv.get(KEY.paid(person))) ?? { payments: [] };
}

async function writePaid(kv: KV, person: string, paid: Paid): Promise<Standing | undefined> {
  const st = standing(paid.payments, paid.disputed);
  await kv.put(KEY.paid(person), JSON.stringify(paid), { metadata: st ?? { none: true } });
  return st;
}

/**
 * A payment onto someone's list, and what their payments come to with it.
 * Told twice, it's counted once; nothing is written when nothing changed.
 */
export async function recordPayment(kv: KV, person: string, payment: Payment): Promise<{ standing: Standing | undefined; fresh: boolean }> {
  const paid = await readPaid(kv, person);
  const fresh = !paid.payments.some((p) => p.ref === payment.ref);
  const payments = withPayment(paid.payments, payment);
  if (JSON.stringify(payments) === JSON.stringify(paid.payments)) return { standing: standing(paid.payments, paid.disputed), fresh };
  await kv.put(KEY.pay(payment.ref), person);
  return { standing: await writePaid(kv, person, { ...paid, payments }), fresh };
}

/**
 * A refund: the payment with that reference stops counting. Stripe's refund
 * names the PaymentIntent, which a monthly payment isn't kept by, so when none
 * matches, the latest payment that still counts is the one refunded.
 */
export async function markRefunded(kv: KV, person: string, ref: string | undefined): Promise<Standing | undefined> {
  const paid = await readPaid(kv, person);
  let i = ref ? paid.payments.findIndex((p) => p.ref === ref && !p.refunded) : -1;
  if (i < 0) {
    const live = paid.payments.map((p, j) => ({ p, j })).filter(({ p }) => !p.refunded);
    i = live.length ? live.reduce((a, b) => (b.p.at > a.p.at ? b : a)).j : -1;
  }
  if (i < 0) return standing(paid.payments, paid.disputed);
  return writePaid(kv, person, { ...paid, payments: paid.payments.map((p, j) => (j === i ? { ...p, refunded: true } : p)) });
}

/** A dispute: off the island, whatever else they paid, until Noor looks (`pnpm supporters`). */
export async function markDisputed(kv: KV, person: string): Promise<void> {
  const paid = await readPaid(kv, person);
  await writePaid(kv, person, { ...paid, disputed: true });
}
