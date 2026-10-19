<!--
Thanks for this. The checklist below is not ceremony — every line is there because
something once broke for the want of it. CONTRIBUTING.md has the full reasoning.
-->

## What changes, and what it changes about the contract

<!--
Not "refactored the field component" — what is TRUE now that wasn't, for someone
who installs this. If nothing a user can observe changed, say that; it is a real
and useful answer.
-->

Closes #

## How it was verified

<!--
What you ran, and what it said. "CI is green" is the floor, not the answer: name
the case you actually checked, especially the one you expected to fail.
-->

## Checklist

- [ ] `git add` **first**, then `pnpm typecheck && pnpm lint && pnpm test` passes.
      (The identity test only sees tracked files — a new file is invisible to it until it is
      staged, which is how a green run once hid a whole broken module.)
- [ ] **Any CSS or component change:** the full Playwright suite run locally, `visual:` tests
      included. CI skips screenshots where only macOS baselines exist, so a local run is the only
      place they are checked.
- [ ] **`CHANGELOG.md`** under `[Unreleased]` names every item whose shipped behaviour changed,
      in backticks, with its `<!-- bump: …; items: … -->` declaration — or this PR is labelled
      `skip-changelog`. A `/e/` version is published once and never rewritten, so an item that
      moves silently moves permanently.
- [ ] **Any bug found along the way is fixed, not noted.** Its own commit, with the failing test
      written and watched failing first, and the reproduction in the pull request. Deferring one
      needs agreement, and a known-failure test that says what it waits on.
- [ ] Accessibility: nothing here removes a focus ring, drops a target below 24×24px, signals
      state with colour alone, or leaves a control without an accessible name.

## Bugs found

<!--
Required, even when the answer is "none". What was fixed, and what was left open and why.
-->

none
