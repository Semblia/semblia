# PR Quality Gates

Read this with `pull-requests.md`. That file defines hosted mergeability; this
file defines the content review that should happen before reviewers find the
same defects again. The evidence is recorded in
`docs/research/2026-07-19-pr-review-gates.md`.

## Run the gates

Before opening or updating a PR, commit the intended diff, fetch the base, and
run:

```sh
pnpm pr:gate:local -- --base origin/main
pnpm review:local:check
pnpm review:local -- --base origin/main
```

- `pr:gate:local` runs the same build-first quality order as CI, requires a
  clean and up-to-date branch, checks the diff, scans added lines for common
  secret shapes, and enforces `persist-credentials: false` on every checkout
  step.
- `review:local` runs every configured official reviewer. A missing license,
  authentication, or recoverable service rate limit is a `SKIP`, never a fake
  pass. Record the exact skip in the PR evidence and complete the manual review
  below.
- If the PR exceeds 100 changed files, split it when the contract permits. If
  it cannot be split, a local CodeRabbit review and an explicit scope
  justification are mandatory because its hosted reviewer has skipped PRs at
  that size.

After every push, wait for hosted checks and reviewers, sweep every new thread,
then run:

```sh
pnpm pr:gate:hosted -- --pr <number>
```

This command is the final machine-readable proof for the required check,
branch freshness, merge state, and zero unresolved conversations.

## Review the changed behavior

Apply every relevant section to the diff. “Not applicable” is acceptable only
when the PR description or review summary makes the reason obvious.

### Trust and public output

- Serialize for the destination context. JSON inside `<script>` needs
  script-breakout escaping; HTML, URLs, headers, and shell arguments need their
  own context-safe handling.
- Re-check authorization, role, consent, and privacy at the final public
  projection boundary. A safe write path does not make every later read safe.
- Redact every secret value, including short values, from errors and command
  output. Never log credentials to make a failed preflight easier to debug.
- Bound public fetches, subprocesses, and provider calls with a timeout and a
  clear failure state.

### Contracts and durable state

- Keep machine identifiers stable when labels or presentation change. Preserve
  server-issued slugs and IDs instead of regenerating them in the client.
- Return the sanitized or migrated value that was validated; do not validate a
  local variable and then persist the raw input.
- Keep guards, schemas, defaults, mirrors, and compiled output aligned. Test
  malformed legacy input and disagreement between raw preference and compiled
  state.
- Reject impossible paired bounds and partial states (`min > max`, committed
  data followed by an error response, or one mirror overwriting its source of
  truth).

### Async UI and failure states

- Await durable saves before preview/navigation depends on them. Preserve
  popup-safe behavior while surfacing save failure.
- Model loading, empty, not-found, fetch-failed, and conversion-failed states
  separately. Do not show synthetic fallback data while a real query is
  unresolved.
- If a post-commit action is documented as best-effort, catch its failure or
  make the whole operation transactional and retryable.

### Accessibility and input semantics

- Custom radios, menus, and composites implement the expected Arrow/Home/End,
  modifier, focus, and disabled behavior; prefer native controls when possible.
- Collapsed or visual-only preview content must be `inert`. `aria-hidden` and
  pointer-event CSS alone do not remove descendants from the tab order.
- Do not use modal/dialog semantics without the corresponding focus and Escape
  behavior. Keep file inputs visually hidden rather than `display: none` when
  labels or assistive technology must activate them.
- Expose pending state (`aria-busy` or an equivalent status) for asynchronous
  controls.

### Operations and workflows

- GitHub checkout steps set `persist-credentials: false` unless a documented
  later step genuinely needs the credential.
- Validate all inputs and immutable artifact references before mutating
  services. Wait for real readiness before smoke tests or rollback validation.
- Health checks test the service process, not merely PID 1 or its supervisor.
- Environment parsers cover quotes, inline comments, empty values, and boolean
  strings. External commands have bounded timeouts.

### Tests and documentation

- Every fixed defect gets the smallest boundary-level regression test. New
  branches cover negative and cross-tenant/privacy cases, not just the happy
  path.
- Mocks preserve the real platform signature and response envelope. Assertions
  target the named job/component instead of passing on an unrelated global
  substring.
- Update plans, continuity, operator commands, widths/tokens, and state names in
  the same PR. Documentation drift is a review defect.

## Reviewer-specific handling

- **CodeScene:** extract a cheap helper before review when it clarifies the
  design. Do not churn verified orchestration or deliberate template packs only
  to lower a metric. Batch-disposition metric-only findings with counts and
  verification evidence, then resolve every conversation.
- **CodeRabbit:** run the local WSL CLI before opening large PRs and use agent
  output for systematic triage. A rate-limited or skipped summary is a warning
  that still needs an explicit disposition.
- **CodeQL:** the official local CLI is a full database scan, not a lightweight
  diff reviewer. The hosted JavaScript/TypeScript and Python jobs remain the
  canonical gate unless a security investigation warrants a local database.
- **Codecov:** its CLI uploads reports; patch-status evaluation is hosted. Run
  the repo tests/coverage locally, inspect low patch coverage, and explain any
  deliberate non-coverable diff rather than treating the advisory badge as the
  test strategy.
