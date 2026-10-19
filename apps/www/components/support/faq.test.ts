/**
 * The support page's questions said "Echo adds you to the island
 * automatically" when nothing did: supporters were added by hand, from
 * Stripe. Someone who paid and then waited on an automatic Echo that never
 * came would read it as broken. Since then something does: the thank-you
 * page saves what they send to the supporters server, and the island reads
 * its list from there as it opens. Whichever way it works, the answer has to
 * say the way it really does.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("the support page says how an Echo gets onto the island the way it really does", () => {
  const page = read("./SupportPage.tsx");
  // What the code does: the thank-you page saves, and the island, the crowd and the heap read the server's list.
  assert.match(read("../supporters/Welcome.tsx"), /"\/supporter\/save"/);
  assert.match(read("../supporters/live.ts"), /\/supporters`\)/);
  for (const reader of ["../supporters/SupportersPage.tsx", "./Crowd.tsx", "./SupportIsland.tsx"]) assert.match(read(reader), /useIsland\(\)/, reader);
  assert.doesNotMatch(read("./supporters.ts"), /export const SUPPORTERS/, "no list written into the site that the server's could disagree with");
  // What the answer says: on the island at once, and nothing about waiting on Noor.
  assert.match(page, /How does my Echo get there\?[\s\S]*?on the island the moment you press the key/);
  assert.doesNotMatch(page, /by hand/i, "the questions say someone adds you by hand, and nobody has to");
});
