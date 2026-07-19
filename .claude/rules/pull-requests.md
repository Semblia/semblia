# Raising a Pull Request

A PR is not "raised" when `gh pr create` returns — it's raised when it is
**mergeable**. Historically every PR here has been blocked after CI went
green, always by the same two things (evidence: PRs #38, #41, #42, #43, #45).
The recurring defect checklist and official local-reviewer policy live in
`pr-quality-gates.md`; they are part of this gate, not optional reading.

## Merge gates on this repo (branch protection)

- **Required status check:** "Test, build, and coverage" — the only required
  check.
- **Conversation resolution:** every review thread must be resolved before
  merge. This is the #1 historical blocker (PR #38: 35 threads, #41: 20,
  #45: 45 — all had green CI while sitting BLOCKED).
- CodeScene, codecov/patch, CodeQL, and CodeRabbit checks are advisory —
  a red one does not block merge, but the review threads they open do.

## Before opening the PR

1. On the committed, clean branch, fetch the base and run the complete local
   sequence:

   ```sh
   pnpm pr:gate:local -- --base origin/main
   pnpm review:local:check
   pnpm review:local -- --base origin/main
   ```

   Record each reviewer's `RUN` or exact `SKIP` result in the PR evidence. The
   first command runs the full build-first quality gate plus repository PR
   policy checks. Never open a PR to "see if CI passes".

2. New logic ships with tests in the same PR. codecov/patch flags untested
   diff lines on every PR — a diff whose new branches have zero coverage is
   not ready.
3. Self-review the full diff (`git diff main...HEAD`) against every relevant
   section of `pr-quality-gates.md`: no debug leftovers, no unrelated drive-by
   changes, no secrets, no stray files. The diffstat should read as the PR's
   story.
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
2. Confirm the state before calling the task done with
   `pnpm pr:gate:hosted -- --pr <n>`. It must report zero blockers and GitHub
   must report `CLEAN` or `UNSTABLE` (`UNSTABLE` = only advisory checks red —
   still mergeable). `BLOCKED` means unresolved threads or the required check
   — go fix it.
3. Merging is the user's call. Leave the PR mergeable; do not merge it.
