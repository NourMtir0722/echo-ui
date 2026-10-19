import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { SoundProvider, useSound } from "./sound-provider";

/**
 * A first visit makes no sound nobody asked for: with no stored choice, the
 * provider starts muted. An app where sound is the point opts in. (A stored
 * choice winning over either is the browser's half, in tests/home.spec.ts.)
 */
function Muted() {
  return createElement("output", null, String(useSound().muted));
}

test("the provider starts muted, and defaultMuted={false} starts with sound", () => {
  assert.match(renderToString(createElement(SoundProvider, { children: createElement(Muted) })), />true</);
  assert.match(renderToString(createElement(SoundProvider, { defaultMuted: false, children: createElement(Muted) })), />false</);
});
