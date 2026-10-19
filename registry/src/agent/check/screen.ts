/**
 * The screen rules one file can show (`registry/src/agent/screen-rules.ts`):
 * how the parts are put together, not how one is used. Each message quotes
 * its rule by number and name, so the agent can look the rule up and a
 * change to the rule's words shows up here.
 *
 * Three more rules have a soft hint in the source (6, 7, 8). Those are notes:
 * said, never counted, because the source can't be sure.
 */
import { runCommand } from "../guidance";
import { screenRule } from "../screen-rules";

import { echoItem, type CheckProject } from "./model";
import type { FileResult } from "./rules";
import type { JsxAttr, JsxElement, TsxFile } from "./tsx";

/** The rules this file checks, which a test holds to the rules the source can see. */
export const SCREEN_CHECKS = [1, 2, 4, 5] as const;
/** The rules this file hints at, as notes. */
export const SCREEN_HINTS = [6, 7, 8] as const;

const said = (n: number) => `Screen rule ${n}, ${screenRule(n).name.replace(/^./, (c) => c.toLowerCase())}`;

/** Component libraries whose parts on an Echo screen read as a second device. */
const OTHER_LIBRARIES = [
  /(^|\/)components\/ui\//, // the default setup's own folder
  /^@mui\//,
  /^@material-ui\//,
  /^antd(\/|$)/,
  /^@chakra-ui\//,
  /^@mantine\//,
  /^react-bootstrap(\/|$)/,
  /^@nextui-org\//,
  /^@heroui\//,
  /^@radix-ui\/themes(\/|$)/,
  /^@headlessui\/react(\/|$)/,
  /^flowbite-react(\/|$)/,
  /^primereact(\/|$)/,
  /^@fluentui\//,
  /^@carbon\/react(\/|$)/,
  /^@shopify\/polaris(\/|$)/,
  /^@atlaskit\//,
  /^@ark-ui\//,
  /^react-aria-components(\/|$)/,
];

const DESTRUCTIVE = /(delete|remove|discard|erase|reset|revoke|destroy|wipe|purge)/i;
/** A handler that opens something first: the destructive part is somewhere else. */
const OPENS = /^(set\w*open|open\w*|show\w*|ask\w*|confirm\w*|prompt\w*)$/i;
const GENERIC = /^(ok|okay|yes|confirm|continue|sure|done|accept|proceed|submit)$/i;
/** Where one decision ends: an Echo dialog, toolbar or group, or a form. */
const SCOPES = new Set(["alert-dialog", "modal", "sheet", "popover", "toolbar"]);

const attr = (el: JsxElement, name: string) => el.attrs.find((a) => a.name === name);
const stringOf = (a: JsxAttr | undefined) => (a?.value.kind === "string" ? a.value.text : undefined);
const namesOf = (a: JsxAttr | undefined) => (a?.value.kind === "expression" ? (a.value.names ?? []) : []);
const truthy = (a: JsxAttr | undefined) =>
  a !== undefined && (a.value.kind === "bare" || (a.value.kind === "boolean" && a.value.value) || (a.value.kind === "string" && a.value.text === "true"));
const falsy = (a: JsxAttr | undefined) => a !== undefined && ((a.value.kind === "boolean" && !a.value.value) || (a.value.kind === "string" && a.value.text === "false"));

export function screenRules(file: string, tsx: TsxFile, project: CheckProject, result: FileResult) {
  /** The Echo item an element is, or undefined for a raw element or someone else's component. */
  const itemOf = (el: JsxElement) => {
    if (el.intrinsic) return undefined;
    const imported = tsx.imports.get(el.tag.split(".")[0]!);
    return imported ? echoItem(project, file, imported.from) : undefined;
  };
  const items = tsx.elements.map(itemOf);
  const ancestors = function* (index: number) {
    for (let p = tsx.elements[index]!.parent; p !== undefined; p = tsx.elements[p]!.parent) yield p;
  };
  const finding = (n: number, el: { line: number; column: number }, message: string) =>
    result.findings.push({ rule: "screen", file, line: el.line, column: el.column, message: `${said(n)}: ${message}` });
  const hint = (n: number, el: { line: number }, message: string) =>
    result.notes.push({ file, line: el.line, message: `${said(n)} (a hint): ${message}` });

  // 1. One device.
  if (items.some(Boolean) || [...tsx.imports.values()].some((i) => i.from.startsWith("echo-ui-core"))) {
    const reported = new Set<string>();
    for (const { from, line } of tsx.imports.values()) {
      if (reported.has(from) || echoItem(project, file, from) || !OTHER_LIBRARIES.some((re) => re.test(from))) continue;
      reported.add(from);
      finding(1, { line: line ?? 1, column: 1 }, `\`${from}\` is another library's part on an Echo screen, and the eye reads two devices. Use the Echo item for the job (\`${runCommand('which "<the job>"')}\`).`);
    }
  }

  const buttons = tsx.elements.map((el, i) => ({ el, i })).filter(({ i }) => items[i] === "hardware-button");
  const inside = (i: number, item: string) => [...ancestors(i)].some((p) => items[p] === item);

  // 2. One lit cap per decision.
  const lit = new Map<number, JsxElement[]>();
  for (const { el, i } of buttons) {
    if (stringOf(attr(el, "variant")) !== "primary") continue;
    const scope = [...ancestors(i)].find((p) => tsx.elements[p]!.tag === "form" || SCOPES.has(items[p] ?? ""));
    if (scope === undefined) continue;
    lit.set(scope, [...(lit.get(scope) ?? []), el]);
  }
  for (const [scope, caps] of lit) {
    if (caps.length < 2) continue;
    const where = tsx.elements[scope]!.intrinsic ? "form" : tsx.elements[scope]!.tag;
    const labels = caps.map((c) => (c.text ? `"${c.text}"` : "one")).join(", ");
    finding(2, caps[1]!, `this ${where} has ${caps.length} primary caps (${labels}). Keep the one you'd keep if you could keep only one, and make the rest \`neutral\` or \`ghost\`.`);
  }

  // 4. Nothing destructive happens on one press.
  const guarded = items.some((item) => item === "alert-dialog" || item === "confirm-button" || item === "hold-button");
  for (const { el, i } of buttons) {
    const handler = namesOf(attr(el, "onClick"));
    const says = DESTRUCTIVE.exec(el.text ?? "") ?? handler.map((n) => DESTRUCTIVE.exec(n)).find(Boolean);
    if (!says || inside(i, "alert-dialog")) continue;
    // A button that opens the question, and a file that asks it somewhere: the wiring can't be read, so trust it.
    if (handler.some((n) => OPENS.test(n)) || guarded) continue;
    finding(4, el, `"${el.text ?? says[0]}" happens on one press. Put it behind a ConfirmButton in a row or toolbar, a HoldButton for the one thing on screen, or an AlertDialog when it can't be undone (\`${runCommand("docs alert-dialog")}\`).`);
  }

  // 5. A confirmation names the consequence.
  tsx.elements.forEach((el, i) => {
    if (items[i] !== "alert-dialog" && items[i] !== "confirm-button") return;
    if (el.spread) return;
    const label = attr(el, "confirmLabel");
    const text = stringOf(label);
    if (items[i] === "alert-dialog" && !label) {
      finding(5, el, `this AlertDialog's answer says "Confirm", its default. Name what happens: \`confirmLabel="Delete 3 projects"\`.`);
    } else if (text && GENERIC.test(text.trim())) {
      finding(5, label!, `"${text}" doesn't say what happens. Name it: \`confirmLabel="Delete 3 projects"\`, \`"Discard draft"\`.`);
    }
    // 6, as a hint: a dialog for something that isn't destructive.
    if (items[i] === "alert-dialog" && falsy(attr(el, "destructive"))) {
      hint(6, el, "an AlertDialog for something that isn't destructive stops everything for what may not need it. If it can be undone, do it and offer Undo in a toast.");
    }
  });

  // 7, as a hint: a cap whose only job is to go somewhere.
  for (const { el } of buttons) {
    const handler = namesOf(attr(el, "onClick"));
    if ((handler.includes("router") && handler.includes("push")) || handler.includes("navigate") || handler.includes("location")) {
      hint(7, el, "this cap only goes somewhere. A cap does something and a link goes somewhere: use a link (Echo's Link, or your router's).");
    }
  }

  // 8, as a hint: a field that is always read-only.
  tsx.elements.forEach((el, i) => {
    if (items[i] === "field" && truthy(attr(el, "readOnly"))) {
      hint(8, el, "a value that can't be changed goes on a screen, not in a field: StatTile, LcdChip or a DescriptionList.");
    }
  });
}
