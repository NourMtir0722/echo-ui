/**
 * What a supporter sends for the island, from /supporters/welcome: the name for
 * their Echo and up to two links. Checked the same way in the page (to say
 * what's wrong before anything is sent) and in the server that keeps it
 * (apps/supporters-api), and the island's list is made from what was kept the
 * same way in the server and in `pnpm supporters`. Pure, so they all share one
 * answer.
 */
import type { LinkKind, Supporter } from "../support/supporters";

export const NAME_MAX = 40;
export const LINKS_MAX = 2;
export const LINK_MAX = 200;
/** The longest a link may come out once written as an address (letters outside ASCII take up to nine each). */
const HREF_MAX = 280;

export interface Clean {
  name: string;
  links: { kind: LinkKind; href: string }[];
}

/** A link's kind, from its host: X (and Twitter), LinkedIn and YouTube by name; anything else is a website. */
export function kindOf(url: URL): LinkKind {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "youtube";
  return "site";
}

/** A link as someone types it ("x.com/ana", "https://ana.dev"), as an https address, or undefined when it isn't one. */
export function asLink(typed: string): URL | undefined {
  const t = typed.trim();
  if (!t || t.length > LINK_MAX || /\s/.test(t)) return undefined;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname) || url.username || url.password) return undefined;
  url.protocol = "https:";
  return url.href.length > HREF_MAX ? undefined : url;
}

/** What was sent, made safe to show, or every problem with it at once. */
export function clean(input: unknown): { ok: true; value: Clean } | { ok: false; problems: string[] } {
  const raw = (input && typeof input === "object" ? input : {}) as { name?: unknown; links?: unknown };
  const problems: string[] = [];
  const name = typeof raw.name === "string" ? raw.name.replace(/\s+/g, " ").trim() : "";
  if (!name) problems.push("A name for your Echo, as you want it shown.");
  else if ([...name].length > NAME_MAX) problems.push(`A name of ${NAME_MAX} characters at most.`);
  else if (/[<>]/.test(name) || [...name].some((ch) => ch.codePointAt(0)! < 32 || ch.codePointAt(0) === 127)) {
    problems.push("A name of letters, numbers and ordinary punctuation.");
  } else if (/https?:\/\/|www\./i.test(name)) problems.push("The name without a link in it: links go in their own boxes.");
  const typed = Array.isArray(raw.links) ? raw.links.filter((l): l is string => typeof l === "string" && l.trim() !== "") : [];
  if (typed.length > LINKS_MAX) problems.push(`Up to ${LINKS_MAX} links.`);
  const links: Clean["links"] = [];
  typed.slice(0, LINKS_MAX).forEach((t, i) => {
    const url = asLink(t);
    if (url) links.push({ kind: kindOf(url), href: url.href });
    else problems.push(`Link ${i + 1} isn't a web address. Write it as "x.com/you" or "https://you.dev".`);
  });
  return problems.length ? { ok: false, problems } : { ok: true, value: { name, links } };
}

/**
 * What the server keeps of one supporter's Echo (KV `supporter:<person>`),
 * whoever they are by email: what they sent, and Noor's marks.
 */
export interface Profile extends Clean {
  /** The end of their own link, given the first time they sent a name, and kept when they change it. */
  id: string;
  /** When they first sent a name, in milliseconds: their place in the order people joined. */
  joinedAt: number;
  /** Taken off the island by Noor (`pnpm supporters hide`), kept for a look; sending again doesn't bring it back. */
  hidden?: boolean;
  /** Erased on their request (`pnpm supporters remove`): no name, no links, only their place, so no one else gets their number. */
  removed?: boolean;
  founding?: boolean;
}

/** One payment, as Stripe told the server about it. No amount: only when, and how. */
export interface Payment {
  /** Stripe's reference for it: the PaymentIntent of a one-time payment, the Invoice of a monthly one. */
  ref: string;
  /** When it was paid, in milliseconds. */
  at: number;
  plan: Supporter["plan"];
  /** For a monthly payment, when the month it pays for ends, in milliseconds. */
  periodEnd?: number;
  refunded?: boolean;
}

/** How long an Echo stays awake on the island for one one-time payment, whatever its amount. */
export const ONE_TIME_DAYS = 30;
/** A monthly payment keeps an Echo awake to the end of its month, and these few days more, for the renewal to arrive. */
const GRACE_DAYS = 3;
const DAY = 24 * 3600 * 1000;

/** What a supporter's payments come to (KV `paid:<person>`'s metadata). */
export interface Standing {
  /** Awake on the island until this, in milliseconds; asleep after. */
  until: number;
  /** How the latest payment that counts was made. */
  plan: Supporter["plan"];
  /** How many payments count. */
  times: number;
  /** The first payment that counts, in milliseconds. */
  since: number;
  /** A payment was disputed with the bank: off the island. */
  disputed?: boolean;
}

/**
 * Payments as time on the island, in the order they were made: each one-time
 * payment adds 30 days to whatever is left, and a monthly one keeps the Echo
 * awake to the end of the month it pays for. A refunded payment doesn't count;
 * with none left, there's no standing at all.
 */
export function standing(payments: readonly Payment[], disputed = false): Standing | undefined {
  const live = payments.filter((p) => !p.refunded).sort((a, b) => a.at - b.at);
  if (!live.length) return undefined;
  let until = 0;
  for (const p of live) {
    until = p.plan === "once" ? Math.max(until, p.at) + ONE_TIME_DAYS * DAY : Math.max(until, p.periodEnd ?? p.at + 31 * DAY) + GRACE_DAYS * DAY;
  }
  return { until, plan: live[live.length - 1]!.plan, times: live.length, since: live[0]!.at, ...(disputed ? { disputed: true } : {}) };
}

/**
 * A payment added to someone's list, or merged into the one already there
 * with its reference (Stripe tells the same payment more than once, and a
 * monthly checkout and its first invoice are the same payment).
 */
export function withPayment(payments: readonly Payment[], p: Payment): Payment[] {
  const i = payments.findIndex((x) => x.ref === p.ref);
  if (i < 0) return [...payments, p];
  const merged = { ...payments[i]!, ...(p.periodEnd ? { periodEnd: p.periodEnd } : {}) };
  return payments.map((x, j) => (j === i ? merged : x));
}

/** A name as the end of a link: lowercase letters, digits and dashes. */
export function slug(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s || "supporter";
}

/** The month someone joined, as the island shows it: "October 2026". */
export function monthOf(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** An id no one on the island has yet (Noor's included): the name's, or the name's with a number after it. */
export function freeId(name: string, taken: ReadonlySet<string>): string {
  const base = slug(name);
  let id = base;
  for (let n = 2; taken.has(id) || id === "noor"; n++) id = `${base}-${n}`;
  return id;
}

/** One supporter's Echo in the island's order, with the number that order gives it. */
export interface Numbered {
  person: string;
  no: number;
  profile: Profile;
}

/**
 * Everyone who ever sent a name, numbered in the order they joined (from 1,
 * hidden and removed included, so a number is never given twice), and the
 * number the next one will get. Two ids that came out the same (two people
 * sending the same name in the same moment) are told apart here, the later one
 * with a number after it, so every link still leads to one person.
 */
export function numbered(profiles: readonly { person: string; profile: Profile }[]): { all: Numbered[]; next: number } {
  const sorted = [...profiles].sort((a, b) => a.profile.joinedAt - b.profile.joinedAt || (a.person < b.person ? -1 : 1));
  const taken = new Set<string>();
  const all = sorted.map(({ person, profile }, i) => {
    if (profile.removed) return { person, no: i + 1, profile };
    const id = taken.has(profile.id) || profile.id === "noor" ? freeId(profile.id, taken) : profile.id;
    taken.add(id);
    return { person, no: i + 1, profile: { ...profile, id } };
  });
  return { all, next: all.length + 1 };
}

/**
 * The island's list: everyone with a name and a payment that counts, in number
 * order, as the page draws them. An Echo whose time has run out is asleep, out
 * in the meadows whatever its plan was; one hidden by Noor, erased, disputed or
 * with every payment refunded isn't there at all.
 */
export function islandOf(
  profiles: readonly { person: string; profile: Profile }[],
  standings: ReadonlyMap<string, Standing>,
  now: number,
): { supporters: Supporter[]; next: number } {
  const { all, next } = numbered(profiles);
  const supporters: Supporter[] = [];
  for (const { person, no, profile } of all) {
    const st = standings.get(person);
    if (!st || st.disputed || profile.hidden || profile.removed) continue;
    const asleep = st.until < now;
    supporters.push({
      id: profile.id,
      name: profile.name,
      plan: asleep ? "once" : st.plan,
      no,
      since: monthOf(st.since / 1000),
      times: st.times,
      ...(asleep ? { asleep: true } : {}),
      ...(profile.founding ? { founding: true } : {}),
      links: profile.links,
    });
  }
  return { supporters, next };
}

/**
 * The island's list as the page receives it, checked again before it's drawn:
 * anything that isn't a supporter as the island knows one (a name it couldn't
 * have sent, a link that isn't https) is left out, rather than shown.
 */
export function readIsland(body: unknown): { supporters: Supporter[]; next: number } | undefined {
  const raw = body as { supporters?: unknown; next?: unknown } | null;
  if (!raw || !Array.isArray(raw.supporters) || !Number.isInteger(raw.next)) return undefined;
  const supporters: Supporter[] = [];
  for (const s of raw.supporters as Partial<Supporter>[]) {
    if (!s || typeof s.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)) continue;
    if (s.plan !== "monthly" && s.plan !== "once") continue;
    if (!Number.isInteger(s.no) || typeof s.since !== "string" || !Array.isArray(s.links) || !Number.isInteger(s.times) || s.times! < 1) continue;
    const checked = clean({ name: s.name, links: s.links.map((l) => (l && typeof l.href === "string" ? l.href : "")) });
    if (!checked.ok || !s.links.every((l) => typeof l.href === "string" && l.href.startsWith("https://"))) continue;
    supporters.push({
      id: s.id,
      name: checked.value.name,
      plan: s.plan,
      no: s.no!,
      since: s.since,
      times: s.times!,
      ...(s.asleep === true ? { asleep: true } : {}),
      ...(s.founding === true ? { founding: true } : {}),
      links: checked.value.links,
    });
  }
  return { supporters, next: raw.next as number };
}
