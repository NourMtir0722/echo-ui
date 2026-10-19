import { test } from "node:test";
import assert from "node:assert/strict";

import { clipboardBlocked } from "./clipboard-blocked";

/**
 * One message covered every copy button, so with the clipboard
 * blocked, Copy seed sent you to the Generated CSS, which has no seed in it.
 */
test("a blocked copy points at where that thing actually is", () => {
  assert.match(clipboardBlocked("CSS", ":root {}"), /Generated CSS/);
  assert.doesNotMatch(clipboardBlocked("Seed", "{}"), /Generated CSS/);
  assert.match(clipboardBlocked("Seed", "{}"), /hex/);
  const link = "https://example.com/generator?accent=8b6fe8&chassis=232130&paper=efebfa";
  assert.ok(clipboardBlocked("Link", link).includes(link), "the link itself, to copy by hand");
});
