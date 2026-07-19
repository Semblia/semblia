# PR Review Gate Analysis — 2026-07-19

## Scope and method

This is a point-in-time audit of the inline review threads, check summaries,
commit histories, and final dispositions on Semblia PRs
[#38](https://github.com/Semblia/semblia/pull/38),
[#41](https://github.com/Semblia/semblia/pull/41),
[#42](https://github.com/Semblia/semblia/pull/42),
[#43](https://github.com/Semblia/semblia/pull/43),
[#44](https://github.com/Semblia/semblia/pull/44),
[#45](https://github.com/Semblia/semblia/pull/45), and
[#48](https://github.com/Semblia/semblia/pull/48). Counts came from GitHub's
review-thread GraphQL connection rather than the visible check badge, because a
green advisory badge does not prove that its conversations are resolved.

| PR        | Outcome at audit  | Files | Threads | Reviewer mix                                        |
| --------- | ----------------- | ----: | ------: | --------------------------------------------------- |
| #38       | merged            |    40 |      35 | CodeScene 23, Codex 7, CodeRabbit 5                 |
| #41       | merged            |    49 |      20 | CodeRabbit 17, Codex 2, GitHub Code Quality 1       |
| #42       | merged            |    57 |       7 | CodeRabbit 7                                        |
| #43       | merged            |    30 |      12 | CodeRabbit 12                                       |
| #44       | closed/superseded |    90 |      39 | CodeScene 24, CodeRabbit 15                         |
| #45       | open              |   121 |      45 | CodeScene 45                                        |
| #48       | open              |   117 |      78 | CodeScene 78                                        |
| **Total** |                   |       | **236** | **CodeScene 170, CodeRabbit 56, Codex 9, GitHub 1** |

CodeScene generated 170/236 threads (72%). Its findings were overwhelmingly
structural biomarkers: complex methods and conditionals, large methods,
duplication, nesting, and file/function size. Those metrics produced large
conversation walls even when the actual disposition was “verified orchestration
or deliberate template structure; accepted advisory debt.” PR #48 is the
clearest case: all 78 threads carried CodeScene's `cs-code-health` marker and no
correctness or security finding. The batch disposition remains visible in the
[#48 review summary](https://github.com/Semblia/semblia/pull/48#issuecomment-5015316665).

## What the substantive reviews repeatedly found

### Trust boundaries and public output

- PR #38 caught JSON-LD script breakout, public privacy projection that could
  regain protected rating/name fields, missing public-wall configuration
  failure, and an unbounded public fetch.
- PR #43 caught checkout credentials being retained, short secret values leaking
  through redaction, and an unbounded Docker subprocess.
- These are boundary defects: green component tests did not prove the final
  serialization, projection, log, or process boundary was safe.

### Contract and state-source disagreement

- PR #38 caught server-issued wall slugs being replaced, select option IDs
  changing when labels changed, widget-role mismatch, impossible min/max
  combinations, and an unwired redirect action.
- PR #44 caught sanitized migration input being discarded for the raw value,
  a color guard accepting values rejected by the schema, compiled appearance
  disagreeing with raw preference, a stale mirror overwriting authoritative
  brand color, and re-selecting a template erasing accents. See the concrete
  [sanitized-value finding](https://github.com/Semblia/semblia/pull/44#discussion_r3572374120)
  and [schema/guard mismatch](https://github.com/Semblia/semblia/pull/44#discussion_r3572374149).
- The recurring rule is to test disagreement: raw versus compiled, label versus
  identifier, mirror versus source of truth, and legacy input versus current
  schema.

### Async state and honest failure UI

- PR #41 repeatedly found preview navigation racing ahead of draft persistence;
  unresolved queries collapsing into fake fallback content; and loading,
  not-found, fetch, and conversion failures sharing an infinite spinner.
- PR #44 found a “best-effort” post-commit enqueue whose rejection made a
  successful durable write look failed and unretryable. The
  [thread](https://github.com/Semblia/semblia/pull/44#discussion_r3572374064)
  is the canonical example of partial success needing an explicit contract.

### Accessibility and input behavior

- PR #41 caught false modal semantics, collapsed-but-focusable content, missing
  modifier guards, and preview controls that remained tabbable despite visual
  inertness.
- PR #42 caught incorrect checkbox state selectors and missing pending-state
  semantics.
- PR #44 caught custom radios without Arrow/Home/End navigation and file inputs
  removed from the accessibility tree with `display: none`; see the
  [radio finding](https://github.com/Semblia/semblia/pull/44#discussion_r3572374089)
  and [file-input finding](https://github.com/Semblia/semblia/pull/44#discussion_r3572374123).

### Operational fail-before-mutate behavior

- PR #43 supplied the operational checklist almost verbatim: parse quotes and
  inline comments, validate rollback inputs before changing services, enforce
  immutable image references, wait for real readiness, test the worker rather
  than its supervisor, bound subprocesses, and scope tests to the named job.
- The current PR workflow still lacked `persist-credentials: false`, even though
  PR #43 had already fixed the same class in the production workflow. The new
  executable policy checks every workflow, not only the file touched today.

## Why the review cycle became expensive

1. **The checks and the actual merge gate were conflated.** CodeScene,
   CodeRabbit, CodeQL, and codecov are advisory, but any inline conversation they
   open blocks merge until resolved. A green required check could coexist with
   `BLOCKED` for dozens of threads.
2. **Metric volume obscured defect signal.** 170 CodeScene comments required
   explicit triage even when the correct decision was a documented exception.
   Cheap clarifying extractions belong before the PR; behavior-preserving churn
   after full verification does not.
3. **Large PRs can silently lose an AI review.** CodeRabbit explicitly skipped
   PR #45 at 118 files with “Too many files” in its
   [summary](https://github.com/Semblia/semblia/pull/45#issuecomment-4972875972).
   The branch later reached 121 files. Cross-cutting contracts cannot always be
   split safely, so the fallback must be a local review plus explicit scope
   justification.
4. **Patch coverage exposed untested branches late.** PR #45 reported 61.20603%
   patch coverage with 386 missing lines, concentrated in renderer and migration
   logic; see the
   [Codecov report](https://github.com/Semblia/semblia/pull/45#issuecomment-4972891612).
5. **The local aggregate gate did not match CI order.** In a clean worktree,
   tests could run before internal workspace build artifacts existed, while CI
   intentionally builds first. `quality:check` now uses CI's build → lint →
   typecheck → test order.

## Gates derived from the evidence

| Repeated failure mode                           | Repository rule                                              | Executable proof                    |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| stale/dirty/behind branch                       | committed clean diff; base must be ancestor                  | `pnpm pr:gate:local`                |
| whitespace or accidental secret                 | diff check plus added-line secret scan                       | `pnpm pr:gate:local`                |
| retained Actions credential                     | every checkout step disables persistence                     | local policy + unit test            |
| source change with no visible regression test   | add a boundary test or justify existing coverage             | local warning + PR evidence         |
| hosted reviewer skipped on size                 | split, or run local CodeRabbit and justify scope             | local reviewer + hosted warning     |
| recurring trust/contract/async/a11y/ops defects | mandatory content checklist                                  | `.claude/rules/pr-quality-gates.md` |
| advisory metric wall                            | count, classify, fix real defects, batch-disposition metrics | review summary + zero threads       |
| stale hosted state or unresolved thread         | re-query after every push                                    | `pnpm pr:gate:hosted -- --pr <n>`   |

## Official local-runner support

- **CodeRabbit:** the official CLI supports structured `--agent` output and
  committed/uncommitted/all diff modes. On Windows the documented path is WSL.
  The official [WSL guide](https://docs.coderabbit.ai/cli/wsl-windows) and
  [CLI reference](https://docs.coderabbit.ai/cli) support the wrapper implemented
  here. Version 0.6.5 is installed and authenticated in this workstation's WSL;
  the wrapper supplies translated worktree/Git paths so Windows-linked Git
  worktrees remain reviewable.
- **CodeScene:** its official CLI performs the same change-oriented checks as
  the PR integration via `cs delta`, including branch comparison and JSON
  output. It supports native Windows, but requires a CodeScene access token; see
  the [installation/license guide](https://codescene.io/docs/cli/index.html) and
  [`cs delta` reference](https://codescene.io/docs/cli/command-reference.html).
  Version 1.0.33 is installed locally; `CS_ACCESS_TOKEN` is currently absent, so
  the wrapper reports an exact `SKIP` instead of claiming a review ran.
- **CodeQL:** GitHub supports local analysis, but it creates and analyzes a full
  language database rather than acting as a lightweight diff reviewer. The
  official [database preparation](https://docs.github.com/en/code-security/tutorials/customize-code-scanning/prepare-code-for-analysis)
  and [analysis](https://docs.github.com/en/enterprise-server@3.17/code-security/tutorials/customize-code-scanning/analyze-code)
  flows are appropriate for security investigations or external CI. The
  existing hosted JavaScript/TypeScript and Python jobs remain canonical here.
- **Codecov:** the official CLI is primarily an authenticated report uploader,
  while `codecov/patch` is a hosted status over changed lines. See the
  [CLI uploader](https://docs.codecov.com/docs/codecov-uploader) and
  [patch-status definition](https://docs.codecov.com/docs/commit-status).
  The repository therefore generates coverage locally/CI and leaves patch
  evaluation to the existing hosted integration.

These choices add local parity where the review product genuinely exposes a
diff runner, without pretending that a missing license, a hosted patch
calculation, or a full CodeQL database scan is an equivalent local pass.
