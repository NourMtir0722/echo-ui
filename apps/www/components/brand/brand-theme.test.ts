import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, hexToOklch } from "echo-ui-core/theme";
import { lightSeedOf } from "@/components/site/device-seed";
import { renderBrandVars } from "./brand-theme";
import { BRAND_REFERENCE } from "./tokens";

const vars = (accent: string, chassis = "#232130", paper = "#EFEBFA") =>
  Object.fromEntries(
    renderBrandVars({ accent, chassis, paper }).map((line) => {
      const [name, value] = line.trim().replace(/;$/, "").split(": ");
      return [name!.replace("--brand-", ""), value!];
    }),
  );

const EYE = BRAND_REFERENCE.creature.eye;

const SHIPPED = [
  { accent: "#8B6FE8", chassis: "#232130", paper: "#EFEBFA" },
  { accent: "#DE3B74", chassis: "#26222B", paper: "#F5EDE0" },
  { accent: "#F2674E", chassis: "#2B2224", paper: "#F9ECE7" },
  { accent: "#3D8EF0", chassis: "#1F2330", paper: "#E9F0FA" },
];

test("the creature is the seed's colour exactly on every shipped seed", () => {
  for (const s of SHIPPED) assert.equal(vars(s.accent, s.chassis, s.paper).body!.toLowerCase(), s.accent.toLowerCase());
});

test("a white or black seed keeps the creature's eyes and outline legible", () => {
  // Picked with the hero's colour picker: white, yellow and green lit the body as light as its
  // eye whites; black and near-blacks put a black creature on the black screen.
  for (const accent of ["#FFFFFF", "#F0F0F0", "#FFFF00", "#00FF00", "#000000", "#101010", "#1A0A40"]) {
    const v = vars(accent);
    const eyes = contrastRatio(EYE, v.body!);
    const outline = contrastRatio(v.body!, v.ink!);
    assert.ok(eyes >= 2.5, `${accent}: eye whites on the body are ${eyes.toFixed(2)}:1`);
    assert.ok(outline >= 3, `${accent}: the body on the screen is ${outline.toFixed(2)}:1`);
  }
});

test("on a light device the creature keeps the seed's colour, and its eyes and outline read", () => {
  // The creature's lightness was only ever searched upward, away from a dark screen. A light
  // device's screen is pale, so the search ran into white and stopped there: a white logo.
  for (const s of SHIPPED) {
    const light = lightSeedOf(s);
    const v = vars(light.accent, light.chassis, light.paper);
    const body = hexToOklch(v.body!);
    const accent = hexToOklch(s.accent);
    assert.notEqual(v.body!.toLowerCase(), "#ffffff", `${s.accent}: the creature is white`);
    assert.ok(body.C >= accent.C * 0.6, `${s.accent}: the creature's chroma is ${body.C.toFixed(3)}`);
    assert.ok(Math.abs(body.H - accent.H) < 10, `${s.accent}: the creature's hue is ${body.H.toFixed(0)}`);
    assert.ok(contrastRatio(EYE, v.body!) >= 2.5, `${s.accent}: eye whites on the body`);
    assert.ok(contrastRatio(v.body!, v.ink!) >= 3, `${s.accent}: the body on the screen`);
  }
});
