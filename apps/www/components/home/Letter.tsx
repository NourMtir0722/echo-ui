/**
 * The last section: a letter from the person who made Echo, saying why it
 * exists, and the ask as its P.S. People give to a person who wrote to them,
 * not to a list of facts, so the maker's letter and the support are one
 * moment.
 *
 * The letter is paper, an object, so it's allowed depth: lit by Echo's key
 * light from the top left with the same soft shadow as a cap, typed in the
 * mono face, the photo clipped to its corner. Its paper and ink are the
 * receipt's (the theme's text colour as paper, its surface as ink), a pair
 * the engine keeps legible on any seed. No wax seal or stamp: that's another
 * product's language.
 *
 * The photo is Noor's own: a face is what stops someone scrolling past, and
 * what they trust before they give. It's far down the page, so it loads only
 * as the letter comes near. The section is the page's second bookend, on the
 * seed's light like the hero. The guide peeks over the top of the paper.
 */
import { BigTitle } from "@/components/home/BigTitle";
import { GuideStop } from "@/components/home/Guide";
import { SupportBody } from "@/components/home/SupportSection";
import { SPONSOR_EMAIL } from "@/components/support/donation-links";

function PaperClip() {
  return (
    <svg className="letter__clip" viewBox="0 0 24 64" aria-hidden="true">
      <path
        d="M8 50V14a4 4 0 0 1 8 0v38a8 8 0 0 1-16 0V10a10 10 0 0 1 20 0v36"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The letter: why Echo exists, from the person who made it. Her goal, what
 * each product's design cost her, and the base she built so it wouldn't. It's
 * written for someone who scrolled past everything else, so it says what Echo
 * is on its own. How it works is the road's to say, not the letter's: two
 * sections never explain the same steps.
 */
function Pitch() {
  return (
    <>
      <p>
        Hi, I&rsquo;m Noor. I&rsquo;m a product designer and software engineer, and I&rsquo;ve given myself until I turn
        30 to launch 30 products of my own.
      </p>
      <p>
        I want each one to have good design and motion, and none of them to look like the others. AI made the building
        fast. The design still took hours: finding a style, finding components my agent could restyle, then catching the
        agent drifting off the style as it built. Thirty times over, I&rsquo;d run out of time before I ran out of ideas.
      </p>
      <p>
        So I built the base first. Echo is one design system my AI agents build with: the same components, the same
        press, sound and motion underneath, and a different style on top for each product. Thirty products, thirty looks,
        one base.
      </p>
      <p>I&rsquo;m building all of them on Echo, so I&rsquo;ll be fixing and growing it for a long time.</p>
    </>
  );
}

export function Letter() {
  return (
    <section className="letter-sec" aria-labelledby="letter-h" data-guide-section="">
      <div className="letter-sec__inner">
        <div className="letter-sec__head">
          <BigTitle id="letter-h" title="30 products before I turn 30">
            <strong>A letter from Noor, who made Echo,</strong> and why it&rsquo;s free.
          </BigTitle>
        </div>

        <article className="letter" aria-label="A letter from Noor Mtir">
          <GuideStop className="letter__stop" />
          <figure className="letter__photo">
            <PaperClip />
            {/* A plain img: the site is also a static export, with no image server behind it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/letter/noor-mtir.webp" alt="Noor Mtir" width={400} height={500} loading="lazy" decoding="async" />
          </figure>

          <p className="letter__date">
            <time dateTime="2026-10-16">16 October 2026</time>
          </p>
          <Pitch />
          <p className="letter__sign">Noor</p>
          <ul className="letter__links">
            <li>
              {/* Why to follow, not only where: the 30 products are built in the open. */}
              <a href="https://x.com/noormtir" rel="me">
                Follow the 30 on X
              </a>
            </li>
            <li>
              <a href="https://github.com/NourMtir0722" rel="me">
                Noor on GitHub
              </a>
            </li>
          </ul>
          {/* Not "open source" while the repository is private: someone who goes looking finds nothing. */}
          <p className="letter__ps">
            P.S. Echo is free, and I make it on my own. If it saves you time, you can support it below. If your company
            builds on Echo and wants to sponsor it, write to me at <a href={`mailto:${SPONSOR_EMAIL}`}>{SPONSOR_EMAIL}</a>.
          </p>
        </article>

        <SupportBody />
      </div>
    </section>
  );
}
