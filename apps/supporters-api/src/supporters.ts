/**
 * `pnpm supporters`: who's on Echo's island, and Noor's few changes to it.
 * Supporters put themselves on it from the thank-you page, and Stripe's
 * notices keep their time on it (store.ts); this is for what only Noor
 * decides. A change reaches the island within a minute.
 *
 *   pnpm supporters                         everyone, in number order: awake or asleep, how often they've supported, links
 *   pnpm supporters hide <who>              off the island, kept for a look (sending again won't bring it back)
 *   pnpm supporters show <who>              back on
 *   pnpm supporters remove <who>            erased, when they ask: name, links and payments gone, their number kept so no one else gets it
 *   pnpm supporters founding <who> [off]    the founding mark
 *   pnpm supporters undispute <who>         back on after a dispute was settled in Echo's favour
 *
 * <who> is their number (12) or their link's end (ana-silva). It reads and
 * writes the server's KV with wrangler, as the account wrangler is logged in to.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { numbered, standing, type Numbered, type Payment, type Profile, type Standing } from "../../www/components/supporters/submission";

export type Change = { hidden?: boolean; removed?: true; founding?: boolean; undispute?: true };

/** The Echo <who> names: a number, or an id. */
export function find(all: readonly Numbered[], who: string): Numbered | undefined {
  const no = /^(?:no\.?\s*)?0*(\d+)$/i.exec(who.trim())?.[1];
  return no ? all.find((e) => e.no === Number(no)) : all.find((e) => e.profile.id === who.trim());
}

/** What a command asks for, or why it can't. */
export function parse(args: readonly string[]): { list: true } | { who: string; change: Change } | { error: string } {
  const [verb, who, value] = args;
  if (!verb || verb === "list") return { list: true };
  if (!who) return { error: `Who? pnpm supporters ${verb} <number or id>` };
  switch (verb) {
    case "hide":
      return { who, change: { hidden: true } };
    case "show":
      return { who, change: { hidden: false } };
    case "remove":
      return { who, change: { removed: true } };
    case "undispute":
      return { who, change: { undispute: true } };
    case "founding":
      return value === undefined || value === "off" ? { who, change: { founding: value !== "off" } } : { error: "pnpm supporters founding <who> [off]" };
    default:
      return { error: `There's no "${verb}": list, hide, show, remove, founding, undispute.` };
  }
}

/** An Echo with a mark changed. Removing keeps only when they joined, which holds their number: no name, so no id made from it. */
export function apply(profile: Profile, change: Change): Profile {
  if (change.removed) return { id: "", name: "", links: [], joinedAt: profile.joinedAt, removed: true };
  const next: Profile = { ...profile };
  if (change.hidden !== undefined) next.hidden = change.hidden;
  if (change.founding !== undefined) next.founding = change.founding;
  if (!next.hidden) delete next.hidden;
  if (!next.founding) delete next.founding;
  return next;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** One line of the list: number, name, how they stand, marks and links. */
export function line({ no, profile }: Numbered, st: Standing | undefined, now: number): string {
  if (profile.removed) return `No. ${no}  (removed)`;
  const how = !st
    ? "no payment counts"
    : st.disputed
      ? "DISPUTED"
      : `${st.plan}, ${st.until < now ? `asleep since ${day(st.until)}` : `awake until ${day(st.until)}`}, supported ${st.times}×`;
  const marks = [how, profile.founding ? "founding" : "", profile.hidden ? "HIDDEN" : ""].filter(Boolean).join(", ");
  return [`No. ${no}  ${profile.name}  #${profile.id}  (${marks})`, ...profile.links.map((l) => `        ${l.href}`)].join("\n");
}

function main(args: string[]) {
  const here = fileURLToPath(new URL("..", import.meta.url));
  const kv = (...rest: string[]) =>
    execFileSync("npx", ["wrangler", "kv", "key", ...rest, "--binding", "SUBMISSIONS", "--remote"], { cwd: here, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const list = (prefix: string) => JSON.parse(kv("list", "--prefix", prefix)) as { name: string; metadata?: unknown }[];

  const asked = parse(args);
  if ("error" in asked) {
    console.error(asked.error);
    process.exit(1);
  }
  const profiles = list("supporter:")
    .filter((k) => (k.metadata as Profile | undefined)?.joinedAt)
    .map((k) => ({ person: k.name.slice("supporter:".length), profile: k.metadata as Profile }));
  const standings = new Map(
    list("paid:")
      .filter((k) => typeof (k.metadata as Standing | undefined)?.until === "number")
      .map((k) => [k.name.slice("paid:".length), k.metadata as Standing]),
  );
  const { all } = numbered(profiles);
  const now = Date.now();

  if ("list" in asked) {
    console.log(all.length ? all.map((e) => line(e, standings.get(e.person), now)).join("\n") : "No one on the island yet.");
    const unnamed = [...standings.keys()].filter((p) => !profiles.some((x) => x.person === p)).length;
    if (unnamed) console.log(`\n${unnamed} more paid and haven't named their Echo yet.`);
    return;
  }
  const entry = find(all, asked.who);
  if (!entry) {
    console.error(`No one is No. ${asked.who} or #${asked.who}. \`pnpm supporters\` lists everyone.`);
    process.exit(1);
  }
  const { person } = entry;
  if (asked.change.undispute) {
    const paid = JSON.parse(kv("get", `paid:${person}`, "--text")) as { payments: Payment[]; disputed?: boolean };
    const settled = { payments: paid.payments };
    kv("put", `paid:${person}`, JSON.stringify(settled), "--metadata", JSON.stringify(standing(settled.payments) ?? { none: true }));
    console.log(`${entry.profile.name} is back on the island within a minute.`);
    return;
  }
  // The stored record, not the one the list may have told apart: what's written back is what was kept.
  const stored = profiles.find((p) => p.person === person)!.profile;
  const changed = apply(stored, asked.change);
  if (asked.change.removed) {
    // Their place stays under a key of its own; the fingerprint of their email goes, with their payments.
    kv("put", `supporter:gone-${stored.joinedAt}`, JSON.stringify(changed), "--metadata", JSON.stringify(changed));
    kv("delete", `supporter:${person}`);
    kv("delete", `paid:${person}`);
  } else {
    kv("put", `supporter:${person}`, JSON.stringify(changed), "--metadata", JSON.stringify(changed));
  }
  console.log(`${line({ ...entry, profile: changed }, standings.get(person), now)}\nOn the island within a minute.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
