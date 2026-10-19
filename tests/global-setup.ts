import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";

/**
 * The server under test is the build you just made.
 *
 * Playwright reuses whatever already listens on the port, so a server left
 * over from an earlier build gets tested instead, and the suite passes against
 * old code. Next.js stamps its build ID into every page; this refuses to run
 * unless the server's ID matches apps/www/$NEXT_DIST_DIR/BUILD_ID.
 *
 * Build and test with the same NEXT_DIST_DIR (default `.next`), e.g.
 * `NEXT_DIST_DIR=.next-build npx playwright test`.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  const distDir = process.env.NEXT_DIST_DIR ?? ".next";
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const idFile = join(repoRoot, "apps/www", distDir, "BUILD_ID");
  if (!existsSync(idFile)) {
    throw new Error(`No production build in apps/www/${distDir}. Build it first, with the same NEXT_DIST_DIR.`);
  }
  const buildId = readFileSync(idFile, "utf8").trim();
  const html = await (await fetch(baseURL)).text();
  // App Router pages carry it in their embedded payload ("b":"<id>"); the
  // ID is a random 21-character string, so containing it is proof enough.
  if (!html.includes(buildId)) {
    throw new Error(
      `The server at ${baseURL} isn't serving apps/www/${distDir} (build ${buildId}). ` +
        "Stop whatever is on that port and start the build you mean to test.",
    );
  }

  const devBaseURL = config.metadata.devBaseURL as string | undefined;
  if (devBaseURL) {
    await primeDynamicRoutes(devBaseURL, join(repoRoot, "apps/www"), distDir);
    await warmStaticRoutes(devBaseURL, join(repoRoot, "apps/www"), distDir);
  }
}

/**
 * Compile every static route on the dev server before any test starts.
 *
 * `next dev` compiles a route the first time it's asked for, and a compile
 * takes the machine's CPU for seconds. The console sweep asks for every route,
 * so it used to compile the site in the first minutes of every run, while the
 * other workers were loading pages against the production build: pages that
 * load in 100ms alone timed out. Compiled here first, three at a time, the
 * sweep finds them ready and the run starts on an idle machine.
 */
async function warmStaticRoutes(devBaseURL: string, wwwDir: string, distDir: string) {
  const built = JSON.parse(readFileSync(join(wwwDir, distDir, "prerender-manifest.json"), "utf8")) as Manifest;
  // A static route is its own source; the dynamic ones were primed above.
  const pages = Object.keys(built.routes).filter((path) => built.routes[path]?.srcRoute === path && !path.startsWith("/_"));
  const queue = [...pages];
  const worker = async () => {
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
      await fetch(devBaseURL + path).then((res) => res.text(), () => "");
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

type Manifest = { routes: Record<string, { srcRoute?: string }>; dynamicRoutes: Record<string, unknown> };

/**
 * Load each dynamic route on the dev server once, one at a time.
 *
 * The first time a dynamic route's static params resolve, Next's dev server
 * adds it to prerender-manifest.json with an unlocked read-modify-write. When
 * two routes do that at once, as the parallel console sweeps did, the writes
 * interleave into invalid JSON and every page answers 500 until a restart.
 * Next only writes when the manifest changes, so once it holds every dynamic
 * route there are no writes left to race.
 */
async function primeDynamicRoutes(devBaseURL: string, wwwDir: string, distDir: string) {
  const read = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Manifest;
  // One concrete page per dynamic route, from the production build's manifest.
  const built = read(join(wwwDir, distDir, "prerender-manifest.json"));
  const devManifest = join(wwwDir, ".next-dev/dev/prerender-manifest.json");
  for (const route of Object.keys(built.dynamicRoutes)) {
    const page = Object.keys(built.routes).find((path) => built.routes[path]?.srcRoute === route);
    if (!page) throw new Error(`No built page for ${route} in apps/www/${distDir}`);
    await fetch(devBaseURL + page).then((res) => res.text());
    // Next writes the manifest after it responds, so wait for this route to land
    // before starting the next one.
    const deadline = Date.now() + 60_000;
    const recorded = () => {
      try {
        return route in read(devManifest).dynamicRoutes;
      } catch {
        return false; // caught mid-write; look again
      }
    };
    while (!recorded()) {
      if (Date.now() > deadline) throw new Error(`The dev server never recorded ${route} in its prerender manifest`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  // What was primed, as the manifest held it before any worker started: the dev server can restart
  // itself later, near its memory limit, and forget, so the check reads this, not the manifest.
  writeFileSync(join(wwwDir, ".next-dev/primed-routes.json"), JSON.stringify(Object.keys(read(devManifest).dynamicRoutes)));
}
