/**
 * Every Echo control can take a ref, and accepts the declared interop set
 * (`PRINCIPLES.md`, "What a component accepts").
 *
 * Before that set existed, four of 49 components could receive a ref and `onBlur` appeared
 * in zero public prop types, so `react-hook-form`'s uncontrolled `register()`
 * — which needs exactly `ref`, `onBlur`, `name` — could not work at all. That
 * is the single likeliest week-one bug report, and it was invisible here
 * because nothing asserted the shape of a control's props.
 *
 * TWO THINGS ARE CHECKED, and the second is the one that matters most:
 *
 * 1. Each control takes its interop props from `EchoInterop` (or
 *    `EchoTextInterop`) rather than restating some of them, so the set cannot
 *    drift between components. Restating a subset is how `id` ends up on nine
 *    controls and `onBlur` on none.
 *
 * 2. Each control is wrapped in `forwardRef`. This is not stylistic. On React
 *    19 `ref` is an ordinary prop and a plain function component receives it;
 *    on React 18 React STRIPS `ref` before the component runs, so declaring it
 *    as a prop type-checks under both majors, works on 19, and populates
 *    nothing on 18. Echo supports 18 until a major, and
 *    `consumer-types.test.ts` cannot catch this because it is a runtime
 *    difference, not a type one. This is the check that can.
 *
 * What this does NOT prove: that the ref reaches the right DOM node, or that
 * a form library is actually happy. That needs a browser and is
 * `tests/form-integration.spec.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registryRoot } from "./docs/program";

const repoRoot = resolve(registryRoot, "..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

/**
 * The controls, and which interop set each one takes.
 *
 * `text` is a control you type free text into, so it also gets
 * `autoComplete`, `inputMode`, `maxLength`, `minLength` and `pattern`.
 * `value` is a control with a value or a checked state that a form library
 * registers. `press` is a button: it takes `ref`, `onBlur` and `onFocus`,
 * and `name`/`required`/`readOnly` would be meaningless on it.
 *
 * Hand-written, because "is this a control" is a judgement — but it cannot
 * rot, because the sweep below fails when the docs gain a Control this list
 * has never heard of.
 */
const CONTROLS: Record<string, "text" | "value" | "press"> = {
  "echo-field": "text",
  "echo-textarea": "text",
  "echo-otp-field": "text",
  "echo-number-field": "text",
  "echo-checkbox": "value",
  "echo-switch": "value",
  "echo-select": "value",
  "echo-radio-group": "value",
  "echo-slider": "value",
  "echo-segmented": "value",
  "echo-hardware-button": "press",
  "echo-led-key": "press",
  "echo-toggle": "value",
  "echo-range-slider": "value",
  "echo-knob": "value",
  "echo-tuner": "value",
  "echo-keypad": "value",
  "echo-filter-tray": "value",
  "echo-week-strip": "value",
  "echo-patch-bay": "value",
  "echo-fill-slider": "value",
  "echo-quick-tile": "value",
  "echo-jog-wheel": "value",
  "echo-switch-bank": "value",
  "echo-combobox": "text",
  "echo-tags-input": "text",
  "echo-checkbox-group": "value",
  "echo-choice-cards": "value",
  "echo-date-field": "value",
  "echo-date-picker": "value",
  "echo-calendar": "value",
  "echo-file-upload": "value",
};

/**
 * Controls whose props ARE another control's: a DatePicker is a DateField
 * with a calendar key, so it takes the interop set through DateField's props
 * rather than extending it a second time.
 */
const COMPOSED: Record<string, string> = {
  "echo-date-picker": "DateFieldProps",
};

/** `echo-field` → `src/echo/field/field.tsx`. */
const sourceOf = (name: string) => {
  const dir = name.replace(/^echo-/, "");
  return `registry/src/echo/${dir}/${dir}.tsx`;
};

test("every control is wrapped in forwardRef, so a ref works on React 18 too", () => {
  const plain: string[] = [];
  for (const name of Object.keys(CONTROLS)) {
    const src = read(sourceOf(name));
    if (!/\bforwardRef\s*</.test(src)) {
      plain.push(`${name} — a ref passed to it is silently dropped on React 18`);
    }
  }
  assert.deepEqual(plain, [], "wrap these in forwardRef; see the note at the top of this file");
});

test("every control takes the interop set from echo-ui-core, not its own copy", () => {
  const wrong: string[] = [];
  for (const [name, kind] of Object.entries(CONTROLS)) {
    const src = read(sourceOf(name));
    const wanted = kind === "text" ? "EchoTextInterop" : kind === "press" ? "EchoPressInterop" : "EchoInterop";
    const through = COMPOSED[name];
    if (through && new RegExp(`\\b${through}\\b`).test(src)) continue;
    if (!new RegExp(`extends\\s+${wanted}\\b`).test(src)) {
      wrong.push(`${name} should have a props interface extending ${wanted}`);
    }
  }
  assert.deepEqual(wrong, [], "one decision, in one place — see PRINCIPLES.md");
});

/**
 * A control that restates an interop prop it already inherits is how the two
 * drift apart: the local one wins, and it is the one nobody updates.
 */
test("no control restates a prop the interop set already gives it", () => {
  const INHERITED = ["id?:", "name?:", "disabled?:", "required?:", "readOnly?:", "autoFocus?:", "onBlur?:", "onFocus?:"];
  const restated: string[] = [];
  for (const name of Object.keys(CONTROLS)) {
    const src = read(sourceOf(name));
    const own = /interface \w+OwnProps extends Echo\w*Interop \{([\s\S]*?)\n\}/.exec(src);
    if (!own) continue;
    for (const prop of INHERITED) {
      if (own[1]!.includes(`\n  ${prop}`)) restated.push(`${name} restates ${prop.replace("?:", "")}`);
    }
  }
  assert.deepEqual(restated, [], "delete the local copy — EchoInterop already declares it");
});

/**
 * Documented beside the controls, but not controls: nothing on them for a form
 * library to register. Toolbar, Form and Fieldset hold controls; the rest of
 * these are readouts and paper.
 */
const NOT_CONTROLS = new Set([
  "echo-toolbar",
  "echo-form",
  "echo-fieldset",
  "echo-annunciator",
  "echo-date-tile",
  "echo-engraved-plate",
  "echo-level-meter",
  "echo-now-playing",
  "echo-receipt",
  "echo-segment-display",
  "echo-ticket",
]);

/**
 * The list above cannot go stale. The docs groups are where an item's place
 * is decided, and a new Button, Form or Object that nothing here has heard of
 * is a control that shipped without a ref.
 */
test("the control list still matches the docs groups", () => {
  const manifest = read("registry/src/agent/groups.ts");
  const documented = [...manifest.matchAll(/"([\w-]+)":\s*"(?:Buttons|Forms|Objects)"/g)].map((m) => m[1]!);
  assert.ok(documented.length > 30, `expected the Buttons, Forms and Objects groups, found ${documented.length} entries`);

  const unknown = documented.filter((n) => !(n in CONTROLS) && !NOT_CONTROLS.has(n));
  assert.deepEqual(
    unknown,
    [],
    "these are documented beside the controls but are in neither CONTROLS nor NOT_CONTROLS — classify them, do not skip them",
  );
  const stale = [...NOT_CONTROLS].filter((n) => !documented.includes(n));
  assert.deepEqual(stale, [], "these are no longer in Buttons, Forms or Objects — take them off NOT_CONTROLS");
});
