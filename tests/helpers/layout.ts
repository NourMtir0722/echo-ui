import { expect, type Page } from "@playwright/test";

/**
 * Horizontal-overflow detection.
 *
 * Every overflow bug found on a phone existed because nothing ever looked at a
 * phone: the suite ran one project, `devices["Desktop Chrome"]`, and exactly
 * one test in it ever changed the viewport. So the rule lives here rather than
 * inside any one spec — one helper every route can be held to, at any width.
 *
 * The rule: an element may scroll horizontally only if it SAYS it scrolls.
 * `overflow-x: auto | scroll` is a deliberate scroll region — the table's
 * keyboard-reachable one is the case that matters — and is exempt. Anything
 * else wider than its own box is either clipping content the user can never
 * reach (a console template once did) or pushing its container open
 * (`/generator` once did, to 585px). Both are bugs, and axe reports neither.
 */

/** scrollWidth/clientWidth are integers, so a 1px gap is rounding, not a bug. */
const TOLERANCE = 1;

export type Overflow = {
  /** A short ancestor path, `.echo-*` where a node has one: `.echo-panel > div > pre`. */
  selector: string;
  scrollWidth: number;
  clientWidth: number;
};

/**
 * Measures every element and returns the ones overflowing horizontally.
 *
 * It walks the whole tree rather than just `.echo-*`, because the container
 * that gives way is frequently unstyled — `MAIN 1101 > 1088` on
 * `/audition` was a bare landmark, and it is invisible to a class-scoped walk.
 * Runs as a single page evaluation; a round trip per node is too slow to put
 * on every route.
 */
export async function findHorizontalOverflow(page: Page): Promise<Overflow[]> {
  return page.evaluate((tolerance) => {
    const name = (el: Element): string => {
      const echo = [...el.classList].find((c) => c.startsWith("echo-"));
      return echo ? `.${echo}` : el.tagName.toLowerCase();
    };
    /** Two ancestors is enough to locate an unclassed <div> by hand. */
    const describe = (el: Element): string =>
      [el.parentElement?.parentElement, el.parentElement, el]
        .filter((n): n is Element => !!n)
        .map(name)
        .join(" > ");

    const out: { selector: string; scrollWidth: number; clientWidth: number }[] = [];
    const seen = new Set<string>();
    const push = (selector: string, el: Element) => {
      const key = `${selector} ${el.scrollWidth}>${el.clientWidth}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ selector, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    };

    // The document is never allowed to pan sideways, whatever it declares.
    for (const root of [document.documentElement, document.body]) {
      if (root.scrollWidth > root.clientWidth + tolerance) push(root.tagName.toUpperCase(), root);
    }

    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      // Already reported above, and by their own names rather than as a path.
      if (el === document.documentElement || el === document.body) continue;
      if (el.scrollWidth <= el.clientWidth + tolerance) continue;
      const style = getComputedStyle(el);
      // An element that declares itself scrollable is doing so on purpose.
      if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
      /**
       * The visually-hidden idiom (`width:1px; height:1px; clip-path:inset(50%)`)
       * overflows by construction and by design — `.echo-led-key__sr`,
       * `.echo-steps__sr`, and a `hideCaption` table caption all measure as
       * `116 > 1`. A 1px box is not a layout the user can see, let alone one
       * they can lose content in.
       */
      if (el.clientWidth <= 1 || el.clientHeight <= 1) continue;
      /*
       * The same idiom at full size. Base UI sizes the Slider's hidden
       * range input to the thumb so VoiceOver's focus ring matches it, and
       * WebKit 26.6 gives a range input 24px of inner width, so a 20px thumb
       * measured `24 > 20`. `clip-path: inset(50%)` clips the box to nothing,
       * so none of what is inside it is on screen to be lost. The target-size
       * sweep below already exempts the same input for the same reason.
       */
      if (style.clipPath === "inset(50%)") continue;
      /*
       * A deliberate hit-area pad is transparent, pointer-only, and
       * bigger than the control on purpose — `.echo-tag__remove` is a 16px
       * button carrying a 24px target. That is interaction overflow, not
       * content overflow: nothing the user has to read is out there. The
       * exemption is bounded by the declared pad so it cannot hide a control
       * that genuinely overflows.
       */
      const pad = parseFloat(style.getPropertyValue("--echo-hit-area"));
      if (Number.isFinite(pad) && el.scrollWidth <= pad) continue;

      /*
       * An element that clips a decorative overlay on purpose — the skeleton's
       * sheen, a specular sweep — or hangs decoration outside its box for an
       * ancestor to clip, like the words either side of the homepage's device.
       * It must SAY so: `--echo-clip: decorative`. Clipping that loses content
       * stays a failure, which is what the console template's stat tiles once
       * were.
       */
      if (style.getPropertyValue("--echo-clip").trim() === "decorative") continue;

      /*
       * An element that truncates DECLARES what happens to long
       * content, and truncating is one of the two right answers. It still
       * reports `scrollWidth > clientWidth` — that is what an ellipsis IS —
       * so measuring alone cannot tell it apart from a container being pushed
       * open. `text-overflow: ellipsis` is the difference, and it is exactly
       * the declaration this ticket asks every text-bearing component to make.
       */
      if (style.textOverflow === "ellipsis" && style.overflowX === "hidden") continue;

      /*
       * A text input whose value is longer than its box scrolls that value
       * inside itself — that is what a text field does, in every browser, and
       * the text stays reachable with the caret. The page doesn't move, and
       * nothing is lost, so it is not a reflow failure.
       */
      if (el instanceof HTMLInputElement && el.type !== "range") continue;
      push(describe(el), el);
    }
    return out;
  }, TOLERANCE);
}

/** Formats offenders as `selector width > container`, e.g. `.echo-console__tiles 709 > 682`. */
export function formatOverflow(offenders: Overflow[]): string[] {
  return offenders.map((o) => `${o.selector} ${o.scrollWidth} > ${o.clientWidth}`);
}

/** Routes the docs app owns outside `/docs/[slug]`, which is scraped instead. */
export const APP_ROUTES = [
  "/",
  // The thank-you page a payment leads to, as anyone opening it without one sees it.
  "/supporters/welcome",
  "/docs",
  "/generator",
  "/styles",
  "/tactile",
  "/audition",
  "/gallery/hardware-button",
  "/gallery/modal",
  "/gallery/overlays",
  "/gallery/controls",
  "/gallery/structure",
  "/gallery/primitives",
  "/gallery/surfaces",
  "/gallery/textures",
  "/gallery/navigation",
  "/gallery/keys",
  "/gallery/rtl",
  "/templates",
  "/templates/console",
  "/templates/chat",
  "/brand/identity",
  "/brand/logo-use",
  "/brand/creature",
  "/brand/movement",
  "/brand/world",
  "/brand/materials",
  "/brand/voice",
  /*
   * The long-content fixture: every text-bearing component with a 120-character
   * label and a 40-character unbroken token. Nothing in the gallery could
   * catch undefined long-content behaviour, because every demo label in the
   * library is one or two tidy words.
   */
  "/stress",
] as const;

/**
 * Doc routes are scraped from the index, not hardcoded, for the reason
 * docs.spec.ts gives: both come from one manifest, so a new item joins this
 * sweep automatically.
 */
export async function docRoutes(page: Page): Promise<string[]> {
  await page.goto("/docs");
  const hrefs = await page
    .locator('a[href^="/docs/"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""));
  const routes = [...new Set(hrefs.filter((h) => h.length > "/docs/".length))];
  expect(routes.length).toBeGreaterThan(20); // the index is not silently empty
  return routes.sort();
}

export type OverflowSkip = {
  route: string;
  /** Which project measured the break. Several routes fail at one width only. */
  projects: ("chromium" | "mobile")[];
  /** The ticket that deletes this entry. */
  ticket: string;
  /** What it measured when the entry was written, so a change is visible. */
  measured: string;
};

/**
 * Known-broken routes — an explicit skip list. **It only ever shrinks.**
 *
 * That is enforced, not asked for: `layout.spec.ts` asserts a skipped route
 * still overflows, so fixing one fails the suite until its entry is deleted.
 * Nothing is added here without a ticket that removes it.
 *
 * Every entry is measured, never copied from a report. A `hideCaption`
 * caption clipped to 1px is not a break, and vertical clipping is outside what
 * this helper can see.
 */
export const OVERFLOW_SKIPS: OverflowSkip[] = [
  /*
   * Empty. Every route now lays out inside its viewport at 390 and 1440.
   *
   * Anything added here needs a ticket that removes it again.
   */
];

/** The skip entry covering this route in this project, if there is one. */
export function skipFor(route: string, project: string): OverflowSkip | undefined {
  return OVERFLOW_SKIPS.find(
    (s) => s.route === route && s.projects.includes(project as "chromium" | "mobile"),
  );
}

/**
 * Asserts a route lays out inside its viewport — unless it is a known break,
 * in which case it asserts the break is STILL there. A route that starts
 * passing fails with the ticket to close and the entry to delete.
 */
export async function expectLayout(page: Page, route: string, project: string): Promise<void> {
  const offenders = formatOverflow(await findHorizontalOverflow(page));
  const known = skipFor(route, project);

  if (!known) {
    expect(offenders, `horizontal overflow on ${route} (${project})`).toEqual([]);
    return;
  }

  expect(
    offenders.length,
    `${route} (${project}) no longer overflows — ${known.ticket} looks fixed. ` +
      `Delete its entry from OVERFLOW_SKIPS in tests/helpers/layout.ts; the list only shrinks.`,
  ).toBeGreaterThan(0);
}

/* ------------------------------------------------------- hit areas (2.5.8) */

/** WCAG 2.2 2.5.8 at AA. */
export const MIN_TARGET = 24;

/**
 * The platform guideline, applied only on coarse pointers.
 *
 * Distinct from MIN_TARGET on purpose: 24px is conformance and 44px is a
 * fingertip. These are "passing AA but under the platform guideline", which
 * is a different claim and deserves a different threshold.
 */
export const MIN_TOUCH_TARGET = 44;

export type SmallTarget = {
  selector: string;
  width: number;
  height: number;
};

/**
 * Measures every interactive node and returns those under 24x24.
 *
 * The measurement is the UNION of the element's own box and any `::before` /
 * `::after` it carries, because that is how Echo's target expansion works:
 * the visual size stays what it was and a transparent pseudo-element does the
 * reaching. Measuring `getBoundingClientRect()` alone would report the fix as
 * a failure.
 *
 * 2.5.8 exempts targets that are "inline" — a link inside a sentence, sized by
 * the text around it. Nothing in Echo's chrome is that: the breadcrumb, the
 * wordmark and "Forgot password?" are all standalone controls in their own
 * layout box, so none of them claims the exemption here.
 */
export async function findSmallTargets(page: Page, min = MIN_TARGET): Promise<SmallTarget[]> {
  return page.evaluate((min) => {
    const SELECTOR = [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "summary",
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="menuitemcheckbox"]',
      '[role="menuitemradio"]',
      '[role="option"]',
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const name = (el: Element): string => {
      const echo = [...el.classList].find((c) => c.startsWith("echo-"));
      return echo ? `.${echo}` : el.tagName.toLowerCase();
    };

    const out: { selector: string; width: number; height: number }[] = [];
    const seen = new Set<string>();

    for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // A 1px visually-hidden control (the skip link before focus) is not a
      // target anybody is aiming at.
      if (box.width <= 1 || box.height <= 1) continue;

      /*
       * 2.5.8's INLINE exception, applied rather than assumed: "the target is
       * in a sentence, or its size is otherwise constrained by the
       * line-height of non-target text". A link inside a paragraph cannot be
       * padded to 24px without pushing the lines around it apart, which is
       * exactly why the criterion exempts it.
       *
       * Held deliberately narrow: `display: inline` AND real text beside it in
       * the same parent. A standalone block link — the rail's "Switch →", the
       * docs' "llms.txt" — is not in a sentence and gets no exemption, which
       * is how `.echo-rail__name` at 316x13 is still a failure here.
       */
      /*
       * A VISUALLY HIDDEN control is not a target either. Base UI renders a
       * real `<input>` behind several of its components — the Slider's is
       * `clip-path: inset(50%)` at `width: 100%` of the thumb — so it
       * measures as a 28px box while being invisible. What a finger lands on
       * is the styled thumb, and that is what gets the 44px.
       */
      if (style.clipPath === "inset(50%)") continue;

      /*
       * Nor is a control inside an INERT subtree: it can't be focused or
       * pressed, so there's nothing to aim at. The homepage's Check card shows
       * the button an AI wrote as a picture of the screen, inert, and that
       * picture's Save is not a control of the page's.
       */
      if (el.closest("[inert]")) continue;

      /*
       * A focusable SCROLL REGION is not a target. `tabindex="0"` on a
       * `<pre>` or a table wrapper exists so a keyboard user can scroll it —
       * there is nothing to activate, and 2.5.8 is about targets you operate.
       * Narrow on purpose: it needs an actual scroll overflow, no role, and
       * no href.
       */
      const scrolls = style.overflowX === "auto" || style.overflowX === "scroll" ||
        style.overflowY === "auto" || style.overflowY === "scroll";
      if (
        scrolls &&
        !el.getAttribute("role") &&
        !el.hasAttribute("href") &&
        !["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(el.tagName)
      ) {
        continue;
      }

      if (style.display === "inline") {
        const parentText = (el.parentElement?.textContent ?? "").trim();
        const ownText = (el.textContent ?? "").trim();
        if (parentText.length > ownText.length) continue;
      }

      let width = box.width;
      let height = box.height;
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none") continue;
        const w = parseFloat(ps.width);
        const h = parseFloat(ps.height);
        if (Number.isFinite(w)) width = Math.max(width, w);
        if (Number.isFinite(h)) height = Math.max(height, h);
      }

      if (width >= min && height >= min) continue;
      const selector = name(el);
      const key = `${selector} ${Math.round(width)}x${Math.round(height)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ selector, width: Math.round(width), height: Math.round(height) });
    }
    return out;
  }, min);
}

/** Formats small targets as `selector WxH`, e.g. `.echo-tag__remove 16x16`. */
export function formatTargets(targets: SmallTarget[]): string[] {
  return targets.map((t) => `${t.selector} ${t.width}x${t.height}`);
}

/**
 * Known-undersized targets, with the ticket that fixes each.
 *
 * Same contract as OVERFLOW_SKIPS: it only shrinks, and that is enforced.
 */
export const TARGET_SKIPS: OverflowSkip[] = [];
