# Raising a Pull Request

A PR is not "raised" when `gh pr create` returns — it's raised when it is
**mergeable**. Historically every PR here has been blocked after CI went
green, always by the same two things (evidence: PRs #38, #41, #42, #43, #45).

## Merge gates on this repo (branch protection)

- **Required status check:** "Test, build, and coverage" — the only required
  check — with **strict up-to-date enforcement**: the check must pass on a
  head that is current with `main`. If `main` moves after your last push,
  the PR flips to `BEHIND` and cannot merge until the branch is updated
  (`gh pr update-branch <n>`) and the required check re-passes on the new
  head.
- **Conversation resolution:** every review thread must be resolved before
  merge. This is the #1 historical blocker (PR #38: 35 threads, #41: 20,
  #45: 45 — all had green CI while sitting BLOCKED).
- CodeScene, codecov/patch, CodeQL, and CodeRabbit checks are advisory —
  a red one does not block merge, but the review threads they open do.

## Before opening the PR

1. Full gate green locally per `verification.md`: typecheck + lint + test +
   build for every touched package. Never open a PR to "see if CI passes".
2. New logic ships with tests in the same PR. codecov/patch flags untested
   diff lines on every PR — a diff whose new branches have zero coverage is
   not ready.
3. Self-review the full diff (`git diff main...HEAD`) before creating the
   PR: no debug leftovers, no unrelated drive-by changes, no secrets, no
   stray files. The diffstat should read as the PR's story.
4. PR description states what/why, verification evidence (gates run,
   screenshots for UI changes), and anything deliberately out of scope.
5. Pre-empt predictable CodeScene advisories where it doesn't fight the
   architecture: its thresholds are cyclomatic complexity ~9–10, ~70 lines
   per function, nesting depth 4. The repeat offenders are mega-component
   render functions, switch-heavy migrate/format helpers, and
   single-template-literal stylesheets. A cheap extraction at write time
   beats a wall of advisory threads at review time. Do not contort a design
   to satisfy the metric — a deliberate exception gets dispositioned at
   review instead (see below).

## After opening the PR — drive it to mergeable

1. Wait for the bots (CodeRabbit, Codex connector, CodeScene) and CI to
   finish, then sweep review threads to **zero unresolved**:
   - Real findings: fix, push, reply on the thread.
   - Advisory/disagree: reply with a one-line disposition (or one summary
     comment for a batch), then resolve the thread. Never refactor green,
     tested code purely to appease an advisory bot.
   - CodeRabbit auto-resolves its own threads on push; Codex and CodeScene
     threads **never auto-resolve** — resolve them explicitly via GraphQL
     `resolveReviewThread` (batch ≤ 5 mutations per request; larger
     aliased batches hit GitHub resource limits).
2. **Every push restarts the clock** — including a `gh pr update-branch`
   merge commit. CodeScene re-reviews each push and posts a fresh batch of
   advisory threads, and the required check must re-pass on the new head.
   The thread sweep is done after the *final* push, not once.
3. Confirm the state before calling the task done:
   `gh pr view <n> --json mergeStateStatus,mergeable` must report `CLEAN`
   or `UNSTABLE` (`UNSTABLE` = only advisory checks red — still mergeable).
   - `BLOCKED` → unresolved threads or required check not green on this head.
   - `BEHIND` → branch out of date with `main` (strict checks):
     `gh pr update-branch`, wait for CI, re-sweep new threads.
   - `mergeStateStatus` is computed lazily and can read stale (e.g.
     `UNSTABLE` shortly before flipping to `BEHIND`). Re-read it after CI
     and thread sweeps settle — one early read is not verification.
4. Merging is the user's call. Leave the PR mergeable; do not merge it.
