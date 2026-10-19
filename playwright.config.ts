import { defineConfig, devices } from "@playwright/test";

/**
 * Component a11y (axe) + keyboard-nav + visual-regression tests.
 * Tests drive the docs app's gallery pages. The webServer builds+serves the
 * docs app; screenshots are OS-specific, so baselines are keyed by platform.
 */
const PORT = Number(process.env.ECHO_TEST_PORT ?? 3100);
/**
 * React's unknown-prop / hydration warnings are DEV-ONLY — a production build
 * silently strips a bad prop, so console.spec.ts must drive a dev server.
 * It gets its own build dir (NEXT_DIST_DIR) because a dev server and
 * `next start` sharing .next corrupt each other.
 *
 * Whichever Next process ran last rewrites apps/www/next-env.d.ts to point at
 * its own dist dir. That file is generated and no longer tracked, and the
 * references that matter are hand-authored in apps/www/echo-env.d.ts — so the
 * churn goes nowhere and there is nothing to restore afterwards.
 */
const DEV_PORT = Number(process.env.ECHO_TEST_DEV_PORT ?? 3101);
/*
 * Both ports move with ECHO_TEST_PORT and ECHO_TEST_DEV_PORT when something
 * else already listens on 3100 or 3101: Playwright would reuse that server,
 * and global-setup refuses one that isn't serving this build.
 */

/**
 * The timing spec, and only it. Unanchored, the pattern also caught
 * any spec whose name ends that way (`file-upload.spec.ts`): the main
 * projects ignored it, and the load projects took it and ran the whole suite
 * as their dependencies.
 */
const LOAD_SPEC = /(^|[\\/])load\.spec\.ts$/;

/**
 * Chromium, as every Chromium project gets it. In CI it starts without WebGL:
 * the runner has two cores and no GPU, so the homepage's 3D Echo
 * was drawn in software and the page grew too slow for its tests. There the
 * homepage takes the drawing's path, and the 3D stage's tests skip; locally
 * they run.
 *
 * On a Mac it draws WebGL on the machine's GPU, as Safari and every visitor's
 * Chrome does. Left to Playwright, Chromium draws it in software (SwiftShader):
 * the homepage's foot fell to 10 frames a second and /support to about 23,
 * and the tests that drive those pages timed out against a slowness no
 * visitor with a GPU meets (2026-10-18: four failures, all passing on Metal at
 * 60 frames a second). WebKit already draws on Metal.
 */
const CHROME = {
  ...devices["Desktop Chrome"],
  ...(process.env.CI
    ? { launchOptions: { args: ["--disable-webgl"] } }
    : process.platform === "darwin"
      ? { launchOptions: { args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } }
      : {}),
};

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  /*
   * Four locally, not Playwright's half-the-cores (7 on a 14-core Mac): beside
   * a dev server and other apps, seven browsers overloaded the machine and the
   * run failed on timeouts, not on Echo. `--workers`
   * still overrides it; CI keeps the default.
   */
  workers: process.env.CI ? undefined : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  /**
   * Playwright's default per-pixel threshold is 0.2 in YIQ space, which is far
   * too lax for a library whose whole subject is color and material: moving
   * every gallery ground from #16121A to --echo-surface (#26222B) — a change
   * plainly visible to the eye, across ~90% of the pixels in every screenshot
   * — did not fail a single one of the 30 visual tests. The suite was
   * confirming layout and silently ignoring color.
   *
   * 0.02 flags any of those shifts (the tightest needed was 0.061); the
   * pixel-ratio allowance is what absorbs text anti-aliasing, which differs in
   * a handful of edge pixels rather than across the frame.
   */
  expect: {
    toHaveScreenshot: { threshold: 0.02, maxDiffPixelRatio: 0.01 },
  },
  // Exposed to console.spec.ts, which must not use the prod baseURL.
  metadata: { devBaseURL: `http://localhost:${DEV_PORT}` },
  projects: [
    {
      name: "chromium",
      // Clipboard permissions live here rather than in a spec's `test.use`:
      // they are Chromium-only, and granting them per-file kills a WebKit
      // context before a single test runs.
      use: { ...CHROME, permissions: ["clipboard-read", "clipboard-write"] },
      /*
       * The `@touch` tests assert the 44px coarse-pointer sizes.
       * This project has a fine pointer, so those rules do not apply here by
       * design — running them would measure the desktop sizes and fail for
       * exactly the reason the rules are gated.
       */
      grepInvert: /@touch/,
      testIgnore: LOAD_SPEC,
    },
    /**
     * Every overflow bug found on a phone existed because this project
     * did not look: the suite ran one desktop viewport, and exactly one test in it
     * ever resized. `/generator` shipped 50% wider than a phone.
     *
     * It runs the a11y and layout specs only — `grep: /@mobile/`. Visual
     * baselines stay desktop-only deliberately: regenerating 30 screenshots at
     * a second width before the layout is fixed would bake today's breaks into
     * the baselines as intended appearance.
     *
     * Desktop Chrome at 390x844 rather than `devices["Pixel 7"]`: this project
     * is about WIDTH. Touch emulation would change what the keyboard and hover
     * assertions in the same specs mean, which is a different ticket
     * and a different argument.
     */
    {
      name: "mobile",
      use: { ...CHROME, viewport: { width: 390, height: 844 } },
      grep: /@mobile/,
    },
    /*
     * The 44px platform guideline is expressed as
     * `@media (pointer: coarse)`, so a project that does not emulate a coarse
     * pointer cannot see those rules at all — it would measure the desktop
     * sizes and pass while proving nothing.
     *
     * This is the one project with touch emulation, and it runs ONLY the
     * `@touch` hit-area tests. Keeping it that narrow is deliberate: touch
     * emulation changes what the keyboard and hover assertions elsewhere
     * mean, which is why the `mobile` project above does not use it.
     */
    {
      name: "touch",
      use: {
        ...CHROME,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      grep: /@touch/,
    },
    /**
     * Correctness on a second engine.
     *
     * Every project above is Chromium, so 201 uses of `oklch()` and
     * `color-mix()`, plus `backdrop-filter`, `:has()`, `@container` and a WebGL
     * shader, were verified on ONE renderer — and Safari is the engine most
     * likely to disagree about all of them. Echo's declared baseline includes
     * Safari 16.2+, and a baseline nothing tests is a claim, not a
     * support statement.
     *
     * `grepInvert` excludes the screenshots deliberately. Visual baselines stay
     * Chromium-only, on macOS, because a second engine's anti-aliasing and font
     * rasterisation differ everywhere at once — a WebKit baseline set would be
     * 39 more images to regenerate on every CSS change, and it would catch
     * rendering differences rather than bugs. What this project is for is
     * BEHAVIOUR: does the keyboard work, is it still accessible, does the
     * layout hold. Those are engine-independent claims, and they are the ones
     * worth checking twice.
     *
     * `@touch` goes too, for the same reason it is excluded from `chromium`:
     * this project has a fine pointer, so the coarse-pointer rules do not apply.
     */
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      grepInvert: /visual:|@touch/,
      testIgnore: LOAD_SPEC,
    },
    /**
     * Load, measured on a machine with nothing else running.
     *
     * `load.spec.ts` times pages loading many at once. Inside the parallel run
     * it timed the run instead: every other worker was loading pages too. So
     * it runs after every other project has finished, one engine at a time.
     * A failure elsewhere skips it, which is the right order to fix things in.
     */
    {
      name: "load-chromium",
      use: { ...CHROME },
      testMatch: LOAD_SPEC,
      dependencies: ["chromium", "mobile", "touch", "webkit"],
    },
    {
      name: "load-webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: LOAD_SPEC,
      dependencies: ["load-chromium"],
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @echo-ui/www start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `pnpm --filter @echo-ui/www dev -p ${DEV_PORT}`,
      url: `http://localhost:${DEV_PORT}`,
      env: { NEXT_DIST_DIR: ".next-dev" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
