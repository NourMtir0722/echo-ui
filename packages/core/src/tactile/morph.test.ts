import { test } from "node:test";
import assert from "node:assert/strict";
import { MorphEngine } from "./morph";
import type { Spring } from "./spring";

/** A spring on its way somewhere, which stops dead when told to. */
function travelling(): Spring {
  let moving = true;
  return {
    get value() {
      return 0;
    },
    get velocity() {
      return moving ? 400 : 0;
    },
    get moving() {
      return moving;
    },
    get target() {
      return moving ? 120 : 0;
    },
    to() {},
    set() {},
    stop() {
      moving = false;
    },
  } as unknown as Spring;
}

test("a destroyed morph never settles", async () => {
  // A component mounted twice (React's development mode) destroys the first
  // body and draws with the second. The first one's springs, stopped, read as
  // at rest, and its pending hand-off fired: the change was handed off while
  // the second body was still drawing it.
  const m = new MorphEngine({ paths: [], wells: [], stops: [], labels: [] }, ["accent"], [], 200, 30);
  m.parts[0]!.x1 = travelling();
  let settled = false;
  m.whenSettled(() => {
    settled = true;
  });
  m.destroy();
  m.draw();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false);
});
