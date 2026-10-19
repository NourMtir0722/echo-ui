/**
 * What the supporters server reads from Stripe: a Checkout Session, asked for
 * with a key that can only read them (STRIPE_KEY), and the events Stripe sends
 * to POST /stripe/webhook, signed with the endpoint's secret
 * (STRIPE_WEBHOOK_SECRET). Only a signed, recent event is read.
 *
 * The events, as far as the island needs them (the endpoint listens to these):
 * - checkout.session.completed, checkout.session.async_payment_succeeded: a
 *   payment, and the thank-you email.
 * - invoice.paid: a monthly payment, renewals included, with the month it pays for.
 * - charge.refunded: a payment that no longer counts.
 * - charge.dispute.created: a payment disputed with the bank.
 *
 * An email address read here is used to know whose payment it is (store.ts,
 * personOf) and to send the thank-you email, and is never kept or logged.
 */
import type { Payment } from "../../www/components/supporters/submission";

/** Stripe's Checkout Session IDs, live or test. Anything else is refused before Stripe is asked. */
export const SESSION = /^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/;
const STRIPE_TIMEOUT_MS = 10_000;
/** How old a signed event may be, in seconds: Stripe's own libraries allow five minutes. */
const TOLERANCE_S = 300;

/** A paid checkout: whose (email), which session, and the payment it made. */
export interface Checkout {
  session: string;
  email: string;
  payment: Payment;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Obj) : undefined);

/**
 * A Checkout Session as a payment. A one-time payment is known by its
 * PaymentIntent, a monthly one by its first Invoice, so the invoice.paid that
 * follows it is the same payment, not a second one.
 */
export function asCheckout(s: Obj): Checkout | undefined {
  const id = str(s.id);
  const email = str(obj(s.customer_details)?.email) ?? str(s.customer_email);
  if (!id || !email) return undefined;
  const plan = s.mode === "subscription" ? "monthly" : "once";
  const ref = (plan === "monthly" ? str(s.invoice) : str(s.payment_intent)) ?? id;
  const at = typeof s.created === "number" ? s.created * 1000 : Date.now();
  return { session: id, email, payment: { ref, at, plan } };
}

type NotPaid = { ok: false; status: number; reason: "unconfigured" | "unknown" | "unpaid" | "unreachable" };

/** Whether Stripe holds this session, completed and paid, and the payment it made. */
export async function checkSession(id: string, key: string | undefined, fetchImpl: typeof fetch = fetch): Promise<({ ok: true } & Checkout) | NotPaid> {
  if (!key) return { ok: false, status: 503, reason: "unconfigured" };
  if (!SESSION.test(id)) return { ok: false, status: 404, reason: "unknown" };
  let response: Response;
  try {
    response = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 502, reason: "unreachable" };
  }
  if (response.status === 404) return { ok: false, status: 404, reason: "unknown" };
  if (!response.ok) return { ok: false, status: 502, reason: "unreachable" };
  const s = (await response.json()) as Obj;
  if (s.status !== "complete" || s.payment_status !== "paid") return { ok: false, status: 402, reason: "unpaid" };
  const checkout = asCheckout(s);
  return checkout ? { ok: true, ...checkout } : { ok: false, status: 402, reason: "unpaid" };
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Equal strings, compared in time that doesn't depend on where they differ. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether `body` is what Stripe signed: the `Stripe-Signature` header carries
 * a time (t) and one or more HMAC-SHA256 signatures (v1) of "t.body" made
 * with the endpoint's secret.
 */
export async function signedByStripe(body: string, header: string | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !signatures.length || Math.abs(now / 1000 - Number(t)) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  return signatures.some((s) => same(s, expected));
}

/** A Stripe event, as far as it's read here. */
export interface StripeEvent {
  type: string;
  data: { object: Obj };
}

/** What an event means for the island, or nothing. */
export type Happened =
  | { kind: "checkout"; checkout: Checkout }
  | { kind: "renewal"; email: string; payment: Payment }
  | { kind: "refund"; email?: string; ref?: string }
  | { kind: "dispute"; ref?: string };

export function happened(event: StripeEvent): Happened | undefined {
  const o = event.data?.object;
  if (!o) return undefined;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      // A delayed payment (a bank debit) completes the checkout unpaid, and is thanked when it succeeds.
      if (o.object !== "checkout.session" || (event.type === "checkout.session.completed" && o.payment_status !== "paid")) return undefined;
      const checkout = asCheckout(o);
      return checkout && SESSION.test(checkout.session) ? { kind: "checkout", checkout } : undefined;
    }
    case "invoice.paid": {
      const email = str(o.customer_email);
      const id = str(o.id);
      // Only a subscription's invoices are monthly support.
      if (o.object !== "invoice" || !email || !id || !String(o.billing_reason ?? "").startsWith("subscription")) return undefined;
      const lines = (obj(o.lines)?.data as Obj[] | undefined) ?? [];
      const ends = lines.map((l) => obj(l.period)?.end).filter((e): e is number => typeof e === "number");
      const paidAt = obj(o.status_transitions)?.paid_at;
      const at = (typeof paidAt === "number" ? paidAt : typeof o.created === "number" ? o.created : Date.now() / 1000) * 1000;
      return { kind: "renewal", email, payment: { ref: id, at, plan: "monthly", ...(ends.length ? { periodEnd: Math.max(...ends) * 1000 } : {}) } };
    }
    case "charge.refunded": {
      // Only a whole refund takes a payment back; a partial one leaves it counting.
      if (o.object !== "charge" || o.refunded !== true) return undefined;
      return { kind: "refund", email: str(obj(o.billing_details)?.email) ?? str(o.receipt_email), ref: str(o.payment_intent) };
    }
    case "charge.dispute.created":
      return o.object === "dispute" ? { kind: "dispute", ref: str(o.payment_intent) } : undefined;
    default:
      return undefined;
  }
}
