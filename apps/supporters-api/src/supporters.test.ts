import { test } from "node:test";
import assert from "node:assert/strict";

import { numbered, type Profile, type Standing } from "../../www/components/supporters/submission";
import { apply, find, line, parse } from "./supporters";

const profile = (id: string, joinedAt: number, more: Partial<Profile> = {}): Profile => ({
  id,
  name: id.toUpperCase(),
  links: [{ kind: "site", href: `https://${id}.dev/` }],
  joinedAt,
  ...more,
});

const { all } = numbered([
  { person: "p2", profile: profile("bo", 2) },
  { person: "p1", profile: profile("ana", 1) },
]);
const NOW = Date.UTC(2026, 9, 19);
const st = (until: number, more: Partial<Standing> = {}): Standing => ({ until, plan: "once", times: 2, since: 0, ...more });

test("a command says what it changes, or why it can't", () => {
  assert.deepEqual(parse([]), { list: true });
  assert.deepEqual(parse(["hide", "ana"]), { who: "ana", change: { hidden: true } });
  assert.deepEqual(parse(["show", "2"]), { who: "2", change: { hidden: false } });
  assert.deepEqual(parse(["founding", "ana", "off"]), { who: "ana", change: { founding: false } });
  assert.deepEqual(parse(["undispute", "ana"]), { who: "ana", change: { undispute: true } });
  for (const bad of [["hide"], ["plan", "ana", "once"], ["founding", "ana", "maybe"], ["delete", "ana"]]) assert.ok("error" in parse(bad), bad.join(" "));
});

test("someone is found by their number or by their link's end", () => {
  assert.equal(find(all, "2")?.profile.id, "bo");
  assert.equal(find(all, "No. 001")?.profile.id, "ana");
  assert.equal(find(all, "bo")?.no, 2);
  assert.equal(find(all, "3"), undefined);
});

test("removing someone erases their name, links and id, and keeps only the place their number holds", () => {
  const gone = apply(profile("ana", 1, { founding: true }), { removed: true });
  assert.deepEqual(gone, { id: "", name: "", links: [], joinedAt: 1, removed: true });
  const after = numbered([
    { person: "gone-1", profile: gone },
    { person: "p2", profile: profile("bo", 2) },
  ]);
  assert.equal(find(after.all, "bo")?.no, 2);
  assert.equal(line(after.all[0]!, undefined, NOW), "No. 1  (removed)");
});

test("the list says who's awake, who's asleep, who's hidden, and how often each has supported", () => {
  assert.match(line(all[0]!, st(NOW + 86_400_000), NOW), /awake until 2026-10-20, supported 2×/);
  assert.match(line(all[0]!, st(NOW - 86_400_000), NOW), /asleep since 2026-10-18/);
  assert.match(line(all[0]!, st(NOW, { disputed: true }), NOW), /DISPUTED/);
  assert.match(line(all[0]!, undefined, NOW), /no payment counts/);
  assert.match(line({ ...all[0]!, profile: apply(all[0]!.profile, { hidden: true }) }, st(NOW + 1), NOW), /HIDDEN/);
  assert.equal(apply(apply(profile("ana", 1), { founding: true }), { founding: false }).founding, undefined);
});
