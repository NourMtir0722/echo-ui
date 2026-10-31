import { test } from "node:test";
import assert from "node:assert/strict";
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

import { analyticsScript } from "./analytics";

test("visits are counted only in the build that deploys", () => {
  const before = process.env.ECHO_STATIC_EXPORT;
  try {
    delete process.env.ECHO_STATIC_EXPORT;
    assert.equal(analyticsScript(), null, "a dev server, the tests and `next build` reach for no other origin");
    process.env.ECHO_STATIC_EXPORT = "1";
    assert.ok(analyticsScript());
  } finally {
    if (before === undefined) delete process.env.ECHO_STATIC_EXPORT;
    else process.env.ECHO_STATIC_EXPORT = before;
  }
});

test("the tracker counts only Echo's own host, leaves Do Not Track alone, and doesn't hold up the first paint", () => {
  const before = process.env.ECHO_STATIC_EXPORT;
  try {
    process.env.ECHO_STATIC_EXPORT = "1";
    const script = analyticsScript()!;
    assert.equal(script.src, "https://stats.nawwara.studio/s.js");
    assert.match(script["data-website-id"], /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.equal(script["data-domains"], new URL(REGISTRY_HOMEPAGE).hostname);
    assert.equal(script["data-do-not-track"], "true");
    assert.equal(script.defer, true);
  } finally {
    if (before === undefined) delete process.env.ECHO_STATIC_EXPORT;
    else process.env.ECHO_STATIC_EXPORT = before;
  }
});
