/**
 * What the page check says, and what it takes. Shared by both entries of
 * `echo-ui-core/check`: the development one that looks, and the production
 * one that renders nothing, so an app's types are the same in either.
 */

/**
 * What the page check checks on a running page, by the name its findings carry:
 * - `setup`: the theme, the ground and the SoundProvider are on the page;
 * - `colour`: the app paints only colours its seed makes;
 * - `name`: every control has a name;
 * - `contrast`: text reaches WCAG AA against what's behind it;
 * - `alignment`, `depth`, `corners`, `icons`: the design tests (design.ts),
 *   what a designer checks on a screen: text cut off, actions out of line,
 *   stacked shadows and glows, corners that don't follow each other, icons
 *   that don't match;
 * - `screen`: the screen rules that need a rendered page to see.
 */
export const PAGE_RULES = ["setup", "colour", "name", "contrast", "alignment", "depth", "corners", "icons", "screen"] as const;
export type PageRule = (typeof PAGE_RULES)[number];

/**
 * The screen rules only a rendered page shows, by number, with the names they
 * have in Echo's screen rules (a test in the registry holds the two together).
 */
export const PAGE_SCREEN_RULES = {
  2: "One lit cap per decision",
  3: 'One "you are here"',
  9: "State is said, not coloured",
} as const;

export interface PageFinding {
  rule: PageRule;
  /** What's wrong and what to do, in one or two sentences. */
  message: string;
  /** What it's about, as a person would point at it: `button.echo-hw__cap "Save"`. */
  where?: string;
  /** A selector that finds it again. */
  selector?: string;
  /** A design test's one change that fixes it, and what to leave alone (the end of `message`). */
  fix?: string;
  /** A design test's numbers: what it measured, against what it allows. */
  measured?: string;
  /** The other elements a design finding is about (the rest of a row), as selectors. */
  related?: string[];
  /** The element itself, in the page (not across a serialisation). */
  element?: Element;
  /** Stable across runs: the same problem on the same element has the same key. */
  key: string;
}

export interface PageCheckOptions {
  /** Rules not to run. */
  ignore?: readonly PageRule[];
  /**
   * Colours the seed doesn't make that the app uses on purpose (a logo's,
   * a partner's), as CSS colours. The same list as echo.json's `check.colours`.
   */
  colours?: readonly string[];
}

export interface EchoCheckProps extends PageCheckOptions {
  /** A small panel in the corner that lists what the page check found. The console always does. */
  overlay?: boolean;
}
