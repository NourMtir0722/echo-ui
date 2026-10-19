/**
 * Everyone who supports Echo, and asked to be shown: each gets an Echo on the
 * island at /supporters (and in the crowd under the support panel, and in the
 * heap at the foot of the homepage), with their name and their links.
 *
 * They put themselves there: right after paying, Stripe brings them to
 * /supporters/welcome, where they give their Echo a name and up to two links,
 * and the supporters server (apps/supporters-api) keeps it, checked against
 * the payment. The pages read the list from that server as they open
 * (supporters/live.ts), so it isn't in the repository: someone who asks to
 * come off the island leaves no trace of their name behind. Noor hides,
 * removes or marks anyone with `pnpm supporters`. Nobody picks a colour: their
 * Echo takes a shade of the brand's blue of its own, and its finish says how
 * they support (finish.ts).
 *
 * One Echo per person: payments with the same email are one supporter, and
 * their card counts them. Each one-time payment keeps their Echo awake on the
 * island for 30 days, and monthly support for as long as it renews; when the
 * time runs out, the Echo falls asleep out in the meadows, name, links and
 * number kept, and the next payment wakes it up. A refunded payment stops
 * counting, and a disputed one takes the Echo off (submission.ts, standing).
 *
 * Their place on the island: monthly supporters live in the village round
 * Noor's hill, one-time supporters, and every sleeping Echo, out in the
 * meadows.
 */
export type LinkKind = "x" | "linkedin" | "youtube" | "site";

export interface Supporter {
  /** The end of their own link: lowercase letters, digits and dashes. */
  id: string;
  name: string;
  plan: "monthly" | "once";
  /** Their number: the order people joined in, starting at 1. */
  no: number;
  /** The month they first supported, as it's shown: "October 2026". */
  since: string;
  /** How many times they've supported: every payment that counts, monthly renewals included. */
  times: number;
  /** Their time on the island has run out: their Echo sleeps until they support again. */
  asleep?: boolean;
  founding?: boolean;
  /** Shown as given, opened in a new tab, marked as paid for (`rel="sponsored"`). */
  links: { kind: LinkKind; href: string }[];
}
