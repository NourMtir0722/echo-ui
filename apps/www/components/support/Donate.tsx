"use client";

/**
 * Supporting Echo, as one clear decision: how often (Monthly or One-time), how
 * much, and one big key that says both ("Support with $25 a month"). The
 * amount shows on the device's screen, big, so the page reads as what it is.
 * Beside it, what the money pays for. "Support", never "donate": Echo is a
 * company's work, and what people give is support for it, not a donation.
 *
 * Monthly is the one we'd ask for, so it's chosen first. Each amount is a cap
 * that stays down when chosen (aria-pressed), and the key opens the payment
 * link for that pair in a new tab. A link is fixed-price, so there's no box to
 * type an amount into, and only amounts with a link are offered
 * (donation-links.ts). A frequency with no links isn't offered. While Monthly
 * is chosen, the note says where someone already giving monthly manages it.
 *
 * Until the links exist, the key still looks like the way to give, because it
 * is the way to give; pressed, it says payments open soon and points to the
 * free ways to help meanwhile. It never pretends to take a payment, and it
 * names no payment company it doesn't use.
 */
import { useEffect, useId, useState } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Segmented } from "@registry/echo/segmented";
import { cheerGuide } from "@/components/home/Guide";
import { DONATION_AMOUNTS, DONATION_LINKS, MANAGE_URL, amountsFor, donationsOpen, type DonationAmount, type Frequency } from "./donation-links";
import { REPO_PUBLIC, REPO_URL } from "@/components/site/repo";
import "./support.css";


function HeartIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  );
}

const FREQUENCIES: { id: Frequency; label: string; per: string }[] = [
  { id: "monthly", label: "Monthly", per: "a month" },
  { id: "once", label: "One-time", per: "once" },
];

/** What the money pays for, in the FAQ's own words. */
const WHERE: [string, string][] = [
  ["New components", "The time it takes to design and build the next ones."],
  ["Fixes", "For what people report."],
  ["Docs, tests and the registry", "Kept current, and the site kept running."],
];

export function Donate({
  links = DONATION_LINKS,
  where = true,
  onFrequency,
  onSupport,
}: {
  links?: typeof DONATION_LINKS;
  /** "Where it goes" beside the panel. /support says it in its questions, and gives the room to the island. */
  where?: boolean;
  /** How often is chosen, and whenever it changes: /support moves the visitor's Echo to match. */
  onFrequency?: (frequency: Frequency) => void;
  /** The key is pressed. */
  onSupport?: () => void;
}) {
  const open = donationsOpen(links);
  // Before any link exists both frequencies and every amount show, so the panel reads whole.
  const offered = open ? FREQUENCIES.filter((f) => amountsFor(f.id, links).length > 0) : FREQUENCIES;
  const [freq, setFreq] = useState<Frequency>(offered[0]?.id ?? "monthly");
  const frequency = offered.find((f) => f.id === freq) ?? offered[0]!;
  const amounts = open ? amountsFor(frequency.id, links) : [...DONATION_AMOUNTS];
  const [picked, setPicked] = useState<DonationAmount>(25);
  const amount = amounts.includes(picked) ? picked : amounts[Math.min(2, amounts.length - 1)]!;
  const href = links[frequency.id][amount];
  const [said, setSaid] = useState<"thanks" | "soon" | null>(null);
  const readout = useId();
  useEffect(() => onFrequency?.(frequency.id), [frequency.id, onFrequency]);

  return (
    <div className={where ? "donate" : "donate donate--alone"}>
      <div className="donate__panel" role="group" aria-label="Support Echo">
        {offered.length > 1 && (
          <Segmented
            aria-label="How often"
            options={offered.map((f) => f.label)}
            value={offered.findIndex((f) => f.id === frequency.id)}
            onValueChange={(i) => {
              setFreq(offered[i]!.id);
              setSaid(null);
            }}
          />
        )}
        <p id={readout} className="donate__screen" aria-live="polite">
          <span className="donate__amount">${amount}</span>
          <span className="donate__per">{frequency.per}</span>
        </p>
        <div className="donate__amounts" role="group" aria-label="Amount">
          {amounts.map((a) => (
            <HardwareButton
              key={a}
              aria-pressed={a === amount}
              onClick={() => {
                setPicked(a);
                setSaid(null);
              }}
            >
              ${a}
            </HardwareButton>
          ))}
        </div>
        <div className="donate__go">
          {href ? (
            <HardwareButton
              variant="primary"
              size="lg"
              impact
              fullWidth
              icon={<HeartIcon />}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={readout}
              onClick={() => {
                setSaid("thanks");
                cheerGuide(1800);
                onSupport?.();
              }}
            >
              <span className="donate__verb">Support with </span>{`$${amount} ${frequency.per}`}
            </HardwareButton>
          ) : (
            <HardwareButton
              variant="primary"
              size="lg"
              impact
              fullWidth
              icon={<HeartIcon />}
              onClick={() => {
                setSaid("soon");
                onSupport?.();
              }}
            >
              <span className="donate__verb">Support with </span>{`$${amount} ${frequency.per}`}
            </HardwareButton>
          )}
        </div>
        <p className="donate__note" aria-live="polite">
          {said === "thanks" ? (
            "Thank you! The payment page opened in a new tab, where you confirm it."
          ) : said === "soon" ? (
            REPO_PUBLIC ? (
              <>
                Payments open soon. Until then, <a href={REPO_URL}>star Echo on GitHub</a>: it helps more than
                you&rsquo;d think.
              </>
            ) : (
              "Payments open soon. Until then, telling a friend who builds interfaces helps more than you\u2019d think."
            )
          ) : open ? (
            <>
              You confirm the amount on the payment page before anything is charged.
              {frequency.id === "monthly" && (
                <>
                  {" "}
                  Already giving monthly? <a href={MANAGE_URL}>Manage or cancel it</a>.
                </>
              )}
            </>
          ) : (
            "Payments open soon."
          )}
        </p>
      </div>

      {where && (
        <div className="donate__where">
          <p className="donate__where-h">Where it goes</p>
          <ul>
            {WHERE.map(([what, how]) => (
              <li key={what}>
                <span className="donate__where-what">{what}</span>
                <span className="donate__where-how">{how}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
