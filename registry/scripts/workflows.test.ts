import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The pipeline's own hygiene, checked rather than remembered.
 *
 * Four properties, each of which was missing from at least one workflow when
 * this was written, and none of which announces itself when it goes missing
 * again:
 *
 *  - **Permissions.** GitHub hands a workflow a read-write token unless it
 *    says otherwise. The day a repository is public, `pull_request` workflows
 *    run for forks, and a token nobody scoped is the shape of a supply-chain
 *    incident.
 *  - **Timeouts.** A hung job holds a runner for GitHub's six-hour default.
 *  - **Concurrency**, on the workflows where a superseded run is genuinely
 *    worthless — and *not* on the two where a cancelled run answers nothing.
 *  - **Pinned versions.** `@v4` is a moving tag. That is an acceptable trade
 *    everywhere except a workflow that can publish, where the action author's
 *    account is one more thing between a commit and npm.
 *
 * A line-oriented reader rather than a YAML parser: these files are small and
 * hand-written, and adding a dependency to the workspace root to check five of
 * them costs more than it is worth.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowDir = join(repoRoot, ".github/workflows");

interface Workflow {
  file: string;
  text: string;
  lines: string[];
}

const workflows: Workflow[] = readdirSync(workflowDir)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .sort()
  .map((file) => {
    const text = readFileSync(join(workflowDir, file), "utf8");
    return { file, text, lines: text.split("\n") };
  });

/** The job names in a workflow, with the block of lines belonging to each. */
function jobs(workflow: Workflow): { name: string; body: string[] }[] {
  const start = workflow.lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (start === -1) return [];
  const out: { name: string; body: string[] }[] = [];
  for (let i = start + 1; i < workflow.lines.length; i++) {
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(workflow.lines[i]!);
    if (!match) continue;
    const body: string[] = [];
    for (let j = i + 1; j < workflow.lines.length; j++) {
      const line = workflow.lines[j]!;
      if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(line) || /^[A-Za-z]/.test(line)) break;
      body.push(line);
    }
    out.push({ name: match[1]!, body });
  }
  return out;
}

/** A top-level key, ignoring the ones nested inside a job. */
const declaresTopLevel = (workflow: Workflow, key: string) =>
  workflow.lines.some((l) => new RegExp(`^${key}:`).test(l));

test("every workflow exists to be found", () => {
  assert.ok(workflows.length >= 5, `expected the workflows, found ${workflows.length}`);
});

test("every workflow declares its permissions", () => {
  const silent = workflows.filter((w) => !declaresTopLevel(w, "permissions"));
  assert.deepEqual(
    silent.map((w) => w.file),
    [],
    "a workflow with no `permissions:` gets a read-write token it does not need",
  );
});

/**
 * Write access is per job, and the list of jobs that have it is short enough
 * to state. Asserted as an exact list rather than a rule, so that granting it
 * to a sixth job is a decision someone makes in this file rather than a line
 * nobody notices in a YAML diff.
 */
test("only the jobs that write may write", () => {
  const writers: string[] = [];
  const minters: string[] = [];
  for (const workflow of workflows) {
    for (const job of jobs(workflow)) {
      if (job.body.some((l) => /contents:\s*write/.test(l))) writers.push(`${workflow.file}:${job.name}`);
      if (job.body.some((l) => /id-token:\s*write/.test(l))) minters.push(`${workflow.file}:${job.name}`);
    }
  }
  assert.deepEqual(
    writers.sort(),
    // Pushes a baselines branch.       Pushes a tag and cuts a release.
    ["release.yml:tag", "visual-baselines.yml:baselines"],
    "`contents: write` is declared on the job that writes, never on the workflow",
  );
  assert.deepEqual(
    minters,
    ["release.yml:publish"],
    "an OIDC token that npm will accept as this repository belongs to exactly one job",
  );
});

test("every job has a timeout", () => {
  const untimed: string[] = [];
  for (const workflow of workflows) {
    for (const job of jobs(workflow)) {
      // A job that calls a reusable workflow cannot declare a timeout — the
      // timeouts belong to the jobs inside the workflow it calls, which this
      // same test checks where they live.
      if (job.body.some((l) => /^\s+uses:/.test(l))) continue;
      if (!job.body.some((l) => /^\s+timeout-minutes:/.test(l))) untimed.push(`${workflow.file}:${job.name}`);
    }
  }
  assert.deepEqual(untimed, [], "a job with no timeout holds a runner for six hours when it hangs");
});

/**
 * Where a superseded run is worthless, and where cancelling one destroys the
 * only thing it was for. Both halves are asserted: adding a concurrency group
 * to the matrix would be a quiet, plausible-looking mistake.
 */
test("concurrency where it helps, and nowhere it hurts", () => {
  const expected: Record<string, boolean> = {
    "ci.yml": true,
    "changelog.yml": true,
    "codeql.yml": true,
    "smoke.yml": true,
    "release-matrix.yml": false,
    "release.yml": false,
    "visual-baselines.yml": false,
  };
  for (const workflow of workflows) {
    const want = expected[workflow.file];
    assert.notEqual(want, undefined, `${workflow.file} is new — decide whether it may be cancelled`);
    assert.equal(
      declaresTopLevel(workflow, "concurrency"),
      want,
      want
        ? `${workflow.file} should cancel a superseded run`
        : `${workflow.file} must finish once started — a half-run answers nothing`,
    );
  }
});

/**
 * One runner can't hold the suite. CI's runner has two cores, so Playwright
 * runs one worker, and at 748 desktop tests the job reached its 45-minute
 * limit with 247 of them run. The browser suites are split across
 * runners instead, each with the same limit, and a red shard leaves the
 * others running so one run says everything that failed.
 */
test("the e2e suites are split across runners", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  const e2e = jobs(ci).find((j) => j.name === "e2e")!;
  const body = e2e.body.join("\n");
  assert.match(body, /^\s+fail-fast: false$/m, "a red shard would cancel the others");
  assert.match(body, /^\s+shard: \[1(, \d+)+\]$/m, "the e2e job is one runner");

  const runs = e2e.body.filter((l) => /playwright test/.test(l));
  const load = runs.filter((l) => /--project=load-/.test(l));
  const share = "--shard=${{ matrix.shard }}/${{ strategy.job-total }}";
  const unsplit = runs.filter((l) => !load.includes(l) && !l.includes(share));
  assert.deepEqual(unsplit, [], "every browser suite takes its share, not the whole");
  assert.equal(load.length, 1);
  // The load test times pages loading at once, so it runs once, on one runner.
  const loadAt = e2e.body.indexOf(load[0]!);
  assert.match(e2e.body.slice(loadAt - 3, loadAt).join("\n"), /if: matrix\.shard == 1/);

  // upload-artifact refuses a name that's already taken, so two red shards
  // would keep one report.
  assert.match(body, /name: playwright-report-\$\{\{ matrix\.shard \}\}/);
});

/**
 * The browser suite is about two hours of runner time a run. A push to main
 * skips it only for a tree a full run already passed on: `e2e-passed` records
 * each one, and the gate looks it up by the same name. Every other push runs it.
 */
test("a push to main skips the browser suite only on a tree it already passed on", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  const body = (name: string) => jobs(ci).find((j) => j.name === name)?.body.join("\n") ?? "";
  const [gate, e2e, passed] = [body("gate"), body("e2e"), body("e2e-passed")];
  assert.ok(gate && e2e && passed, "the gate, the suite and the record are all there");
  assert.match(gate, /if: github\.event_name == 'push'/, "the gate answers pushes only");
  assert.match(passed, /needs: e2e/, "a tree is recorded only once every shard has passed");
  // One name on both sides, or nothing ever matches and every merge runs twice.
  assert.match(passed, /name: e2e-passed-\$\{\{ steps\.tree\.outputs\.sha \}\}/);
  assert.match(gate, /actions\/artifacts\?name=e2e-passed-\$tree/);
  // Unless the gate says it passed, a push runs the suite: a lookup that fails says nothing.
  assert.match(e2e, /github\.event_name == 'push' && needs\.gate\.outputs\.tested != 'true'/);
  assert.match(gate, /echo "tested=false"/);
});

/**
 * A job whose chain holds a skipped job is skipped, whatever its own
 * needs did: `gate` is skipped outside pushes and `e2e` needs it, so with the
 * default condition `e2e-passed` was skipped on PR #34 with every shard green,
 * and no tree was ever recorded for a merge to find.
 */
test("a tree every shard passed is recorded, though the gate was skipped", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  const passed = jobs(ci).find((j) => j.name === "e2e-passed")!.body.join("\n");
  assert.match(passed, /if: \$\{\{ !cancelled\(\) && needs\.e2e\.result == 'success' \}\}/);
});

/**
 * One switch, the repository variable BROWSER_SUITE_AUTO, runs the browser
 * suite on pull requests and pushes; without it, the suite runs by hand only.
 * Dependabot opens no update pull requests: an update lands as a commit of its
 * own, after the full suite, never by merging a bot's.
 */
test("the browser suite runs by hand, and on pushes and pull requests behind the switch; Dependabot opens no pull requests", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  const e2e = jobs(ci).find((j) => j.name === "e2e")!.body.join("\n");
  // By hand: always.
  assert.match(e2e, /github\.event_name == 'workflow_dispatch'\n\s+\|\| \(vars\.BROWSER_SUITE_AUTO == 'on' && \(/);
  // Pushes and pull requests only behind the switch.
  const switched = e2e.slice(e2e.indexOf("vars.BROWSER_SUITE_AUTO"));
  assert.match(switched, /github\.event_name == 'push'/);
  assert.match(switched, /github\.event_name == 'pull_request'/);
  // Dependabot lists updates and opens no pull request, for npm or for actions.
  const dependabot = readFileSync(join(repoRoot, ".github/dependabot.yml"), "utf8");
  assert.equal((dependabot.match(/^\s+open-pull-requests-limit: 0$/gm) ?? []).length, 2);
});

test("drafts and Dependabot get the build; a pull request ready for review gets the suite", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  const e2e = jobs(ci).find((j) => j.name === "e2e")!.body.join("\n");
  assert.match(e2e, /!github\.event\.pull_request\.draft/);
  assert.match(e2e, /github\.event\.pull_request\.user\.login != 'dependabot\[bot\]'/);
  // Marking a draft ready is what runs it, and a run by hand covers Dependabot before a merge.
  assert.match(ci.text, /types: \[opened, synchronize, reopened, ready_for_review\]/);
  assert.match(ci.text, /^ {2}workflow_dispatch:/m);
  assert.match(e2e, /github\.event_name == 'workflow_dispatch'/);
  // The build job has no condition: every push and pull request is typechecked, tested and built.
  const build = jobs(ci).find((j) => j.name === "build")!.body;
  assert.ok(!build.some((l) => /^ {4}if:/.test(l)), "the build runs on everything");
});

test("the e2e job keeps its report when it fails", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  assert.match(ci.text, /if: failure\(\)/, "nothing uploads on failure");
  assert.match(ci.text, /actions\/upload-artifact/);
  assert.match(ci.text, /playwright-report\//);
  assert.match(ci.text, /test-results\//);
});

test("CI builds what npm would publish", () => {
  const ci = workflows.find((w) => w.file === "ci.yml")!;
  assert.match(
    ci.text,
    /pnpm -r build/,
    "packages/core's specifier rewriter and generated dist/package.json are only exercised by a build",
  );
});

test("dependency and action updates are automated", () => {
  const dependabot = readFileSync(join(repoRoot, ".github/dependabot.yml"), "utf8");
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.ok(
    workflows.some((w) => w.file === "codeql.yml"),
    "CodeQL analyses the code this project writes into other people's applications",
  );
});

/**
 * The one place a floating action tag is not an acceptable trade.
 *
 * Everywhere else, `@v4` means a fix arrives without a pull request. In a
 * workflow holding publish credentials it means the action's author — or
 * whoever reaches their account — can move what runs next to an npm token.
 * Trusted Publishing removes the long-lived token; it does not remove this.
 */
test("a workflow that can publish pins its actions by SHA", () => {
  // What makes a workflow "publishing" is a step that publishes or a token
  // that can, not a comment mentioning one — the first draft of this matched
  // the words `npm publish` inside a code comment in ci.yml and reddened two
  // workflows that hold no credentials at all.
  const canPublish = (w: Workflow) =>
    w.lines.some((l) => /^\s*id-token:\s*write\s*$/.test(l)) ||
    w.lines.some((l) => /^\s*(-\s*)?run:.*\bnpm publish\b/.test(l)) ||
    /^\s+npm publish\b/m.test(w.text);
  const publishing = workflows.filter(canPublish);
  const problems: string[] = [];
  for (const workflow of publishing) {
    for (const [index, line] of workflow.lines.entries()) {
      const uses = /^\s*-?\s*uses:\s*([^\s#]+)/.exec(line);
      if (!uses) continue;
      // A workflow in this repository is already pinned — to the commit this
      // run checked out. There is no third party to pin against.
      if (uses[1]!.startsWith("./")) continue;
      const ref = uses[1]!.split("@")[1];
      if (!ref || !/^[0-9a-f]{40}$/.test(ref)) {
        problems.push(`${workflow.file}:${index + 1} — ${uses[1]} is not pinned to a commit`);
      }
    }
  }
  assert.deepEqual(problems, [], "\n  " + problems.join("\n  ") + "\n");
});

/**
 * Code scanning is a feature of public repositories (or paid
 * Advanced Security). While this one is private, CodeQL analyses the whole
 * codebase and then fails on the upload with "Code scanning is not enabled",
 * so every pull request carried a red check that said nothing about the code.
 * The job runs once the repository is public, which is when it can report.
 */
test("CodeQL runs only where code scanning can take its results", () => {
  const codeql = workflows.find((w) => w.file === "codeql.yml")!;
  const analyze = jobs(codeql).find((j) => j.name === "analyze")!;
  assert.ok(
    analyze.body.some((l) => /^\s{4}if:.*github\.event\.repository\.private\s*==\s*false/.test(l)),
    "on a private repository the upload fails and reddens every pull request",
  );
});

/**
 * Dependabot's pull requests were meant to skip the changelog check
 * through the `skip-changelog` label its config applies, but the label did not
 * exist in the repository, so Dependabot applied nothing and a dev-dependency
 * bump failed the check. A dependency bump that ships to consumers is written
 * up at release; the exemption belongs in the workflow, not in repo settings.
 */
test("the changelog check exempts Dependabot without relying on a label", () => {
  const changelog = workflows.find((w) => w.file === "changelog.yml")!;
  const job = jobs(changelog).find((j) => j.name === "changelog")!;
  const condition = job.body.find((l) => /^\s{4}if:/.test(l)) ?? "";
  assert.match(condition, /dependabot\[bot\]/, "a Dependabot PR fails the check whenever its label is missing");
  assert.match(condition, /skip-changelog/, "the label still skips the check for anyone else");
});

/**
 * The release's last job is the production smoke check, and one of
 * its assertions is that the hosted MCP server reports the version
 * mcp/package.json says. The Worker deploys apart from the site, and the
 * release deployed only the site, so the first real release would have ended
 * red at its own last step, with the hosted server a release behind.
 */
test("the release deploys the hosted MCP server its smoke check judges", () => {
  const release = workflows.find((w) => w.file === "release.yml")!;
  const all = jobs(release);
  const deploying = all.filter((j) => j.body.some((l) => /pnpm (--filter echo-ui-mcp )?deploy:worker\b/.test(l)));
  assert.ok(deploying.length, "a job in release.yml runs the MCP Worker's deploy");
  const smoke = all.find((j) => j.name === "smoke")!;
  const needs = (job: { body: string[] }) => /needs:\s*\[?([^\]\n]*)/.exec(job.body.join("\n"))?.[1]!.split(",").map((s) => s.trim()) ?? [];
  // The smoke check runs after the Worker is deployed, directly or through the jobs it waits on.
  const before = (name: string, seen = new Set<string>()): Set<string> => {
    for (const dep of needs(all.find((j) => j.name === name)!)) if (!seen.has(dep)) before(dep, seen.add(dep));
    return seen;
  };
  assert.ok(deploying.some((j) => before(smoke.name).has(j.name)), "the smoke job waits for the Worker's deploy");
  // A dry run deploys nothing, the Worker included.
  for (const job of deploying) assert.ok(job.body.some((l) => /if: \$\{\{ !inputs\.dry-run \}\}/.test(l)), `${job.name} is skipped on a dry run`);
});

/**
 * Four jobs in release.yml build the registry (verify, publish, deploy,
 * smoke), all before `published-core.json` is bumped in the commit after the
 * release, so each has to say which core the run is publishing. Said once, at
 * the top, it reaches all of them.
 */
test("every registry build in the release knows which core it's releasing", () => {
  const release = workflows.find((w) => w.file === "release.yml")!;
  const top = release.text.slice(0, release.text.indexOf("\njobs:"));
  assert.match(top, /^env:\n {2}ECHO_RELEASING: \$\{\{ inputs\.version \}\}$/m);
  const building = jobs(release).filter((j) => j.body.some((l) => /pnpm build:registry/.test(l)));
  assert.ok(building.length >= 3, `found ${building.length} jobs that build the registry`);
});
