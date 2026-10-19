import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { describeProps } from "./props";
import { meta as hardwareButtonMeta } from "../echo/hardware-button/meta";
import { meta as ledKeyMeta } from "../echo/led-key/meta";

test("describeProps flattens the wrappers a meta actually uses", () => {
  const schema = z.object({
    label: z.string().describe("Required, no default."),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    // .describe() after .default() lands on the ZodDefault...
    lit: z.boolean().default(false).describe("Outer description."),
    // ...and before it lands on the inner type. Both spellings are in use.
    glow: z.boolean().describe("Inner description.").default(true),
    caption: z.string().optional(),
    count: z.number().optional().describe("Optional number."),
  });

  const props = Object.fromEntries(describeProps(schema).map((p) => [p.name, p]));

  assert.deepEqual(props.label, { name: "label", type: "string", required: true, description: "Required, no default." });
  assert.deepEqual(props.size, {
    name: "size",
    type: '"sm" | "md" | "lg"',
    required: false,
    defaultValue: '"md"',
  });
  assert.equal(props.lit?.description, "Outer description.");
  assert.equal(props.lit?.defaultValue, "false");
  assert.equal(props.glow?.description, "Inner description.");
  assert.equal(props.glow?.defaultValue, "true");
  assert.equal(props.caption?.required, false);
  assert.equal(props.count?.type, "number");
  assert.equal(props.count?.required, false);
});

test("describeProps renders the composite types the metas use", () => {
  const props = Object.fromEntries(
    describeProps(
      z.object({
        span: z.union([z.string(), z.number()]),
        rows: z.array(z.object({ id: z.string() })),
        vars: z.record(z.string(), z.string()),
        onSelect: z.function(),
        icon: z.unknown(),
        mode: z.union([z.literal("none"), z.object({ x: z.number() })]),
      }),
    ).map((p) => [p.name, p.type]),
  );

  assert.equal(props.span, "string | number");
  assert.equal(props.rows, "object[]");
  assert.equal(props.vars, "Record<string, string>");
  assert.equal(props.onSelect, "function");
  // ReactNode-shaped props are z.unknown() by convention; the description
  // carries the meaning there, so "unknown" is the honest rendering.
  assert.equal(props.icon, "unknown");
  assert.equal(props.mode, '"none" | object');
});

test("describeProps is empty, not thrown, for a meta with no schema", () => {
  assert.deepEqual(describeProps(null), []);
  assert.deepEqual(describeProps(undefined), []);
});

test("real metas extract with no unknown types", () => {
  for (const meta of [hardwareButtonMeta, ledKeyMeta]) {
    const props = describeProps(meta.props);
    assert.ok(props.length > 0, `${meta.name} extracted no props`);
    for (const p of props) {
      assert.notEqual(p.type, "unknown", `${meta.name}.${p.name} has no resolvable type`);
    }
  }
  // React-shaped props carry their display name through typed().
  const button = describeProps(hardwareButtonMeta.props);
  assert.equal(button.find((p) => p.name === "variant")?.type, '"primary" | "neutral" | "ghost"');
  assert.equal(button.find((p) => p.name === "icon")?.type, "ReactNode");
});
