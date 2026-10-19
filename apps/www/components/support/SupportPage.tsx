"use client";

/**
 * /support: where the nav's "Support Echo", the README, npm's `funding` link
 * and GitHub's Sponsor button lead. It shows what supporting Echo gets you
 * before you pay. The first screen is the ask alone, the price and the key,
 * so there's one thing to look at; at its foot Echo hops on a key asking what
 * happens when you support it (WhatHappens). The answer is the next screen:
 * Echo's island, with the visitor's own Echo dropping onto it (SupportIsland);
 * then the video every supporter's Echo makes of its spot, as it looks posted
 * (PlacePost); then the questions people ask before they give, and the ask
 * again.
 */
import { useCallback, useRef, useState } from "react";
import "echo-ui-core/theme/material.css";
import { SoundProvider } from "echo-ui-core/sound";
import { AppShell } from "@registry/echo/app-shell";
import { Accordion } from "@registry/echo/accordion";
import { HardwareButton } from "@registry/echo/hardware-button";
import { TopNavLinks, Wordmark } from "@/components/site/SiteTopBar";
import { BUG_REPORT_URL, REPO_PUBLIC, REPO_URL } from "@/components/site/repo";
import { REGISTRY_HOMEPAGE, SUPPORT_EMAIL } from "@registry/agent/guidance";
import { BigTitle } from "@/components/home/BigTitle";
import { HomeFooter } from "@/components/home/HomeFooter";
import { LANDING_SEED } from "@/components/home/landing-seed";
import { useReveal } from "@/components/home/use-reveal";
import { Donate } from "./Donate";
import { PlacePost } from "./PlacePost";
import { SupportIsland } from "./SupportIsland";
import { WhatHappens } from "./WhatHappens";
import {
  DONATION_AMOUNTS,
  MANAGE_URL,
  SPONSOR_EMAIL,
  type Frequency,
} from "./donation-links";
import "@/components/home/home.css";
// The landing's Swiss titles (BigTitle), for the page's sections.
import "@/components/home/landing.css";
import "./support-page.css";

/** In the order someone deciding asks them: what they get first, then the money. */
const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What do I get?",
    a: (
      <>
        An Echo of your own on <a href="/supporters">Echo&rsquo;s island</a>,
        with your name, up to two links (X, LinkedIn, YouTube or a website) and
        a number of its own, in the order people joined. It has its own address
        to share, {new URL(REGISTRY_HOMEPAGE).host}/supporters#your-name, and its card makes a short
        video of your place, ready to post.
      </>
    ),
  },
  {
    q: "How does my Echo get there?",
    a: "Right after you pay, you come back to this site, where you give your Echo a name and up to two links: X, LinkedIn, YouTube or a website. Your Echo is on the island the moment you press the key, with your own address to share. The link to that page also comes in your thank-you email, in case you leave before you're done.",
  },
  {
    q: "What's the difference between monthly and one-time?",
    a: "How long your Echo stays awake, where it lives, and what it's made of. Monthly supporters live in the village round Noor's hill, in a clear glaze, awake for as long as they support. A one-time payment keeps your Echo awake for 30 days, out in the meadows, in satin. When its time runs out, your Echo falls asleep on the island, keeping its name, links and number, and the next payment wakes it up.",
  },
  {
    q: "What if I support more than once?",
    a: "Every payment goes to the same Echo, as long as you pay with the same email: its card counts how many times you've supported, each one-time payment adds another 30 days awake, and a sleeping Echo wakes up. A payment that's refunded stops counting.",
  },
  {
    q: "Can I change my name or links, or leave the island?",
    a: (
      <>
        Any time, from the link in your thank-you email. To leave the island, write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, and your Echo
        comes down.
      </>
    ),
  },
  {
    q: "Is Echo free?",
    a: "Yes, all of it. Echo is MIT-licensed: use it in anything, commercial work included, with no account, no key and no paid tier.",
  },
  {
    q: "Where does the money go?",
    a: "Into Echo: the time it takes to design and build new components, fix what people report, keep the docs and the tests current, and run the site and the registry.",
  },
  {
    q: "How is the payment made?",
    a: "Through Stripe. The button opens Stripe's payment page for the amount you chose, in a new tab, where you confirm it and pay. Echo never sees your card details. Your statement shows NAWWARA STUDIO LLC: Nawwara Studio is the company that makes Echo.",
  },
  {
    q: "How do I change or cancel monthly support?",
    a: (
      <>
        Any time, on{" "}
        <a href={MANAGE_URL}>Stripe&rsquo;s page for your subscription</a>: sign
        in with the email you paid with. Cancelling stops the next payment. To
        change the amount, cancel and choose the new one here.
      </>
    ),
  },
  {
    q: "Is my support tax-deductible?",
    a: "No. Echo is made by a company, not a charity, so what you give is a payment toward Echo's work rather than a charitable gift.",
  },
  {
    q: "Can my company sponsor Echo?",
    a: (
      <>
        Yes: write to Noor at{" "}
        <a href={`mailto:${SPONSOR_EMAIL}`}>{SPONSOR_EMAIL}</a>. Monthly support
        at any level works too, and Stripe emails a receipt for every payment.
      </>
    ),
  },
  {
    q: "Can I help without paying?",
    a: (
      <>
        Very much.{" "}
        {REPO_PUBLIC ? (
          <>
            <a href={REPO_URL}>Star the repository</a>, tell
          </>
        ) : (
          "Tell"
        )}{" "}
        someone who builds interfaces, or{" "}
        <a href={BUG_REPORT_URL}>report a bug</a>: every report makes Echo
        better for everyone who uses it.
      </>
    ),
  },
];

export function SupportPage() {
  const [plan, setPlan] = useState<Frequency>("monthly");
  const onFrequency = useCallback((f: Frequency) => setPlan(f), []);
  const ask = useRef<HTMLElement>(null);
  useReveal();
  return (
    <SoundProvider>
      <AppShell bare>
        <AppShell.Rail label="Site" brand={<Wordmark />}>
          {/* The page opens on the brand's blue (app/support/page.tsx), so the light key keeps it. */}
          <TopNavLinks opening={LANDING_SEED} />
        </AppShell.Rail>
        <AppShell.Content>
          <div className="sp">
            {/* One night from the ask down to the island, so the two screens read as one place. */}
            <div className="sp-sky sw-sky">
            <section
              ref={ask}
              id="get-yours"
              className="sp-hero"
              aria-labelledby="support-h"
            >
              <header className="sp-hero__words">
                <h1 id="support-h" className="sp-hero__title">
                  Support Echo
                </h1>
                <p className="sp-hero__line">
                  <strong>Echo is free, made by one person.</strong> Your
                  support keeps it free for everyone.
                </p>
              </header>
              <div className="sp-hero__panel">
                <Donate where={false} onFrequency={onFrequency} />
              </div>
              <div className="sp-hero__cue">
                <WhatHappens to="what-happens" />
              </div>
            </section>

            <section
              id="what-happens"
              className="sp-isle"
              aria-labelledby="what-happens-h"
            >
              <h2 id="what-happens-h" className="sp-isle__h">
                What happens when you support Echo
              </h2>
              <SupportIsland plan={plan} under={ask} />
            </section>
            </div>

            <PlacePost />

            <section className="sp-faq" aria-labelledby="faq-h">
              <BigTitle id="faq-h" title="Questions" />
              <Accordion>
                {QUESTIONS.map(({ q, a }) => (
                  <Accordion.Item key={q} value={q}>
                    <Accordion.Trigger>{q}</Accordion.Trigger>
                    <Accordion.Panel>
                      <p className="sp-faq__answer">{a}</p>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
              <div className="sp-faq__ask">
                <HardwareButton
                  variant="primary"
                  size="lg"
                  impact
                  href="#get-yours"
                >
                  Get your Echo on the island
                </HardwareButton>
                <p className="sp-faq__note">
                  From ${DONATION_AMOUNTS[0]}, once or monthly.
                </p>
              </div>
            </section>
          </div>
          <HomeFooter />
        </AppShell.Content>
      </AppShell>
    </SoundProvider>
  );
}
