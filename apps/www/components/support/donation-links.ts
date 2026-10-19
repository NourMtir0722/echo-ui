/**
 * Where support goes: a Stripe payment link for each amount, one set for
 * one-time payments and one for monthly ones, all for the product "Support
 * Echo UI" on Nawwara Studio's Stripe account.
 *
 * A payment link is fixed-price, so every amount the panel offers is a link of
 * its own (a monthly one starts a subscription). Once any link exists, an
 * amount with no link isn't offered. With no links at all, every amount shows
 * and the key, pressed, says payments open soon (Donate.tsx).
 *
 * To Stripe these are tips for Echo, not donations: a donation has to serve a
 * charitable purpose, and Nawwara Studio is a company. So the payment pages
 * say "Pay" and "Subscribe", and the site says "Support".
 *
 * Amounts are US dollars. Stripe shows each visitor their own currency, with
 * US dollars one click away.
 */
export type Frequency = "monthly" | "once";

/** Five caps fit a column. */
export const DONATION_AMOUNTS = [5, 10, 25, 50, 100] as const;
export type DonationAmount = (typeof DONATION_AMOUNTS)[number];

export const DONATION_LINKS: Record<Frequency, Partial<Record<DonationAmount, string>>> = {
  once: {
    5: "https://buy.stripe.com/eVq4gz57Tf6qcpK1vsfrW08",
    10: "https://buy.stripe.com/14A5kD1VH6zUgG0ca6frW01",
    25: "https://buy.stripe.com/14A6oHgQB6zU4Xi4HEfrW09",
    50: "https://buy.stripe.com/6oU4gz7g1e2mcpKdeafrW0a",
    100: "https://buy.stripe.com/14A8wPcAl4rM2Paca6frW0b",
  },
  monthly: {
    5: "https://buy.stripe.com/bJe4gz9o96zU9dygqmfrW00",
    10: "https://buy.stripe.com/dRm4gzcAlbUeahC5LIfrW06",
    25: "https://buy.stripe.com/aFaaEXdEp0bwfBWca6frW05",
    50: "https://buy.stripe.com/3cIeVdgQB3nIcpKb62frW04",
    100: "https://buy.stripe.com/eVqeVd0RDe2m2PagqmfrW02",
  },
};

/**
 * Where a monthly supporter manages their support: Stripe's customer portal.
 * They sign in with the email they paid with, can cancel (at the end of the
 * month already paid for) or change their card, and it brings them back to
 * /support. Changing the amount is cancelling and choosing a new one.
 */
export const MANAGE_URL = "https://billing.stripe.com/p/login/bJe4gz9o96zU9dygqmfrW00";

/** Where a company writes to sponsor Echo: Noor herself, not a payment link. */
export const SPONSOR_EMAIL = "noor@nawwara.studio";

/** The amounts a visitor can choose for a frequency: the ones with a link. */
export const amountsFor = (frequency: Frequency, links = DONATION_LINKS) =>
  DONATION_AMOUNTS.filter((a) => links[frequency][a]);

/** Whether payments are open at all. */
export const donationsOpen = (links = DONATION_LINKS) => amountsFor("once", links).length + amountsFor("monthly", links).length > 0;
