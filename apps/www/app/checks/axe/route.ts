/**
 * A test fixture for axe in the page tests: fourteen mistakes an agent makes
 * writing raw markup outside Echo's parts, and one control with no name, in a
 * page of their own. It's a route rather than a page because three of them
 * are the document's own (no `lang`, no `<title>`, a viewport that stops
 * zoom), which the site's layout would put right.
 *
 * tests/page-tests.spec.ts runs it through the CLI's page tests and expects
 * axe to find eleven of the fourteen, each with its rule, and Echo's `name`
 * alone to say the control has no name. axe misses the last three: a link
 * around a button, a duplicated id, and a scrolling box with nothing in it a
 * keyboard can reach.
 */
export const dynamic = "force-static";

const ICON = (size: number) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>`;
const PICTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%235d5a66'/%3E%3C/svg%3E";

const PLANTS = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
body { margin: 32px; background: #fff; color: #1d1b22; font: 16px/1.5 system-ui, sans-serif; }
section { margin: 0 0 24px; }
#plant-target { display: flex; }
#plant-target button { width: 14px; height: 14px; padding: 0; border: 0; }
.scroll { height: 80px; width: 320px; overflow: auto; border: 1px solid #5d5a66; }
.scroll p { margin: 0; height: 240px; }
</style>
</head>
<body>
<main>
<h1>axe plants</h1>
<section id="plant-hidden"><div aria-hidden="true"><button type="button">Hidden</button></div></section>
<section id="plant-expanded"><button type="button" aria-expanded="yes">Menu</button></section>
<section id="plant-tab"><div role="tab" tabindex="0">A lone tab</div></section>
<section id="plant-list"><ul><li>One</li><div>Two</div></ul></section>
<section id="plant-target"><button type="button" aria-label="Bold">${ICON(10)}</button><button type="button" aria-label="Italic">${ICON(10)}</button></section>
<section id="plant-img"><img src="${PICTURE}" width="40" height="40"></section>
<section id="plant-frame"><iframe src="about:blank" width="200" height="60"></iframe></section>
<section id="plant-autocomplete"><label>Email <input type="email" autocomplete="nope"></label></section>
<section id="plant-nested"><a href="#plant-nested"><button type="button">Inside a link</button></a></section>
<section id="plant-id"><p id="twice">First</p><p id="twice">Second</p></section>
<section id="plant-scroll"><div class="scroll"><p>A box that scrolls, with nothing in it a keyboard can reach.</p></div></section>
<section id="plant-unnamed"><button type="button">${ICON(24)}</button></section>
</main>
</body>
</html>
`;

export function GET() {
  return new Response(PLANTS, { headers: { "content-type": "text/html; charset=utf-8" } });
}
