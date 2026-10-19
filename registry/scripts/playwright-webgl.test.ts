import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * CI's runner has two cores and no GPU, so the homepage's 3D Echo was
 * drawn in software there, and the page it travels over grew too slow for its
 * tests: four failed and two more flaked. Every one passes on a Mac, which
 * draws it in software too, on fourteen cores. In CI, Chromium starts without
 * WebGL: the homepage takes the drawing's path, which its own tests cover, and
 * the tests of the 3D stage skip there (`stage()` in home.spec.ts) and run
 * locally.
 */
const CONFIG = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "../../playwright.config.ts")).href;

interface Project {
  name: string;
  use: { defaultBrowserType?: string; launchOptions?: { args?: string[] } };
}

/** The config's projects as CI, or a laptop, reads them. */
async function projects(ci: boolean): Promise<Project[]> {
  const before = process.env.CI;
  if (ci) process.env.CI = "true";
  else delete process.env.CI;
  try {
    const { default: config } = await import(`${CONFIG}?ci=${ci}`);
    return config.projects as Project[];
  } finally {
    if (before === undefined) delete process.env.CI;
    else process.env.CI = before;
  }
}

test("in CI, Chromium starts without WebGL; locally it keeps it", async () => {
  for (const ci of [true, false]) {
    const chromium = (await projects(ci)).filter((p) => p.use.defaultBrowserType === "chromium");
    assert.ok(chromium.length >= 4, `the Chromium projects, ${ci ? "in CI" : "locally"}`);
    for (const p of chromium) {
      const off = p.use.launchOptions?.args?.includes("--disable-webgl") ?? false;
      assert.equal(off, ci, `${p.name}, ${ci ? "in CI" : "locally"}`);
    }
  }
});
