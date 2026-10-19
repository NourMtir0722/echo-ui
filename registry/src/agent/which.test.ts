import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RegistryCatalog } from "./catalog";
import { ALL_METAS } from "./metas";
import { GAPS, JOBS, answerNeed } from "./which";

const catalogPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/www/public/r/catalog.json");
// Read in one step, not looked for and then read: absent, it's not built.
const text = await readFile(catalogPath, "utf8").catch(() => undefined);
const built = text !== undefined;
const catalog = built ? (JSON.parse(text) as RegistryCatalog) : undefined;
const first = (need: string) => answerNeed(catalog!, need).fits[0]?.component.name;

test("every item the job vocabulary names exists", () => {
  const names = new Set<string>(ALL_METAS.map((m) => m.name));
  const missing = JOBS.flatMap((j) => j.items).filter((item) => !names.has(`echo-${item}`) && !names.has(item));
  assert.deepEqual(missing, []);
});

test("no phrase is both a job and a gap", () => {
  const jobs = new Set(JOBS.flatMap((j) => j.says));
  assert.deepEqual(GAPS.flatMap((g) => g.says).filter((p) => jobs.has(p)), []);
});

test("which answers the job, not the word", { skip: !built }, () => {
  assert.equal(first("a settings toggle"), "echo-switch");
  assert.equal(first("confirm a delete"), "echo-alert-dialog");
  assert.equal(first("a monthly/yearly switch"), "echo-segmented");
  assert.equal(first("stat cards for revenue"), "echo-stat-tile");
  assert.equal(first("a table of recent orders"), "echo-table");
  assert.equal(first("upload progress"), "echo-progress");
  assert.equal(first("a file upload with a dropzone"), "echo-file-upload");
  assert.equal(first("an email field"), "echo-field");
  // An item named whole, as a person or agent would.
  assert.equal(first("the hardware button"), "echo-hardware-button");
  assert.equal(first("a date tile"), "echo-date-tile");
  // At most three, and the vocabulary's answer alone when it has one.
  assert.deepEqual(answerNeed(catalog!, "button").fits.map((f) => f.component.name), ["echo-hardware-button"]);
  assert.ok(answerNeed(catalog!, "confirm a delete").fits.length <= 3);
});

test("a date picker is DatePicker, not DateTile; nothing fits is an answer", { skip: !built }, () => {
  assert.equal(first("a date picker"), "echo-date-picker");
  assert.ok(!answerNeed(catalog!, "a date picker").fits.some((f) => f.component.name === "echo-date-tile"));
  assert.equal(first("a booking calendar"), "echo-calendar");
  assert.equal(first("a desk calendar"), "echo-date-tile");
  // Coming soon, said as such.
  const range = answerNeed(catalog!, "a date range picker");
  assert.deepEqual(range.fits, []);
  assert.match(range.gap!, /coming soon/);
  assert.match(answerNeed(catalog!, "an image slider").gap!, /carousel is coming soon/);
  // Nothing Echo has, and nothing it knows it lacks: still no guess.
  const odd = answerNeed(catalog!, "a flux capacitor");
  assert.deepEqual(odd.fits, []);
  assert.equal(odd.gap, undefined);
});

test("each fit carries a one-line reason from its own summary", { skip: !built }, () => {
  const [fit] = answerNeed(catalog!, "a settings toggle").fits;
  assert.ok(fit && fit.reason.length > 10 && fit.reason.length <= 160);
  assert.doesNotMatch(fit.reason, /\n/);
});

test("the jobs a travel screen asked for are named, not answered with nothing", { skip: !built }, () => {
  // Each was "Nothing in Echo does this yet" (or the wrong item) when an agent
  // built a trip screen, so it would have drawn its own: a lookalike.
  assert.equal(first("a row of choices where one is chosen"), "echo-segmented");
  assert.equal(first("a person's initials in a round chip"), "echo-avatar");
  assert.equal(first("a status word like Boarding"), "echo-badge");
  assert.equal(first("show a state in words"), "echo-badge");
  assert.equal(first("group related content"), "echo-panel");
  assert.equal(first("a departure time that flips"), "echo-split-flap");
  assert.equal(first("a departures board"), "echo-split-flap");
  // Not every "initial" is a person.
  assert.notEqual(first("a field with an initial value"), "echo-avatar");
  // A photograph has no part of its own: said as such, with what to use.
  const photo = answerNeed(catalog!, "a photo frame");
  assert.deepEqual(photo.fits, []);
  assert.match(photo.gap!, /Panel/);
});

test("jobs worded as jobs, the way the echo-ui skill asks, find their part", { skip: !built }, () => {
  // An agent building a paper-effects composer asked these all at once, as the
  // skill says to. Each came back "Nothing in Echo does this yet" or the wrong
  // item, though asking "a slider" or "a button" finds the part.
  assert.equal(first("a setting from 0 to 100 with its value shown"), "echo-slider");
  assert.equal(first("the one main action: export the code"), "echo-hardware-button");
  assert.equal(first("a choice of one among a few options, like paper stock"), "echo-segmented");
  assert.equal(first("a label and value table"), "echo-description-list");
  assert.equal(first("a tag that says a state"), "echo-badge");
  assert.equal(first("a row with a label and a control"), "echo-item");
  // A possessive is one word: "app's frame" is the app frame.
  assert.equal(first("the app's frame: a top bar, a left rail and a right panel around a main area"), "echo-app-shell");
  // Echo has no code block: said as such, with what to build it from.
  const code = answerNeed(catalog!, "a block of code to copy");
  assert.deepEqual(code.fits, []);
  assert.match(code.gap!, /Panel/);
});

test("a choice among a few finds Segmented, however the among is said", { skip: !built }, () => {
  // Writing the Workflow guide's export screen, "one choice among a few"
  // answered nothing: only "one of a few" and "among a few options" were known.
  assert.equal(first("one choice among a few"), "echo-segmented");
  assert.equal(first("a choice among a few presets"), "echo-segmented");
  assert.equal(first("pick one among a few paper stocks"), "echo-segmented");
});

test("the jobs three blind-run agents asked for find their part", { skip: !built }, () => {
  // Runway's services page and Coil's focus screen, built by agents that had
  // never seen Echo: each answered nothing (or a part that does another job).
  assert.equal(first("site navigation with current page"), "echo-side-nav");
  assert.equal(first("page section layout"), "echo-layout");
  assert.equal(first("frequently asked questions expandable"), "echo-accordion");
  assert.equal(first("toggle between monthly and annual"), "echo-segmented");
  assert.equal(first("stop or abandon a session with confirmation"), "echo-confirm-button");
  assert.equal(first("an empty garden"), "echo-empty-state");
  assert.equal(first("a vertical level that fills like liquid"), "echo-meter");
  // What no part does says what to use instead.
  assert.match(answerNeed(catalog!, "heading text").gap!, /--echo-type-heading/);
  assert.match(answerNeed(catalog!, "a line icon set").gap!, /Lucide/);
  // The words that used to win keep their jobs.
  assert.equal(first("an empty text field"), "echo-field");
  assert.equal(first("a settings toggle"), "echo-switch");
});

test("the jobs a fresh agent asked for in a paper-effects composer find their part", { skip: !built }, () => {
  // A second agent, building the same screen on its own, asked these in one
  // `which`: each answered nothing, or a part that does another job.
  assert.equal(first("announce that the code was copied"), "echo-toast");
  assert.equal(first("a numeric value readout"), "echo-lcd-chip");
  assert.equal(first("choose one of many options in a dropdown"), "echo-select");
  assert.equal(first("switch between two export formats"), "echo-segmented");
  // A label over controls isn't a badge: Echo prints it in a text style.
  const label = answerNeed(catalog!, "a section label over controls");
  assert.deepEqual(label.fits, []);
  assert.match(label.gap!, /machine-label/);
  // The words that used to win keep their own jobs.
  assert.equal(first("a settings toggle"), "echo-switch");
  assert.equal(first("a status label"), "echo-badge");
  assert.equal(first("choose one"), "echo-radio-group");
});
