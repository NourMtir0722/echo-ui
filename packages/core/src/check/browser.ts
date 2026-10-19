/**
 * The page check as one script, for a browser something else drives: the
 * CLI's `check --url` adds it to a headless page before the app's own
 * scripts run. Built into the CLI, never into an app.
 *
 * Opening the channel this early is what lets a production build of the app
 * say it has no SoundProvider: core's `useSoundOptional` notes it wherever
 * the channel is open, and nothing else opens it outside development.
 *
 * Beside the check, it lends the CLI's axe step what it needs in the page:
 * each element named the way the check names one, and which rules the last
 * check found on an element, so a problem the check already said isn't said
 * again by axe. The element is compared, never a selector: axe and Echo write
 * different selectors for the same element.
 */
import { openPageCheckChannel } from "./channel";
import { checkPage, describe, selectorOf } from "./run";
import type { PageCheckOptions, PageFinding, PageRule } from "./types";

const channel = openPageCheckChannel();

/** A finding as it crosses out of the page: everything but the element. */
export type SentFinding = Omit<PageFinding, "element">;

/** The elements behind the last check's findings, with the rules that found each. */
let found = new WeakMap<Element, PageRule[]>();

const page = globalThis as unknown as {
  __echoCheckPage: (options?: PageCheckOptions) => SentFinding[];
  __echoFound: (el: Element) => PageRule[];
  __echoWhere: (el: Element) => { where: string; selector: string };
};

page.__echoCheckPage = (options) => {
  const findings = checkPage(document, options, channel.notes.values());
  found = new WeakMap();
  for (const f of findings) if (f.element) found.set(f.element, [...(found.get(f.element) ?? []), f.rule]);
  return findings.map(({ element: _element, ...finding }) => finding);
};
page.__echoFound = (el) => found.get(el) ?? [];
page.__echoWhere = (el) => ({ where: describe(el), selector: selectorOf(el) });
