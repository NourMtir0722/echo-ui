/**
 * `init --ci`: a GitHub Actions job that runs Echo's tests on every pull
 * request, against the app built and started on the runner, so a screen that
 * fails them fails the pull request. Written only when asked for, never over
 * a file that's already there.
 *
 * The runner's own Chrome renders the pages (GitHub's Ubuntu images have
 * one), so the job installs nothing the project doesn't; the report is kept
 * as an artifact when it fails.
 */
import type { Framework, PackageManager } from "@registry/agent/config-schema";
import { CI_WORKFLOW_PATH } from "@registry/agent/footprint";

export const CI_WORKFLOW = CI_WORKFLOW_PATH;

const INSTALL: Record<PackageManager, string> = {
  npm: "npm ci",
  pnpm: "pnpm install --frozen-lockfile",
  yarn: "yarn install --frozen-lockfile",
  bun: "bun install --frozen-lockfile",
};
const RUN: Record<PackageManager, (script: string) => string> = {
  npm: (s) => `npm run ${s}`,
  pnpm: (s) => `pnpm ${s}`,
  yarn: (s) => `yarn ${s}`,
  bun: (s) => `bun run ${s}`,
};
const EXEC: Record<PackageManager, string> = { npm: "npx", pnpm: "pnpm exec", yarn: "yarn", bun: "bunx" };

/** The pnpm lockfile's format, and the pnpm major that writes it. */
const LOCKFILE_PNPM: Record<string, string> = { "9.0": "9", "6.0": "8", "5.4": "7" };

/**
 * The pnpm the job has to install, or undefined when package.json already says
 * (`packageManager`, or `devEngines.packageManager`), which pnpm/action-setup
 * reads. Without either it stops with "No pnpm version is specified", and the
 * job failed before it ran a test. Then: the pnpm the project runs
 * (`pnpm --version`, read by `init`), else the major its lockfile was written
 * by, else the latest.
 */
export function pnpmVersionFor(pkg: unknown, running: string | undefined, lockfile: string | undefined): string | undefined {
  const manifest = (pkg ?? {}) as { packageManager?: unknown; devEngines?: { packageManager?: { name?: unknown } } };
  if (typeof manifest.packageManager === "string" && manifest.packageManager.startsWith("pnpm@")) return undefined;
  if (manifest.devEngines?.packageManager?.name === "pnpm") return undefined;
  const version = /^\d+\.\d+\.\d+$/.exec(running?.trim() ?? "")?.[0];
  if (version) return version;
  const format = /^lockfileVersion:\s*'?([\d.]+)'?/m.exec(lockfile ?? "")?.[1];
  return (format && LOCKFILE_PNPM[format]) ?? "latest";
}

/** How the built app is served on the runner, and on which port. */
function serve(framework: Framework, pm: PackageManager): { command: string; port: number } {
  if (framework === "next") return { command: `${EXEC[pm]} next start -p 3000`, port: 3000 };
  if (framework === "vite") return { command: `${EXEC[pm]} vite preview --port 4173 --strictPort`, port: 4173 };
  return { command: RUN[pm]("start"), port: 3000 };
}

export function ciWorkflow(framework: Framework, pm: PackageManager, { pnpmVersion }: { pnpmVersion?: string } = {}): string {
  const { command, port } = serve(framework, pm);
  const url = `http://localhost:${port}`;
  const pnpm = `      - uses: pnpm/action-setup@v6\n${pnpmVersion ? `        with:\n          version: ${pnpmVersion}\n` : ""}`;
  const setup =
    pm === "pnpm"
      ? `${pnpm}      - uses: actions/setup-node@v7\n        with:\n          node-version: 22\n          cache: pnpm\n`
      : pm === "bun"
        ? "      - uses: oven-sh/setup-bun@v2\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 22\n"
        : `      - uses: actions/setup-node@v7\n        with:\n          node-version: 22\n          cache: ${pm}\n`;
  return `# Echo's tests on every pull request: the app is built and started here,
# and \`echo-ui test\` measures its pages (contrast, alignment, depth, corners,
# icons) and runs axe's WCAG A and AA rules on them. Written by
# \`echo-ui init --ci\`; yours to edit.
name: Echo's tests

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  design:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
${setup}      - run: ${INSTALL[pm]}
      - run: ${RUN[pm]("build")}
      - name: Start the app
        run: ${command} &
      - name: Wait for it to answer
        run: |
          for i in $(seq 1 60); do curl -sf -o /dev/null ${url} && exit 0; sleep 1; done
          echo "The app didn't answer at ${url}." && exit 1
      - name: Run Echo's tests
        run: ${EXEC[pm]} echo-ui test --url ${url}
      - name: Keep the report
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: echo-design-report
          path: .echo/report
`;
}
