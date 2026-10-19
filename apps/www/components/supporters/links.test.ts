import { test } from "node:test";
import assert from "node:assert/strict";
import { handleOf } from "./links";

test("a link is written as people write it: @handle on X and YouTube, in/slug on LinkedIn, a site by its address", () => {
  assert.equal(handleOf("x", "https://x.com/anasilva"), "@anasilva");
  assert.equal(handleOf("x", "https://twitter.com/anasilva/status/1"), "@anasilva");
  assert.equal(handleOf("youtube", "https://www.youtube.com/@kenjibuilds"), "@kenjibuilds");
  assert.equal(handleOf("youtube", "https://www.youtube.com/c/kenjibuilds"), "kenjibuilds");
  assert.equal(handleOf("linkedin", "https://www.linkedin.com/in/anasilva/"), "in/anasilva");
  assert.equal(handleOf("linkedin", "https://www.linkedin.com/company/studio-lumen"), "company/studio-lumen");
  assert.equal(handleOf("site", "https://www.ana.studio/"), "ana.studio");
  assert.equal(handleOf("site", "https://ana.studio/work"), "ana.studio/work");
});

test("a link that isn't a URL is shown as it was given, never dropped", () => {
  assert.equal(handleOf("site", "ana.studio"), "ana.studio");
});
