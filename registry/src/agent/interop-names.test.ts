import { test } from "node:test";
import assert from "node:assert/strict";

import { interopProps, pressInteropProps, textInteropProps } from "./interop";
import { INTEROP_NAMES } from "./interop-names";

test("the plain list of interop names is the schemas' own", () => {
  const fromSchemas = new Set([...Object.keys(interopProps), ...Object.keys(textInteropProps), ...Object.keys(pressInteropProps)]);
  assert.deepEqual([...INTEROP_NAMES].sort(), [...fromSchemas].sort());
});
