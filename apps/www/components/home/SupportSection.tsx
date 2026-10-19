/**
 * Keep Echo free: supporting it, then the crowd of people who have.
 *
 * The second half of the homepage letter's section, which its P.S. leads
 * into, under the letter's heading. /support is a page of its own
 * (support/SupportPage.tsx), with the same panel beside Echo's island.
 *
 * "Support", never "donate": Echo is a company's work, not a charity's, so
 * what people give is support for it.
 */
import { Donate } from "@/components/support/Donate";
import { Crowd } from "@/components/support/Crowd";
import { BUG_REPORT_URL, REPO_PUBLIC, REPO_URL } from "@/components/site/repo";

export function SupportBody() {
  // The letter's P.S. has just said Echo is free and made by one person.
  return (
    <div className="support" data-reveal="">
      <header className="support__head">
        <h3 id="support-h" className="support__title">
          Support Echo
        </h3>
        <p className="support__lede">
          <strong>If Echo saves you time,</strong> your support pays for the next components, fixes and releases, so it
          stays free for everyone.
        </p>
      </header>
      <Donate />
      <Crowd />
      <p className="support__other">
        No budget?{" "}
        {REPO_PUBLIC ? (
          <>
            <a href={REPO_URL}>Star Echo on GitHub</a>, tell
          </>
        ) : (
          "Tell"
        )}{" "}
        a friend who builds interfaces, or <a href={BUG_REPORT_URL}>report a bug</a>.
      </p>
    </div>
  );
}
