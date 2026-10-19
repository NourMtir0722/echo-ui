import { test } from "node:test";
import assert from "node:assert/strict";
import { asLink, clean, islandOf, kindOf, monthOf, numbered, readIsland, slug, standing, withPayment, type Payment, type Profile, type Standing } from "./submission";

test("a name and two links come back as the island shows them, each link with its kind", () => {
  const r = clean({ name: "  Ana   Silva ", links: ["x.com/ana", "https://www.linkedin.com/in/ana", ""] });
  assert.deepEqual(r, {
    ok: true,
    value: {
      name: "Ana Silva",
      links: [
        { kind: "x", href: "https://x.com/ana" },
        { kind: "linkedin", href: "https://www.linkedin.com/in/ana" },
      ],
    },
  });
});

test("everything wrong is said at once, and nothing that isn't a web address passes for a link", () => {
  const r = clean({ name: "", links: ["javascript:alert(1)", "not a link", "c.dev"] });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.problems.length, 4, r.problems.join("\n"));
    assert.match(r.problems.join(" "), /A name for your Echo/);
    assert.match(r.problems.join(" "), /Up to 2 links/);
  }
  for (const bad of ["ftp://a.dev", "https://user:pw@a.dev", "localhost", "https://a b.dev", "x".repeat(201)]) {
    assert.equal(asLink(bad), undefined, bad);
  }
  assert.equal(asLink("http://a.dev/x")?.href, "https://a.dev/x");
});

test("a name can't carry markup or a link of its own, and is held to 40 characters", () => {
  for (const name of ["<b>Ana</b>", "Ana https://ana.dev", "Ana www.ana.dev", "A".repeat(41)]) {
    assert.equal(clean({ name, links: [] }).ok, false, name);
  }
  assert.equal(clean({ name: "Zoë Ñúñez & Co.", links: [] }).ok, true);
});

test("a link's kind comes from its host", () => {
  assert.equal(kindOf(new URL("https://twitter.com/ana")), "x");
  assert.equal(kindOf(new URL("https://youtu.be/xyz")), "youtube");
  assert.equal(kindOf(new URL("https://m.youtube.com/@ana")), "youtube");
  assert.equal(kindOf(new URL("https://ana.dev")), "site");
});

test("a name becomes the end of a link, and a month is said the island's way", () => {
  assert.equal(slug("Zoë Ñúñez & Co."), "zoe-nunez-co");
  assert.equal(slug("@@@"), "supporter");
  assert.equal(monthOf(Date.UTC(2026, 9, 18) / 1000), "October 2026");
});

const DAY = 24 * 3600 * 1000;
const T0 = Date.UTC(2026, 9, 18);
const profile = (id: string, joinedAt: number, more: Partial<Profile> = {}): Profile => ({ id, name: id, links: [], joinedAt, ...more });
const once = (ref: string, at: number, more: Partial<Payment> = {}): Payment => ({ ref, at, plan: "once", ...more });

test("each one-time payment keeps an Echo awake 30 days more, and a monthly one to the end of its month and a few days", () => {
  assert.deepEqual(standing([once("a", T0)]), { until: T0 + 30 * DAY, plan: "once", times: 1, since: T0 });
  // A second payment while still awake adds to what's left; one after it ran out starts from then.
  assert.equal(standing([once("a", T0), once("b", T0 + 10 * DAY)])!.until, T0 + 60 * DAY);
  assert.equal(standing([once("a", T0), once("b", T0 + 45 * DAY)])!.until, T0 + 75 * DAY);
  const monthly = standing([{ ref: "in_1", at: T0, plan: "monthly", periodEnd: T0 + 31 * DAY }]);
  assert.deepEqual(monthly, { until: T0 + 34 * DAY, plan: "monthly", times: 1, since: T0 });
});

test("a refunded payment doesn't count, and with none left there's no standing; a dispute says so", () => {
  assert.equal(standing([once("a", T0, { refunded: true })]), undefined);
  assert.equal(standing([once("a", T0), once("b", T0 + DAY, { refunded: true })])!.times, 1);
  assert.equal(standing([once("a", T0)], true)!.disputed, true);
});

test("the same payment told twice is one payment, and a later word of it adds the month it pays for", () => {
  const first = withPayment([], { ref: "in_1", at: T0, plan: "monthly" });
  assert.equal(withPayment(first, { ref: "in_1", at: T0, plan: "monthly" }).length, 1);
  assert.deepEqual(withPayment(first, { ref: "in_1", at: T0 + 5, plan: "monthly", periodEnd: T0 + 31 * DAY }), [{ ref: "in_1", at: T0, plan: "monthly", periodEnd: T0 + 31 * DAY }]);
  assert.equal(withPayment(first, once("pi_2", T0)).length, 2);
});

test("everyone is numbered in the order they joined, the hidden and the removed holding their numbers", () => {
  const st = (s: Partial<Standing> = {}): Standing => ({ until: T0 + DAY, plan: "once", times: 1, since: T0, ...s });
  const { supporters, next } = islandOf(
    [
      { person: "c", profile: profile("cy", 30, { founding: true }) },
      { person: "a", profile: profile("ana", 10, { hidden: true }) },
      { person: "b", profile: profile("", 20, { name: "", removed: true }) },
      { person: "d", profile: profile("dee", 40) },
      { person: "e", profile: profile("eve", 50) },
      { person: "f", profile: profile("fay", 60) },
    ],
    new Map([
      ["a", st()],
      ["c", st({ plan: "monthly", times: 4 })],
      ["d", st({ until: T0 - DAY, plan: "monthly" })],
      ["e", st({ disputed: true })],
    ]),
    T0,
  );
  assert.deepEqual(supporters, [
    { id: "cy", name: "cy", plan: "monthly", no: 3, since: "October 2026", times: 4, founding: true, links: [] },
    // Asleep: out in the meadows, whatever plan it was on.
    { id: "dee", name: "dee", plan: "once", no: 4, since: "October 2026", times: 1, asleep: true, links: [] },
  ]);
  // Eve is disputed and Fay has no payment that counts: neither is on the island, and both keep their numbers.
  assert.equal(next, 7);
});

test("two people who sent the same name at the same moment still get a link each, and nobody gets Noor's", () => {
  const { all } = numbered([
    { person: "b", profile: profile("ana", 2) },
    { person: "a", profile: profile("ana", 1) },
    { person: "c", profile: profile("noor", 3) },
  ]);
  assert.deepEqual(all.map((e) => [e.no, e.profile.id]), [
    [1, "ana"],
    [2, "ana-2"],
    [3, "noor-2"],
  ]);
});

test("the page draws only supporters as the island knows them: a link that isn't https, or markup in a name, is left out", () => {
  const good = { id: "ana", name: "Ana", plan: "monthly", no: 1, since: "October 2026", times: 2, links: [{ kind: "x", href: "https://x.com/ana" }] };
  const read = readIsland({
    supporters: [
      good,
      { ...good, id: "evil", links: [{ kind: "site", href: "javascript:alert(1)" }] },
      { ...good, id: "tag", name: "<img src=x>" },
      { ...good, id: "Not An Id" },
      { ...good, id: "plan", plan: "yearly" },
      { ...good, id: "never", times: 0 },
      null,
    ],
    next: 7,
  });
  assert.deepEqual(read, { supporters: [good], next: 7 });
  for (const bad of [null, [], { supporters: "x", next: 1 }, { supporters: [] }]) assert.equal(readIsland(bad), undefined);
});

test("a link that comes out longer than the server can keep, once written as an address, isn't taken", () => {
  assert.equal(asLink(`ana.dev/${"é".repeat(60)}`), undefined);
  assert.ok(asLink(`ana.dev/${"é".repeat(20)}`));
});
