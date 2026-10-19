import { test } from "node:test";
import assert from "node:assert/strict";

import { thankYou, thankYouAgain, timesSaid } from "./thanks";

const SITE = "https://site.example";
const SESSION = "cs_live_a1B2c3D4e5F6g7H8i9J0";

test("the first email is from Noor, with their own link, Echo jumping, and where their Echo will live", () => {
  const once = thankYou(SITE, SESSION, "once");
  assert.equal(once.link, `${SITE}/supporters/welcome?session_id=${SESSION}`);
  assert.match(once.text, /^Hi, it’s Noor here\./);
  assert.match(once.text, /out in the meadows/);
  assert.ok(once.text.includes(once.link) && once.html.includes(once.link));
  assert.ok(once.html.includes(`${SITE}/email/echo-hop.gif`), "Echo jumping, from the site");
  assert.match(thankYou(SITE, SESSION, "monthly").text, /in the village round my hill/);
});

test("supporting again says what it did for their Echo, by name, and leads to it on the island", () => {
  const awake = thankYouAgain(SITE, SESSION, { name: "Ana", id: "ana", plan: "once", times: 3, woke: false });
  assert.match(awake.text, /^Hi, it’s Noor again\./);
  assert.match(awake.text, /Ana has another 30 days awake on the island/);
  assert.match(awake.text, /supported Echo 3 times/);
  assert.ok(awake.html.includes(`${SITE}/supporters#ana`));
  assert.match(thankYouAgain(SITE, SESSION, { name: "Ana", id: "ana", plan: "once", times: 2, woke: true }).text, /Ana just woke up/);
  assert.match(thankYouAgain(SITE, SESSION, { name: "Ana", id: "ana", plan: "monthly", times: 5, woke: false }).text, /for as long as you support monthly/);
});

test("a name is the supporter's own words in the plain text, and can't become markup in the HTML", () => {
  const m = thankYouAgain(SITE, SESSION, { name: `Zoë & "Co"`, id: "zoe-co", plan: "once", times: 2, woke: false });
  assert.match(m.text, /Zoë & "Co" has another/);
  assert.ok(m.html.includes("Zoë &#38; &#34;Co&#34;"));
  assert.equal(timesSaid(2), "twice");
  assert.equal(timesSaid(7), "7 times");
});
