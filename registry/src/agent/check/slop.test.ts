import { test } from "node:test";
import assert from "node:assert/strict";

import { CODE_TELLS } from "../slop";
import { readCss } from "./css";
import type { CheckProject } from "./model";
import type { FileResult } from "./rules";
import { slopCss, slopRules } from "./slop";
import { readTsx } from "./tsx";

/** The police only reads what the builder kept. */
const project = (keeps: string[] = []) => ({ keeps: new Set(keeps) }) as unknown as CheckProject;

function tsx(source: string, keeps: string[] = []): FileResult {
  const result: FileResult = { findings: [], notes: [] };
  slopRules("app/page.tsx", readTsx("app/page.tsx", source), project(keeps), result);
  return result;
}
const css = (source: string, keeps: string[] = []) => slopCss("app/page.css", readCss(source, "app/page.css"), project(keeps));
const tells = (r: FileResult) => r.findings.map((f) => /^Slop police, ([^:]+):/.exec(f.message)?.[1]);
const named = (id: string) => CODE_TELLS.find((t) => t.id === id)!.name;

/** Each code tell, caught on the smallest file that shows it. */
const CAUGHT: Record<string, { source: string; css?: boolean }> = {
  placeholder: { source: `export const A = () => <p>Jane Doe, Acme Inc.</p>;` },
  "gradient-text": { source: `export const A = () => <h1 className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Fly</h1>;` },
  "emoji-icon": { source: `export const A = () => <li>🚀 Fast booking</li>;` },
  "ai-sparkle": { source: `import { Sparkles } from "lucide-react";\nexport const A = () => <Sparkles />;` },
  "generic-cta": { source: `export const A = () => <button type="button">Get started</button>;` },
  "arrow-label": { source: `export const A = () => <a href="/trips">See your trips →</a>;` },
  "vague-copy": { source: `export const A = () => <h1>Elevate your travel with seamless booking</h1>;` },
  "side-stripe": { source: ".card { border-left: 4px solid var(--echo-accent); }\n", css: true },
  "spaced-caps": { source: ".eyebrow { text-transform: uppercase; letter-spacing: 0.18em; }\n", css: true },
  "dot-string": { source: `export const A = () => <p>Flights · Hotels · Packages</p>;` },
};

test("every code tell in the chart is caught, by the message that names it", () => {
  assert.deepEqual(Object.keys(CAUGHT).sort(), CODE_TELLS.map((t) => t.id).sort(), "a fixture for every tell");
  for (const [id, fixture] of Object.entries(CAUGHT)) {
    const found = fixture.css ? css(fixture.source).map((f) => /^Slop police, ([^:]+):/.exec(f.message)?.[1]) : tells(tsx(fixture.source));
    assert.ok(found.includes(named(id)), `${id}: ${JSON.stringify(found)}`);
  }
});

test("the same tells in the other language: Tailwind classes, style objects, the sparkle glyph", () => {
  assert.ok(tells(tsx(`export const A = () => <p className="text-xs uppercase tracking-widest">Deals</p>;`)).includes(named("spaced-caps")));
  assert.ok(tells(tsx(`export const A = () => <div className="border-l-4 p-4">x</div>;`)).includes(named("side-stripe")));
  assert.ok(tells(tsx(`export const A = () => <h1 style={{ backgroundClip: "text" }}>x</h1>;`)).includes(named("gradient-text")));
  assert.ok(tells(tsx(`export const A = () => <span>✦ AI picks</span>;`)).includes(named("ai-sparkle")));
  assert.ok(tells(tsx(`export const A = () => <img alt="" src="https://i.pravatar.cc/80" />;`)).includes(named("placeholder")));
  assert.ok(css(".h { -webkit-background-clip: text; }\n").length === 1);
  // Phrases between the dots, not only single words.
  assert.ok(tells(tsx(`export const A = () => <p>140+ Routes Worldwide · 4.9/5 from 3,210 travelers · Trusted by teams</p>;`)).includes(named("dot-string")));
});

test("a tell the builder kept isn't flagged; the floor always is", () => {
  const source = `export const A = () => (<><h1 className="bg-clip-text">Fly</h1><p>Jane Doe</p></>);`;
  assert.deepEqual(tells(tsx(source, ["gradient-text", "placeholder"])), [named("placeholder")]);
  assert.deepEqual(css(".e { text-transform: uppercase; letter-spacing: 2px; }\n", ["spaced-caps"]), []);
});

test("what isn't a tell stays quiet", () => {
  const clean = tsx(`import { Plane } from "lucide-react";
export const A = () => (
  <main>
    <h1>Your trips</h1>
    <p>Three flights this month, two with friends.</p>
    <button type="button">Search flights</button>
    <a href="/help">Help</a>
    <p>© 2026 Avelo · all rights reserved</p>
    <Plane aria-hidden />
  </main>
);`);
  assert.deepEqual(clean.findings, []);
  // A thin rule and ordinary capitals are fine.
  assert.deepEqual(css(".row { border-left: 1px solid var(--echo-seam); } .kbd { text-transform: uppercase; }\n"), []);
});

test("a number that may be invented is a note, not a finding", () => {
  const r = tsx(`export const A = () => <p>Trusted by 10,000+ travelers, 4.9/5</p>;`);
  assert.deepEqual(r.findings, []);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0]!.message, /If it's real, keep it/);
});
