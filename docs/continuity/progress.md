# Progress Ledger

Last updated: 2026-08-07 (Import width + colour, settings measure, response
record — the newest checkpoint is the last section of this file, not the
Current Snapshot below).
Earlier: 2026-08-06 Dependency housekeeping.
Earlier: 2026-08-05 Import progression + three UX defects.
Earlier: 2026-08-03 Code-health pass.
Earlier: Inbound imports PR closeout; App shell refactor.
Earlier: Sitemap restructure. Earlier: PR review-gate hardening.
Earlier: Template refinement pass; Template system v2.
Earlier: Production-spine recovery. Earlier: Design-language pass; Studios rebuild; Forms rebuild **Phase 7** DONE, commit `129d95af` — `apps/forms_runtime` rebuilt (Hono Lambda): hosted `/f/:slug` + `/embed/:slug` SSR via forms-renderer, `embed.js`/`loader.js` Phase-8 stubs, signed snapshot fetch + cache, submit/presign proxy, embed origin allowlist + CSP/security headers, custom-domain loud-fail, mock mode; gate green incl. `cdk synth`. Earlier **Phase 6** DONE `4899d5be` — public submission pipeline
(`POST /v2/runtime/forms/:slug/submissions` + uploads/presign: full-snapshot validate, normalize,
Origin/HMAC trust with HMAC hard-reject, honeypot/min-time/blocked-content, FormSubmitIdempotency replay +
in-flight 409, FormResponse + encrypted FormResponsePrivateMetadata + sourceMetadata, enqueue
FormModerationRun), authenticated `responses` module (list/get display-safe + no PII, status, consent-gated
publish, delete, annotations), moderation re-pointed onto FormModerationRun (reviewer state authoritative),
and ALL consumers restored onto FormResponse/FormView (0 `FORMS-REBUILD(Phase 6)` markers left:
widgets/analytics/exports/billing/projects + default Form seed). Codex-delegated (codex:codex-rescue),
orchestrator-reviewed/verified/committed; orchestrator finished the gate after Codex was cut off by a
ChatGPT usage limit (removed a stale trust pre-compute in the throttler guard, Prisma Json→StoredAnswer[]
cast, pruned dead imports, stubbed a widget spec mock). Gate green: api_v2 typecheck + lint + test
(63 files / 401) + build; web_v2 build; @workspace/types build; update-indexes. Next: Phase 7
(`apps/forms_runtime` rebuild — Hono Lambda hosted pages/embeds/injection + submit/upload proxy). Earlier:
**Phase 5** api_v2 forms drafts/publish/snapshots/versions; **Phase 4** `packages/forms-renderer`;
**Phase 3** `packages/forms-core`. 2026-06-17 both studios rebuilt into visual inspectors; only remaining
widget gap was server-side save/publish parity (now shipped; see Current Snapshot))

## Current Snapshot

> The active branch is **`feat/ui-import-responses-settings-2026-08-06`**
> (PR #56). This section describes the previous checkpoint, which is merged;
> the live entry is the last section of this file.

- 2026-08-06 — **DEPENDENCY HOUSEKEEPING** on
  `chore/dependency-housekeeping-2026-08-06` (branched from `main` after
  PR #54 merged). `pnpm audit` went from **111 vulnerabilities (4 critical,
  54 high) to zero**, `pnpm peers check` from one unmet peer to clean,
  `pnpm dedupe --check` from five duplicated packages to no changes, and
  `pnpm outdated` from 111 entries to 9 — every one of those 9 a recorded
  deferral, not an oversight. Five commits, one per phase.
  **(1 — packages/ui deleted)** It had zero consumers: all 56
  `@workspace/ui` references were self-references, and web_v2 carries its
  own `components/ui`. It was still in the CI gate, so turbo linted and
  typechecked 60 files of dead code every run. It was also the single
  largest source of drift — ~50 dependencies including the deprecated
  `recharts@2.15.4` and `zod@3.25.76`, which were the _only_ two remaining
  version conflicts in the workspace, plus `three`, `@react-three/fiber`,
  `framer-motion` and 26 Radix packages nothing rendered. Deleting it alone
  cleared **85 of the 111 advisories**. The user chose deletion over
  upgrading it in place.
  **(2 — security)** Direct dependencies fixed in their own package.json,
  never by an override, so the declared range stays honest: next +
  eslint-config-next 16.2.6 → **16.2.12** (nine advisories incl. middleware
  bypass and Server-Action SSRF), sharp 0.34.5 → **0.35.3**, vitest +
  coverage-v8 3.2.4 → **4.1.10**, @hono/node-server 1.19.13 → **2.1.0**,
  hono → 4.13.0, esbuild → 0.28.1, turbo → 2.10.8. The overrides block
  covers what we do not declare, each pinned to the lowest patched release
  _inside the major line already installed_ — hence range-scoped keys
  (`brace-expansion@1`, `minimatch@9`, `vite@7`, …). `hono`,
  `@hono/node-server` and `sharp` sit in both places because
  @modelcontextprotocol/sdk, @prisma/dev and next pull their own copies.
  Note for the next person: **postcss is pinned to 8.5.25, not 8.5.26**,
  although both fix the advisory — 8.5.26 was seven hours old and tripped
  pnpm's minimum-release-age guard, which silently wrote a
  `minimumReleaseAgeExclude` entry into `pnpm-workspace.yaml`. Take the
  older patched release rather than let that supply-chain guard be
  weakened.
  **(3 — conflicts)** typescript (5.7.3 vs 5.9.3) → 5.9.3 everywhere;
  @types/node (^20/^24/^25) → **^22.20.1**, because the Dockerfile builds
  `node:22-alpine3.21` and both workflows set `NODE_VERSION "22"` —
  packages/database and mcp-server had been typechecking against Node APIs
  production does not have, and root `engines` now says `>=22`;
  react/react-dom 19.2.1 vs 19.2.4 (forms-renderer's devDependency) → one
  copy; eslint 9.32 vs 9.39 deduped; zod 3 → 4 in mcp-server (it already
  imported the `zod/v4` compat subpath); `chokidar ^5` declared in api_v2
  for @swc/cli's unmet peer. `baseUrl` dropped from api_v2's tsconfig —
  dead config with no `paths` map, and TS deprecates it for removal in 7.0.
  **(4 — majors, and why three did not happen)** Taken: eslint-config-prettier
  9 → 10 (import from `/flat`), @typescript-eslint 8.66, bullmq 5.81.3 with
  ioredis 5.11.1 (bullmq pins ioredis _exactly_, so they move together),
  lucide-react → 1.28, jsdom → 30. **Blocked, each by something concrete
  rather than by caution — verify before retrying:** eslint 10 by
  `eslint-plugin-import` (current release still caps at eslint ^9, and
  eslint-config-next bundles it); bullmq 6 by `@nestjs/bullmq` 11.0.4
  capping at bullmq ^5; ioredis 6 because bullmq 5 pins 5.11.1 exactly, so
  it would add a second client speaking RESP3 while bullmq's speaks RESP2
  to the same server; react-day-picker 10 because it is a rename to
  `@daypicker/react` plus a classNames migration (`table` → `month_grid`)
  and `components/ui/calendar.tsx` is styled against v9 keys. next 16.3.0
  deferred deliberately — it flips to Node streams, Turbopack fs cache and
  appShells by default and deprecates the edge runtime, none of which the
  security fix needed. Also deleted, same finding as packages/ui:
  @workspace/eslint-config's `next-js` and `react-internal` presets (only
  `/base` is imported anywhere; web_v2 and admin use eslint-config-next
  directly), plus `react-resizable-panels` from web_v2 and `lucide-react`
  from admin — declared, never imported.
  **(5 — everything else)** 56 packages to current via `pnpm update -r`
  plus hand edits for the exact pins: NestJS 11.1.28, Prisma 7.9.1, Clerk
  backend 3.15.1 / nextjs 7.6.5, six AWS SDK clients, radix-ui 1.6.7,
  @base-ui/react 1.7, Tailwind 4.3.3, motion 12.43, react 19.2.8.
  **(one deferral this surfaced)** eslint-config-next's floating
  `eslint-plugin-react-hooks ^7.0.0` moved 7.0.1 → 7.1.1, which added
  `react-hooks/set-state-in-effect`. It fires on **34 pre-existing call
  sites across 30 files**, including `hooks/use-mobile.ts` and
  `use-media-query.ts` (where the initial synchronous read is the standard
  matchMedia pattern) and shadcn's own `carousel.tsx`. Turned off in
  web_v2's eslint config with a TODO rather than fixed blind or hidden by
  pinning the plugin back — every other rule 7.1 added stays on. **Worth a
  focused follow-up pass.**
  **(verification)** Chrome extension offline again; a Playwright harness
  drove 12 routes × light/dark plus 6 at 390px — zero console errors, zero
  horizontal scroll, analytics/recharts, dark-mode graphite, Phosphor marks
  and Radix dialogs all correct. The load-bearing runtime check: a **real
  manual import driven through the UI** (web form → API → BullMQ → Redis →
  worker → Prisma) landed in the responses queue on 2026-08-06 at 16:19
  IST, carrying the run marker `dep-housekeeping-1786013963585` and the
  row's freshly-written relative label — which is what actually exercises
  bullmq 5.81 + ioredis 5.11. API health reported
  database up / redis up / Clerk configured; the worker compiled 323 files
  with 0 TSC issues; forms_runtime served `/f/:slug` at 200 with CSP,
  X-Frame-Options and nosniff intact under @hono/node-server 2 (its
  `/embed/:slug` 404 is the intentional hosted|embed split, not a
  regression); admin booted on Next 16.2.12. Gates: typecheck clean across
  13 packages plus web_v2 tsc, eslint clean, tests green (api_v2 86
  files/776, web_v2 58/371, forms_runtime 6/72, packages 18/238), build
  12/12.
  **(the one gate that went red, and why no local run caught it)** The
  required check failed on the first push while every local gate was green,
  because the shells disagree about globs. `packages/types` ran
  `vitest run --exclude dist/**`; PowerShell hands that to vitest untouched,
  bash expands it first, so on the Linux runner it became ~20 positional
  args — which vitest reads as _filters_, not exclusions. Combined with the
  new `include`, it matched nothing and exited 1 with "No test files found".
  The flag was a workaround for the same dist problem the config now solves,
  so it was deleted. **Run `pnpm test` through bash before pushing** — added
  to `.claude/rules/verification.md`; any gate argument containing `*` is
  shell-sensitive and belongs in config, not the command line. The CI log
  also exposed `widgets-embed` reporting 12 tests for 6 real ones (its
  config set `environment` but never scoped `include`); fixed in the same
  commit.
  **(a defect this exposed)** Vitest 4 removed `dist` from its default
  excludes. Four packages had no `vitest.config.ts` and were collecting
  their own compiled `.spec.js` — widgets-core reported **195 tests for 96
  real ones**, and mcp-server failed outright on stale output. All four now
  carry the `include: ["src/**/*.spec.ts"]` config forms-core already had.
  Any new package with a build step needs it too.
  `update-indexes.py` still unavailable in this environment (no python) —
  indexes stale for these diffs.
- 2026-08-05 — **IMPORT PROGRESSION + THREE UX DEFECTS** on
  `feat/import-flow-and-ux-2026-08-05` (branched from `main` after PR #53
  merged). Four things the user named, one commit each.
  **(1 — notifications, api_v2)** Eleven notification creation sites wrote a
  placeholder link: `/projects` (which 308s to the project list) or `/`. The
  cause was structural — the site held a `projectId` and had no slug to build a
  URL from — so the fix went where all of them pass through: every
  project-scoped creator already loads the project to resolve recipients, so
  `link` may now be a function of that project and is resolved there
  (`CreateProjectNotificationInput`). Destinations live in one new
  `common/links/app-links.ts` mirroring the web app's `lib/routes.ts` rule.
  A new response now opens _that response_, not the queue. `PROJECT_INVITE_
RECEIVED` deliberately keeps `/`: the recipient has no project access until
  they accept and there is no acceptance surface in web*v2 yet — recorded in
  place so it isn't "fixed" into a 404.
  **(2 — post-sign-in landing)** `GET /me/last-used-project` has existed and
  re-checks access; nothing read it. All three ways in (password sign-in's
  `decorateUrl`, the SSO callback's `signInFallbackRedirectUrl`, and the
  signed-in forward gate in `proxy.ts`) hard-coded `/`. New `/continue` server
  route resolves the slug and forwards, falling back to the list on \_any*
  failure — first sign-in, deleted project, revoked access, API down; a sign-in
  must not fail because a convenience lookup did. Deliberately a separate route
  so `/` stays the list for the sidebar's Projects link; `continue` joins
  `RESERVED_PROJECT_SLUGS`. The write-only `last_project` cookie is deleted
  (nothing read it, and only the server value can check access).
  `tests/auth-redirects.test.ts` now pins all three entry points together,
  because them disagreeing is the actual bug.
  **(3 — previews)** `ItemRow` gains `leadingFlush`: the preview owns the row's
  left edge top to bottom and title/meta/metrics/actions all begin after it in
  one column. Boxed inside the row padding at a fixed `h-20 w-32` it floated in
  whitespace with the action row restarting underneath it — two unrelated
  blocks. Size lives in one exported `PREVIEW_LEADING` that
  `ListSkeleton leading="preview"` reserves. `WidgetCardMiniPreview`'s doc
  comment had promised "fixed logical size, then scale-fit" and the code never
  did it — it handed the renderer the frame's real width in `scale="mini"`
  (8px type, wall pinned to 4 columns), so a wall reflowed per frame into
  slivers with its second row sliced. It now lays out at a desktop width and
  CSS-scales; short layouts centre, tall ones top-anchor and fade at the clip.
  `PageHeader`: `max-w-full` on the `shrink-0` actions cluster (its own
  `flex-wrap` could never engage, so a plan-limit sentence ran off a phone) and
  the title takes `basis-full` below `sm` (it was the only shrinkable item, so
  it truncated to "Social Pro…" to keep two buttons whole).
  **(4 — import progression)** Every `/import/*` page opened on its form with
  the source buried in a `<select>` of up to forty labels; web additionally
  gated its submit invisibly. Now: `SourcePicker` — a grid of marks with search
  over names _and_ domains — is step 1 for connect/web/migrate, under a
  numbered `StepRail` in the sign-in rail's vocabulary, with the committed
  source restated as a changeable `SourceChip`. Marks: Phosphor for the 23
  platforms it has one for, two-letter initials otherwise (one initial collides
  three ways in this catalog). Host detection is repurposed from silent
  retargeting to `HostMismatchNotice` — names what the link looks like and
  offers the switch, keeping the URL. Manual stays a single form (a rail over
  one screen is furniture) but its attribution uses the same picker behind a
  popover with availability suppressed. Spreadsheet gets its two steps named
  and a real drop target; its native input is `peer sr-only` with the ring on
  the label (the styled `Input`'s `w-full` had survived merging with `sr-only`
  and given the page a horizontal scrollbar).
  **(verification)** Chrome extension offline again; the Playwright harness
  drove everything at 1440 / 768 / 390, light and dark — search → pick → step 2
  → mismatch switch → change source, the connect drill-in, a real sign-in
  landing on `/client-work/responses`, and `/` still the project list. Gates:
  api_v2 tsc + lint clean and vitest 86 files / 776 green; web_v2 tsc + eslint
  clean, vitest 58 files / 370 green, `pnpm build --filter web_v2` green.
  `update-indexes.py` still unavailable in this environment (no python) —
  indexes stale for these diffs.
  **(runtime proof of the notification fix)** Rotating the signing secret
  through the live API produced `Signing secret rotated → /agency-portfolio/
settings/security`, sitting directly above older rows still carrying the
  `/projects` placeholder; clicking it in the bell lands on the security page.
  Note for the next person: the api-keys notifications exclude the acting user
  (`excludeUserIds`), so creating your own key on a single-member project
  correctly produces no notification — that is not the bug reproducing.
  **(local reviewers)** CodeScene + CodeRabbit both `RUN/PASS`. CodeRabbit found
  3 minor on the first pass (flush skeleton reserved no room for the action row
  so lists still jumped; `>=` treated an exact fit as clipped;
  `RememberLastProject` wrote while `isSignedIn` was still `undefined`) and 2 on
  the hosted PR (hand-built `?source=` query param; a reserved-slug test that
  asserted only the path string) — all 5 fixed, and it now reports 0 findings.
  CodeScene's 2 introduced Complex Method findings were fixed by extraction
  (`StepRail` → `CHIP`/`LABEL` tables + `Step`; `ItemRow` → `RowBody`), leaving
  3 dispositioned metric artifacts on files already over threshold on `main`
  (`projects.service.ts` +2 lines on 1590, its spec +2 on 1285,
  `exports.spec.ts` 98 lines vs 97 on main after already pulling it down from
  104).
  **PR [#54](https://github.com/Semblia/semblia/pull/54) raised.** Merging is
  the user's call.
  **(hazard worth remembering)** A review workflow was run over the branch diff
  with write-capable subagents; they mutated the working tree to run
  experiments — reverting committed fixes in `remember-last-project.tsx` and
  `signing-secret.service.ts`, leaving a scratch test behind, and killing both
  dev servers. It was stopped and the tree restored from HEAD (commits were
  never at risk). Review agents on this repo must be read-only, and the
  `api_v2` dev + worker processes must be started _sequentially_ — started
  together they race on `dist/` and both die with `EPERM: rmdir`; a stale lock
  on `packages/database/dist` needs that directory removed before the rebuild
  will pass.
- 2026-08-03 — **CODE-HEALTH PASS** on `feat/internal-ui-rework-2026-07`
  (continues PR #53). Behavior-preserving decomposition of the
  CodeScene-flagged oversized functions/components across the branch's
  diff surface: web*v2 responses (detail/list/queue-row/verdict), shared
  primitives (data-table, detail-sheet, empty-state, item-shell,
  metric-value, section, settings-section, status-badge), analytics
  (hero-chart, heatmap, range-picker, tabs), developers
  (webhooks/keys/agents/audit/exports), settings clients, imports
  (connect/web), forms + widgets lists, nav-model, hooks
  (use-responses-api gained shared query/mutation option builders;
  use-list-selection rewritten — the rewrite also drops a stray NUL byte
  that made git treat the committed blob as binary); `semblia-api.ts` at
  its size budget → responses domain split to `lib/responses-api.ts`,
  re-exported so import sites are unchanged; api_v2 `consentGaps` →
  data-driven checks table, forms metrics + audit list where-builder
  extracted. One fix on review: `resolveActiveSource` had gained an
  explicit `| undefined` return the original inference never had, breaking
  tsc at the `useDirectImportDialogController` call. Gates: web_v2 tsc
  clean, eslint clean, vitest 56 files / 347 green; api_v2 tsc clean,
  lint 0 warnings, vitest 86 files / 774 green.
  **(CodeScene sweep)** `cs delta origin/main` reported 38 fixed / 9
  improved / 7 introduced. The three structural ones were fixed to 10.0 —
  `WebhooksClient` handlers into `useWebhookActions`, `WebhookEndpointRow`'s
  four mutually-exclusive dialog booleans into one state slot plus
  `EndpointConfirmations`, and `empty-state`'s six inline centred/compact
  ternaries into the `ALIGN`/`ERROR_SCALE` tables (classes unchanged). The
  other four are metric artifacts of modules that exist to format primitives
  and strings (`format.ts`, `normalize.ts`, `status-badge.tsx`) and are
  dispositioned, not contorted. Both hosted-gate hotspots cleared:
  `widget-list.tsx` 9.03 → 10.0 and `forms.service.ts` off the delta
  entirely, with zero Bumpy Road findings left.
  **(CodeRabbit sweep)** Local run scoped to `3d6e0405` returned 11 findings
  over 60 files; 10 fixed, 1 dispositioned. The load-bearing ones:
  webhook secret rotation was the only one-time-secret reveal in the app
  \_not* guarded by `ConfirmCloseDialog`, so Escape or a scrim click destroyed
  a secret the API only stores hashed; `useMemberActions` shared one busy
  flag across every row, so acting on one member froze the whole list (now
  per-id via `usePendingIds`); `parseLocalDay` accepted `2026-02-31` and let
  `Date` roll it into March; `parsePage` accepted `Infinity` and decimals;
  the heatmap's total summed rows the grid refuses to draw; `useSearchDraft`
  never followed an externally changed `?q=`, so Back was undone by the stale
  draft pushing itself back; plus `aria-sort` on unwired sortable columns,
  the range-picker keeping a cancelled selection, and a links footer naming
  "these 3 links" then quoting one. Dispositioned: effect-driven page reset
  in `audit-client` — correct, and the established pattern app-wide.
  Regression checks added for the two that a boundary test catches
  (`tests/lib/analytics-range.test.ts`, per-row busy in the members suite);
  suite now 57 files / 357.
  **(rendered verification)** Chrome extension offline again, so the
  Playwright harness drove it. Deep routes 404'd until `.next` was deleted —
  the gate's production `turbo build` had written it and `pnpm dev` started
  on top (the known corrupt-`.next` failure mode; it cost a full
  false-diagnosis cycle, so clear `.next` before trusting a 404 after any
  gate run). After that: members, webhooks (centred `EmptyState`, ghost
  preview + dot-paper intact), analytics (start-aligned empty inside the
  chart card) all correct, which is what proves the `ALIGN`/`EMPTY_LAYOUT`
  tables render identically. The range-picker fix was exercised end to end —
  a real July 30–Aug 3 selection, cancelled via Back, reopens with 0
  selected cells.
  **(PR #53 driven back to mergeable)** `pr:gate:local blockers=0` on the
  clean tree before pushing, required check "Test, build, and coverage"
  green on the new head, both CodeQL jobs green, hosted CodeRabbit SKIP at
  264 files > 100 (answered by the scoped local RUN/PASS), CodeScene hosted
  still advisory-red with exactly the 3 dispositioned metric findings —
  batch-dispositioned in a PR comment and resolved via `resolveReviewThread`.
  `pr:gate:hosted blockers=0 warnings=4` (all advisory), GitHub `UNSTABLE` +
  `MERGEABLE`, zero unresolved threads, branch 0 behind `main`. Merging is
  the user's call.
- 2026-08-02 (late) — **REVIEW FLOW + PALETTE PASS** on
  `feat/internal-ui-rework-2026-07` (continues PR #53); canon in
  `docs/ui-rework/2026-08-02-review-and-palette/` (decision, after). The
  user's verdict: dark theme too warm (light fine), billing spacing bug,
  approval/moderation screens confusing, too much hand-holding copy, and
  Responses should be list → detail with form/source filters and rating
  sort. Delivered, one commit per phase: **(palette)** dark mode moved off
  warm hue 55–70 to neutral graphite (hue 255, chroma ≤ 0.006) in
  `globals.css` only — brand amber, semantics, light mode untouched.
  **(billing)** Usage + Plans unbounded Sections joined the settings
  gutter (`px-4 py-6 sm:px-6` + hairline); start-aligned `EmptyState`
  py-10 → py-4 app-wide. **(responses)** split-pane deleted; full-width
  queue with status pills + form select (only when >1 form) + source
  select (FORM/IMPORT) + sort (newest/oldest/rating_desc/rating_asc) +
  search, rows navigate to NEW `/[slug]/responses/[id]` (route +
  `responsePath` + section `error.tsx`); detail = left author rail
  (identity, consent verdict+matrix, provenance, automated check) and a
  wider reading column with the decision bar; mobile leads with the quote;
  A/R/Esc wired; `response-record.tsx` deleted, tests retargeted to
  exported AuthorRail/Testimonial/DecisionBar pieces; api_v2 responses
  list gained `formId` + `origin` filters (dto+service+regression test);
  web client/hooks extended (`useResponse`, detail query key).
  **(copy)** moderation verdict's "You decided…" paragraphs deleted
  ("Advisory only" carries it); 16 product-lecture descriptions trimmed
  across developers/forms/projects/analytics/settings; security and
  destructive-consequence copy kept. Verified via Playwright harness:
  list/detail/billing light+dark 1440, mobile 390, URL-driven filters hit
  the live API (`source=import&sort=rating_asc` returns imports sorted
  ascending). Gates: web tsc/eslint clean, web_v2 vitest 56 files / 347
  tests green, api_v2 responses module 24 green, api_v2 + web_v2 builds
  green, review:local PASS ×2 (scoped to `ba8ecb15`, 10 minor findings
  triaged — 9 fixed, 1 bogus future-date claim skipped). **Iteration 2**
  (`c472535a`+`4ad860e9`): user rejected the first detail page against
  the Senja reference — rebuilt (identity hero + DefinitionList rail,
  question-headed tinted answer panels, one-sentence consent with matrix
  behind a disclosure, decision bar docked in the reading column, Copy
  text on approved), then adversarially critiqued by a three-lens agent
  panel (reference/canon/visual-QA) and re-verified; details in
  `docs/ui-rework/2026-08-02-review-and-palette/after.md`.
- 2026-08-02 — **COLLECTION IA PASS** on `feat/internal-ui-rework-2026-07`
  (continues PR #53); canon in `docs/ui-rework/2026-08-02-collection-ia/`
  (principles P1–P10 from the four Senja reference captures, decision,
  after). The user rejected the 2026-08-01 state: references not applied,
  imports must leave the Responses section, import/integrations UI carries
  too much cognitive load. Delivered: **(sitemap)** `/[slug]/import` is a
  top-level section between Forms and Responses (`importPath` + five method
  builders; `responsesImportPath` deleted; 308 from `/responses/import`;
  Responses loses its nav children and renders as a plain link again).
  **(import, method-first)** the 56-tile catalog page is deleted; the
  landing asks "how?" with five method rows and a recent-imports band; each
  method is its own page — `connect` (providers with real availability,
  shared OAuth caveat hoisted above the list), `web` (source detected from
  the pasted URL's host via `publicHosts`/suffixes, select stays for
  correction, submit gated until a source is committed), `spreadsheet`,
  `manual` (13 "Manual only" platform tiles → one optional "Where is this
  from?" attribution select), `migrate`. Existing controllers reused; the
  scrimless pseudo-dialog that replaced the page body is gone. Old flow
  pieces live in `direct-import-form.tsx`; `import-center.tsx` and
  `direct-import-dialog.tsx` deleted. **(forms)** list view default, row
  preview h-20 w-32 (16:10; skeleton + widget row in lockstep), card gains
  the views·responses·rate strip. **(responses)** rows lead with an
  initials avatar carrying the lifecycle dot on its corner (checkbox swaps
  in on hover/select); the record column renders only while rows exist —
  the empty queue speaks with one voice at full width, which also removed
  the duplicated error surface in the old placeholder. **(integrations)**
  no change; the 2026-08-01 picker restructure already answered the
  complaint — verified by screenshot and dispositioned in the after doc.
  **(sweep)** webhooks/keys/exports/activity, account
  profile/security/notifications, settings general/social/domains/security/
  danger all screenshot-reviewed; three non-blocking notes recorded in
  after.md (webhooks dual CTA, notifications' contained inbox card, hosts
  double-seed data showing two default collection pages — known backend
  defect). Verified via the Playwright harness end-to-end: 7 manual imports
  seeded through the real UI → worker → pending queue; light+dark 1440,
  mobile 390; legacy redirect exercised in-browser. Gates: tsc clean,
  eslint clean, vitest 55 files / 343 tests green (import suites ported to
  the new composition by a subagent, orchestrator-reviewed), build green.
  `update-indexes.py` still unavailable in this environment (no python/
  chromadb) — indexes stale for these diffs. Senja's customer entity page
  recorded in `open-questions.md` as a product decision, not built.
- 2026-08-01 — **STRUCTURE-AND-SURFACES PASS** on
  `feat/internal-ui-rework-2026-07` (continues PR #53). The user's critique:
  grid system inconsistent, settings width-constrained, developer separators
  floating, activity verbose, integrations a text wall, imports screen
  unreachable, analytics flat, widgets empty state weak, keys unstructured;
  Senja references for responses/forms rows; widgets → Social Proof Studio.
  Delivered, one commit per phase (`dab08a41`…): **P1** one full-bleed grid
  everywhere — `SettingsSection` rebuilt as a full-bleed section band
  (header/body in the app gutter, hairline edge-to-edge, footer band),
  `PageBody measure` + max-w-5xl deleted, ItemRow gutter unified
  `px-4 sm:px-6`, 8 settings clients + 3 account pages converted; **P5** keys
  page flattened to one list with kind filter pills + single New-key menu;
  **P2** integrations tile wall → "Add integration" picker dialog (blocked
  providers stated in place, one-sentence reason), page leads with the
  connection list; **P3** Import Center surfaced in the nav (Responses gains
  Queue/Import children), history band full-bleed; verified end-to-end
  against the running worker (manual import → job completed → pending in
  queue); **API slice** (Codex, reviewed): V2FormSummaryDTO.metrics
  (views/submissions/responseRate/lastSubmissionAt, batched groupBy) + audit
  actorId/credentialId/from/to filters; **P4** activity clusters same-actor
  bursts into expandable blocks (rolling 10-min window, display-only) +
  member/time selects riding the new params + action→icon map refreshed to
  the real vocabulary (response._, form._, import.\*); **P6** response record
  humanizes trustMode (raw enum leaked) and renders non-string answers
  (multi-select arrays were dropped); avatar-asset hydration deferred — needs
  an API GET for media; **P7** forms + widget list rows preview-led (live
  h-14 w-24 render, `ListSkeleton leading="preview"`), form rows carry
  views·responses·rate; **P8** widgets → **Social Proof Studio** at
  `/:slug/studio` (redirects for old + legacy addresses, nav "Studio" with
  seal-check icon, titles renamed, API paths + `widgets:view` key untouched)
  and the first run rebuilt as live mini renders of a wall + an embed from
  sample testimonials (EmptyKindPicker gains `preview`, card became
  role="button" — real buttons inside previews); **P9** analytics rebuilt as
  an instrument dashboard (Plausible-informed): per-tab fused hero (metric
  band + daily chart in one card; MetricRow `flush` + lone-fragment unwrap),
  AnalyticsPanel as bounded paper card in a 2-col instrument grid with
  `wide`, breakdown rows tinted by their share in the segment's own colour.
  Gates green: tsc, eslint 0 problems, 341 tests / 55 files, build web_v2 +
  api_v2, prettier pass folded. Visual light+dark verification via the
  Playwright harness on every phase.
- 2026-07-31 — **VISUAL-DEPTH PASS ("desk and paper")** on
  `feat/internal-ui-rework-2026-07`; canon in
  `docs/ui-rework/2026-07-27-internal-ui/2026-07-31-desk-and-paper.md`. The
  user refused the branch as flat/lifeless; the cause was a compressed surface
  staircase (all planes within 1.5% lightness) and a composition layer that
  never used the Measured Ink kit. Driven visually via a Playwright harness
  (Chrome ext offline; `%TEMP%/…/scratchpad/vv`, Clerk test login, 1440/390,
  light+dark). Delivered: warm-linen desk background (0.967) with white paper
  content and a deeper sidebar desk edge (0.956); amber active-nav wash + new
  `--brand-ink` token; outline buttons/filter pills as paper chips; project
  card recomposed left-anchored (badge under title); grid mount stagger;
  widget preview wells and page-owning empty states on the dot-paper
  workbench; blocked-by-plan CTAs as locked outline chips (washed disabled
  primary read as a bug — projects/forms/widgets/billing); `MetricRow` as one
  bordered instrument strip with larger values; funnel in brand amber
  (`Progress tone="brand"`); responses record column on `bg-card` with the
  split stretched to the viewport (PageBody needed `flex flex-col`);
  SettingsFooter sharing the `max-w-5xl` measure (two-right-edges defect).
  Gates green: tsc, eslint at ZERO warnings (the two standing warnings were
  computed-but-unwired props — the range-picker's `applyBlockedReason` now
  disables Apply with its reason in place, fixing a silent no-op click, and
  `copyLabel` reaches its button), 332 tests, `pnpm build --filter web_v2`.
  `update-indexes.py` unavailable in this environment (chromadb/graphify
  missing) — indexes stale for these diffs. Studios remain out of scope.
  **PR [#53](https://github.com/Semblia/semblia/pull/53) raised and driven to
  mergeable**: required check green, `pr:gate:local blockers=0`, CodeScene
  full-branch RUN/PASS locally (hosted advisory red, 73 metric threads batch-
  dispositioned + resolved), CodeRabbit SKIP at full scope (211 files > 150
  free-tier limit) with a RUN/PASS scoped to the visual pass (4 minor: 2 doc
  nits fixed, 2 dispositioned), `pr:gate:hosted blockers=0 warnings=4` (all
  advisory), merge state UNSTABLE = advisory-only red. Merging is the user's
  call.
- 2026-07-28 — **INTERNAL UI RESTRUCTURE** (`feat/internal-ui-rework-2026-07`;
  canon in `docs/ui-rework/2026-07-27-internal-ui/`: `principles.md` P1–P8,
  `decision.md` the rule set, `system.md` the primitive API, plus four
  primary-sourced research files and a mechanical defect census). User
  directive: the app shell was fixed last session, but page _interiors_ are a
  stock-ShadCN reskin — restructure them, one canonical system, no cards on
  cards, no unhandled empty states, no bad lists, every data state attended to,
  and build the moderation surface that exists in the backend but not the UI.
  **(the decision)** Geist's structural discipline applied over the locked
  Measured Ink tokens, with ShadCN kept strictly as the behaviour layer —
  Radix, focus management, ARIA wiring, keyboard semantics all untouched; the
  _composition_ layer above them is what gets replaced. Not a reskin: typeface,
  palette, full-bleed layout, and the signature motion kit stay locked.
  **(the root cause)** 152 hand-rolled `rounded-* + border` surfaces and four
  flagship surfaces (Responses, Analytics, Forms, Widgets) with **zero**
  query-error handling — every one rendered "you have nothing yet" when its API
  call failed. That is not four bugs; it is the predictable outcome of every
  page hand-writing its own `loading ? … : empty ? …` ladder.
  **(the primitive layer)** `components/shared` gains `DataState`/`useDataState`
  (owns the state union, derives it error-first, so _empty-while-isError is
  unrepresentable at a call site_; a failed refresh over loaded rows keeps the
  rows and says so inline), `ErrorState` (names the resource, no retry on a
  permanent failure, digest not response body), `DataList`/`ListSkeleton`/
  `GridSkeleton` (list semantics, skeleton rows matching the real row,
  pagination driven by the API's own envelope), `DataTable` (the column law),
  `DetailSheet` (non-modal inspector, focus return, arrow-key record walking),
  `useListSelection`/`BulkActionBar`/`SelectionCheckbox` (keyboard triage;
  Cmd-A scoped to what is listed, never the unfiltered set), `Section`/
  `SectionStack`/`DefinitionList` (grouping without a container), `StatusBadge`/
  `StatusDot` (one vocabulary, registries with readable enum fallbacks), and
  `MetricValue`/`MetricRow` (self-describing, click-through, known-0 ≠ unknown).
  `lib/format` gains one canonical time formatter plus `orDash`/`fmtRange`/
  `fmtRating`/`fmtDateTime`.
  **(moderation, the missing product)** The submission-moderation pipeline has
  scanned text/image/audio/video since Phase 6 and the UI showed none of it.
  Responses is now a real queue — keyboard triage, bulk actions that report
  partial failure honestly, URL-round-tripped filters and search that stay
  mounted during loading, pagination, and a non-modal detail sheet carrying the
  full answer set, the author's consent, provenance, and the automated verdict.
  The verdict is advisory throughout, strictest-decision-wins across artifacts,
  and a failed check reads as failed rather than as clean.
  **(one API change)** `V2ResponseDTO` gains `publishable` +
  `publishBlockedReason`. Publishing is hard-gated server-side on per-field
  consent, but the inbox offered "Feature" on every approved response, so
  withheld consent produced a 409 and a "try again" toast for an action that
  could never succeed. A client cannot derive this — the DTO nulls out the very
  fields whose consent is missing — so the verdict ships on the DTO and the
  control is disabled with its reason rendered in place.
  **(Import Center)** Restructured off the second in-page nav rail and the
  dialog-replaces-the-page-body pattern from PR #52.
  **(THE PASS WAS STOPPED MID-RUN AND REDONE — read this before continuing.)**
  The first half built the systems layer, then briefed eight agents with
  `decision.md` — a _rule set_ — and swept every remaining surface with it. The
  user stopped the session: "the UI is extremely poorly structured … visual
  hierarchy is broken all over … alignment, and layouts?" Every specific was
  right: content clustered left with a badge pinned 400px right and a void
  between, approve and reject as identical ghost buttons, a raw
  `<input type="checkbox">`, the record panel floating over the page's own
  header, 56 import sources as 56 rows with one sentence repeated eleven times.
  Root cause: "restructuring" was treated as state correctness and no rendered
  screen was ever judged; the visual research the user asked for was skipped in
  favour of a prior session's scraped design-system _documentation_. Rules
  produce correct and characterless — eight agents given only rules produced it
  eight times. The structural sweep is checkpointed at `7084ba25` and was NOT
  built on; the redo drove a browser over GitHub issues, Plausible, Linear, and
  Geist and wrote `visual-language.md` (V1–V8 + the five page archetypes), then
  rebuilt against it screenshotting and critiquing each surface.
  **(delivered in the redo)** No project dashboard — `/[project]` redirects to
  the queue, `ProjectOverview` deleted. Responses is a real two-column split
  (380px list + record, both in flow); row anatomy is status glyph left,
  metadata _under_ the title, hover/focus-revealed approve/reject overlaying the
  timestamp so rows never reflow (145px → ~98px); approve carries the fill and
  reject is quiet; `A`/`R` rule and advance before the mutation settles; Radix
  `Checkbox`. The record reads as a testimonial being judged — quote at reading
  size, attribution set the way it will appear once featured, consent matrix and
  provenance behind disclosures. Import Center and Integrations converged on one
  tile grid (import: ~5,600px of rows → four rows per group; repeated policy
  hoisted to its group). Three lying numbers fixed: approval rate 133.3%, a
  trend chart drawing a flat zero line and calling it data, a funnel splicing an
  em dash mid-sentence. Settings/account bodies bounded via `PageBody measure`
  at the page (not the section — that gave Billing two right edges); this is not
  the centred rail retired 2026-06-13. Grids capped at three columns for rich
  entities; widget previews centred in their frames; `SessionsList`'s stray
  `useQuery` moved behind a hook.
  **(gates)** web_v2 tsc clean, eslint clean (2 pre-existing warnings), 332
  tests green, `pnpm build --filter web_v2` green; api_v2 responses specs 23
  green. Browser-verified at 1440 and 390, light and dark.
  **(NOT done — see `after.md`)** Developers (webhooks/exports/activity/key
  detail), Account (profile/security/notifications), and the individual Settings
  pages carry the structural sweep but have NOT been visually reviewed; the
  Forms card is still thin; studios untouched; `7084ba25`'s output has not been
  re-read against `visual-language.md`. PR not yet raised.
- 2026-07-26 — **INBOUND IMPORTS + IMPORT CENTER PR READY** (PR
  [#52](https://github.com/Semblia/semblia/pull/52),
  `codex/inbound-imports`; reviewed code head `60a46267`). Delivered the
  project-scoped inbound platform end to end: manual proof; CSV/XLS/XLSX
  preview, mapping, private source cleanup, and async processing; constrained
  public URL and testimonial-wall migrations; official connected reads for X,
  LinkedIn, Google Business Profile, YouTube, and Google Play; server-held Vimeo
  plus constrained WordPress.com; six-hour recurring sources; provenance,
  dedupe, pending moderation, live project/org authorization fencing, bounded
  fetch/pagination, retry/heartbeat/reaping, and the complete Import Center UI.
  Final closeout fixed provider backoff/terminal outcomes, YouTube thread
  pagination, connected-resource cache reseeding, malformed Senja rating scales,
  and a production-safe concurrent partial identity index. Proof: canonical
  local gate `blockers=0` (api_v2 86 files/768 tests, web_v2 43/203,
  forms_runtime 6/72); database 7/7; disposable PostgreSQL 17 applied all 39
  migrations through `prisma migrate deploy`; hosted build/test/coverage and
  both CodeQL jobs passed; CodeScene result `7044434` passed; GitHub was
  `MERGEABLE` / `CLEAN`; unresolved review threads were zero; hosted gate
  `blockers=0`. Advisories only: the atomic E2E change is 128 files, and the
  final incremental CodeRabbit run disclosed a rate limit; the earlier full
  local review reported zero findings. Post-merge operator work is limited to
  provider app/scopes/approvals, optional `IMPORTS_VIMEO_ACCESS_TOKEN`, and
  non-production authorize/resource/sync lifecycle smoke tests.
- 2026-07-26 — **APP SHELL REFACTOR** (`feat/app-shell-refactor-2026-07`;
  canon in `docs/ui-rework/2026-07-26-app-shell/decision.md`). User directive:
  the sitemap restructure fixed URLs but the chrome on top was still layered
  and inconsistent — revamp the shell, everything on the top level, no
  gradients or glows, consistent internal navigation, a real layout refactor.
  Delivered: **(one rail)** `AppTopbar` + `AccountTopbar` + `ProjectSidebar` +
  `AccountSidebar` + `SettingsShell` rail + `DeveloperShell` rail + `SectionNav`
  - `MobileNavTrigger` + `BreadcrumbSlash` + dead `AppFooter`/`HelpFab` all
    DELETED, replaced by `components/nav/{nav-model.ts,app-sidebar.tsx,
app-shell.tsx}`. The sidebar is the app's only navigation surface: full
    viewport height, project switcher at the head, notifications/help/theme/user
    at the foot, and sections reveal their sub-destinations INLINE (disclosure)
    instead of handing off to a second vertical rail — so every top-level section
    is always visible and every sub-destination of the current section is one
    click away. Was 4 stacked pieces of nav chrome (2 competing rails) at
    `/[project]/settings/branding`; now 1. **(grouping rows expand, never
    navigate)** Developers and Settings are the only rows with children and
    neither is a real page (`/developers` only redirects to its first child;
    `/settings` IS the General child listed underneath), so they are
    `aria-expanded` disclosure buttons, not links — open by default when the
    current page is inside them, manual toggle wins until the route changes,
    sections independent. Collapsed panels are `inert` (a `0fr` grid row still
    leaves links tabbable); reuses the dead `.studio-collapse` CSS utility,
    renamed `.collapse-grid`. **(one shell)** the
    `(account-shell)` route group is gone — `/account/*` moved under `(app)` and
    renders the same `AppShell` (URLs unchanged); consistency is structural, not
    a convention. **(scroll model)** sidebar owns `h-svh`, content column is its
    own scroll container, so page chrome sticks to `top-0` and the `3.25rem`
    topbar offset hard-coded in `PageHeader`/`PageToolbar` is deleted from the
    codebase. **(sitemap)** `/[project]/developers` overview was link-cards-only
    (navigation rendered twice) → redirects to `developers/keys`;
    `/[project]/developers/docs` internal redirect deleted (sidebar links docs
    directly). **(bug found live)** child selection used first-prefix match, so
    `/settings` ("General") lit up on every settings page — now longest-match
    `activeChildHref`, with a regression test. **(crispness)** app-wide removal
    of gradients/glows: brand radial washes + 3D perspective card stack in the
    projects empty state, blurred hover shadows (`ItemShell`, `EmptyKindPicker`,
    project card/row, onboarding hero glow rings), `backdrop-blur` on page
    headers/toolbars/settings footer/modal overlays/studio floating bars (veil
    darkened 18%→34% light to keep separation), preview-crop fade overlays, the
    Parcel gradient swatch, and the analytics inset highlight. Kept deliberately:
    dot-paper texture, shimmer skeleton, hard 0-blur focus rings, media scrims.
    **(navigation consistency)** `lib/routes.ts` already said "never hand-build an
    internal href" but 14 call sites did — auth links, notification bell, brand
    mark, not-found, account index redirect, every post-sign-out `router.push`,
    and the two Clerk hand-off URLs (`redirectUrl`,
    `signUp/signInFallbackRedirectUrl`). All swept through the map; 4 missing
    builders added (`forgotPasswordPath`, `ssoCallbackPath`, `legalTermsPath`,
    `legalPrivacyPath`); `tests/auth-redirects.test.ts` rewritten from raw-source
    string matching to pinning the route values + asserting all 5 hand-off sites
    use builders.
    Gates green: web_v2 tsc + eslint + 33 files/146 tests + build;
    `pr:gate:local blockers=0`; `review:local` CodeRabbit PASS 0 findings.
    **CodeScene local CLI state corrected 2026-07-26:** `CS_ACCESS_TOKEN` IS set,
    but the `cs` binary is absent from the native PATH, from WSL, and from any
    install dir — the inverse of what the 2026-07-19 entry recorded. The wrapper
    probes `cs version` first, so it still reports `SKIP`, just for the other
    reason; reinstalling the binary is the only outstanding step. (CodeRabbit's
    CLI is still at `~/.local/bin/coderabbit` in WSL, so WSL itself is fine.)
    Live-verified via the Playwright harness (Chrome ext offline): projects home,
    forms, responses, analytics, widgets, settings/branding, settings/domains,
    developers/webhooks, account/billing, form studio — all 200, zero console
    errors, light + dark, 1440 + 390 wide; plus a driven disclosure pass (expand
    without navigating, two sections open at once, child nav keeps its section
    open, collapsed panels `inert` and keyboard-blocked).
- 2026-07-25 — **SITEMAP RESTRUCTURE** (`feat/sitemap-restructure-2026-07`).
  User directive: routes confusing/over-nested — remake the route map. The
  dashboard is now root-scoped (Vercel/GitHub pattern, research + decision
  canon in `docs/ui-rework/2026-07-25-sitemap/`): `/` = projects home (silent
  last-used redirect retired), `/new` = create, `/[project]/{forms,responses,
widgets,analytics,integrations,developers,settings}` with Integrations
  PROMOTED out of Developers, and jargon renames so URLs match labels
  (`audit`→`activity`, `hosts`→`domains`, `trust`→`security`). Max depth 5→4.
  Mechanics: `web_v2/lib/routes.ts` is the sitemap-as-code (all ~100 href
  literals across ~60 files now import it); `RESERVED_PROJECT_SLUGS` in
  `@workspace/types` enforced by api_v2 at project create AND rename (rename
  previously skipped reservation checks); permanent 308 redirects in
  `next.config.ts` cover every legacy `/projects/*` URL incl. renames; api_v2
  now issues new-shape notification links (old stored links covered by the
  redirects). Clerk sign-in fallback → `/` (local env updated; production
  Clerk/host env needs the same one-line change at deploy). Gates green:
  types build; api_v2 tsc+build+projects/responses specs 66/66 (new reserved-
  slug regression tests); web_v2 tsc+eslint+140/140 tests+build; indexes
  updated. Live-verified (Playwright harness, Chrome ext offline): 15
  surfaces + both studios at new deep routes, all 200 with zero console
  errors; 9 curl redirect cases + in-browser legacy redirect; sign-in lands
  on `/`. Local CodeRabbit review flagged the pre-existing 404 links to a
  nonexistent `/[slug]/responses/[id]` detail page — new-response
  notifications (api_v2) and the analytics content table now land on the
  responses inbox instead; a real detail/focus surface remains a follow-up.
- 2026-07-19 — **PR review-gate hardening** (`codex/pr-review-gates`, isolated
  worktree). Audited 236 review threads across PRs #38, #41–#45, and #48:
  CodeScene produced 170 (72%) metric comments, while substantive recurring
  defects clustered around trust/public projection, contract-source drift,
  async failure states, accessibility, operational fail-before-mutate behavior,
  and test realism. Added an evidence-backed agent checklist, a clean/fresh/diff/
  secret/workflow local policy gate, a hosted required-check/merge-state/thread
  auditor, and official CodeRabbit/CodeScene local-review wrappers. CodeRabbit
  CLI 0.6.5 is installed/authenticated in WSL; CodeScene CLI 1.0.33 was
  installed but honestly reported `SKIP` until `CS_ACCESS_TOKEN` was supplied
  (**superseded — see the 2026-07-26 entry: the token is now set but the `cs`
  binary is missing, so it still `SKIP`s for the opposite reason**). The PR
  workflow now disables checkout credential persistence, and `quality:check`
  follows CI's build-first order. Two completed local CodeRabbit reviews found
  eight contract/parser issues and one stale documentation URL; all nine were
  fixed, including strict agent NDJSON, actionable secret locations, YAML step
  boundaries, integer-only PR numbers, subprocess timeouts, and recoverable
  rate-limit classification. Hosted CodeRabbit then found an unbounded Git
  subprocess, and an independent final audit found reviewer-probe timeouts could
  be mislabeled as allowed skips; both were fixed with bounded execution and a
  test-first command-result classifier. Verification is green: 14/14 gate
  regressions, script/rule Prettier, `git diff --check`, 12/12 builds, 5/5
  lints, all workspace typechecks, 40 ops/gate tests, and 657 package/app tests
  (697 total). At close-out, PR #49 was `MERGEABLE` / `CLEAN` with every hosted
  check green, CodeScene approval, zero unresolved threads, and hosted gate
  `blockers=0`; CodeRabbit's final incremental summary was rate-limited after
  its substantive review, so that historical skip remains one informational
  warning. No production, DNS, provider, or deployment state was changed.
- 2026-07-19 — **Project-subdomain hosting staged closeout**
  (`codex/subdomain-hosting`): the expand-only host behavior now has a
  credential-free strict verifier and an approval-gated activation/rollback
  runbook. Semblia-managed forms/walls labels derive from the project slug only
  at creation; the API-issued hosts are then immutable across rename/slug
  changes, retained disabled tombstones are never reusable, and the current
  mutable slug is not hostname authority. No contract migration,
  provider/DNS/cloud mutation, public-host activation, generated-client URL
  switch, or new domain purchase is included. Production activation remains an
  explicit user-owned next step.

  Compiled Nest startup gaps are fixed by `c82e992e` (optional observability
  writer token) and `0d08eac5` (optional runtime clock token). Final smoke also
  found and closed two runtime-delivery gaps: `forms_runtime` now adapts the real
  resolver `resourceType`/`resourceId`/`project.id` envelope into the approved
  temporary `projectId` bridge while rejecting inconsistent ownership, and its
  Node ESM bundles receive `createRequire`; the build imports Lambda, starts and
  probes the emitted local bundle, and rejects a browser bundle containing the
  React development runtime. `web_v2` returns an opaque private/no-store `404`
  for exact `walls.semblia.com` before Clerk and applies private/no-store to
  successful tenant rewrites.

  Verification used direct `pnpm.cmd` 11.1.3: types 1 file/14 tests; api_v2 71
  files/552 tests; forms_runtime 6 files/70 tests plus typecheck, lint, emitted
  Lambda/local/browser builds and bundle startup smoke; web_v2 34 files/143
  tests plus lint and optimized Next 16.2.6 build. Mock CDK synth passed;
  source/spec inspection proves API mode uses a same-region Secrets Manager ARN,
  exact+wildcard aliases, viewer-host cache isolation, viewer trust-header
  stripping, and no raw-secret CDK context.

  A fresh disposable PostgreSQL 17 run applied all 33 migrations through
  `20260714000000_project_subdomain_hosting_expand`; the contract directory was
  absent. Its nine-project fixture reserved `conflict.forms.semblia.com` through
  a separate retired, `DISABLED` row. Before and after both dry-runs, hosts
  remained 13 with digest `1a3f68dfeccaad44074696c53116abd3` and widgets
  remained 4 with digest `b0e9b6b0c07ee6a69be6fd686ce2c7fd`; each dry-run
  reported `changed=0`. Apply 1 reported `changed=7`; apply 2 reported
  `changed=0`, with both post-apply snapshots at 17 hosts
  (`3d542bd17b4d7d7414c69b7898ff636c`) and 4 widgets
  (`1517ecacc1b41685a629c86d92c0c2e7`). Each CLI invocation exited 1 only
  because intentional reserved/external fixtures produced
  `manualResolutionRequired=2`.

  The final disposable production-artifact smoke passed the strict verifier for
  alpha/beta same-slug isolation, beta-only hostile form rejection, exact-host
  compatibility, wildcard `projectId` non-authority, unknown/exact/internal
  opaque `404`s, forms noindex/security/no-cookie headers, and wall
  no-store/canonical/Open Graph/JSON-LD/robots/sitemap behavior. A headed fresh
  browser navigated alpha then beta for forms and walls with distinct content,
  correct metadata, zero Clerk resources/cookies, and no console/page errors;
  one synthetic form submission completed through the browser and signed API
  path with upstream `201`. The vector refresh indexed 6 changed files and now
  contains 1,912 chunks; both its incremental graph phase and the dedicated
  graph rebuild remain blocked exactly by `No existing graph manifest. Run
/graphify first to build the initial graph.` Disposable listeners,
  PostgreSQL/Redis containers, volume, network, generated Clerk state, and
  temporary evidence were removed; the pre-existing listeners on 3002, 3007,
  and 8100 remained intact.

  Post-PR review was completed locally because the hosted CodeRabbit run skipped
  the 116-file change cap. Its six persisted findings were all dispositioned:
  the verifier now proves caller-owned marker isolation with positive beta
  controls; `isPrimaryWall` is non-null in both schema and migration; Prisma
  fails fast without `DATABASE_URL` in production while retaining the local
  fallback; P2002 mocks use Prisma's array-shaped target; legacy hosts are
  classified after normalization; and the upload report/continuity wording now
  describes the rebuilt runtime rather than the superseded forms-v4 client. A
  light follow-up review found one shell-glob portability issue, removed by
  using the Node test runner without the Vitest exclude. Review-fix gates passed:
  database generate/build/typecheck plus 4/4 tests, focused api_v2 2 files/50
  tests plus typecheck/lint, PowerShell parse, strict marker host-matrix smoke,
  fresh PostgreSQL 33-migration proof (`isPrimaryWall=NO|false`), and
  `git diff --check`.

- 2026-07-17 (late) — **TEMPLATE REFINEMENT PASS** (same branch, PR #45;
  commits `332b9bd0` → HEAD). User re-review: "still looks unrefined, the
  overflows still exist … skipped the visual research step … templates
  aren't changed … give token control (corner radius etc.)". Delivered:
  **(research)** live-browser workflow walkthroughs of Senja (wall + collect
  measured), Testimonial.to, Tally + its Senja-powered wall, Famewall/
  Shoutout (anti-pattern list), Trustmary/Trustpilot/Elfsight → canon in
  `docs/ui-rework/2026-07-17-template-refinement/research.md` + per-pack
  briefs in `specs.md`. **(tuning)** owner Finish layer: `tuning`
  {radius 0–4, density, surfaceStyle; null = template default} on BOTH docs,
  `applyThemeTuning` in brand-theme applied at forms `compileTemplate`,
  widgets `publishWidgetDefinition`, api mirror columns; shared
  `FinishSection` in forms Brand tab + widgets Style tab; additive/
  fall-forward, live-verified in both studios. **(overflows)** fixed-height
  studio frames now scroll internally like real viewports (was silent
  mid-element clipping — the reported overflow); switch-row "bleeders" were
  probe false positives (focus-halo pseudos). **(widgets re-cut)** SVG amber
  stars in one fixed slot (omitted unrated), per-name pastel initials
  avatars, Senja-order chip anatomy, numeral-first aggregate masthead,
  quote clamps everywhere, Tally-wall mosaic geometry, gallery double-mat,
  editorial accent ticks + dateline, wider marquee edge masks, detached
  attribution pill. **(forms re-cut, 5 parallel agents)** Meridian composed
  brand pane w/ numbered guidance prompts + first-fold centering; Aperture
  spotlight cone + cue numbers + ring inputs + hero recorder w/ reassurance;
  Ledger balanced letter + ruled-paper testimonial lines + letterpress
  button + folio; Parcel receipt device (dotted leaders, honest time lines,
  VERIFIED WORDS stamp) + star-first soft panel; Terminal session window
  (title bar, dotted progress, pressable keycap stars) replacing the
  infinite grid. Gates: brand-theme 6, forms-core 77, widgets-core 40,
  forms-renderer 21, forms_runtime 24, api_v2 446, web_v2 93 all green;
  web eslint clean; live screenshots of all 15 template surfaces + public
  wall (1440/390, zero overflow, zero console errors).

- 2026-07-17 — **PRODUCT POLISH PASS on template system v2** (same branch
  `feat/template-system-v2-2026-07`, pushed to PR #45; plan
  `docs/plans/2026-07-17-template-system-v2-product-polish.md`; 8 commits
  `dfcd5100` → `4a29df78` + docs). User review verdict: right direction, not
  yet a product — 13 feedback items, all shipped. **(contracts)**
  `FormDefinitionDoc.delivery: hosted|embed` (additive; embed = constrained
  product: no upload/capture types, EMBED_MAX_FIELDS=6 ask cap in new
  `forms-core/delivery.ts`, publish gate 422, seeded fit at create; no DB
  column — doc+snapshot carry it); intent now mutable (saveDraft mirrors
  `draft.intent` → `Form.intent`, fixing the known drift); protection/
  consent/anonymity are platform-owned (no studio UI; captcha default →
  `suspicious`; consent field type left the palette + outline, still seeded/
  rendered/validated). **(studios)** content lives LEFT, design RIGHT:
  `StudioFrame.override` → `outlineOverride` (left rail swaps to
  field/Header/Ending editors, per-field Logic sections replace the Setup
  rules list; right = Template·Brand·Setup where Setup = form type +
  delivery + attribution + embed snippet); widgets gain a left content rail
  (right = Layout·Style); StudioCanvas learns `fitHeight` (embed frames hug
  content — no internal scroll; fit zoom width-only w/ measured wrapper);
  embed-delivery forms preview inside HostPageChrome everywhere (canvas,
  preview route, create gallery — the hosted/embed dock toggle died);
  renderer `mode:"showcase"` makes every preview display-only (inert fields
  via data-tf-mode CSS, free step nav, success moment on demand).
  **(widgets)** embeds NEVER render headings (masthead wall-only; h2-on-embed
  branch dead) and never paint scope background (transparent on host page;
  cards/frames still paint); the five worlds re-cut: marquee constant-speed
  rails (per-rail `--sw-glide-dur`) + hover lift, gallery = framed work w/
  plaque BELOW the frame, mosaic = provenance-first feed (ratings demoted to
  muted footer stars), column = serif praise column (ch-measure, centered
  short separators), editorial = newspaper fold (double rule) + nameplate
  wall masthead; per-template masthead flavors; cqw everywhere.
  **(recorder + uploads)** MediaCaptureControl = real getUserMedia/
  MediaRecorder recorder (live preview, cap auto-stop, playback, re-record,
  upload fallback); upload answers previously stored NAMES and no bytes ever
  uploaded — controller now carries Files on the payload, browser.ts
  presigns+PUTs and rewrites answers to asset ids; collectUploadAssetIds
  gains video/audio; runtime permissions-policy now allows camera/mic (self)
  on hosted (was blanket-blocked) + media-src blob:. **(embeds work)**
  /embed/:slug = hydrated transparent document (first-party submit inside
  the host's iframe; height postMessage); /embed.js = real `<semblia-form>`
  iframe loader; formEmbedSnippet + copy in Setup; /f serves hosted-delivery
  only, /embed embed-only; textareas app-wide non-resizable (2 chokepoints).
  Gates green: forms-core 77, forms-renderer 21, widgets-core 20(src),
  forms_runtime 24, api_v2 tsc+lint+446, web_v2 tsc+full-lint+93, turbo
  build 12/12, indexes updated. **Live-verified** (Playwright harness;
  Chrome ext offline): forms studio left-rail field editor w/ Logic + stable
  right inspector, Setup form-type/delivery, consent hidden, no dock toggle;
  widget studio content rail + fit-height embed canvas in host chrome w/
  single heading; /wall/wall-of-love Editorial nameplate + lead + deck; zero
  console errors. Deferred: shadow-DOM loader.js (Phase 8), forms_runtime
  live-stack smoke (unit-covered), video transcode, media derivative serving
  (pre-existing).

- 2026-07-14 — **TEMPLATE SYSTEM v2 — per-surface worlds**
  (`feat/template-system-v2-2026-07`, seeded from the CLOSED PR #44 branch +
  merged `main`; PR pending). PR #44 was REJECTED: every template rendered the
  same centered card with commodity controls (personality = paint, not
  composition) and hosted/embed rendered identically. This pass started from
  live Chrome research (Senja collect + wall, a live Typeform, Tally, VideoAsk,
  Stripe Checkout, Supabase wall, Resend; conversion grounding: multi-step
  +86–300%, time honesty, control reassurance, star-first triviality, curation
  leads volume; artifacts in `docs/ui-rework/2026-07-14-template-system-v2/`).
  Shipped: **(contract)** `FormRendererProps.surface: hosted|embed` →
  `data-tf-surface` + per-surface pack compositions; packs size against
  `--tf-viewport` (fallback `100svh`) so previews can bind the frame;
  widgets `RenderWidgetOptions.surface: embed|wall` replaces `omitWallHead`;
  per-template widget item markup (shared `renderCard` deleted). **(form
  packs, all rebuilt)** Meridian = split-pane conversation (sticky brand pane
  w/ trust ledger; baseline-rule typographic inputs; embeds get an earned
  card); Aperture = full-viewport dark stage (film-strip progress, cue-card
  prompts, floating pill options, haloed record pill; embed = portrait stage
  panel); Ledger = paper letter on a desk (serif masthead, `No. 01` manuscript
  numbering, writing-line/ruled inputs, letter keycap chips, `Page n of m`,
  signature moment; embed = ribbon-ruled sheet); Parcel = commerce split
  (dashed receipt of the exchange, star-first hero act, polaroid upload,
  rubber-stamp thank-you; embed = one receipt card); Terminal = session
  transcript (mono bar `~/slug [n/m]`, answered asks accumulate as dimmed log
  lines, digit-keycap select w/ real keydown handling, `↵ continue` hints,
  log-line moments). **(widget packs)** Marquee = counter-scrolling rails w/
  edge-fade masks + seamless dup segments (hover pause, reduced-motion +
  autoRotate=off → static scroll); Gallery = plaque tiles (small-caps
  attribution under hairlines, featured 2× lead); Mosaic = authentic-feed
  masonry (embeds cap w/ bottom fade); Column = serif praise column (hanging
  quote marks, signature lines; accents now `flourish`); Editorial = front
  page (lead-story display quote + newspaper deck; accents now `edition`).
  Wall surface renders a template-owned masthead (h1 + subhead + avg-rating/
  count stats); `/wall/:slug` hands its hero to the fragment (page keeps
  metadata/JSON-LD/shell + project eyebrow). **(studio)** FormCanvas renders
  hosted full-bleed with a Page|Embed dock toggle (`--tf-viewport` bound to
  the device frame's px height); preview route ships the hosted page unframed
  (+ `?surface=embed`); widget canvas/preview use wall-surface parity by kind.
  **(fixes found live)** stored v1-era `publishedSnapshot`/draft docs crashed
  every consumer — `composePublishedWidgetDoc` + api `snapshotFromWidget`
  now safeParse-and-fall-forward to a fresh publish, `syncStudioConfig`
  migrates stored docs (one chokepoint), widget-studio persist bumped v3→4
  with converting/dropping migration; the API exception filter now LOGS masked
  500s (they were silent). Gates green: forms-core 72, forms-renderer 21,
  widgets-core 38, api_v2 widgets+filter 38; tsc/lint clean; builds web_v2 +
  api_v2 + forms_runtime 9/9; indexes updated. **Live-verified in Chrome**
  (test user via Clerk BAPI sign-in token; membership + 8 FormResponses
  seeded — StoredAnswer[] shape keyed to the published version's field ids):
  all 5 form templates render as distinct worlds in the studio, Page/Embed
  toggle, Terminal transcript + digit keys advance live, preview route
  full-bleed; all 5 widget templates against real+curated items; wall widget
  created via UI → published → `/wall/wall-of-love` serves the Editorial
  front page with the 8 real responses (masthead stats `4.8 · 8 stories`);
  public embed fragment endpoint serves real chips w/ `data-sw-surface`.
  Deferred (pre-existing): forms-embed loader remains Phase-8 stub; media
  derivative serving; video transcode.

- 2026-07-13 — **TEMPLATE SYSTEM REBUILD** (`feat/template-system-rebuild-2026-07`,
  commits `bc60e0fd` → `344723db`, PR pending). User goal: rebuild (not refine)
  forms + widgets — kill the granular-builder posture for a **white-label
  template system**: finite, art-directed templates, each a self-contained
  design project. Research-first (respondent psychology, per-niche feedback
  rituals, Framer template quality bar, white-label requirements) — artifacts in
  `docs/ui-rework/2026-07-13-forms-widgets-template-rebuild/` (before/research/
  principles P1–P10/decision) + plan `docs/plans/2026-07-13-template-system-rebuild.md`.
  Shipped: **(forms-core v6)** `FormDefinitionDoc` = `templateId` + `brand`
  facts + finite per-template `accents` + declared asset slots; layoutPreset +
  9-knob design + flow pacing knobs DELETED; template manifests/registry in
  `forms-core/src/templates.ts`; pre-v6 docs project lossily onto the intent's
  default template; new `videoUpload`/`audioUpload` field types (capture-hinted,
  duration caps). **(forms-renderer)** five template packs each owning
  composition/motion/loader/success moment: Meridian (quiet card), Aperture
  (dark video stage, record-or-write moment), Ledger (editorial letter — answers
  settle into prose), Parcel (star-first commerce, product hero slot), Terminal
  (keyboard-first grid-paper instrument); LayoutShell + knob CSS deleted;
  controller pacing is template-owned (identity clustering, record-or-write
  pairing, auto threshold); brand-theme now clamps accent vs page background
  (WCAG 1.4.11) enforced by a 35-combo contrast CI gate. **(studio v3)**
  inspector = Template · Brand · Content · Setup; Style panel + looks.ts
  deleted; creation = intent × template with live real-renderer previews,
  project brand color + name stamped on the first draft. **(widgets v2)**
  WidgetDefinitionDoc drops layout×variant + raw 9-knob theme for templateId +
  brand + accents; packs Marquee/Gallery/Mosaic/Column/Editorial in
  widgets-core; v1 + legacy flat configs migrate forward; publish derives via
  the template recipe ("widgets-v2"); widget studio Template/Brand sections
  replace the appearance knob wall; creation collapses layout+style into one
  template pick. **(media pipeline)** new api_v2 `media-optimize` BullMQ
  worker: sharp WebP width tiers (320/640/1280/2560) on asset activation,
  derivatives recorded on `MediaAsset.derivatives` (+`optimizedAt`, additive
  migration `20260713000000`), enqueued from confirmUpload + public-submit
  activation; video/audio pass through behind the same seam (transcode = named
  follow-up). Gates green: forms-core 72/72, forms-renderer 20/20, widgets-core
  30/30, brand-theme 6/6, api_v2 445/445 + lint + tsc, forms_runtime 22/22,
  web_v2 tsc + eslint + vitest 93/93 + build 6/6, indexes updated (AST).
  **NOT yet done:** live in-browser visual verification of the five form
  templates + widget templates (needs full stack; flagged for next session),
  embed loader completion (Phase-8 stub, unchanged), serving-side adoption of
  media derivatives in widget fragments/DTOs (`bestDerivativeKey` helper is
  ready), Atrium/hospitality + additional roster templates. Build gotcha: turbo
  resolves `C:\nvm4w\nodejs\pnpm.cmd` (11.5.1) over the pinned 11.1.3 — prefix
  `PATH="/c/Users/anubhab/AppData/Local/pnpm:$PATH"` when turbo builds fail on
  the version check.

- 2026-07-12 — **Production-spine recovery** (`codex/production-spine-recovery`,
  based on clean `main` at `79dd7af8`; zero open PRs at discovery). Added a
  secret-redacting production-env preflight, immutable API image, explicit
  migration/API/worker/backup Compose services, backup-first deploy and
  schema-safe rollback scripts, an operator runbook, automated public/API/
  container smoke verification, and a manual-only protected GitHub production
  release workflow. The workflow uses SHA-tagged GHCR images, Vercel's
  prebuilt production flow, pinned SSH host keys, and a required
  `DEPLOY_PRODUCTION` confirmation; it has not been dispatched. A production
  string-boolean defect found by the container preflight was fixed with Zod
  `stringbool()` and a regression test. Final image smoke also closed two
  preflight gaps: the standalone worker smoke now supplies isolated test URLs,
  and production validation requires the S3 variables the runtime constructor
  needs. Widget Studio draft hydration, save, and publish are server-backed
  through `useWidgetDraft`,
  `useSaveWidgetDraft`, and `usePublishWidgetDraft`; the old local-only/direct-
  navigation warning is retired. First production execution, provider setup,
  and DNS changes remain explicit user-approved external work.
- 2026-07-12T00:32:04+05:30 — **Fresh public-host observation:**
  `app.semblia.com` resolved to Vercel but returned HTTP 404 with
  `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`; `semblia.com`, `api.semblia.com`,
  `forms.semblia.com`, and `admin.semblia.com` had no A/AAAA/CNAME answer and
  could not establish HTTPS. This supersedes older historical live-check
  entries; no production DNS or deployment state was changed during recovery.

- 2026-07-11 — **Design-language pass — "Quiet Precision v2 · Measured Ink"**
  (`feat/design-language-2026-07`). User goal: the system read as well-groomed
  default shadcn; make it cohesive + recognizable without losing calm/warm/
  accessible. Research-first (Linear/Geist/Stripe/Attio + Emil Kowalski motion
  framework; user's dither/dot-matrix idea adopted as _drafting paper_, rejected
  as dither/terminal). Artifacts: `docs/ui-rework/2026-07-11-design-language/`
  (before/principles L1–L10/decision/after); canon added to `.impeccable.md`
  (7-rule signature kit). Shipped: **(foundations)** motion tokens 120/160/240ms
  - `--ease-standard`/`--ease-exit`, ~20 per-surface keyframes collapsed onto
    `ink-fade/rise/drop/slide/pop` (class names kept, exits faster than enters),
    amber focus `--ring` (4.9:1 light / 8.7:1 dark), `bg-dot-grid`, `ink-raised`,
    `ink-veil`, `spinner-dot`; **(primitives)** all overlays drop `zoom-in-95`
    for fade+rise-from-trigger (150ms in / 100ms out), dialogs settle from 8px
    rise w/ ink-veil backdrops, primary Button = ink-raised + hover tint,
    Spinner = dot-matrix triad, Skeleton = shimmer (pulse banned), tabs underline
    draws in, checkbox pops, focus halos normalized to `ring-ring/30`, Empty sits
    on dot-grid; **(sweep)** five hand-rolled loader dialects → shared Spinner
    (auth svg ×2, 4× border-spinner divs in studios/previews, avatar+media
    uploads, share drawer, refreshing badge), PageTabs/SectionNav/FilterPills/
    welcome-rail easings → tokens, `/design` duration table updated. Radix
    semantics/keyboard/DOM untouched. Gates green: tsc, eslint, vitest 93/93,
    build 6/6, update-indexes (AST). Live-verified in Chrome (dark+light):
    projects, forms list, responses empty state, form studio (outline/canvas/
    inspector/zoom dropdown), theme menu, amber focus ring visible, zero console
    errors. PR opened from `feat/design-language-2026-07`.

- 2026-07-10 — **Studios rebuild — PR #41 review response**: fixed the nested-`<button>`
  hydration error on the forms listing (FormPreviewLauncher → `div[role=button]`); Preview
  now AWAITS the draft save before the new tab navigates (shared in-flight save promise in
  both shells + popup-safe open in StudioTopbar); mobile field-select reveals the inspector
  panel (Codex P2); draft-fetch errors get real error states w/ retry in both preview routes;
  FormCanvas scheme follows `doc.design.mode` w/ manual dock override; PanelSection collapsed
  body is `inert`; StudioFrame dropped false `role=dialog`; keyboard guards (⌘D/⌘⌫ no longer
  mutate fields); Segmented/IconSegment merged, Bg glyphs merged, shared `usePreviewQuery` +
  `useApprovedPreviewItems` + `widgetContentDark` dedups; CodeScene complexity extractions
  (useCanvasZoom/CanvasDock, Desktop/MobileLayout, useOutlineRowKeys/OutlineFieldRow,
  useDraftSnapshot, Preset/BrandSection, useIdleHide); docs aligned (290px, Layout·Style·
  Content, no auto-theme pulse). Gates green: tsc, eslint, build 6/6, vitest 93/93, indexes;
  live-verified in Chrome (hydration clean, mobile select, preview await, both studios).

- 2026-07-10 — **Studios rebuild** (`feat/studio-rebuild-2026-07`, commits `5c7aed6a` →
  `c8db3aad`). PR #40 ("guided five-section editors") was REJECTED — it reshuffled inspector
  content without changing the studio's bones. This pass rebuilt the bones after live research
  on Typeform/Tally/Figma/Senja/Framer (principles P1–P10 in
  `docs/ui-rework/2026-07-10-studios-rebuild/` — before.md, principles.md, decision.md,
  after.md). Shipped: **(shared)** compact monochrome control vocabulary in
  `components/studio/controls.tsx` (Row/IconSegment/GlyphTileGroup/PanelSection/Stepper;
  `OptionCardGroup` DELETED — was 44 uses/9 files), `StudioFrame` (outline left | canvas hero |
  290px inspector right w/ text tabs, mobile bottom bar), `StudioCanvas` (true device widths,
  transform-scale, visible zoom % + fit/25–200 dropdown, ctrl/cmd+wheel, `0`/`!` hotkeys,
  device+scheme dock), slim `StudioTopbar` (save whisper; Publish = only filled button),
  auto-hiding `PreviewChrome` pill; **(forms)** structure outline w/ field icons + move/dup/
  remove menu + palette, contextual field inspector (breadcrumb override), Content·Design·Flow
  tabs, canvas click-to-select; **(widgets)** Layout·Style·Content(±Wall)·Behavior tabs,
  presets as WidgetThemeSwatch miniatures, Content picker now lists REAL approved responses
  (fixed dormant hardcoded-empty bug); **(both)** true full-page preview ROUTES
  (`…/forms/[formId]/preview`, `…/widgets/[id]/preview`, `?device=&scheme=` deep-linkable,
  robots noindex, error.tsx). Save/publish/conflict machinery + compile paths untouched.
  Live verification fixed two real defects: shared ui/tooltip now self-provides
  TooltipProvider (bare Tooltip crashed the studio route), preview clients cover the (app)
  shell with `fixed inset-0 z-50`. Gate green: tsc, eslint, build 6/6, indexes updated
  (py -3.11). Verified live in Chrome: outline select, field editor, Design tab, presets,
  zoom/device/scheme dock, preview routes + query params + pill auto-hide, autosave whisper.
  Note: test widget "Untitled embed" draft was cycled Mono→Noir→Mono during verification, so
  it shows "Unpublished changes" (content identical to published).

- 2026-07-04 — **Forms + widgets + walls overhaul** (`feat/forms-widgets-walls-overhaul`,
  PR pending; plan `docs/plans/2026-07-04-forms-widgets-walls-overhaul.md`, phases P0–P8, one
  commit each). User goal: the feature set felt "immature and sluggish" — full-ownership pass.
  Shipped: **(P1)** preview perf — forms renderer no longer remounts per keystroke (structural
  key + deferred compile), widget fragment memoized on a deferred draft; **(P2)** the forms
  studio finally exposes the whole forms-core field system (add-field palette for all 14 types
  with role/privacy-correct seeds, duplicate, per-type settings: rating scale/style, select
  options editor, length bounds, upload constraints, hidden capture, publish/privacy toggles);
  **(P3)** conditional-rules visual builder + redirect success action + Protection group
  (captcha/min-time/honeypot/blocked words); **(P4)** canvas editing — click a field in the
  live preview to jump to its editor (forms-renderer stamps `data-tf-field`), shared
  `useStudioHotkeys` (digits→sections, ⌘⏎ publish, `?` help) + full keyboard field editing
  (arrows/Alt-arrows/Delete/D); **(P5)** creation galleries — form picker shows a real scaled
  FormRenderer of intent×look with curated "starting looks" (`lib/forms/looks.ts`, names
  mirror widget presets), widget picker gains a starting-style step for both kinds (applied as
  first server draft); **(P6)** widgets-core `layout.variant` (additive, no DB change; five
  variants: carousel/spotlight, grid/featured, masonry/dense, list/quotes, wall/editorial) +
  studio Variation picker + Slate/Forest presets (8 total); **(P7)** **the hosted wall page
  exists** — `/wall/:slug` in web_v2 (public via Clerk middleware allowlist, 60s ISR on the
  cached `/v2/walls` API), rendering the same widgets-core fragment embeds use inside a
  theme-derived shell (h1 hero via new `omitWallHead`, rating summary) with canonical/OG/
  robots-index-override metadata and Organization+AggregateRating+Review JSON-LD; the wall
  payload now carries `project` name/website (api_v2, additive). Wall URLs centralized
  (`wallUrl/wallLink/wallPath`). Gate green: web_v2 tsc + full eslint + build 6/6;
  forms-renderer 16, widgets-core 28, api_v2 widgets 30 tests. NOT verified live in-browser
  this session.

- 2026-06-30 — **API surface fitness pass** (`codex/api-surface-fitness`, commits
  `bf518730` -> `287e3221`). User goal: stop blind bug-fixing and move the API surface
  toward a measurable quality target. Benchmark used five 20-point layers: build/executable
  health, contract/route coverage, authz/trust boundaries, data/workflow correctness, and
  ops/dependency readiness. Final score: **95/100**, with zero open API-scoped P0/P1 findings
  and no layer below 18/20. Shipped real fixes for moderation telemetry and ops suppressed-run
  counts, account-default logo upload actor isolation, media/public-submit asset boundary
  coverage, health route contract coverage, stale billing webhook TODO cleanup, and API-relevant
  transitive dependency hardening. `pnpm audit --prod --json` still exits 1 for the monorepo,
  but parsed `apps__api_v2` advisory paths are 0; the remaining advisories are in `packages/ui`,
  `apps/admin`, `apps/web_v2`, and `packages/semblia-mcp-server`. Full report:
  `docs/api-surface-fitness-2026-06-30.md`.
  Verification passed with repo-pinned Corepack pnpm 11.1.3: `corepack.cmd pnpm --filter
@workspace/database generate`; `corepack.cmd pnpm --filter @workspace/database exec prisma
validate`; `corepack.cmd pnpm --filter @workspace/types build`; `corepack.cmd pnpm --filter
api_v2 typecheck`; `corepack.cmd pnpm --filter api_v2 lint`; `corepack.cmd pnpm --filter
api_v2 test` (65 files / 420 tests); `corepack.cmd pnpm build --filter api_v2` (6/6 tasks);
  `corepack.cmd pnpm --filter api_v2 smoke:worker`.

- 2026-06-23 (late) — **STUDIOS UNIFICATION** (revamp/v2, committed `7c7c4099` → `6e49e664`,
  8 clean per-phase commits). User goal: the forms + widgets studios still felt like "two
  passion projects," not one serious product. Approved a full unification + pipeline framing,
  benchmarked against Senja/Testimonial.to, Typeform/Tally/Fillout, Framer/Webflow (NOT
  Linear/Stripe — wanted a _visual editor_ feel, not a settings panel). Plan:
  `docs/plans/2026-06-23-studios-unification.md`. **Diagnosis (from code):** the two studios
  shared a vocabulary but not their bones — different skeletons (forms 2-pane vs widgets
  3-pane+sibling-rail), incompatible save models (forms server-autosave+publish vs widgets
  _local-only_ zustand, no publish), different inspector chrome + section taxonomies, forms
  Style was still text-dropdowns while widgets Style was visual pickers, and the widget preview
  showed fake demo data + a `MockProject` shim with a "deferred to Phase 2" comment in prod.
  **Key unblock:** the widget backend already existed (`PUT :widgetId/draft` + `…/draft/publish`
  in `widgets.controller`/`studio-drafts.service`), so this was ALL frontend (web_v2) — no Codex.
  **Shipped:** (1) shared `components/studio/{studio-shell,studio-rail,studio-topbar}.tsx` — one
  full-screen frame (desktop Topbar+Rail+Inspector+Preview-hero; mobile bottom-tabs), a vertical
  editor-grade section rail (replaces forms' tab strip + widgets' nav + the sibling rail), one
  topbar (back·name·status·autosave·help·Publish·Share). (2) Forms migrated onto the shell;
  `FormInspector`→`FormInspectorPanel`; new `form-style-panel.tsx` rebuilds the Design→**Style**
  panel as a real visual editor (layout cards, scheme cards, corner/density glyphs, mini buttons
  - fields in the live brand colour, background swatches, real type specimens — zero dropdowns).
    (3) Widget studio onto the shell + the SAME server lifecycle as forms: debounce-autosave to the
    StudioDraft (optimistic `version`; draft stored as the `WidgetDefinitionDoc` that the server's
    `migrateWidgetDoc` publish path expects; hydrate round-trips via `syncStudioConfig({name,
definition})`), a real Publish moment (`publishWidgetDraft` client + `usePublishWidgetDraft`),
    status reads Draft/Published/Unpublished-changes from `version` vs `publishedVersion`, name
    persists via `useUpdateWidget`. (4) Widget preview now renders REAL approved+published responses
    (`fetchResponses` + `useApprovedResponses` + defensive `response-to-testimonial` projection
    using the `usedInWidget` answer flag; curated fallback tops up). (5) Removed the `MockProject`
    shim; widget empty state frames the collect→display journey. (6) `/polish` pass aligned the two
    inspectors' inset + rhythm. Gate per phase: tsc + eslint + `update-indexes`; **`pnpm build
--filter web_v2` GREEN (6/6)**. **NOT yet done (flagged to user):** live in-browser visual
    verification (didn't risk a full stack/Playwright bringup autonomously).
  * **FOLLOW-ON (same session, committed `b6e1ae2f`+`ce5609d6`): built the missing Responses
    (Manage) inbox** — the pipeline's middle now exists. New `/projects/:slug/responses` route +
    `ResponsesList` (PageHeader + All/Pending/Approved/Featured filter over `ResponseRow`, composed
    from the verified `ItemRow`/`ItemActionRow` primitives) + moderation actions (Approve/Reject,
    Feature/Unpublish, Delete) wired to new clients (`updateResponseStatus`/`updateResponsePublish`/
    `deleteResponse`) + hooks (`useResponses`/`useUpdateResponseStatus`/`useUpdateResponsePublish`/
    `useDeleteResponse`). Nav now reads **Forms · Responses · Widgets · Analytics · …** so
    Collect→Manage→Display is legible. Build green (6/6); route registered.
  * **VISUALLY VERIFIED LIVE (2026-06-24).** Brought up the full stack (docker pg/redis + api_v2:8100 +
    web_v2:3002), provisioned a fresh DB (the api `.env` points at an empty `:5432/appdb`; `:5433` has
    no `appdb`): `prisma migrate deploy` + a provision script (billing plans + User
    `user_3F5aDohTUTmz8yBb5lzQdgjGFvX`=test+clerk_test, Project `northwind-studio`, OWNER membership) +
    the harness `seed.mjs` (5 forms + 5 widgets). **Gotcha:** SSR `[slug]` routes 404'd until I wiped
    `apps/web_v2/.next` (stale PROD build artifacts from my `pnpm build` runs conflicting with `next dev`
    — the documented `.next`-corruption gotcha; client API calls were 200 the whole time). After that,
    forms list, widgets list, responses inbox, **and both unified studios all render 200, zero console
    errors, light + dark.** Confirmed: the two studios read as ONE instrument (vertical rail · inspector ·
    hero preview · Publish topbar), forms Style is visual, widget preview shows testimonials on a real
    host page, nav reads Forms·Responses·Widgets. Screenshots sent to the user. STUDIOS GOAL: CLOSED.

- 2026-06-23 — **Studios/listings finish + two features** (revamp/v2, committed `1381b271` →
  `887f9343`). Verified live via a Playwright harness (claude-in-chrome was disconnected) at
  `~/.tresta-visual-verify` (auth.json reuses a Clerk test session; `snap.mjs`/`clicksnap.mjs`).
  Found `.next` was corrupt after the forms demolition — optional catch-all routes (`/sign-in`) 404'd;
  wiping `.next` fixed it. Shipped: (1) **real widget listing previews** — `WidgetLayoutPreview` now
  renders authored mini-testimonials (initials + names + short quotes) instead of skeleton gray bars;
  (2) **forms list-row thumbnails** — scaled `FormCardPreview` for list/card parity; removed the banned
  mono-uppercase project-name sidebar footer; (3) **studio webfont CSP fix** — allow
  `fonts.googleapis.com`/`fonts.gstatic.com` so previews render the theme's webfont-first stacks
  (runtime/embed still don't load them — follow-up for true production parity); (4) **Feature C —
  project-type-aware host page**: `HostPageChrome` rebuilt into 5 believable archetypes (saas · commerce
  · agency · learning · generic) from `V2ProjectType`, using brand accent + site favicon, replacing the
  generic mono placeholder; (5) **Feature B — website→favicon/metadata**: `Project.websiteUrl` already
  existed (no DB/API change), so web_v2-only — new SSRF-guarded `GET /api/site-metadata`, shared
  `ProjectAvatar` (logo→favicon→initials, object-contain) wired into card/row/sidebar/switcher, and the
  create flow reads the site (`useSiteMetadata`) to prefill brand colour + description + show a detected-
  site preview. Gate green: `pnpm build --filter web_v2` 6/6, full eslint, tsc, security-headers tests.
  Studios already had help (`StudioHelp`) + roving-tabindex keyboard nav + proportioned device frames +
  dark mode — verified, no overflow at narrow widths. Settings-side metadata prefill is a possible
  follow-up (favicon icon already updates from any websiteUrl source).

- 2026-06-22 — **Studios + listings finished-product polish** (revamp/v2, not yet committed). Forms +
  Widgets studios and their listing pages aligned to the design system; verified live in-browser
  (light/dark, desktop + narrow widths). Highlights: fixed a `fetchWidgets` DTO-shape bug — typed
  `V2WidgetListEntry[]` but the API returns `V2WidgetDTO[]` (`{entry,config}`); the list + studio-rail
  passed the whole DTO to `dtoToWidgetListEntry` so name/layout/theme/isActive/metrics fell back to
  defaults (blank names, "Grid/System/Paused", "undefined loads"). Now reads `dto.entry`. Forms listing
  gained a NEW card/grid view + ViewToggle with an intent-themed `FormCardPreview` + shared
  `FormStatusBadge` + minimal publish/updated KPI. Forms studio preview rebuilt into a real responsive
  frame (shared `BrowserChrome` on desktop + phone frame on mobile) replacing the card-in-a-void; both
  studios got a `StudioHelp` popover + roving-tabindex/arrow-key section nav; mono-uppercase decoration
  (card ribbons/chips, `HeaderCaption` taglines, stage labels, device pills, `StudioMark` caption) removed.
  Gate green: `pnpm build --filter web_v2` (6/6) + tsc + eslint + update-indexes. Artifacts:
  `docs/ui-rework/2026-06-22-studios/` (principles + after).

- 2026-06-18 — **FORMS FULL REBUILD FROM SCRATCH** kicked off. The forms ("collection surface") feature
  is being deleted to the database level and rebuilt end-to-end per `docs/raw/forms_redesign_specs.md`.
  Canonical execution plan: `docs/plans/2026-06-18-forms-rebuild.md` (13 phases, one checkpoint commit
  each). The forms-v4 parametric implementation is superseded; `FormResponse` replaces
  `CollectionFormSubmission` as the canonical feedback record (widgets/exports/analytics/billing/projects
  re-point). New locked decisions recorded in `decisions.md` (2026-06-18 rows). Verification gate per
  phase per plan §8.
  - **Phase 0 (plan + continuity) — DONE** (`e475daef`).
  - **Phase 1 (demolition to clean slate) — DONE.** Deleted `packages/forms-core`, `packages/forms-embed`,
    `apps/forms_runtime`, the api_v2 `forms`/`responses`/`submission-moderation` modules, and the web_v2
    collect studio + responses inbox. Dropped the collection DB models (`CollectionForm`,
    `CollectionFormSubmission`+annotation+private-metadata, `SubmissionModerationRun`, `FormImpression`,
    `PublicSubmitIdempotency`, + enums `ModerationStatus`/`PublicSubmitTrustMode`/`PublicSubmitSurface`/
    `SubmissionModeration*`) via migration `20260619000000_forms_rebuild_demolition` (created from a live-DB
    diff + applied with `db execute` + `migrate resolve` to work around pre-existing drift: `admin_auth`
    missing from the folder, `collection_form_slugs` modified-after-applied). Kept `StudioDraft` (widgets),
    `PublicSurfaceHost`/`ProjectTrustedOrigin`/`ProjectSigningSecret`/`MediaAsset` (trimmed forms FKs), and
    the `submission-moderation` BullMQ queue name as reserved infra (Phase 6 re-adds the processor).
    Neutralized consumers to compile with forms absent (restored in Phase 6): widgets walls/embeds render
    empty; analytics form-view/submission/impression metrics return 0/no-op; exports CSV is header-only;
    billing/project response counts are 0; project default-form seed removed. Relocated the generic studio
    primitives (`Section`/`Field`/`Segmented`/`OptionCardGroup`/`SwitchRow`/`InlineName`) to neutral
    `apps/web_v2/components/studio/` so the Widget Studio keeps working. **Interim items tracked for later
    phases:** `V2ProjectDTO.collectionFormUrl`/`formConfig` + the onboarding/welcome collection-URL preview
    are kept as null/placeholders pending the Phase 9 creation-flow rebuild; MCP response/testimonial tools
    - the forms/response DTOs in `@workspace/types` are kept until superseded in Phase 6; project index
      redirects to `/widgets` until a Forms surface lands (Phase 9). Verification: `@workspace/database`
      generate+validate; recursive `typecheck` (all workspaces); api_v2 lint + 56 files/372 tests; web_v2
      tsc+eslint+23 files/69 tests; `pnpm build` (full monorepo, 10/10).
  - **Phase 2 (new forms DB schema) — DONE.** Added `Form` (draft source), `FormVersion` (immutable
    versioned public-safe snapshot), `FormResponse` (canonical feedback, replaces CollectionFormSubmission)
    - `FormResponsePrivateMetadata` + `FormResponseAnnotation`, `FormModerationRun`, `FormView`,
      `FormSubmitIdempotency`, and 9 enums (`FormIntent`, `FormStatus`, `FormVersionStatus`,
      `FormResponseTrustMode`, `FormResponseReviewStatus`⟂`FormResponsePublishStatus`,
      `FormModerationRunStatus`/`ArtifactType`/`Decision`). Re-added `MediaAsset.formId`/`responseId`
      (+ form/response/moderation relations) and `formResponses` back-refs on
      `ProjectTrustedOrigin`/`ProjectSigningSecret`. Migration `20260619001000_forms_rebuild_schema`
      (diff-created from live DB + `db execute` + `migrate resolve`). Review status and publish status are
      orthogonal enums per spec §21. Verified: prisma format+validate+generate+build; api_v2 tsc clean; DB
      `migrate status` up to date (31 migrations).
  - **Phase 3 (forms-core rebuild) — DONE.** Rebuilt `packages/forms-core` from scratch as the shared,
    framework-agnostic contracts + compilers (pure TS + zod v4 + `@workspace/brand-theme`): `schema/`
    (FormDefinitionDoc, 14 field types w/ per-type settings + roles, StoredAnswer, first-class consent,
    intents/layout/flow/condition/design/content/settings zod schemas, CompiledSnapshot/PublicSnapshot
    interfaces); 5 **intent templates** (`createFormTemplate` seeds fields/copy/layout/flow/consent —
    TESTIMONIAL/REVIEW/PRODUCT_FEEDBACK/CUSTOMER_STORY/CUSTOM); **design-token compiler** (`compileDesign`
    maps the constrained controls onto brand-theme's AA-clamping derive engine → per-scheme `--tf-*`
    cssVars); deterministic **snapshot compiler** (`compileSnapshot` + content-fingerprint checksum that
    excludes wall-clock `publishedAt`, `toPublicSnapshot` strips server-only anti-abuse settings per spec
    §26); authoritative **validation** (visible/non-hidden fields only), bounded **conditions** engine
    (8 operators, all/any, show/hide), **submission normalization** (private/publishable/widget eligibility
    - author/rating projection + consent parse), and **doc migration** scaffold (forward-projects, rejects
      newer major). 6 spec files / 33 unit tests (conditions, validate, snapshot determinism+public-safety,
      intents, normalize, migrate). **Two fixes from the resumed session:** (1) Zod v4 `.default({})` on the
      nested object schemas was rejected because v4 `.default` short-circuits parsing and requires the full
      _output_ shape — switched to `.prefault({})` (feeds the value through parsing so inner defaults apply;
      confirmed via Context7) and keyed `intents.ts` `TemplateSeed` off `z.input<…>` so partial nested seeds
      typecheck. (2) Removed stale `dist/` (old-package compiled `.spec.js` that survived Phase 1's `git rm`
      because dist is gitignored) and added a scoped `vitest.config.ts` (`include: ["src/**/*.spec.ts"]`) so
      specs aren't discovered + double-counted from the build output. Reconciled the lockfile (`pnpm install`
      added the `packages/forms-core` importer; the corepack-11.5.1 postinstall failed the pinned-pnpm check —
      direct `pnpm` at 11.1.3 is the working path). Verified: forms-core typecheck + test (6/33) + build;
      `@workspace/types` build; prisma generate. Next: Phase 4 (forms-renderer React package).
  - **Phase 4 (forms-renderer) — DONE.** New `packages/forms-renderer` — the single React renderer for a
    forms-core `PublicSnapshot`, shared by dashboard preview, hosted pages (SSR), embeds, native injection,
    and static-preview capture so every surface renders identical output (spec §18.5, §27). Pieces:
    `css.ts` (`buildFormStylesheet` — self-contained, Tailwind-free stylesheet scoped to `.tf-root`,
    resolving all visuals from brand-theme's `--tf-*` vars, with `data-scheme`/`data-field-style`/
    `data-bg-style`/`data-button-style`/`data-layout` variants + a `prefers-color-scheme` block for system
    mode + reduced-motion); `use-form-controller.ts` (headless hook: answers, conditional visibility +
    per-step/full validation via forms-core, step nav + no-validate `advance` for rating auto-advance,
    consent derivation, submit lifecycle, honeypot/elapsedMs); `fields.tsx` (dispatcher + controls for all
    14 field types w/ label/help/error a11y); `components.tsx` (progress, thank-you, closed, honeypot,
    attribution); `renderer.tsx` (`FormRenderer` composing header + 4 layout presets — centeredCard/
    fullPage/splitHero/oneQuestion — single-page vs stepped bodies + closed/success states); isomorphic
    `index.ts`, `./server` (`renderFormToString` hydratable + `renderFormToStaticMarkup` for previews),
    `./client` (`mountForm` create/hydrate). Tooling mirrors the React-library convention (NodeNext +
    `react-jsx`, `.js` import extensions, compiled to dist; jsdom vitest scoped to src). 3 spec files /
    16 tests: stylesheet scheme/scope/reduced-motion, SSR per-preset structure + closed-form + §26
    public-safety (no blocked words leak), and testing-library interactions (empty-submit errors,
    conditional reveal/hide, valid submit → consent payload + thank-you, stepped next/back, blocked invalid
    advance). Verified: forms-renderer typecheck + test (3/16) + build; lockfile reconciled (new importer +
    react/react-dom/testing-library/jsdom devDeps). Next: Phase 5 (api_v2 forms domain — drafts/publish/
    snapshots/versions).
  - **Phase 5 (api_v2 forms domain) — DONE.** New `apps/api_v2/src/modules/forms/` (delegated to Codex
    `codex:codex-rescue`; orchestrator reviewed + verified + committed per orchestrator-mode). Authenticated
    project-scoped `FormsController` (`@Controller("projects/:slug/forms")`, every route
    `CapabilityGuard` + `RequireCapability(MANAGE_PUBLISH_SURFACES)`): list / create (intent-seeded via
    `createFormTemplate`, plan-limit guarded) / get / PATCH metadata (name/slug/open, per-project slug
    uniqueness) / delete / draft get / draft save (optimistic `expectedVersion` via `updateMany` version
    guard → 409, mirrors studio-drafts) / publish / versions list+get. **Publish** compiles the draft via
    forms-core `compileSnapshot`, stores the FULL `CompiledSnapshot` immutably in `FormVersion` (id =
    app-generated snapshotId, version = max+1) and bumps `Form.currentVersion`+`status` in a
    `$transaction`; **no-churn**: recompiles a candidate against the latest version's id/version so an
    identical re-publish is a true no-op. Public runtime controllers (`@Public()` + throttled):
    `GET /v2/runtime/forms/:slug/snapshot?projectId=` (interim `projectId` query — Phase 7 swaps to
    host-based resolution; resolves PUBLISHED+open form's current version) and
    `GET /v2/runtime/snapshots/:snapshotId`. **§26 public-safety:** every snapshot returned to ANY caller
    (runtime AND authenticated version reads) passes through `toPublicSnapshot`, stripping server-only
    `serverSettings` (minCompletionMs/honeypot/blockedWords). Plan enforcement: `billing.service` gained a
    `forms` limit on all plans (FREE 1 / PRO 10 / BUSINESS 100) + `getFormUsageForProject`; create throws
    `ForbiddenException` at the cap. New DTOs in `@workspace/types` (`V2FormSummaryDTO`/`V2FormDTO`/
    `V2FormDraftDTO`/`V2FormVersionSummaryDTO`/`V2FormVersionDTO` + `V2UsageLimitDTO`); legacy
    `V2FormConfig*`/`V2CollectionFormDTO` kept (superseded in Phase 9). Orchestrator fixes on the delegated
    output: added `@workspace/forms-core` to api_v2 deps + `pnpm install`; fixed two test-mock typings
    (`updateMany` `data` draftVersion union, `delete` destructure guard); removed Codex scratch files.
    Verified: `@workspace/types` build; api_v2 typecheck + lint + test (58 files / 385) + build (6/6).
    Next: Phase 6 (responses, submissions, moderation + consumer re-point onto FormResponse/FormView).
  - **Phase 6 (responses + submissions + moderation + consumer re-point) — DONE** (`4899d5be`).
    Codex-delegated (`codex:codex-rescue`), orchestrator reviewed/verified/committed. Resurrected-and-adapted
    the pre-demolition `responses` + `submission-moderation` modules (git ref `26964f6f^`) onto the new
    schema. **Public submission runtime** `POST /v2/runtime/forms/:slug/submissions` (+ `uploads/presign`):
    resolves the PUBLISHED+open form's current `FormVersion`, validates against the FULL stored snapshot
    (incl. server-only settings), `normalizeSubmission` → answers/rating/author/consent, Origin/HMAC trust
    via `PublicSubmitTrustService` (HMAC hard-rejects, no Origin fallthrough; trust validated in the service,
    not the throttler guard), honeypot/min-completion-time/blocked-content rules, `FormSubmitIdempotency`
    replay + in-flight 409, persists `FormResponse` (PENDING/PRIVATE) + encrypted `FormResponsePrivateMetadata`
    - `sourceMetadata`, enqueues a `FormModerationRun`. **`responses` module** (project-scoped, capability-
      guarded `REVIEW_RESPONSES`/`PUBLISH_RESPONSES`): list/get (display-safe, `RESPONSE_SELECT` excludes the
      encrypted private-metadata relation — no PII), PATCH status (approve/reject/spam/archive), PATCH publish
      (`assertConsentAllowsPublish` gate per spec §9/§21), delete, annotations; DTOs in `@workspace/types`.
      **Moderation** re-pointed onto `FormModerationRun` + `FormResponse`; reviewer-set REJECTED/APPROVED stays
      authoritative over worker reconciliation; raw provider output private. **Consumers restored** onto
      `FormResponse`/`FormView` (0 `FORMS-REBUILD(Phase 6)` markers remain): widgets wall/embed (APPROVED +
      PUBLISHED + consent gate), analytics totals/rows/view+submission events, exports CSV, billing count,
      projects pending-moderation counts + default `Form` seed on create. **Orchestrator fixes after Codex was
      cut off mid-gate by a ChatGPT usage limit:** removed a stale trust pre-compute block in the public-submit
      throttler guard, cast Prisma `Json`→`StoredAnswer[]` in `readStoredAnswers`, pruned dead imports/helpers,
      stubbed `formResponse.findMany` in the widget embed-fragment spec. Gate green: `@workspace/types` build;
      api_v2 typecheck + lint + test (63 files / **401**) + build (6/6); `web_v2` build (4/4, hard constraint);
      `update-indexes` (graph 6442 nodes / 11220 edges). Next: Phase 7 (`apps/forms_runtime` rebuild).
  - **Phase 7 (`apps/forms_runtime` rebuild) — source staged, verification blocked locally**.
    Resurrected the pre-demolition package from `26964f6f^` and re-pointed it to the new api_v2 runtime
    contract plus `@workspace/forms-renderer` SSR. Implemented hosted `/f/:slug`, static `/embed/:slug`,
    Phase-8 `/embed.js` + `/loader.js` placeholders, submit and upload-presign proxies, public-safe snapshot
    rendering, edge rate limits, embed-origin enforcement, security headers/CSP, mock mode, and the CDK
    custom-domain loud-fail guard. Orchestrator verified + committed (`129d95af`): Codex was killed in its gate phase by sandbox ACL/offline limits, so the orchestrator ran `pnpm install` + the full gate unsandboxed. Gate GREEN: forms_runtime typecheck + lint + test (4 files / 21) + build (lambda/local/browser bundles) + `cdk synth`; forms-core + forms-renderer build; `update-indexes`. Next: Phase 8 (`packages/forms-embed` — iframe loader + `<semblia-form>` web component).
  - **Historical Phase 9 checkpoint (web_v2 Form Studio + Responses) — 9a DONE + 9b studio core DONE.**
    The dashboard forms UI did not exist after the demolition (no forms/collect/responses pages; `lib/semblia-api.ts`
    forms/responses clients were stubbed out). This pass rebuilt the **client/hooks foundation + forms list + intent-led
    create (9a)** and a **functional editing studio with live preview (9b core)**.
    - **Foundation:** re-added the forms client fns to `lib/semblia-api.ts` (list/get/create/update/delete/draft get +
      PATCH save w/ optimistic `expectedVersion`/publish/versions — note drafts use PATCH, widgets use PUT), `forms`
      query keys, and `hooks/api/use-forms-api.ts` (+ barrel export). Added `@workspace/forms-core` + `@workspace/forms-renderer`
      to web_v2 deps (`pnpm install` + built both so web_v2 typecheck/bundle resolve their dist).
    - **List + create (9a):** `app/(app)/projects/[slug]/forms/page.tsx` (server) → `components/forms/form-list.tsx`
      (status filter pills all/live/drafts/closed, RefreshingDataBadge, live-query state, empty + filtered-empty states),
      `form-row.tsx` (intent glyph, InlineName rename, status badge, published-version metric, Edit/Copy-link/Open-close/Delete
      via shared ItemRow+ItemActionRow), `form-intent-picker.tsx` (5 intents → `createForm`), `forms-empty-state.tsx`,
      `lib/forms/intents.ts` (intent + status presentation). Added a **Forms** nav entry (first) to `project-sidebar.tsx`
      and repointed the project index redirect `/widgets`→`/forms` (Forms is the start of the collect→review→display funnel).
    - **Studio (9b core):** `app/(app)/projects/[slug]/forms/[formId]/{page,_studio-client}.tsx` → `components/forms/studio/`:
      `form-studio.tsx` (full-screen shell: loads form+draft, local working-doc state, debounced autosave 1200ms + Cmd/Ctrl+S
      w/ optimistic version + 409 re-hydrate, publish [saves-then-publishes], rename metadata, beforeunload + leave guard),
      `form-studio-topbar.tsx` (back, InlineName, status badge, save state, View hosted link, Save draft, Publish/Republish),
      `form-inspector.tsx` (section rail Content/Fields/Design/Flow over the shared studio control primitives — Content copy,
      Fields edit/label/help/placeholder/required + reorder + remove, Design layout-preset cards + brand color + scheme + font
      - radius/density/button/field/background, Flow mode/progress/auto-advance/consent-placement + require-consent/anonymous/
        attribution), `form-studio-preview.tsx` (compiles the working draft via `lib/forms/draft.ts` → forms-core `compileSnapshot`
        → `toPublicSnapshot` → shared `FormRenderer` with light/dark toggle = true WYSIWYG). Gate GREEN: web_v2 tsc --noEmit +
        eslint + vitest (23 files / 69) + `pnpm build --filter web_v2` (both forms routes emitted) + `update-indexes` (6481/11301).
    - **Remaining in Phase 9:** 9b polish (add-field type picker + per-type settings: select options editor, rating scale,
      upload limits, hidden-field source; conditional-rule editor; slug/embed-origins/attribution publish controls;
      versions history UI); **9c Responses inbox** (list/detail/approve/reject/spam/archive/publish-unpublish/annotations —
      responses client fns + hooks still stubbed) + a Responses nav entry. Then Phase 8 (forms-embed), 10 (static previews),
      11 (analytics/spam/uploads), 12 (hardening).
- Historical branch at the 2026-06-07 sync: `revamp/v2`. Current recovery work
  is on `codex/production-spine-recovery` from `main` at `79dd7af8`.
- Git state before the 2026-06-07 integrations OAuth repair: `revamp/v2...origin/revamp/v2` ahead 38 at `f50a826 fix(integrations): real provider brand icons + clearer connect copy`.
- Current brand checkpoint: `semblia.com` is owned and configured as the launch domain. Active repo-owned strings now use Semblia instead of the retired prelaunch name: app/admin/API copy, env defaults, public domains (`*.semblia.com`), forms runtime signing headers (`x-semblia-*`), embed custom element (`<semblia-form>`), forms v4 stub marker (`data-semblia-forms-v4-stub`), web API helper filenames, brand assets, docs filenames, and the MCP package (`packages/semblia-mcp-server`, `@workspace/semblia-mcp-server`, `SEMBLIA_API_BASE_URL`, `SEMBLIA_AGENT_KEY`). Cloudflare DNS is configured for Zoho workspace mail plus Resend transactional sending; Cloudflare Email Routing remains disabled.
- Rebrand verification: no repo-owned old-brand text hits, no old-brand filenames, no wrong-domain variants for Semblia, `pnpm.cmd install`, `pnpm.cmd typecheck`, explicit `web_v2` `tsc --noEmit`, explicit `web_v2` eslint, `pnpm.cmd lint`, `pnpm.cmd test`, `pnpm.cmd build`, Prisma validate, `git diff --check`, `python scripts/update-indexes.py`, and `python scripts/rebuild-graphify.py` passed. The final index refresh reported 1757 vector chunks and a merged graph of 6083 nodes / 10551 edges.
- Current stage: the repo is v2-only after `8e1f1a4` removed the legacy `apps/api`, `apps/web`, and `packages/widget` workspaces. The testimonial projection surface is gone, the local database has applied the projection-removal migration, recent `web_v2` follow-ups shipped response annotations, Phase 3 Developers surfaces for Exports, Outbound Webhooks, Activity audit, and native Integrations, plus admin-user management. Current focus remains Phase 7 verification/hardening, admin go-live prerequisites, the Collect studio Phase 4 follow-up already active in the dirty working tree, Resend production enablement, hosted forms runtime follow-up work, and the remaining billing hardening deferrals.
- Current checkpoint: `web_v2` Phase 1b empty-state and new-user onboarding trigger is committed; hydration/refresh-stability now has a shared API-hook policy. Route-critical current-user/project/account state waits for a fresh response, list/table-style refreshes keep mounted data visible with local "Refreshing data" badges, and a policy test prevents app/page components from reintroducing direct `useQuery` calls outside the live-query hook layer. The 2026-05-14 API-only wiring pass added typed client/hook seams for current organization, notifications, analytics/events, public surface resolve, action audit, outbound webhooks, exports, and native integrations. The 2026-05-15 follow-up moved the notification bell and account notifications page from mock data to those live hooks. The 2026-05-18 follow-up consolidated the project Developers surface (private keys + agent keys + docs/SDK stubs) under `/projects/[slug]/developers/`, surfaced full scope selection on private key creation, and rendered the previously unused agent-access hooks (overview, create, revoke, actions audit). The 2026-05-19 follow-up rebuilt the project Settings area as eight sub-routes (General / Branding / Visibility / Social / Hosts / Trust / Members / Danger) under a shared `SettingsShell`, surfaced the previously unrendered allowed-origins editor and signing-secret rotation, exposed full role-edit Members management (reopening the 2026-05-03 simple-permissions decision), and fixed the `addProjectMember` body shape + `V2ProjectMemberRole` mismatch between web and api. Billing account UI now uses live billing flows: PlanSwitcher starts Razorpay Checkout for FREE -> paid, schedules paid -> paid switches for the next billing cycle, and cancels paid -> FREE at period end; saved cards remain read-only from webhook mirrors.
- Previous committed implementation checkpoint: `web_v2` Phase 1a shell navigation wiring landed as `4246ac8`; the approved execution plan landed as `f280b64`.
- Billing track: 2026-05-24 locked Razorpay as the payment provider and Razorpay Subscriptions as the source-of-truth mirrored to the local DB via webhooks. B1 (plan seed + customer-create + production env hardening + RazorpayService typed surface) landed as `191bb0e`. B2 (`POST /v2/account/subscription/checkout` returning subscriptionId/shortUrl/razorpayKeyId) landed as `81faee2`. B3 (Razorpay webhook domain handlers — subscription.activated/charged/cancelled/halted/paused/resumed/completed + payment.captured/failed + invoice.paid, with idempotent SubscriptionPayment writes and User.plan promotion/downgrade) landed as `43d54c5`. B4 (Razorpay-backed cancel and paid-plan switch — cancel calls subscription cancel-at-period-end, switch cancels current at cycle end and schedules next sub for `currentPeriodEnd`; `Subscription` gained `scheduledRazorpaySubscriptionId` / `scheduledPlanId` / `scheduledStartAt`; webhook handler now resolves scheduled-id activations, promotes them, and suppresses FREE downgrades while a switch is pending) landed as `90d641e`; B4 API tests reported 50 files and 340 tests passing. B5 (saved cards read-only mirror + invoice URLs — removed `DELETE /v2/account/payment-methods/:id` and `POST /v2/account/payment-methods/:id/default`, mirrors Razorpay card token metadata from `subscription.charged` / `payment.captured`, mirrors `invoice.paid` hosted URLs into local `Invoice.downloadUrl`, and handles the new `invoice.payment_failed` event for local invoice status) landed as `4703571`; B5 API tests report 50 files and 350 tests passing. B6 (web_v2 Razorpay Checkout integration — FREE -> paid starts Razorpay Checkout via the B2 checkout API, paid -> paid schedules the B4 switch, paid -> FREE cancels at period end, saved cards stay read-only, and invoice rows link hosted invoice URLs when present) landed as `e68cfdc`; web_v2 tests report 21 files and 79 tests passing. B7 (security audit + final verification — found and fixed one P0: `BillingController` was reachable by project-bound API keys and agent keys via the global Clerk auth fallback, leaking subscription/payment-method/invoice/billing-profile access; fix is a new `UserActorGuard` applied at the controller level with 5 covering unit tests, and two P2 deferrals for CSP/dependency hygiene/scheduled-switch race recorded in `docs/continuity/open-questions.md` and `docs/billing-security-audit-2026-05-26.md`) closes the billing track; api_v2 tests now report 51 files and 355 tests, web_v2 tests remain at 21 files and 79 tests, merged graph at 5047 nodes and 8439 edges.
- Admin track: 2026-05-27 replaced the broken legacy `apps/admin` scaffold with a Next.js 16 app intended for `admin.semblia.com`, backed by a DB-side `AdminUser` table (not Clerk metadata, which the old admin surface had used and the user explicitly rejected). Identity is owned by a separate `semblia-admin` Clerk application; authorization is a per-route guard + lookup against `AdminUser.isActive`. `api_v2` still runs as one process — the security boundary is per-route JWKS verification and the `AdminUser` lookup, not the process boundary. A1 (`7fa6167`) added `AdminUser` + `AdminAuditLog` tables, the `20260526142918_admin_auth` migration, four `ADMIN_CLERK_*` env vars validated by the Zod schema, and an idempotent `apps/api_v2/scripts/grant-admin.ts` seed CLI. A2 (`59dd9c4`) added `ClerkAdminAuthGuard`, `AdminLookupInterceptor` (debounced `lastLoginAt` updates), `@RequireAdmin()`, and `@CurrentAdmin()`. A3 (`87deac1`) wired `AdminModule` into `api_v2` and exposed `/v2/admin/me`, `/v2/admin/plans` (GET + POST that creates Razorpay plans via the existing `RazorpayService` for paid plans only), and `/v2/admin/plans/:id/deactivate`; mutations write `AdminAuditLog` rows. Both admin controllers combine `@Public()` (opt out of the global `ClerkAuthGuard`) with `@RequireAdmin()`. The admin frontend scaffold (`7614760`) replaces the broken legacy admin app: Clerk middleware on every route except `/sign-in` and `/access-denied`, an `(authed)` layout that verifies access via `GET /v2/admin/me` before rendering, server-rendered `/plans` table, and a `/plans/new` form whose server action converts rupees → paise. Admin API tests report 18 new tests passing across 5 files. Before live use, the user still needs to (1) create the `semblia-admin` Clerk app and populate `apps/admin/.env.local` + the `ADMIN_CLERK_*` keys in `apps/api_v2/.env`, (2) run `pnpm --filter @workspace/database prisma migrate deploy` against the live DB, and (3) run `pnpm --filter api_v2 admin:grant -- --email=… --clerk-user-id=…` to bootstrap the first admin.
- 2026-06-05 admin management checkpoint: `api_v2` now exposes secure admin-user management endpoints at `GET /v2/admin/users`, `POST /v2/admin/users`, `POST /v2/admin/users/:id/deactivate`, plus `GET /v2/admin/audit-logs?limit=...`. All new controllers use the existing admin-only boundary (`@Public()` only to bypass the product Clerk guard, then `@RequireAdmin()` with admin Clerk token verification and DB-backed `AdminUser.isActive` lookup). Admin-user mutations are transaction-wrapped with `AdminAuditLog` writes, normalize email/Clerk ids, reject ambiguous email-vs-Clerk conflicts, allow exact inactive-row reactivation, and refuse self-deactivation. `apps/admin` now has a brief `/admins` scaffold for list/grant/deactivate and a `/audit-logs` scaffold for the latest 50 audit rows. Verification passed: `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, `corepack.cmd pnpm --filter api_v2 test` (72 files / 446 tests), `corepack.cmd pnpm --filter admin typecheck`, `corepack.cmd pnpm --filter admin lint`, `pnpm.cmd build --filter api_v2`, `pnpm.cmd build --filter admin`, `python scripts/update-indexes.py` (11 files indexed, vector store 1733 chunks, merged graph 5681 nodes / 9728 edges), and `python scripts/rebuild-graphify.py` (same merged graph). The `py` launcher lacks `chromadb`/`graphify` in this checkout; plain `python` is the successful indexing path for this checkpoint.
- Analytics dashboard wiring is in fact already shipped: the `GET /v2/projects/:slug/analytics/dashboard` endpoint per `docs/plans/2026-05-15-analytics-api-expansion.md` landed as `90443dd` (2026-05-15), and `apps/web_v2/components/analytics/analytics-dashboard.tsx` was wired to `useAnalyticsDashboard` + `dtoToDashboardData` adapter as `bd1a7d6`. `apps/web_v2/lib/analytics/aggregate.ts` was deleted in the same wiring pass; only `dto-adapter.ts`, `range.ts`, and `types.ts` remain under `lib/analytics/`. The "next implementation checkpoint" snapshot before this update was stale — this entry corrects the record.
- 2026-05-28 signup loader UX fix landed as `1a7f0b2`: `OnboardingGate` previously showed "Setting up your account — syncing your new sign-up" copy whenever the initial `/v2/me` fetch was in flight, which flashed signup-flavored copy at returning users on every fresh page load. The gate now scopes that copy to the active `ACCOUNT_RECONCILING` retry path only, and renders neutral "Loading your account / One moment while we get things ready." for the generic initial-fetch wait. A new regression test asserts returning users never see the signup copy. Reconciliation, exhausted-retry, and error branches are unchanged.
- Real remaining implementation tracks (after the 2026-05-28 doc sweep that retired the "mock-backed UI sweep" and "Studio API" lines as already-shipped): Phase 7 verification + hardening; the admin go-live prerequisites (`semblia-admin` Clerk app + env + `migrate deploy` + first-admin grant); the remaining billing P2 deferrals (`next`/`@prisma/*` advisory review and scheduled-switch race) per `docs/billing-security-audit-2026-05-26.md`; the active Collect studio Phase 4 follow-up in the dirty working tree; and the `EMAIL_ENABLED=true` flip once the Resend production sender, domain, and quota are configured. `docs/plans/2026-05-14-api-only-wiring-ui-deferrals.md` is now marked superseded — every UI surface it deferred has shipped and the `mock-data` layer is gone.
- 2026-05-29 backend check after adding local Resend key: `apps/api_v2/.env` has `RESEND_API_KEY` set, `EMAIL_FROM=Semblia - noreply <notifications@semblia.com>`, `EMAIL_REPLY_TO=Semblia <admin@semblia.com>`, `EMAIL_DAILY_LIMIT=100`, and `APP_PUBLIC_URL=http://localhost:3002`, but `EMAIL_ENABLED=false`, so the worker still suppresses actual sends. The backend email implementation is already present: `ResendMailerService` sends through Resend with the persisted delivery idempotency key, `EmailDeliveryService` creates deterministic notification/project-invite outbox rows and BullMQ jobs, and worker-only maintenance enqueues pending email deliveries. Focused backend verification found and fixed one date-brittle ops-admin queue snapshot spec that expected 2026-05-28/27 instead of freezing system time. Verification after the fix: `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, `corepack.cmd pnpm --filter api_v2 test -- src/modules/ops-admin/ops-admin.spec.ts` (62 files / 394 tests), `python scripts/update-indexes.py`, `pnpm.cmd --filter api_v2 build`, and `pnpm.cmd --filter api_v2 smoke:worker` passed. `corepack.cmd pnpm build --filter api_v2` remains blocked by the known Windows/Turbo nested-pnpm mismatch (`current pnpm is v11.1.3` inside the child build); direct `pnpm.cmd --filter api_v2 build` is the successful path in this checkout.
- 2026-05-30 Clerk email reroute work is implemented in the working tree: signed `POST /v2/webhooks/clerk` payloads now accept `email.created`, `sms.created`, and generic Clerk organization invitation events without breaking the existing strict `user.created`/`user.updated` validation. `email.created` creates an immediately enqueued `EmailTemplateKey.CLERK_EMAIL` `EmailDelivery` row keyed by the Svix event id + recipient, and `ResendMailerService` sends the rendered Clerk subject/body through the existing Resend pipeline. `sms.created` is accepted and ledged as ignored because the current stack has no SMS provider; `docs/continuity/open-questions.md` records that Clerk SMS delivery should stay enabled until a provider is chosen. Clerk template docs now instruct disabling "Delivered by Clerk" for email templates and subscribing the webhook endpoint to `email.created`. Verification passed: `corepack.cmd pnpm --filter @workspace/database generate`, `corepack.cmd pnpm --filter @workspace/database exec prisma validate`, `corepack.cmd pnpm --filter @workspace/database build`, `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, `corepack.cmd pnpm --filter api_v2 test` (62 files / 402 tests), `pnpm.cmd build --filter api_v2`, `python scripts/update-indexes.py`, and `python scripts/rebuild-graphify.py` (merged graph 5230 nodes / 8670 edges). The first parallel `update-indexes.py` attempt timed out at 120s while `rebuild-graphify.py` was also running; the rerun completed successfully.
- 2026-05-30 hosted forms scaffold landed in `apps/forms_runtime` and `packages/forms-core`: `forms-core` now owns shared form config normalization, design tokens, view models, React rendering, and server HTML rendering for both hosted forms and future `web_v2` live preview usage. `forms_runtime` is a separate Hono app with local mock mode, Lambda and Node entrypoints, signed `api_v2` client plumbing, hosted host/path resolution, submit proxy shape, unit tests, and AWS CDK scaffolding for CloudFront + Lambda Function URL + OAC. The runtime opens locally at `http://localhost:3007/` in mock mode. API-side `/v2/runtime/forms/*` endpoints and `web_v2` studio preview integration remain future work. Verification passed: `corepack.cmd pnpm --filter @workspace/forms-core typecheck`, `test`, and `build`; `corepack.cmd pnpm --filter forms_runtime typecheck`, `lint`, `test`, `build`, and `cdk synth`; targeted Prettier check; `python scripts/update-indexes.py`; and `python scripts/rebuild-graphify.py`.
- 2026-05-31 hosted forms service/API groundwork is implemented server-side: `CollectionForm.slug` is now persisted with a project-scoped unique index, new projects receive default `${project}.collect.semblia.com` collection hosts, and existing projects/forms are backfilled by migration. `api_v2` now exposes signed public runtime endpoints at `POST /v2/runtime/forms/resolve` and `POST /v2/runtime/forms/submit`; the resolve path enforces active collection hosts, project/form slug targeting, hosted config adaptation, and view analytics, while submit parses hosted JSON or form-encoded bodies and reuses the canonical public form submission/trust/idempotency pipeline. `forms_runtime` now unwraps the `api_v2` response envelope and forwards original visitor user-agent/forwarded-for metadata for server-side trust records. Verification passed: database generate/validate/build, `api_v2` focused runtime/forms/security/projects/testimonials tests (63 files / 408 tests), `api_v2` typecheck/lint/build, `forms_runtime` typecheck/lint/test/build, `@workspace/forms-core` typecheck/build, `@workspace/types` build, `@workspace/database` typecheck/build, `python scripts/update-indexes.py`, and `python scripts/rebuild-graphify.py`.
- 2026-06-01 hosted forms service-layer polish: the forms list now returns real per-form submission/view metrics from two batched aggregate queries instead of stubbed zeros, and hosted runtime submit now uses the already-resolved hosted project/form target plus the shared trusted-submit core instead of re-running public origin trust and duplicate form/project lookups. Visitor `x-forwarded-for` is promoted into the runtime submit request before private metadata capture. Verification passed: `corepack.cmd pnpm --filter api_v2 test -- src/modules/forms/forms.service.spec.ts` (63 files / 410 tests), `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, and `corepack.cmd pnpm build --filter api_v2`.
- 2026-06-01 hosted forms quality gates: public/hosted form submission now rejects exact recent duplicate payloads with `409` before persistence, while preserving same-key idempotency replay semantics. The same trusted-submit core now flags obvious spam links/terms, repetitive content, deceptive paid/fake-review language, and abusive language as `FLAGGED` across public submission paths, including moderation flags, score, reason, and submission metadata for reviewer triage; flagged payloads cannot auto-approve even when HMAC or OAuth trust would otherwise qualify. Verification passed: `corepack.cmd pnpm --filter api_v2 test -- src/modules/forms/forms.service.spec.ts` (63 files / 413 tests), `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, `git diff --check`, `corepack.cmd pnpm build --filter api_v2`, `python scripts/update-indexes.py` (final rerun indexed 1 source file, merged graph 5328 nodes / 9099 edges), and `python scripts/rebuild-graphify.py` (merged graph 5328 nodes / 9099 edges).
- 2026-06-01 hosted forms P1 hardening: the backend/runtime now has a server-side Studio draft publish endpoint (`PUT /v2/projects/:slug/forms/:formId/draft/publish`) that promotes saved Studio config into live `CollectionForm.config`; runtime routes are protected by visitor/host-aware throttling; custom hosts pass through the runtime to API `PublicSurfaceHost` resolution instead of being rewritten to the default collect host; unsafe cross-origin success redirects are dropped; production API env validation now requires `FORMS_RUNTIME_SIGNING_SECRET`; project default collect hosts derive from `FORMS_RUNTIME_PUBLIC_BASE_DOMAIN`; the runtime adds CSP/HSTS/referrer/content-type/frame headers, API fetch timeouts, strict submit DTO forwarding, and CloudFront origin/security policies. The CDK stack now loudly rejects `formsRuntimeCustomDomains` because per-tenant alternate-domain/cert/DNS automation still needs a production rollout. Verification passed in the isolated `codex/forms-p1-hardening` worktree: `corepack.cmd pnpm --filter api_v2 typecheck`, `lint`, targeted forms-related `test` (64 files / 418 tests), and `build`; `corepack.cmd pnpm --filter forms_runtime typecheck`, `lint`, `test` (4 files / 16 tests), `build`, and `cdk synth`; targeted Prettier check; `git diff --check`; `python scripts/update-indexes.py`; and `python scripts/rebuild-graphify.py` (merged graph 5352 nodes / 9195 edges).
- 2026-06-02 moderation planning checkpoint: the submission moderation pipeline is locked as AWS-first while AWS credits are available for the next 3-4 months. Planned provider path is local heuristics before paid calls, Amazon Comprehend toxicity detection for text, Amazon Rekognition for images and video moderation, Amazon Transcribe for audio/transcripts/toxicity, and sparse keyframe sampling before full video moderation except for Pro/Business/escalation cases. The implementation plan is saved at `docs/superpowers/plans/2026-06-02-aws-first-moderation-pipeline.md`; `docs/continuity/decisions.md` records the locked provider choice and `docs/continuity/open-questions.md` records the proposed starter media quota caps. No source code was changed in this planning checkpoint.
- 2026-06-02 AWS-first submission moderation pipeline implemented in the working tree: `SubmissionModerationRun` persistence, nested plan moderation limits, provider-neutral policy, AWS Comprehend/Rekognition/Transcribe clients, disabled-safe local/noop provider defaults, BullMQ `submission-moderation` queue/worker wiring, public/hosted form enqueue hooks, `SUBMISSION_ATTACHMENT` media upload/attachment validation, safe moderation-run summaries in `SubmissionsService`, and ops telemetry/dead-letter retry/budget suppression visibility. `prisma migrate dev --name submission_moderation_runs` was blocked by local migration drift (`20260526185633_admin_auth` is applied in the local DB but missing locally), so the migration SQL was created manually at `packages/database/prisma/migrations/20260602120000_submission_moderation_runs/migration.sql`; generate/validate/build pass against the schema. Verification passed: `corepack.cmd pnpm --filter @workspace/database generate`, `corepack.cmd pnpm --filter @workspace/database exec prisma validate`, `corepack.cmd pnpm --filter @workspace/database build`, `corepack.cmd pnpm --filter @workspace/types build`, `corepack.cmd pnpm --filter api_v2 typecheck`, `corepack.cmd pnpm --filter api_v2 lint`, `corepack.cmd pnpm --filter api_v2 test` (71 files / 444 tests), `corepack.cmd pnpm build --filter api_v2`, `pnpm.cmd --filter api_v2 smoke:worker`, `python scripts/update-indexes.py` (48 files indexed, vector store 1703 chunks, merged graph 5447 nodes / 9286 edges), and `python scripts/rebuild-graphify.py` (merged graph 5447 nodes / 9286 edges). Semantic extraction remains skipped because it requires Claude.
- 2026-06-03 testimonial projection removal is committed as `c343aee`: the `Testimonial`, `Tag`, `TestimonialImpression`, `TestimonialDisplayRevision`, and old testimonial enum surfaces are removed from Prisma. `CollectionFormSubmission` is the canonical persisted feedback source for direct public submit, hosted/form submit, moderation, analytics, exports, widgets, MCP reads, notifications, and webhook payloads. Submission-owned private metadata replaces `TestimonialPrivateMetadata`; annotations and moderation runs no longer duplicate `testimonialId`; analytics daily uses `submissionImpressions`; public impression capture is `submission-impression`; presentation-suggestion endpoints/types are removed until a future projection is intentionally rebuilt. Static docs and clients now use `submissionId` for the backing id under the testimonial product routes.
- 2026-06-03 local migration application after the commit: an empty stale local directory `packages/database/prisma/migrations/20260602143000_direct_testimonials_submission_backfill/` caused Prisma `P3015` and was removed; `corepack.cmd pnpm --filter @workspace/database exec prisma migrate deploy` then applied `20260602233000_remove_testimonials_projection`. Follow-up `migrate status` reported 27 migrations and "Database schema is up to date"; `prisma validate`, `@workspace/database generate`, and `@workspace/database build` passed; a Prisma `information_schema` check returned no old testimonial tables.
- 2026-06-04 UI↔API contract audit + Phase 1 remediation. The audit (`docs/ui-api-contract-audit-2026-06-04.md`, 16 findings) is committed; the derived phased plan lives at `docs/plans/2026-06-04-ui-api-contract-remediation.md`. User chose Phase 1 only this session (then check-in); Phase 3 new pages are to be full CRUD when reached. Phase 1 (web_v2-only drift/defunct cleanup) is done: dropped dead `responses:publish/unpublish` from the private-key scope picker (#5); removed the retired "publish" concept from analytics — `published` KPI → `approved`, dropped the funnel `published` step, deleted `publish-rate-card.tsx` + `PublishRateData`, dropped dead `isPublished` from `ContentPerformanceRow` (#6); plumbed `ratingScale` through `display.ts`→`ResponseVM`→`Stars` so a 4/10 fills 5 stars proportionally and shows `n/scale` (#11); added `deviceSplit.unknown` to the denominator + an Unknown segment (#13); removed the always-empty `alerts` — deleted `alerts-rail.tsx` + `AlertEntry` (#15); deleted the dead `fetchAnalyticsSummary`/`useAnalyticsSummary` wrapper + query key + its two tests, keeping the endpoint/DTO (MCP uses it) (#16). #14 needed no web change — the developer UI already uses `keyType`/`keyPrefix` consistently (the `.type` hits are event types); DTO-level dual-field dedup is a backend task. Verification: `tsc --noEmit`, `eslint`, `vitest` (22 files / 84 tests), and `pnpm build --filter web_v2` all pass; `update-indexes.py` refreshed (1678 chunks, merged graph 5599 nodes / 9588 edges). Phases 2–4 (moderationRuns/annotations, the 3 net-new Developer pages + action-audit, Collect studio config expansion) remain. Backend tail of Phase 1 (the defunct-concept cleanup that crosses api_v2 + shared types, handled inline since the Codex CLI is unavailable in this env) is now also done: removed `PUBLISH_RESPONSES` from the `Capability` enum + all role/clerk capability sets + the `V2ProjectCapability` union; dropped `responses:publish`/`responses:unpublish` from `apiKeyScopeValues`, `V2ApiKeyScope`, the `CONTENT_MANAGER`/`DEVELOPER` agent presets, and the credential-scope→capability map (#5); removed the legacy `type`/`prefix`/`permissions` fields from `V2ApiKeyDTO` + `ApiKeysService.toDto` (web/MCP already read `keyType`/`keyPrefix`) (#14); excised the retired "publish" concept from `analytics.service.ts` + `V2Analytics*` DTOs — deleted `buildPublishRate`/`V2AnalyticsPublishRateDTO`, `publishRate` from the dashboard, `publishedTestimonials` from summary+dashboard totals, the `published` daily/funnel step, and `isPublished` from `V2AnalyticsContentRowDTO` + the moderation-by-day counters (#6). The persistent `isPublished`/`autoPublished` DB columns and the response DTO's own `isPublished` field are intentionally untouched (out of Phase 1 contract-drift scope; `autoPublished` still feeds pipeline `autoResolved`). Spec files updated to match (capabilities/guard/project-access/projects/analytics/analytics-dashboard + web agents-client & scope-selector mocks). Backend verification: `@workspace/types` build, api_v2 `tsc --noEmit` + `eslint` + `vitest` (69 files / 437 tests) + `nest build`, web_v2 `tsc --noEmit` + `eslint` + `vitest` (23 files / 86 tests) all pass.
- 2026-06-04 Phase 2 response-review UI surface is implemented in the working tree: `ResponseDetail` now surfaces safe moderation-run summaries (provider/operation, artifact, status, decision, score, flags, top categories, completion/reason), last human review actor/time, existing response annotations with sentiment/labels/actor metadata, and an inline reviewer-note form. The responses inbox drawer and dedicated response detail page both wire the form to `useCreateResponseAnnotation`, preserving the existing approve/reject flow. Focused coverage lives in `apps/web_v2/tests/responses/response-detail.test.tsx`. Verification passed: focused Vitest (`response-detail.test.tsx`), `apps/web_v2` `tsc --noEmit`, `eslint . --ext .ts,.tsx`, `pnpm.cmd build --filter web_v2`, `python scripts/update-indexes.py`, and `python scripts/rebuild-graphify.py`.
- 2026-06-05 Phase 3 (net-new Developer surfaces) started — Exports surface shipped (audit #2). Per the user's per-surface scope decision, only Exports was built this session. New `/projects/[slug]/developers/exports` route + `ExportsClient` lists CSV export deliveries (status filter pills, pagination, status chips, error surfacing, empty/loading states) and triggers new exports via `useCreateCsvExport`; deliveries that are `SUCCEEDED` with an `artifactAssetId` get a Download action. Added the previously-missing `downloadExport` client fn (`lib/semblia-api.ts`) — it fetches the 302 download route, follows the cross-origin redirect to the signed storage URL, and returns `{ blob, filename }`; the new `useDownloadExport` hook stays DOM-free so the client owns the object-URL/anchor download. Wired Exports into `DeveloperShell` (new `exports` sub-tab) and the Developers overview (new count card). Added an "Export CSV" action to the Responses inbox filter bar (audit #760) that queues an export and toasts a link to the Exports page. Coverage: `apps/web_v2/tests/developers/exports-client.test.tsx` (5 tests: empty state, list+download affordance, browser-download trigger, queue-from-header, failed-delivery error/no-download). Pre-existing `search-placeholders.test.tsx` updated with a `next/navigation` router mock (the filter bar now uses `useRouter`). Verification: `tsc --noEmit`, `eslint . --ext .ts,.tsx`, full Vitest (24 files / 91 tests), `pnpm build --filter web_v2` (exports route present in output), and `python scripts/update-indexes.py` all pass. Remaining Phase 3 surfaces (outbound webhooks #1, native integrations #3, action-audit #7) and Phase 4 (Collect studio config #8/#9/#12) are still pending. Note for backend (Codex lane): download relies on the signed-URL storage host allowing CORS reads from the web origin.
- 2026-06-05 Phase 3 continued — Outbound webhooks surface shipped (audit #1), full CRUD per the per-surface scope decision. New `/projects/[slug]/developers/webhooks` route + `WebhooksClient` with two `PageTabs` views: **Endpoints** (list name/url/status chip ACTIVE·DISABLED·REVOKED, subscribed-event count, last success/failure relative time; per-row actions Edit / Rotate secret / Disable / Revoke gated by status) and **Deliveries** (status filter pills, pagination, per-row event/attempts/HTTP-status/next-attempt, error surfacing, Retry on FAILED/EXHAUSTED). Create flow is a dedicated `/webhooks/new` page (`CreateWebhookForm`) mirroring the keys create→reveal pattern: name + URL + event picker, then a one-time `signingSecret` reveal via the shared `RevealPanel`/`ConfirmCloseDialog`. Edit is an inline dialog (`EditEndpointDialog`) per endpoint wired to `useUpdateOutboundWebhookEndpoint`; rotate-secret surfaces the new secret in a `RevealStep` dialog. Shared event catalog + `EventTypePicker` + `humanizeWebhookEvent` in `webhook-events.tsx`; reused the exports `DeliveryStatusChip` for delivery rows. Wired Webhooks into `DeveloperShell` (new `webhooks` sub-tab between Agents and Exports) and the Developers overview (active-endpoint count card). All 11 pre-existing `use-outbound-webhooks-api.ts` hooks now have a consumer (closing audit #1's "zero consumers"). Coverage: `apps/web_v2/tests/developers/webhooks-client.test.tsx` (5 tests: empty state, endpoint listing + actions, rotate→confirm→reveal, revoke→confirm, deliveries-tab failed delivery error + retry). Verification: `tsc --noEmit`, `eslint . --ext .ts,.tsx`, full Vitest (25 files / 96 tests), `pnpm build --filter web_v2` (both webhooks routes present in output), and `python scripts/update-indexes.py` (merged graph 5652 nodes / 9702 edges) all pass. Remaining Phase 3 surfaces (native integrations #3, action-audit #7) and Phase 4 (Collect studio config #8/#9/#12) are still pending.
- 2026-06-05 tracker/CSP reconciliation: GitHub Project 1 and Linear project state were checked live. GitHub Project 1 was stale at the 2026-05-30 housekeeping snapshot; open board items were #26 admin go-live (Ready), #27 web_v2 CSP (Ready before this fix), #28 dependency hygiene (Ready), #29 scheduled-switch race (Backlog), and draft PR #30 (In progress). Linear project `Semblia` was stale from 2026-05-26 and still listed analytics as remaining; canonical Linear items are TRE-52 analytics (should mirror closed GitHub #25), TRE-53 admin go-live, TRE-54 CSP, TRE-55 dependency hygiene, and TRE-56 scheduled-switch race. The CSP gap is now filled locally: `apps/web_v2/next.config.ts` sets app-wide security headers, including a `Content-Security-Policy` that allows Razorpay Checkout script loading from `https://checkout.razorpay.com` and frames from `https://api.razorpay.com` / `https://checkout.razorpay.com`, while preserving Clerk, app API, media/font/image, and local development connection needs. `apps/web_v2/tests/config/security-headers.test.ts` covers the Razorpay allowances and registered headers. Verification before ledger/index refresh: `corepack.cmd pnpm --filter web_v2 exec prettier --check .\app\ .\components\ .\hooks\ .\lib\ .\tests\` passed; focused `corepack.cmd pnpm exec vitest run tests/config/security-headers.test.ts --reporter=verbose --testTimeout=10000` passed (1 file / 2 tests); `corepack.cmd pnpm exec tsc --noEmit` passed; `corepack.cmd pnpm exec eslint . --ext .ts,.tsx` passed with one pre-existing warning in `tests/developers/integrations-client.test.tsx`; full `corepack.cmd pnpm test` passed (28 files / 105 tests); `corepack.cmd pnpm build --filter web_v2` failed on the known Windows/Corepack pnpm mismatch (`current pnpm is v11.5.1` vs repo pin `11.1.3`), and the required direct `pnpm.cmd build --filter web_v2` rerun passed with all formatter entries unchanged.
- Tracker closeout after the local CSP fix: GitHub issue #27 was commented with the verification details, closed as completed, and moved to Done in GitHub Project 1. GitHub Project 1 readme/description now reflects the current v2-only repo state, the CSP closeout, and the remaining active items. Linear project `Semblia` summary/description was refreshed; TRE-52 analytics and TRE-54 CSP are Done; TRE-54 and TRE-52 issue bodies now describe the resolved state; duplicate Linear shadows TRE-48, TRE-49, TRE-50, and TRE-51 are marked Duplicate against canonical TRE-53, TRE-54, TRE-55, and TRE-56; and the two active Linear milestone descriptions were updated so analytics/CSP no longer appear pending. The duplicate cleanup briefly auto-closed GitHub mirrors #26/#28/#29 through the GitHub/Linear attachment integration; those issues were immediately reopened and their Project statuses restored to #26 Ready, #28 Ready, and #29 Backlog. The stale GitHub attachments were then removed from the duplicate Linear shadows before returning them to Duplicate so the canonical GitHub mirrors remain open. Remaining canonical tracker items are GitHub #26 / TRE-53 admin go-live, GitHub #28 / TRE-55 dependency hygiene, and GitHub #29 / TRE-56 scheduled-switch race hardening, with Resend, hosted forms, and Collect studio follow-up remaining continuity-led work.
- 2026-06-06 integrations surface UX pass (frontend-only, per user scope decision). The Developers → Integrations surface used generic/incorrect provider glyphs (Linear was a `KanbanIcon`; Slack/Notion/GitHub were Phosphor logo glyphs, not real marks). Added `components/developers/integrations/provider-icons.tsx` with accurate brand SVGs — Slack's official 4-colour mark (worldvectorlogo `slack-new-logo`), GitHub/Notion as monochrome `currentColor` glyphs, Linear in brand purple `#5E6AD2` (Notion/Linear/GitHub paths verbatim from simple-icons). `integration-providers.ts` now types `icon` as `BrandIcon` and references these; the connect cards, connection rows, and connect dialog drop the Phosphor `weight` prop and present marks on a neutral `bg-background` tile so brand colour shows (revoked rows get `grayscale`). Also tightened field-helper copy (where to find Slack channel ID, Notion page/DB ID, Linear team ID, GitHub owner/repo). Three further user-requested gaps — **delete**, **re-enable a disabled connection**, and the **OAuth resource picker** (authorize-then-pick channels/repos instead of pasting IDs) — all require backend work and were explicitly deferred to a dedicated backend pass; recorded in `docs/continuity/open-questions.md` (note: only GitHub is configured as a Clerk OAuth provider today). Verification: `tsc --noEmit`, `eslint . --ext .ts,.tsx` (clean), full Vitest (29 files / 110 tests, integrations test green), targeted Prettier, and `pnpm.cmd --filter web_v2 build` all pass.
- 2026-06-07 integrations OAuth repair is implemented in the working tree. The deferred control gaps from the 2026-06-06 UX pass are now filled: `api_v2` has connection revoke/delete (`DELETE /v2/projects/:slug/integrations/connections/:id`), re-enable (`POST .../connections/:id/enable`), Clerk-OAuth token/scope verification before create/enable/resource discovery and update, and `GET /v2/projects/:slug/integrations/providers/:provider/resources` for provider-side destination discovery. Slack, Notion, Linear, and GitHub adapters list channels/pages-or-databases/teams/repos through the connected account token and return canonical config objects, so customers authorize the provider and pick a destination instead of pasting IDs. The generic update path now normalizes empty OAuth scope updates back to provider-required defaults before saving, preventing a scope-stripping bypass. `web_v2` starts Clerk external-account OAuth with provider default scopes, waits for the connected account, fetches resources from the API, creates the connection with the selected server-discovered config, and exposes disable, enable, and revoke controls on existing connections. Remaining caveat is platform-side only: production Clerk/provider OAuth apps still need credentials, redirect URLs, and scopes configured; this is not customer setup. Verification before index refresh: `corepack.cmd pnpm --filter @workspace/types build`; `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm --filter api_v2 lint`; `corepack.cmd pnpm --filter api_v2 test` (72 files / 453 tests); `pnpm.cmd exec tsc --noEmit --pretty false` in `apps/web_v2`; `pnpm.cmd exec eslint . --ext .ts,.tsx` in `apps/web_v2`; `pnpm.cmd --filter web_v2 test` (29 files / 112 tests); `pnpm.cmd build --filter api_v2`; and `pnpm.cmd build --filter web_v2` all pass.
- 2026-06-09 ownership-transfer finalize + stub sweep + UX walkthrough. (1) Project ownership transfer (Codex backend + Claude UI from `docs/plans/2026-06-08-project-ownership-transfer.md`) was completed and verified: applied the pending `20260608170000_project_ownership_transfer` migration to the local DB via `prisma db execute` + `migrate resolve --applied` (drift workaround), regenerated the client; api_v2 typecheck + 463 tests, web_v2 typecheck/eslint/full-vitest all pass. The Settings→Danger transfer dead-end was refined: when no other members exist the disabled Transfer button now explains itself with an "Add a member" link to `/settings/members` instead of being silently disabled. (2) **MFA sign-in lockout (P0)** fixed: account security lets users enable TOTP MFA, but the custom sign-in form rejected the second factor ("not yet supported"), locking out anyone who enabled it. Added a real two-step-verification step (`components/.../sign-in/_form.tsx`) — 6-digit authenticator OTP via `InputOTP` + backup-code fallback — using Clerk's `SignInFuture` flow API (`signIn.mfa.verifyTOTP()` / `verifyBackupCode()`, confirmed via Context7), then `signIn.finalize()`. Also handles `needs_client_trust` through the same step. (3) MFA setup QR placeholder ("Tap to open in authenticator app" dashed box) replaced with a real `QRCodeCanvas` (reusing the `qrcode.react` dep). (4) API-key update dead form fixed: the key detail Settings tab had an editable name + rate-limit slider with a permanently-disabled Save ("no update endpoint"). Codex (driven directly via `codex exec` since the CLI was off-PATH for the rescue companion) added `PATCH /v2/projects/:slug/api-keys/:keyId` (cap `MANAGE_CREDENTIALS`, body `{ name?, rateLimit? }`, `api_key.updated` audit, 467 api_v2 tests) + `updateApiKey` client + `useUpdateApiKey` hook; Claude wired the Save button. Verified live end-to-end on a dev server (rename persisted across reload). Stub sweep across `components/`/`app/`/`lib/` found no other dead handlers/`href="#"`/TODOs (only the internal `/design` gallery). The Hosts custom-domain "Coming soon" card is intentionally kept (real TLS/DNS infra, honest manual fallback). Verification: web_v2 `tsc --noEmit`, `eslint . --ext .ts,.tsx`, full Vitest (29 files / 113 tests), `pnpm.cmd build --filter web_v2` all pass; api_v2 gates green via Codex; `python scripts/update-indexes.py` refreshed.
- 2026-06-06 Phase 4 (Collect studio config) shipped, closing the UI↔API contract remediation. Two contract gaps from `docs/ui-api-contract-audit-2026-06-04.md` were the dirty working tree carried over from the prior session and are now wired and committed. (#8/#9) Studio draft publish: `web_v2` previously only saved drafts and had no way to promote them to the live hosted form, even though the backend `PUT /v2/projects/:slug/forms/:formId/draft/publish` endpoint existed. Added `publishFormDraft` client (`lib/semblia-api.ts`), extended `StudioDraftProvider` with `publish()` (saves any pending edits first, then promotes the resulting version via `{ expectedVersion }`), an `isPublishing` flag, and a `hasUnpublishedChanges` derivation (`version > publishedVersion`). `StudioTopbar` demotes Save to `variant="outline"`, adds a primary Publish button (enabled when dirty or unpublished, busy state while publishing) and an "Unpublished" badge; `StudioShellInner` threads the props and a toast-wrapped `handlePublish`. (#12) Per-form A/B traffic weight: the `abWeight` field was rendered read-only in the form list but never editable from the UI. Added `AbWeightDialog` (number input + 0/25/50/75/100 preset buttons, client-side 0–100 validation) and an "A/B weight" row action on both `FormItem` and `FormItemCard`; `FormConfigList` wires it to `useUpdateFormById` with `{ abWeight }`. Coverage: extended `tests/collect/form-config-list.test.tsx` (weight-dialog flow) and new `tests/collect/studio-topbar.test.tsx` (4 cases: disabled/enabled/unpublished-badge/busy publish states). Cleaned the pre-existing unused-import lint warning in `tests/developers/integrations-client.test.tsx` in passing. Verification: `tsc --noEmit`, `eslint . --ext .ts,.tsx` (clean, zero warnings), full Vitest (29 files / 110 tests), targeted Prettier, `pnpm.cmd --filter web_v2 build` (all collect routes present), and `python scripts/update-indexes.py` (3 files indexed, store 1764 chunks, merged graph 5715 nodes / 9783 edges) all pass. With #8/#9/#12 done, the audit's Phase 4 is complete and no contract-remediation phases remain.
- 2026-05-30 housekeeping pass after legacy app removal: root scripts no longer reference deleted `@workspace/widget`; Dockerfile now targets `api_v2`; `packages/ui` scans `apps/web_v2` instead of deleted `apps/web`; stale generated declarations and npm lock residue were removed from `packages/types/src`; pnpm settings moved from the ignored `package.json#pnpm` field into `pnpm-workspace.yaml` with `pmOnFail: download`, `verifyDepsBeforeRun: warn`, and explicit pnpm 11 `allowBuilds`; the root package-manager pin is aligned to `pnpm@11.1.3` so Turbo child tasks no longer see a different pnpm than the repo declares; `web_v2` Next and `eslint-config-next` are aligned to `16.2.6`; current API docs and the historical control-plane plan were renamed away from legacy names. Verification for this pass is recorded below.
- Housekeeping verification passed: `corepack.cmd pnpm install`, `corepack.cmd pnpm build --filter api_v2`, `corepack.cmd pnpm --filter api_v2 typecheck`, `lint`, and `test` (62 files / 402 tests), `cd apps/web_v2 && corepack.cmd pnpm exec tsc --noEmit`, `cd apps/web_v2 && corepack.cmd pnpm exec eslint . --ext .ts,.tsx`, `corepack.cmd pnpm --filter web_v2 test` (21 files / 80 tests), `corepack.cmd pnpm build --filter web_v2`, `corepack.cmd pnpm --filter admin typecheck`, `lint`, and `corepack.cmd pnpm build --filter admin`, `corepack.cmd pnpm --filter @workspace/forms-core typecheck`, `test`, and `build`, `corepack.cmd pnpm --filter forms_runtime typecheck`, `lint`, `test`, and `build`, recursive `corepack.cmd pnpm typecheck`, `lint`, `test`, and `build`, `python scripts/update-indexes.py`, and `python scripts/rebuild-graphify.py`. Index refresh ended at 1591 vector chunks and merged graph 5243 nodes / 8811 edges.
- 2026-05-30 GitHub Project sync: updated `anubhabx` project 1 readme/description to the v2-only state, closed stale analytics issue `#25` as shipped and set its project status to Done, commented dependency hygiene issue `#28` to narrow remaining scope to Prisma/advisory review after this Next/pnpm pass, and moved draft PR `#30` to In progress. Linear was not locally available in that session; the linked GitHub issues for TRE-52 and TRE-55 were updated so the configured GitHub/Linear integration could mirror the sync.

- 2026-06-11 forms v4 — parametric theming over the freeform builder (architectural session; rendering deferred). The 2026-06-10 product decision (Notion; implementation contract `docs/plans/2026-06-11-forms-v4-parametric-theming.md`) landed in seven commits: `fb4bbf0a` plan doc; `3274da20` derivation engine extended to the final 9-knob surface (adds `neutralTone`, `buttonStyle`, `typePairing:"inherit"`; interactive accent states, focus ring, density spacing, `resolveThemeSnapshot` resolving both schemes at publish, `--tf-*` CSS vars); `ff9acc23` versioned contract (`FormDefinitionDoc` schemaVersion 2 splitting structure/layout-preset/theme/content, `publishFormDefinition` write-time validation + derived snapshot, self-contained lossy `migrateFormDoc` v1→v2, theme-telemetry event schemas, loud render stub, `/schema` `/theme` `/telemetry` `/render` subpath exports with `sideEffects:false`); `f3e397b0` web_v2 demolition (all freeform studio controls/preview/token systems deleted; `/collect/[formId]` is a marked rebuild stub; forms list keeps management with preset-keyed thumbnails; creation posts no config; shared input primitives moved to the widget studio, which stays freeform per user scope decision); `75613f10` forms-core/runtime demolition (898-line renderer + FormTokens + esbuild client pipeline deleted; hosted pages serve the script-free stub through `migrateFormDoc`; CSP collapses to `script-src 'none'`; submit pipeline untouched; mock mode serves a publish-validated default doc); `c9fd8fa9` embed delivery (`packages/forms-embed` `<semblia-form>` Shadow DOM custom element, one SSR fragment round trip from new `forms_runtime` `*/__embed` with CORS + edge caching; build fails over 3 KB gzip, actual 806 B); `66d226dc` api_v2 backend via direct `codex exec` (the codex-rescue wrapper failed off-PATH again) — config writes store only `publishFormDefinition` output with 422s, legacy studio drafts rejected loudly, runtime resolve migrates on read and exposes sha256 `configEtag`, `scripts/backfill-forms-v4.ts` (`forms:backfill-v4`, `--dry-run`), direct-submissions backing form uses the shared default doc, and `POST .../theme-telemetry` persists knob batches as `ProjectActionAudit` rows via new `recordMany` (orchestrator refactor away from Codex's WidgetAnalytics column-overloading). Verification: forms-core 140 tests, forms-embed 6, forms_runtime 21, api_v2 73 files / 475 tests, web_v2 typecheck/eslint/26 files / 92 tests, all builds green. Next session is the UI rebuild: parametric studio + the four layout-preset renderers; until then every hosted form/embed intentionally serves the loud stub. Backfill against the live DB (`pnpm --filter api_v2 forms:backfill-v4`) has not been run yet.

- 2026-06-12 account-shell UX rework + cross-cutting fixes. The Account area (`(account-shell)/account/*`) got its first recorded rework pass (artifacts at `docs/ui-rework/2026-06-12-account-shell/`): PlanCard no longer offers "Cancel subscription" on FREE (title-cased plan name, "₹0 / month · no billing" subtitle, paid behavior unchanged); UsageMeter rows at 100% show an inline brand "Upgrade" anchor to `#plans`; PlanSwitcher features renamed "testimonials"→"responses" to match the usage meter; the permanently-disabled "Add card" decoy was removed (read-only Razorpay-mirror explanation moved to the section description); Defaults visibility copy dropped the retired publish concept; the Notifications page gained a live "Email alerts" Switch (first consumer of `useUpdateNotificationPreferences`), a "Show more" pager driven by `hasNext`, and `settings-section-enter` motion parity. Live-testing the toggle exposed a **P0 api_v2 CORS bug: `buildApiV2CorsOptions` omitted `PUT`**, so every browser preflighted PUT (notification preferences, form draft save/publish) failed — fixed in `src/config/security.ts` + covering assertion in `security.spec.ts`. Also shipped: `apps/web_v2/app/robots.ts` + root-layout `robots: { index:false, follow:false }` metadata and `apps/admin/src/app/robots.ts` so the authenticated control plane and admin panel are never crawled (public form surfaces on forms_runtime stay indexable). Known backend follow-up recorded in the rework after.md: `billing.service.ts` lazy FREE-subscription creation races the `userId` unique constraint (P2002) when billing queries land concurrently — needs upsert/catch. Verification: web_v2 tsc/eslint/vitest (26 files / 94 tests, 2 new)/build; api_v2 typecheck/lint/security spec 6/6; email toggle verified live off→on.

- 2026-06-12 (late) `/projects` workspace-home structural rework — second rework pass on the entrypoint (artifacts at `docs/ui-rework/2026-06-12-projects/`, including live before/after screenshots). The 2026-05-23 pass had fixed row internals but left the page a full-bleed thin row over an ~80% empty viewport in the common 1–5 project regime, with the richer card view unreachable (toolbar gated to ≥6 and default view `list`). Rework: centered `max-w-6xl` workspace-home column (brand-rule "Workspace" eyebrow + title + summary line) replaces the full-bleed `PageHeader` band on this page; summary renders the previously-unused `totalResponses`/`totalPending` ("N projects · N responses · N pending review", pending in warning amber); default view is now `grid` (persisted choice wins, toggle still ≥6); `ProjectCard` lost the double-brand top stripe and got a worded stat footer via ItemCard's `footer` slot; new dashed `NewProjectTile` ghost cell (compact horizontal variant on mobile, grid equal-rows only from `sm:`); list view (≥6) renders inside a rounded `bg-card` panel with the doubled `divide-y`+`border-b` separator bug fixed; first-load failure now has a designed error state wired to a new `refetch` from `useProjects`; `RefreshingDataBadge` moved to the header (visible at all counts); entrance stagger capped at 6 steps; skeletons rebuilt to mirror final shapes. Coverage: new `tests/projects/projects-client.test.tsx` (summary+ghost-tile, error→retry→recovery). Verification: web_v2 `tsc --noEmit`, `eslint` (0 warnings), Prettier, full Vitest 27 files / 96 tests, `pnpm build --filter web_v2`, indexes refreshed. Follow-ups recorded in `after.md`: sign-in POST 500 observed during the live walkthrough (auth surface, separate session); consider a `PageHeader` max-width content option if another sidebar-less surface appears.

- 2026-06-13 full-bleed revert + settings/nav/defaults rework (web-led; artifacts at `docs/ui-rework/2026-06-13-fullbleed-settings-nav/`, including live before/after screenshots). The 2026-06-13 `4401c2dd` "contained layout" commit had centered top-level content on a `max-w-6xl` rail while band borders stayed full-bleed — glaring at wide viewports. Per the user's locked decision, **full-bleed is restored app-wide**: `contained`/`maxWidth`/`contentClassName` were deleted from `PageHeader`/`PageBody`/`PageToolbar` and stripped from ~30 call sites (scripted), including the `/projects` workspace-home (kept its grid/ghost-tile/stat-footer rework, dropped the rail, grid now `xl:grid-cols-4`). (1) **Nav**: new shared `components/nav/account-nav.ts` is the single source for the account area; the avatar dropdown (`user-menu.tsx`) now lists Profile/Security/Notifications/Billing + All projects + Sign out with active state (was only Profile/Billing) and the duplicated-email header is fixed; the account sidebar consumes the same model and dropped the Defaults entry. (2) **Settings UX**: `SettingsSection` became a card (border + `bg-card`, title/description header divided from body) with a `danger` tone and a `flush` option for edge-to-edge divided lists — lifting hierarchy across every settings + account page; new `components/ui/color-picker.tsx` (swatch → popover: 12 presets + `#` hex input + OS-picker "Custom" + EyeDropper + clear) replaces the raw `<input type=color>`; `SettingsFooter` gained a Vercel-style "unsaved changes" indicator; account `profile` lists flattened to divided rows and the Danger zone uses `tone="danger"`; logo preview is `object-contain`. (3) **Account-level defaults removed e2e (contract level)**, resolving the open question — defaults are platform-governed, not user-settable: deleted the `/account/defaults` page + `useAccountDefaults`/`useUpdateAccountDefaults` hooks + `fetch/updateAccountDefaults` client + query key; deleted `AccountDefaultsController` + `AccountDefaultsModule` (the `GET/PATCH /v2/account/defaults` routes are gone) and the user read/write service methods; project creation now derives from `parseAccountDefaults(null)` (no `User.defaults` read, no default-logo clone). The physical `User.defaults` column / `accountDefaultsLogoAsset` relation / `MediaAssetPurpose.ACCOUNT_DEFAULTS_LOGO` enum + the now-internal `V2AccountDefaultsDTO`/`V2UpdateAccountDefaultsBody` family are a **deferred** schema-cleanup pass (Codex-owned; the Codex CLI was not installed this session). Verification: web_v2 `tsc --noEmit` + `eslint` + `vitest` all green; api_v2 `typecheck` + `lint` + full `test` (73 files / 474 tests) green (updated `projects.service.spec` to the platform-defaults contract + rewrote `account-defaults.spec` to cover only `parseAccountDefaults`); web + api builds + index refresh at close-out. New locked decisions recorded in `decisions.md` (full-bleed app-wide; platform-governed defaults).

- 2026-06-14 forms v4 — render path rebuilt + parametric studio (the deferred UI session from 2026-06-11). Two committed phases on `revamp/v2`:
  - **Render vertical** (`d1f1453c`): the loud "being rebuilt" stub is replaced by real rendering for all four layout presets (card, inline, split, conversational). New `packages/forms-core/src/render/` (`escape.ts`, `fields.ts`, `css.ts`, `runtime-script.ts`, `index.ts`): every preset renders SSR HTML from a `PublishedFormDoc`, themed **entirely** by the publish-time derived `--tf-*` snapshot (preview === served form). Progressive enhancement — forms work with JS disabled (native `required`/validation, pure-CSS star/nps/emoji ratings, server-rendered success). One **constant** inline runtime script adds `showIf` conditional reveal + conversational stepping; per-form data rides a non-executable `<script type="application/json">` island so the script bytes (and its CSP hash) stay stable; `renderPublishedFormPage` returns `inlineScripts` for the runtime to hash. New API: `renderPublishedFormPage` (full doc), `renderPublishedFormFragment` (Shadow DOM embed, zero executable script), `FORM_RUNTIME_SCRIPT`; the old `renderFormStub*`/`FormsV4NotImplementedError` became outage/unpublished states. `forms_runtime` now migrates+publishes (derives) on read then renders, sets a **per-response CSP** carrying the runtime script's sha256 hash, server-renders success on `?submitted=1` (no-store, no script), and answers `?embed=1` submits with JSON+CORS so the loader never navigates the host page. `forms-embed` loader intercepts submit → urlencoded cross-origin POST → swaps in the server-rendered success fragment; **1110 B gzipped** (budget 3072 B). Verified live in mock mode (`localhost:3007`): card form + success render correctly with the teal mock brand applied to eyebrow/required marks/submit fill and AA-safe neutrals.
  - **Parametric studio** (committed alongside; see git): `/collect/[formId]` is no longer a stub — new `components/collect/studio/` (`studio-client.tsx`, `studio-editor.tsx`, `studio-preview.tsx`). Four tabs (Content / Questions / Layout / Theme): Content edits copy + after-submit behavior; Questions is a full structure editor (add/remove/reorder, type, required, placeholder, helper, options for choice kinds, and conditional `showIf`); Layout picks one of the four presets; Theme exposes the full 9-knob surface (brand color via `ColorPicker`, appearance, radius, density, typeface, surface, accent intensity, neutral tone, button style) plus preset seeds (default/clean). **True WYSIWYG** preview renders through the exact production `forms-core` renderer into a sandboxed iframe (desktop/mobile toggle). Draft/publish wired to the v4 contract: `PUT …/draft` (`{draft, expectedVersion}`) + `PUT …/draft/publish` (`{expectedVersion}`) via new `usePublishFormDraft`; dirty/unpublished status pill; publish saves first if dirty. New `tests/collect/studio-editor.test.tsx` (4 tests, Vitest-native matchers). Verification: web_v2 `tsc --noEmit`, `eslint` (clean), full Vitest **28 files / 100 tests**, `pnpm --filter web_v2 build` (the `/collect/[formId]` route compiles); forms-core 132 + forms_runtime 22 + forms-embed 7 tests; indexes refreshed.
  - **Remaining forms-v4 tail**: per-question `file` upload still posts urlencoded (api submit parser is JSON/urlencoded only — multipart upload is a separate SUBMISSION_ATTACHMENT flow); embed conditional-reveal/stepping is disabled in shadow-DOM embeds (no executable script there) — hosted pages get full enhancement; a visual-regression matrix (presets × representative themes) and a dedicated `/critique`+`/polish` design pass on the studio chrome are recommended follow-ups; `pnpm --filter api_v2 forms:backfill-v4` against the live DB still has not been run.

- 2026-06-14 (later) forms v4 — per-question file upload shipped end-to-end (closes the largest forms-v4 tail item; file upload is no longer urlencoded-only). A `file` question now actually uploads on hosted pages and the full page; it degrades to an honest "use the hosted form" note in shadow-DOM embeds (no executable script) and shows a `<noscript>` requirement without JS. Architecture decision (orchestrator, user-approved scope): a NEW **signed** `POST /v2/runtime/forms/upload-intent` (parallel to resolve/submit) mints a `SUBMISSION_ATTACHMENT` presign scoped to the resolved form's project + the **forwarded browser IP as principal** — the SAME principal `submitRuntimeForm` derives — so the existing `activatePublicSubmitAssets`/`attachPublicSubmissionAssets` linking (which requires `createdByActorId === submit principal`) succeeds; a dedicated signed endpoint was chosen over the origin-trust public upload endpoint precisely because the hosted-submit path bypasses origin-allowlist trust and a mismatched principal would break linking. Layers: (api_v2) `media.service.ts` `createRuntimeSubmissionUploadIntent`, `forms.service.ts` `createRuntimeUploadIntent` + `parseRuntimeUrlEncodedBody` now collects repeated `mediaAssetIds[]` and threads them into the runtime submit candidate (the attach pipeline already existed via `createFormSubmissionBodySchema.mediaAssetIds`), new `runtimeFormsUploadIntentBodySchema`, controller endpoint + 2 specs. (forms-core) `render/fields.ts` file control gets `accept=image/audio/video` + status line + `<noscript>`, embeds render a fallback note (`interactive` flag); `render/index.ts` carries upload meta `{url,maxBytes,accept}` in the JSON island + a new `requiresUpload` flag on `RenderedForm`; the **constant** `runtime-script.ts` gained presign→PUT→inject-hidden-`answers[qid]`+`mediaAssetIds[]`→native-submit (bytes stay constant for the CSP hash); `render/css.ts` styles. (forms_runtime) `POST */__upload` signed proxy + `createUploadIntent` service (api + mock with a local `PUT /__mock-upload` sink), and CSP `connect-src` opens to `'self' <FORMS_RUNTIME_UPLOAD_CONNECT_SRC default https:>` **only** when the rendered form `requiresUpload` (plain forms stay `connect-src 'none'`). (web_v2) studio question editor explains the file constraints (image/audio/video, hosted-only). Codex CLI was unavailable (ledger-documented), so the api_v2 slice was implemented inline. Verification: forms-core 148 / forms_runtime 26 / forms-embed 7 (bundle 1110 B) tests; api_v2 typecheck+lint+full test (73 files / 476) green; web_v2 tsc+eslint+full vitest (28 files / 101) + `pnpm build --filter web_v2` green; live mock smoke at `localhost` confirmed `/__upload` mints an intent, the sink accepts the PUT, and plain pages keep `connect-src 'none'`. Also fixed two pre-existing typecheck snags surfaced by the run: a strict-index `mock.calls[0]![0]` in `projects.service.spec.ts` and a closure-`never` narrowing in `tests/collect/studio-editor.test.tsx`. Follow-ups: real-S3 bucket CORS must allow cross-origin PUT from the collect host in production; tighten `FORMS_RUNTIME_UPLOAD_CONNECT_SRC` from `https:` to the exact bucket origin.

- 2026-06-11 forms v4 — parametric theming over the freeform builder (architectural session; rendering deferred). The 2026-06-10 product decision (Notion; implementation contract `docs/plans/2026-06-11-forms-v4-parametric-theming.md`) landed in seven commits: `fb4bbf0a` plan doc; `3274da20` derivation engine extended to the final 9-knob surface (adds `neutralTone`, `buttonStyle`, `typePairing:"inherit"`; interactive accent states, focus ring, density spacing, `resolveThemeSnapshot` resolving both schemes at publish, `--tf-*` CSS vars); `ff9acc23` versioned contract (`FormDefinitionDoc` schemaVersion 2 splitting structure/layout-preset/theme/content, `publishFormDefinition` write-time validation + derived snapshot, self-contained lossy `migrateFormDoc` v1→v2, theme-telemetry event schemas, loud render stub, `/schema` `/theme` `/telemetry` `/render` subpath exports with `sideEffects:false`); `f3e397b0` web_v2 demolition (all freeform studio controls/preview/token systems deleted; `/collect/[formId]` is a marked rebuild stub; forms list keeps management with preset-keyed thumbnails; creation posts no config; shared input primitives moved to the widget studio, which stays freeform per user scope decision); `75613f10` forms-core/runtime demolition (898-line renderer + FormTokens + esbuild client pipeline deleted; hosted pages serve the script-free stub through `migrateFormDoc`; CSP collapses to `script-src 'none'`; submit pipeline untouched; mock mode serves a publish-validated default doc); `c9fd8fa9` embed delivery (`packages/forms-embed` `<semblia-form>` Shadow DOM custom element, one SSR fragment round trip from new `forms_runtime` `*/__embed` with CORS + edge caching; build fails over 3 KB gzip, actual 806 B); `66d226dc` api_v2 backend via direct `codex exec` (the codex-rescue wrapper failed off-PATH again) — config writes store only `publishFormDefinition` output with 422s, legacy studio drafts rejected loudly, runtime resolve migrates on read and exposes sha256 `configEtag`, `scripts/backfill-forms-v4.ts` (`forms:backfill-v4`, `--dry-run`), direct-submissions backing form uses the shared default doc, and `POST .../theme-telemetry` persists knob batches as `ProjectActionAudit` rows via new `recordMany` (orchestrator refactor away from Codex's WidgetAnalytics column-overloading). Verification: forms-core 140 tests, forms-embed 6, forms_runtime 21, api_v2 73 files / 475 tests, web_v2 typecheck/eslint/26 files / 92 tests, all builds green. Next session is the UI rebuild: parametric studio + the four layout-preset renderers; until then every hosted form/embed intentionally serves the loud stub. Backfill against the live DB (`pnpm --filter api_v2 forms:backfill-v4`) has not been run yet.

- 2026-06-14 widgets parametric service and embed runtime shipped from `docs/plans/2026-06-14-widgets-parametric.md`. New `@workspace/brand-theme` extracts the forms theme derivation engine and keeps `forms-core` compatibility facades; new `@workspace/widgets-core` owns widget v1 schema migration, publish snapshots, telemetry event contracts, CSS var emission, and SSR renderers for carousel/grid/masonry/list/wall fragments. `Widget.config` and `Widget.publishedSnapshot` landed with migration `20260614143000_widgets_parametric_config`; flat widget columns are now compatibility/query mirrors. `api_v2` validates widget config writes, publishes draft snapshots with optimistic version checks, serves public widget JSON with ETags/cache headers, serves raw HTML fragments at `/v2/widget-embeds/projects/:slug/:widgetId/fragment`, records widget analytics from the shared contract, and extends trusted-origin CORS to widget embed hosts. `web_v2` rewrote Widget Studio around the parametric definition model and production `widgets-core` preview renderer while preserving the current local draft-store flow; snippet surfaces now emit `<script type="module" src="https://widgets.semblia.com/embed.js" async></script><semblia-widget ...>`. New `@workspace/widgets-embed` ships the dependency-free Shadow DOM custom element loader at 814 B gzip (3 KB budget). Verification passed: brand-theme/forms-core/widgets-core/widgets-embed/types/database/api_v2/web_v2 builds or focused test gates, full API suite (73 files / 477 tests), full web suite (28 files / 101 tests), explicit `apps/web_v2` tsc/eslint, and `web_v2` production build. Follow-ups stay scoped: live Studio save/publish API wiring only if product wants to leave local-store drafts; hosted wall pages, custom domains, and AI brand import remain deferred.

- 2026-06-15 studios reconciliation + widget-studio dead-code cleanup (design/research session, no api_v2/db change). A "design & build the studios from scratch" brief (forms like the Tally drag-drop builder, widgets like freeform Framer/Webflow token editors) was **reconciled** against the already-shipped locked parametric architecture instead of executed literally — taken at face value it would have rewritten forms-v4 + widgets-parametric and violated four locked decisions (2026-06-10 "no drag-and-drop, ever"; 2026-06-11 freeform hard-deleted; 2026-06-14 widgets use the shared brand-theme engine; open-question "do not reintroduce freeform token/composition controls in the widget studio"). Deliverables committed as `344fda1a`: (1) `docs/research/2026-06-15-studio-competitors/` — public-surface competitor research (Typeform/Tally/Jotform/Fillout/Framer/Webflow/Airtable/Feathery, 8 full-page screenshots) with Tresta-scoped takeaways; honest that `agent-browser` (installed, v0.27.2) could **not** drive the user's running logged-in Chrome (profile exclusively locked + no `--remote-debugging-port`, so `--profile Default` hangs and `--auto-connect` finds nothing), so only public pages were inspected, builder UIs behind login were not, and nothing was fabricated; (2) `docs/plans/2026-06-15-studios-reconciliation-and-roadmap.md` — current UX/technical/data-model state + non-conflicting V1/later roadmap. Code committed as `891e9c81`: removed six orphaned flat-token Widget Studio controls (`controls-color/shape/style/typography/theme/density.tsx`, 448 LOC, **zero importers** — the 2026-06-14 plan §2 marked them for deletion but the rewrite left them in-tree). **Drift corrected** in this ledger + `decisions.md` framing: the widget Studio rewrite was described as fully done/"in-tree", but the dead files remained AND the studio still persists to a **local zustand draft store** (`lib/widgets/widget-studio-store.ts`) with no API-backed save/publish — that publish parity (vs. forms, which wired server publish) is the single real functional gap and the top V1 roadmap item. Verification: web_v2 `tsc --noEmit`, `eslint` (clean), full Vitest (28 files / 102 tests), `pnpm build --filter web_v2` (5/5 tasks), and `python scripts/update-indexes.py` (6 orphans removed; total store 1787 chunks; merged graph 6276 nodes / 10939 edges) all green. Next session candidates (all non-conflicting with locked decisions): `/audit`+`/polish` pass on both studio chromes; a starter preset×theme gallery at form/widget creation (mocks-first, biggest product win); widget publish-parity (Codex api_v2 lane + Claude UI wiring).

- 2026-06-15 (later) Widget Studio `/audit` + a11y hardening (`ac47bee0`). Ran the `/audit` design skill statically over `components/widgets/studio/` + `components/widgets/` (couldn't run the authed app — agent-browser can't reach the logged-in session, see [reference]). Score 19/20 (Excellent): theming/perf/responsive/anti-patterns all clean; the only sub-P1 a11y gaps were fixed: (P2) the auto-theme preview pulse now respects `prefers-reduced-motion` (WCAG 2.3.3 — static resolve to the viewer's `prefers-color-scheme` instead of a 5s light↔dark cycle), and (P3) the mobile studio tablist got the full `role="tabpanel"`/`id`/`aria-controls`/`aria-labelledby` wiring. No visual change for default users; the broader subjective `/polish` chrome pass + a creation starter-gallery remain for a session that can view the rendered authed studio. Verified: tsc, eslint, full Vitest (28 files / 102 tests), prettier, `pnpm build --filter web_v2` (5/5), `update-indexes.py` (merged graph 6276 nodes / 10939 edges).

- 2026-06-16 form creation starter gallery shipped (`38179b89`, web_v2-only, frontend; no backend/db change). Forms previously always started from the API default doc — the single/stepped `EmptyKindPicker` was vestigial (its picked kind no longer shaped the config since forms-v4). Replaced it with a real **starter gallery** (the Jotform/Fillout "template system" + Typeform/Fillout layout variety) expressed inside the locked parametric model: each starter is a curated, constrained combination of an existing layout preset + theme seed + starter question set + copy — never freeform. New `lib/collect/form-starters.ts` (4 starters: Quick testimonial/card, Detailed review/split, Guided flow/conversational, Compact inline/inline), `components/collect/form-starter-gallery.tsx` (reuses `FormCardPreview` thumbnails + a "Blank form" escape hatch), and `form-config-list.tsx` wiring (empty state renders the gallery; "Create new" opens it in a dialog). Selection posts the starter's `config` through the EXISTING `useCreateForm` API (`{name, description, config}`) — no backend change; "Blank form" posts no config (prior behavior). Coverage: `tests/collect/form-starters.test.ts` validates every starter against the REAL `publishFormDefinition` pipeline (guarantees no 422 at create) + `tests/collect/form-starter-gallery.test.tsx`; updated the existing `form-config-list.test.tsx` create case to the gallery flow. Verification: web_v2 tsc/eslint/prettier, full Vitest (30 files / 108 tests), `pnpm build --filter web_v2` (5/5), `update-indexes.py` (merged graph 6282 nodes / 10946 edges) all green. NOTE: the claude-mem plugin worker was unreachable and its hooks blocked the Read tool this session; the test patch + this ledger entry were applied via Python through Bash as a workaround.

- 2026-06-16 live studio verification on the running stack (api*v2 :8100, web_v2 :3002, Docker Postgres+Redis), driven logged-in via agent-browser with the test account. **Verified**: the 2026-06-15 form starter gallery works end-to-end against the real backend — selecting a starter posts its `config` and the studio opens rendering the starter content (`docs/research/2026-06-16-studios-live/`). **Discovered defect** (pre-existing, now in open-questions Â§Discovered Defects): the Widget Studio bails to "this widget no longer exists" on reload/direct-nav of a real widget because its zustand draft store keys snapshots by local `w*…`ids, not the API id, so cold loads can't find`snapshots[apiId]` — the same local-store/server-draft gap as the deferred publish-parity item. A symmetric widget "starter look" feature was built and then **reverted** because live verification showed it rides on that defect (the look could not apply reliably); it should re-land after the widget studio hydrates by API id via the server draft API. No committed code changed for widgets this session beyond the prior a11y commit; the forms gallery (`38179b89`) stands. Evidence committed as `c22e701d`.

- 2026-06-17 Form Studio editor rebuilt into a visual inspector (web_v2-only; engine/contract/API/preview untouched, backward compatible). The 2026-06-15 studio was functional but read as a 420px 4-tab **settings form** — every appearance choice was a plain `<Select>` dropdown, theme presets text chips, layouts text-only cards (before-audit ~24/40; recognition-vs-recall 1/4). Three commits on `revamp/v2`: `b05c1131` rebuild — section RAIL (Compose/Questions/Layout/Style; vertical icon+label on `lg`, horizontal on mobile; editor col 420→468px) + NEW `theme-swatch.tsx` (a faithful mini-form rendered from the REAL engine via `resolveThemeSnapshot` — each surface/accent/button tile shows the current theme with one knob changed, can't drift) + NEW `studio-controls.tsx` (`Section`/`Field`/`Segmented`/`OptionCardGroup`/`SwitchRow`/`SelectField`/`AaBadge`); Style = live themed preset cards + segmented appearance + surface/accent/button swatch tiles + corner-radius glyph picker + typeface specimens + guided color overrides behind a "Fine-tune colors" disclosure; Layout = visual `FormCardPreview` miniatures + segmented knobs; Questions = icon TYPE-PICKER popover (Tally-style quick add, grouped) for add + change-type, rows with type glyph/inline label/REQ pip. `b6d07aae` polish — keyboard focus rings on all hand-rolled controls (had none) + condition-editor native `<select>`→shadcn `SelectField`. `897848ff` rework docs. **Verified LIVE**: mounted a self-contained harness (StudioEditor+PreviewCanvas, local state, no API hooks) on the auth-gated `/design` gallery, ran the dev server, logged in via agent-browser (test acct), screenshotted the real compiled UI in light mode (`docs/ui-rework/2026-06-17-forms-studio/shot-01..08.png` + before/principles/decision/after.md); harness reverted after. Verification: `tsc --noEmit`, `eslint . --ext .ts,.tsx` (clean), Vitest (collect 34/34; `studio-editor.test.tsx` 6/6 rewritten for the new UI), `pnpm build --filter web_v2` (5/5), `update-indexes.py` (1804 chunks, merged graph 6299 nodes / 10981 edges) all green. after-audit ~35/40. Widget Studio intentionally NOT touched — it still trails (server-draft hydration parity + the same dropdown→visual-picker treatment remain open; roadmap `docs/plans/2026-06-15-studios-reconciliation-and-roadmap.md`). Note: the two pre-existing dirty widget files (`widget-kind-picker.tsx`, `widget-list.tsx`) from before this session were left untouched/unstaged.

- 2026-06-17 Widget Studio editor rebuilt into a visual inspector (web_v2-only; engine/`WidgetDefinitionDoc` v1/draft store/API/shadow-DOM preview untouched, backward compatible) — the companion to the same-day Form Studio rebuild, same workflow (artifacts `docs/ui-rework/2026-06-17-widget-studio/before|principles|decision|after.md`; before-audit ~25/40, recognition-vs-recall 2/4 with three text dropdowns still present). Two commits on `revamp/v2`: `94c0d2d6` rebuild — NEW `widget-theme-swatch.tsx` (`WidgetThemeSwatch`, a faithful mini testimonial card from the REAL engine `resolveBrandThemeSnapshot` — each surface/radius/button/accent/neutral tile renders the current theme with one knob changed, can't drift); `controls-appearance.tsx` fully visual (themed preset `OptionCardGroup` + Remix, segmented mode, engine-derived surface/button/neutral tiles, corner-radius glyph picker, real type specimens) — the three `<Select>` dropdowns (Type/Neutral/Buttons) DELETED; `widget-studio-controls.tsx` six-deep `SectionCollapsible` accordion → a `Layout · Style · Content` section-nav inspector (desktop in-panel tablist; mobile keeps the shell's bottom tab bar); every section (layout/behavior/content/visibility/wall) moved to the shared inspector vocabulary (`Section`/`Field`/`Segmented`/`OptionCardGroup`/`SwitchRow`) re-exported through `studio-primitives.tsx` from the collect studio's `studio-controls.tsx`; orphaned accordion/dropdown/toggle/textarea primitives the rebuild replaced deleted from `studio-input-primitives.tsx`. `97d4b714` polish — focus rings on all hand-rolled controls, desktop tab/tabpanel ARIA wiring (conditional so it doesn't nest in the mobile tabpanels), density label normalized to "Spacious", preset section retitled "Preset", removed a dead typeface-picker prop. Could NOT drive the logged-in Chrome (profile lock — see [reference]) and did not fabricate screenshots; verification is the real build + the structural guarantee that pickers and preview both call `resolveBrandTheme`. Verification: `tsc --noEmit`, `eslint components/widgets/studio` (clean), Vitest (collect/studio-editor 6/6 — shared primitives intact), `pnpm build --filter web_v2` (5/5), `update-indexes.py` (merged graph 6304 nodes / 10990 edges) all green. after-audit ~34/40. **The only remaining widget gap is server-side save/publish parity** (`save()` still writes the local zustand store; `useSaveWidgetDraft` wired-but-uncalled) — the dropdown→visual-picker treatment the forms note flagged is DONE. The two pre-existing dirty widget files (`widget-kind-picker.tsx`, `widget-list.tsx`) from before the session were left untouched/unstaged.

## Executive Status

The original `api_v2` rebuild has been completed through its cross-cutting validation phase. The newer backend-first continuation, driven by the consolidated API/UI/database decisions, has completed the database/API foundation slices:

- normalized public trust and host foundations
- canonical form submission writes
- submission-owned private metadata split
- shared server-side drafts for forms and widgets

The `web_v2` mock layer has been deleted and the major control-plane surfaces now use live v2 APIs. Remaining work should be treated as Phase 7 verification/hardening, deployment readiness, and focused product follow-ups rather than broad mock-to-API wiring.

On 2026-05-03, the backend-first product/architecture stance was locked: Clerk remains primary auth, Clerk Organizations become the workspace/account layer, Semblia projects remain the product/security boundary, Semblia differentiates through in/out integrations and agent-native access, and original collected feedback remains immutable.

Also on 2026-05-03, the first two control-plane implementation checkpoints landed: the Clerk organization/actor foundation is committed, and scoped private API keys plus scoped agent keys are committed in `apps/api_v2`.

On 2026-05-06, implementation paused for a fresh V2 security audit of the recently landed public trust, form submission, testimonial PII, draft, organization, and credential surfaces. The audit found no dependency advisories affecting the V2 workspaces and produced root hardening fixes for public-submit idempotency, invalid-submit throttling, and API-key prefix-collision handling. The UI gap map was refreshed against the new credential and agent-access API surface.

On 2026-05-08, the feedback integrity API surface landed. `CollectionFormSubmission` became the immutable source record with workflow moderation state; annotations, then-available presentation suggestions, and project actor audit rows were separate workflow/presentation layers at that checkpoint. The 2026-06-03 projection cleanup removed presentation suggestions with the old `Testimonial` table; agents and API keys can still annotate, moderate, and publish/unpublish only through scoped capability-gated routes.

Later on 2026-05-08, the outbound webhook and async CSV export foundation landed. Projects now have capability-gated webhook endpoint management, one-time encrypted webhook secrets, signed async delivery processing, delivery retries, and audit rows for mutating actions. CSV exports now create async database-backed delivery artifacts with display-safe submission fields only, download readiness checks, project isolation, and an `export.delivery_failed` webhook event hook.

On 2026-05-10, native thin integrations landed. Projects can now store Slack, Notion, Linear, and GitHub integration connections, resolve user connected-account OAuth tokens through a Clerk-backed token-provider boundary, queue one-way native export deliveries, and map safe feedback/submission payloads into provider-native messages, pages, and issues without bidirectional sync.

Later on 2026-05-10, the local stdio MCP server package for agent clients, a project analytics summary endpoint for agent-safe read workflows, and project-list credential boundary hardening landed. The MCP server uses `SEMBLIA_API_BASE_URL` and `SEMBLIA_AGENT_KEY`, calls the stable private API routes only, exposes safe tools/resources/prompts, and never connects directly to the database. At that checkpoint the summary endpoint was a read projection over existing daily rows and live submission/impression tables; the later API production contract checkpoint added event capture.

Later on 2026-05-10, the API production contract checkpoint added OpenAPI serving, developer-facing docs, backend-produced project access blocks, host-aware public surface resolution, public analytics event capture, notifications list/state/preference APIs, and project action audit reads. This checkpoint was committed as `f9df398`; billing later shipped as the Razorpay Subscriptions-backed B1-B7 track.

On 2026-05-13, the continuity ledger was synced to the committed API production-contract state and the next implementation leg was opened for `web_v2` wiring. The first slice moved current-user loading to the typed `GET /v2/me` client and moved the projects list hook from the simulated mock API to the typed `GET /v2/projects` client, with project list/card components accepting API DTO date strings. Phase 1a then moved project layout validation, sidebar identity/badges, mobile project nav, topbar breadcrumbs, and the project switcher onto typed project data from `apps/web_v2/lib/semblia-api.ts` / `apps/web_v2/hooks/api`.

Later on 2026-05-13, Phase 1b started by making onboarding durable and project-empty-state driven. `User` now records `onboardingStep` and `onboardingData`, `PATCH /v2/me/onboarding` persists step progress, `POST /v2/me/onboarding/complete` marks the flow complete, and `web_v2` redirects incomplete users into `/welcome`. The welcome flow now resumes from the stored step, saves each completed step through `api_v2`, creates the first project through `POST /v2/projects`, and shows the generated hosted collection URL. `/projects` now has a more useful first-use empty state and `/projects/new` is a real project creation route instead of a dead link.

Later on 2026-05-13, the inbound Clerk webhook parser was corrected to accept Clerk's real snake_case `user.created`/`user.updated` payload shape after Svix signature verification. `POST /v2/webhooks/clerk` remains public at the Nest guard layer, valid signed Clerk payloads now map into the internal user DTO, schema failures return `400` instead of being mislabeled as webhook auth failures, and missing server-side webhook secrets now surface as server configuration errors instead of public-auth failures.

Later on 2026-05-13, a `web_v2` hydration/refresh-stability pass added a shared live-query state helper and local refreshing badge. Welcome/onboarding and project topbar identity now require a fresh API response before rendering route-critical user/project state, while project and testimonial list surfaces keep existing rows visible and show a restrained "Refreshing data" badge during background refreshes. A follow-up pass centralized `freshOnMount` across `hooks/api`, moved account billing queries behind hook-level live options, made subscription/billing-profile surfaces wait for fresh data, added refresh badges to invoice/payment-method list refreshes, and added a policy test so future app/page components cannot import `useQuery` directly.

On 2026-05-14, an API-only `web_v2` wiring pass filled out typed client and hook coverage for already-landed backend contracts: current organization, notifications, analytics summary/public event capture, public-surface resolve, project action audit, outbound webhooks, CSV export deliveries, and native integration connections/exports. This pass deliberately avoided UI component/page edits. The skipped mock-backed UI areas are recorded in `docs/plans/2026-05-14-api-only-wiring-ui-deferrals.md`.

On 2026-05-15, the first live-hook usage follow-up moved notifications off mock data. The topbar notification bell now reads live notifications/unread counts and marks linked items read through `hooks/api`; `/account/notifications` now renders the live account inbox, notification preference read state, single mark-read, and mark-all-read actions. At that time larger mock-backed areas still needed adaptation; later checkpoints wired those surfaces and deleted the mock layer.

On 2026-05-18, the project Developers area landed. The project sidebar entry was renamed from "API Keys" to "Developers" and the section was consolidated under `/projects/[slug]/developers/` with sub-routes for overview, private API keys (moved from the old `/api-keys` route), agent keys (newly built UI over the previously unrendered `useAgentAccessOverview` / `useCreateAgentKey` / `useRevokeAgentKey` / `useAgentActions` hooks), a deferred docs stub, and an invisible SDK stub. The private key create dialog now exposes the full 20-scope `V2ApiKeyScope` selector with the backend defaults pre-selected, so newly minted secret keys can be scoped to least privilege from the UI. Agent keys reuse a shared `RevealStep` and the existing list/card item shells; create flow uses preset radio cards backed by `V2AgentAccessPresetDTO`, and the detail page renders an overview with preset summary + scopes plus an actions audit feed scoped to that key. The misleading `/account/api-keys` empty-state page and its account sidebar entry were removed because launch keys are project-scoped. A real bug was fixed in passing: the client and hook for `createAgentKey` posted `{ name, presetId }` but the backend zod schema expected `{ name, preset }`; both surfaces now use `preset`.

On 2026-05-19, the Developers area was refined for UX and separation of concerns. The multi-step `CreateKeyDialog` and `CreateAgentKeyDialog` were promoted to dedicated routes `/projects/[slug]/developers/keys/new?type=…` and `/projects/[slug]/developers/agents/new` so the tall scope catalog and preset picker can breathe instead of overflowing a modal. The reveal step renders inline on the new-key page; only the "leave without copying" guard remains a small dialog. The in-app `/developers/docs` and `/developers/sdk` stubs were removed — `/developers/docs` now server-redirects to `https://docs.semblia.com`, and the Docs sub-tab and overview card render as external links with an out-arrow indicator. Copy across the area was tightened: the overview drops the "Getting started" prose, section heads on `/keys` lose their long subtitle, empty-state descriptions are one sentence (or omitted), eyebrows say "Developers · Keys" / "Developers · Agents" instead of "API keys" / "Agent access", and the "Reset to defaults" / "Pick the least privilege" microcopy on the scope selector collapses to a single "Reset" affordance. A new test asserts the credentials disclosure stays gated behind a click; the agents test that exercised the dialog flow now renders `CreateAgentKeyForm` directly and a complementary test asserts that `AgentsClient` points the empty-state CTA at `/developers/agents/new`.

Later on 2026-05-19, the project Settings area was rebuilt as the canonical "manage everything about a project" surface and committed as `7694bf3`. The query-param-driven `SettingsClient` was replaced by sub-routes under `/projects/[slug]/settings/` — General (`/`), Branding (`/branding`), Visibility (`/visibility`), Social (`/social`), Hosts (`/hosts`), Trust (`/trust`), Members (`/members`), Danger (`/danger`) — each owning its own dirty/save scope. A shared `SettingsShell` (mirror of `DeveloperShell`) renders the `PageHeader` plus a sticky sub-tab toolbar. Shared helpers (`normalizeProject`, `recordToSocialLinks` / `socialLinksToRecord`, `validateAllowedOrigin`, `TagInput`, `SocialLinksEditor`, `SlugChangeDialog`, `DeleteProjectDialog`) live under `components/settings/shared/`. General now exposes `shortDescription` and `projectType` in addition to name/slug/description/tags; slug rename confirmation pushes the router to the new path. Branding wires `logoUrl`, `brandColorPrimary`, and `brandColorSecondary` against `useUpdateProject` with hex validation and a sidebar-avatar live preview. Visibility separates the visibility radios from a moderation card with auto-moderation, auto-approve-verified, and profanity-level controls. Social now uses the extracted editor with the same preconfigured platforms plus custom links. Hosts derives the default `<slug>.testimonials.semblia.com` and `<slug>.walls.semblia.com` hostnames client-side (with copy/open buttons) and shows a `Coming soon` custom-domain card, pending the API endpoint described below. Trust ships the previously unrendered allowed-origins editor (using `useAllowedOrigins` + `useReplaceAllowedOrigins` with client-side mirroring of the backend `allowedOriginSchema`) plus a signing-secret card that exposes `useGenerateSigningSecret` and `useClearSigningSecret` with a one-time inline `RevealPanel` reveal. Members reopens the 2026-05-03 simple-permissions decision and exposes a full role lifecycle: list with avatars/role badges, role-change `Select` per row, remove with last-owner guard, and add-by-userId form. `lib/semblia-api.ts` `addProjectMember` was corrected from `{ email }` to `{ userId }` to match the backend zod schema, `V2ProjectMemberRole` was widened from `"OWNER" | "ADMIN" | "MEMBER"` to `"OWNER" | "ADMIN" | "EDITOR" | "VIEWER"` to match the Prisma `MemberRole` enum, and new web hooks `useAddProjectMember`, `useUpdateProjectMember`, `useRemoveProjectMember` were added with shared query-key invalidation. Danger zone keeps the existing delete flow plus a disabled Transfer ownership row. Two backend gaps were identified at slice close-out: a dedicated `GET /v2/projects/:slug/public-surface-hosts` listing endpoint and an email-based invite path for `addProjectMember`. Both were slated for Codex delegations as separate checkpoints.

Later on 2026-05-19, the first Codex delegation landed (`b7254c1`): `GET /v2/projects/:slug/public-surface-hosts` returns `V2PublicSurfaceHostDTO[]` for project actors with `VIEW_PROJECT`, ordered by `feature` then `hostname`. The shared types now expose `V2PublicSurfaceHostStatus` (`ACTIVE` | `PENDING_VERIFICATION` | `DISABLED`) alongside the pre-existing `V2PublicSurfaceFeature` / `V2PublicSurfaceResourceType` unions. The Hosts settings tab dropped its slug-derived stub for the new `usePublicSurfaceHosts` hook, and renders the live `isDefault` badge plus a status pill per row; the "Coming soon" custom-domain card is retained until self-serve verification lands.

Later on 2026-05-19, the second Codex delegation landed: an email-based invite path for project membership. New Prisma `ProjectMemberInvite` model (migration `20260519160000_project_member_invites`) keyed by `(projectId, email)` with a partial unique index over `status = 'PENDING'`, plus a `ProjectMemberInviteStatus` enum (`PENDING` | `ACCEPTED` | `REVOKED` | `EXPIRED`) and a 14-day default expiry. Four new routes: `GET /v2/projects/:slug/members/invites` (capability `VIEW_PROJECT`), `POST /v2/projects/:slug/members/invites` (`MANAGE_MEMBERS`, rejects OWNER), `DELETE /v2/projects/:slug/members/invites/:inviteId` (`MANAGE_MEMBERS`, idempotent), and `POST /v2/me/project-invites/:inviteId/accept` (self-service, validates current user email matches the invite, transacts the accept + `ProjectMember` upsert). `member.invite_sent` / `member.invite_revoked` / `member.invite_accepted` rows now appear in `ProjectActionAudit`. A new `PROJECT_INVITE_RECEIVED` notification is emitted to invitees who already have Semblia accounts; email delivery is left as a TODO. Shared types add `V2ProjectMemberInviteDTO`, `V2ProjectMemberInviteStatus`, and extend `V2NotificationType`. Web side adds `fetchProjectMemberInvites`/`createProjectMemberInvite`/`revokeProjectMemberInvite`/`acceptProjectMemberInvite`, four matching hooks, the `projects.memberInvites(slug)` query key, and a `PROJECT_INVITE_RECEIVED` icon entry in `notification-utils.tsx`. The Settings → Members tab promotes invite-by-email to the primary CTA, demotes add-by-userId to a collapsed "Advanced" affordance, and adds a Pending invites section with role + age + revoke buttons. Together the two Codex slices brought api_v2 tests from 249 to 297.

On 2026-05-21, Account Defaults landed end-to-end. `packages/database/prisma/schema.prisma` now stores a nullable `User.defaults` JSON document with migration `20260521120000_user_account_defaults`; `packages/types/src/v2.ts` exposes the structured form, moderation, visibility/access, and brand defaults DTOs; `apps/api_v2/src/modules/account-defaults/` adds `GET/PATCH /v2/account/defaults` with zod validation and current-user scoping; `apps/api_v2/src/modules/projects/projects.service.ts` merges saved defaults into `POST /v2/projects` only for fields the request leaves unset; and `apps/web_v2/app/(account-shell)/account/defaults/page.tsx` now renders a real account-settings editor backed by `apps/web_v2/hooks/api/use-account-api.ts` and `apps/web_v2/lib/semblia-api.ts`.

On 2026-05-23, the Clerk signup reconciliation gap was closed. `GET /v2/me` now performs a bounded server-side wait when Clerk auth is valid but the local `User` row has not yet been created by `user.created`; `UsersService.upsertFromClerk()` wakes same-process waiters after the webhook upsert, and timed-out waits return a typed setup-pending `503` with retry guidance. `web_v2` keeps new users on the standalone `/welcome` route after email/OAuth signup, renders a setup loader until the typed current-user query resolves, and only retries the special account-reconciling response with server backoff instead of broad UI polling. On 2026-05-24, the client retry path was capped so a missing/delayed webhook cannot keep users in an infinite loader; exhausted reconciliation now shows an alert-style fallback with a manual retry action.

## Phase Ledger

### Original API Rebuild

| Phase                                   | Status | Commit    | Notes                                        |
| --------------------------------------- | ------ | --------- | -------------------------------------------- |
| 0 Discovery dossier                     | Done   | `1e43be8` | Historical API rebuild discovery.            |
| 1 Prisma schema refactor                | Done   | `bf05b49` | Initial v2 schema refactor.                  |
| 2 `api_v2` scaffolding and shared infra | Done   | `6443bb6` | Nest v2 scaffold and shared infra.           |
| 2.5 tooling hardening                   | Done   | `b281279` | Nest CLI, ESLint, Prettier, smoke-start.     |
| 2.6 `web_v2` Vitest compatibility       | Done   | `7a4d75d` | jest-dom to Vitest-native matcher cleanup.   |
| 3a Users                                | Done   | `35e8f08` | User domain.                                 |
| 3b Projects                             | Done   | `d8004b0` | Project domain and owner membership.         |
| 3b.5 Public-route prerequisites         | Done   | `d562bb4` | Schema deltas, crypto, authz infra.          |
| 3c Widgets                              | Done   | `ecdea31` | Auth widgets, public embeds, public walls.   |
| 3d Testimonials                         | Done   | `5a9e784` | Auth and public testimonial APIs.            |
| 3e Forms                                | Done   | `88c200f` | Auth forms and public form submit.           |
| 4a Webhooks                             | Done   | `2de8edc` | Clerk and Razorpay idempotency ledgers.      |
| 4b Alerts and ops/admin                 | Done   | `f95e784` | Backend groundwork only; no `web_v2` wiring. |
| 5 Cross-cutting validation              | Done   | `cf4476f` | Validation-only close-out.                   |

### Backend-First API Surface Continuation

| Phase                                                        | Status          | Commit    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gap map and locked decisions                                 | Done            | docs only | Consolidated in `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`.                                                                                                                                                                                                                                                                                                                                                         |
| Implementation phase map                                     | Done            | docs only | Stored in `docs/plans/2026-05-02-api-surface-implementation-phases.md`.                                                                                                                                                                                                                                                                                                                                                            |
| 1 migration                                                  | Done            | `01d0cae` | Phase 1 database foundation migration catch-up.                                                                                                                                                                                                                                                                                                                                                                                    |
| 1a Public trust and host models                              | Done            | `8b8c4a3` | Trusted origins, signing secrets, hosted public-surface trust, route-aware public CORS.                                                                                                                                                                                                                                                                                                                                            |
| 1b Canonical form submissions                                | Done            | `0c9f618` | `CollectionFormSubmission` writes with rating, answers, trust, idempotency linkage.                                                                                                                                                                                                                                                                                                                                                |
| 1c Testimonial private metadata                              | Done            | `7aae66d` | Encrypted PII writes, hashed identifiers, public-submit PII removal, authenticated email compatibility shim.                                                                                                                                                                                                                                                                                                                       |
| 1d Studio drafts                                             | Done            | `c56cf68` | Shared `StudioDraft` service and form/widget `GET`/`PUT .../draft` endpoints with optimistic concurrency.                                                                                                                                                                                                                                                                                                                          |
| Phase 1 progress docs                                        | Done            | `0f14884` | Recorded Phase 1a-1d progress.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Continuity docs structure                                    | Done            | `b7c88cf` | Made `docs/continuity/` the canonical durable memory and doc map.                                                                                                                                                                                                                                                                                                                                                                  |
| Historical control-plane plan                                | Implemented     | docs only | `docs/plans/2026-05-03-auth-integrations-agent-access-implementation-plan.md` records the old implementation track for Clerk org mirror, actor model, private/agent keys, outbound webhooks, exports, native integrations, MCP agent access, and friendly UX. Keep it as evidence only; current continuation is v2-only.                                                                                                           |
| Control-plane Task 1 Clerk organization and actor foundation | Done            | `ffae2cf` | Added local organization schema/migration, request actor context, current organization endpoint, org-aware project listing/creation/access checks, and launch capability presets.                                                                                                                                                                                                                                                  |
| Control-plane Task 2 Scoped private API keys and agent keys  | Done            | `5ac7c34` | Added `ApiKeyType.AGENT`, project-bound scrypt-hashed private/agent keys, one-time secret responses, revocation/rotation/usage metadata, API-key actor auth, agent presets, and read/write scope capability mapping.                                                                                                                                                                                                               |
| Deprecated design helper cleanup                             | Done            | `63aec50` | Removed unused `docs/semblia_claude_design/src/*` helper module files.                                                                                                                                                                                                                                                                                                                                                             |
| Security audit refresh                                       | Done            | `0bc7bd1` | Fresh dependency/CVE and code audit before continuing feedback integrity work. Fixed surface-scoped public idempotency, invalid-submit and mode-specific public throttling, API-key prefix collision handling, and refreshed the UI gap map for credentials/agent access.                                                                                                                                                          |
| Control-plane Task 3 Feedback integrity APIs                 | Done            | `09fa77a` | Added immutable submission workflow state, submission annotations/moderation APIs, then-available presentation suggestions, human-only display approval, and project actor audit. Presentation suggestions were removed by the 2026-06-03 projection cleanup.                                                                                                                                                                      |
| Control-plane Task 4 Outbound webhooks and async CSV exports | Done            | `3742765` | Added encrypted webhook endpoints, signed async deliveries/retries, async DB-backed CSV export deliveries/downloads, shared DTOs, webhook dispatch hardening, Hono override refresh, and audit rows.                                                                                                                                                                                                                               |
| Control-plane Task 5 Native thin integrations                | Done            | `8e82c74` | Added `IntegrationConnection`, Clerk connected-account token provider boundary, native export queueing, Slack/Notion/Linear/GitHub one-way adapters, shared DTOs, and provider tests.                                                                                                                                                                                                                                              |
| Control-plane Task 6 Agent access and MCP server             | Done            | `adf651f` | Added `@workspace/semblia-mcp-server`, safe MCP tools/resources/prompts over private API routes, `GET /v2/projects/:slug/analytics/summary`, and project-scoped credential hardening for project list/create.                                                                                                                                                                                                                      |
| Control-plane Task 7 API production contracts                | Done            | `f9df398` | Added OpenAPI serving, docs under `docs/api/`, project access blocks, notifications API, project action audit reads, public surface host resolution, and public analytics event capture.                                                                                                                                                                                                                                           |
| 1e Auxiliary product data                                    | Done            | n/a       | API key, agent key, feedback integrity, outbound webhook, async CSV export, native thin integration, notification, analytics capture/dashboard, and Razorpay Subscriptions billing B1-B7 are implemented.                                                                                                                                                                                                                          |
| 2 Common API contracts                                       | Mostly complete | n/a       | Project access blocks, shared DTO/client contracts, error envelope, idempotency, concurrency, and OpenAPI/developer docs now exist for the production wiring pass.                                                                                                                                                                                                                                                                 |
| 3 Public surface API                                         | Done            | n/a       | Host-aware public resolution, trusted public submission, hosted-page analytics capture, public form/testimonial/widget/wall reads, and idempotent submit handling are implemented and in use.                                                                                                                                                                                                                                      |
| 4 Studio API                                                 | Done            | n/a       | Forms and widgets controllers expose list/create/get/patch/duplicate/delete plus `:id/draft` GET/PUT over the Phase 1d shared draft model. Web UI is wired (`88af22f` form studio, `e542957` widget gallery). Phase 4c display-safe testimonial defaults shipped in Phase 1c.                                                                                                                                                      |
| 5 Auxiliary API surfaces                                     | Done            | n/a       | API keys, agent keys, analytics summary/events/dashboard, notifications, exports, webhooks, integrations, audit reads, and full Razorpay Subscriptions billing (B1-B7) are all implemented and in use.                                                                                                                                                                                                                             |
| 6 `web_v2` adaptation                                        | Mostly complete | `c057ec9` | Mock layer deleted (`c057ec9`). Wired to live V2 APIs: notifications (`30b999d`), project shell (`4246ac8`), onboarding (Phase 1b), account billing (`9beba0c`, `e68cfdc`), settings 8 sub-routes, developers, testimonials list/detail (`7b3d1dc`), analytics dashboard (`bd1a7d6`), form studio (`88af22f`), widget gallery (`e542957`), API keys (`e8c2fd5`). Signup loader UX fix (`1a7f0b2`). No remaining mock dependencies. |
| 7 Verification and hardening                                 | In progress     | n/a       | Security, performance, migration, and end-to-end checks. The production spine now has env, image, migration, backup, rollback, worker, smoke, and protected-release contracts. Remaining launch proof includes the first approved production execution/DNS cutover, authenticated end-to-end checks, embed loader completion, and focused dependency/race follow-ups.                                                              |

## Operational Notes

- Public form submissions now use `FormResponse` as the canonical answer/rating/trust record, linked to the published `FormVersion`; sensitive raw values live in encrypted `FormResponsePrivateMetadata`.
- Public testimonial/form writes keep email, IP, and user agent out of public DTOs; sensitive raw values live in submission-owned encrypted private metadata with normalized hashes.
- Public submit responses omit `authorEmail`; authenticated feedback reads rehydrate it from `SubmissionPrivateMetadata`.
- Draft writes require `expectedVersion`; first save uses `expectedVersion: 0`; stale writes return `409 Conflict`.
- `web_v2` mock data has been deleted; future UI work should use `apps/api_v2` endpoints and domain hooks rather than reintroducing mock-shaped contracts.
- The organization/actor foundation from the 2026-05-03 control-plane plan is checkpoint-committed as `ffae2cf`.
- Active Clerk organization sessions now resolve project access by `project.organization.clerkOrgId`; mismatches hard-fail instead of falling back to legacy user ownership.
- Projects created while a Clerk organization is active are attached to the local organization mirror.
- Prisma migrations are no longer ignored by the root or package-local `.gitignore` files; the organization migration and previously hidden migration artifacts are now visible to Git.
- Private API keys and agent keys are distinct from public submit trust and server submit HMAC secrets.
- Private/agent key raw secrets are generated once, stored as scrypt hashes, exposed only in create/rotate responses, and list/event endpoints return metadata only.
- API-key bearer auth maps valid project-bound credentials into `ActorContext` as `api_key` or `agent_key`, then `CapabilityGuard` resolves access from scopes.
- API-key bearer auth checks every active row matching the public key prefix and accepts only the row whose stored scrypt hash matches the supplied secret.
- Agent presets are `READ_ONLY`, `CONTENT_MANAGER`, `AUTOMATION_MANAGER`, and `DEVELOPER`; disallowed source-write, billing, member, credential-reveal, and project-delete scopes are not in the launch scope set.
- Read-only export/webhook/integration scopes map to `VIEW_INTEGRATIONS`, not `MANAGE_INTEGRATIONS`.
- Public submit idempotency is now surface-scoped; form and testimonial idempotency keys no longer collide, and duplicate requests only replay completed response bodies.
- Invalid public submit trust attempts are counted by the custom public-submit throttler before the trust error is rethrown, and public list/browser submit/HMAC submit buckets stay separate.
- Submission annotations, moderation updates, and testimonial publish/unpublish actions now create project actor audit rows.
- The old presentation-suggestion workflow is removed with the old projection table. If a projection workflow is needed later, rebuild it intentionally on top of submission-owned state.
- Rejecting or flagging a submission removes it from public testimonial reads and does not mutate submission answers, rating values, or private metadata.
- Outbound webhook endpoint secrets are encrypted with `API_V2_SECRET_ENCRYPTION_KEY`; raw `whsec_...` values are exposed only in create and rotate responses.
- Outbound webhook deliveries are signed with `X-Semblia-Event`, `X-Semblia-Delivery`, `X-Semblia-Timestamp`, and `X-Semblia-Signature: v1=<hmac>`.
- Outbound webhook dispatch has a bounded network wait and bounded response capture: requests time out after 10 seconds, and stored response snippets are capped without reading arbitrary-size remote bodies.
- Webhook subscriptions require explicit event names only; no wildcard subscription exists in the launch contract.
- CSV export deliveries store artifacts in the database and include display-safe submission fields only. Private metadata, IP, user agent, and email are excluded by default.
- Export delivery failures emit the generic `export.delivery_failed` outbound webhook event for subscribed endpoints.
- Native integration connections are project-scoped `IntegrationConnection` records with provider, auth strategy, connected user, optional Clerk provider name, scopes, status, and provider config.
- Native integration exports reuse `ExportDestination` and `ExportDelivery` records, with a separate `native-integration-export` queue for Slack, Notion, Linear, and GitHub deliveries.
- Clerk connected OAuth tokens are resolved server-side through `ClerkConnectedAccountTokenProvider`; missing or revoked connected tokens fail as connect-required authorization errors.
- Clerk OAuth integration connections verify provider tokens and required scopes before create, update, enable, and resource discovery. Empty customer-side config is valid at OAuth connect start; provider config is produced by the server-backed resource picker.
- Native integrations are intentionally one-way. They create Slack messages, Notion pages, Linear issues, or GitHub issues from safe export payloads and do not import remote edits, sync provider membership, or depend on provider webhooks for core Semblia state.
- Project-scoped API keys and agent keys can list only their bound project from `GET /v2/projects` and cannot create projects. Creation remains a user-session action.
- `GET /v2/projects/:slug/analytics/summary` is a project-scoped read endpoint over analytics daily rows and live submission/impression counts.
- Public analytics event capture now exists under `POST /v2/analytics/events/*` for form views, widget loads, submission impressions, and hosted page views. These routes validate resource relationships, write event rows where a raw table exists, and increment `ProjectAnalyticsDaily`.
- `GET /v2/public-surfaces/resolve` is the API-owned host resolver for public pages. It normalizes hostnames, requires an active `PublicSurfaceHost`, returns project branding, and exposes the public forms/testimonials/wall endpoints the frontend should render.
- Project list/detail/update responses now include a backend-produced `access` block with role and capabilities for user, Clerk organization, private API key, and agent key actors.
- `GET /v2/projects/:slug/action-audit` exposes a project-scoped paginated audit stream for capability-gated project actors.
- Authenticated notification routes now exist for list, unread count, mark-read, mark-all-read, and preference management under `/v2/notifications`.
- OpenAPI is served at `GET /v2/openapi.json`, with Swagger UI at `GET /v2/openapi`.
- `packages/semblia-mcp-server` is the official local stdio MCP adapter for Task 6. It uses `SEMBLIA_API_BASE_URL` and `SEMBLIA_AGENT_KEY`, exposes safe feedback/testimonial/export/delivery tools, resources, and prompts, and calls private APIs instead of the database.
- MCP export triggering uses the actual Task 4/5 API shapes: CSV via `POST /v2/projects/:slug/exports/csv`, native integrations via `POST /v2/projects/:slug/integrations/connections/:connectionId/exports`.
- Root `pnpm.overrides.hono` is pinned to `4.12.18` so the Prisma tooling path no longer matches the May 2026 Hono advisories.
- `apps/web_v2/lib/semblia-api.ts` remains the typed client direction: it unwraps `{ success, data, meta }`, uses shared DTOs from `@workspace/types`, and should be extended through domain hooks rather than page-local request code.
- `apps/web_v2/hooks/api` is the preferred route for new TanStack Query consumers. Project, billing, settings, developers, testimonials, analytics, forms, widgets, and notifications are live API surfaces; do not revive deleted `mock-data` flows.
- New-user onboarding state is backend-owned, not localStorage-owned: `User.onboardingStep`, `User.onboardingData`, `User.onboardingCompletedAt`, `PATCH /v2/me/onboarding`, and `POST /v2/me/onboarding/complete` are the current resume/complete contract. `/welcome` should remain the guided setup route; `/projects/new` is the direct post-onboarding project creation route.
- Route-critical `web_v2` user/project/account consumers can opt into `freshOnMount` plus `useLiveQueryState({ requireFreshOnMount: true })` to suppress stale cached data until the live response returns. Less disruptive list/table-style surfaces should keep cached rows mounted and show `RefreshingDataBadge` during background refresh. New TanStack Query consumers in `app/` or `components/` should go through `hooks/api` or another domain hook; `tests/live-query-policy.test.ts` intentionally fails on direct page/component `useQuery` imports or API hooks missing shared live-query options.

## Latest Verification

- 2026-06-03 local migration application after `c343aee` passed: `corepack.cmd pnpm --filter @workspace/database exec prisma migrate deploy` applied `20260602233000_remove_testimonials_projection`; follow-up `corepack.cmd pnpm --filter @workspace/database exec prisma migrate status` reported 27 migrations and "Database schema is up to date"; `corepack.cmd pnpm --filter @workspace/database exec prisma validate`, `corepack.cmd pnpm --filter @workspace/database generate`, and `corepack.cmd pnpm --filter @workspace/database build` passed; a Prisma `information_schema` check returned `[]` for the removed testimonial tables.
- 2026-06-03 docs/ledger prune verification: `git diff --check`, targeted stale-reference `rg` checks, and `corepack.cmd pnpm exec prettier --check` over touched docs passed after pruning resolved open questions, old presentation-workflow references, and stale legacy/noise labels from active continuity and API docs. `python scripts/update-indexes.py` and `python scripts/rebuild-graphify.py` also passed; semantic extraction remained skipped because it requires Claude.
- 2026-06-05 web_v2 CSP pre-index verification passed: `corepack.cmd pnpm --filter web_v2 exec prettier --check .\app\ .\components\ .\hooks\ .\lib\ .\tests\`; focused `corepack.cmd pnpm exec vitest run tests/config/security-headers.test.ts --reporter=verbose --testTimeout=10000` (1 file / 2 tests); `corepack.cmd pnpm exec tsc --noEmit`; `corepack.cmd pnpm exec eslint . --ext .ts,.tsx` (passed with one existing warning in `tests/developers/integrations-client.test.tsx`); full `corepack.cmd pnpm test` (28 files / 105 tests); `pnpm.cmd build --filter web_v2`. `corepack.cmd pnpm build --filter web_v2` failed first on the known Windows/Corepack pnpm 11.5.1 vs repo pin 11.1.3 mismatch; direct `pnpm.cmd` was the successful required build path.

### Historical Verification Log

- API production contract checkpoint database verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- API production contract checkpoint shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- API production contract checkpoint docs grep passed: `rg -n "Public surface ID|Server submit secret|Agent access|X-Semblia-Signature" docs/api docs/plans docs/continuity`.
- API production contract checkpoint API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- API production contract checkpoint API lint passed: `pnpm.cmd --filter api_v2 lint`.
- API production contract checkpoint full API tests passed: `pnpm.cmd --filter api_v2 test` reported 45 files and 249 tests passing.
- API production contract checkpoint API build passed: `pnpm.cmd build --filter api_v2`.
- API production contract checkpoint index refresh passed: `python scripts/update-indexes.py` indexed 26 changed files, skipped 0, and increased the vector store to 1189 chunks while refreshing the AST knowledge graph.
- API production contract checkpoint graph refresh passed: `python scripts/rebuild-graphify.py`; semantic extraction remains skipped because it requires Claude.
- First `web_v2` wiring slice verification passed: targeted hook tests for current-user/projects passed, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed, full `cd apps/web_v2 && pnpm.cmd test` passed with 7 files and 32 tests, and `pnpm.cmd build --filter web_v2` passed.
- First `web_v2` wiring slice index refresh ran: `python scripts/update-indexes.py` completed AST graph refresh but skipped vector embedding because Ollama was unreachable, leaving the vector store at 1181 chunks. `python scripts/rebuild-graphify.py` passed; semantic extraction remains skipped because it requires Claude.
- `web_v2` Phase 1a shell/navigation verification passed: `cd apps/web_v2 && pnpm.cmd test -- tests/nav/project-shell.test.tsx` passed, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed, full `cd apps/web_v2 && pnpm.cmd test` passed with 8 files and 34 tests, and `pnpm.cmd build --filter web_v2` passed.
- `web_v2` Phase 1a index refresh passed: `python scripts/update-indexes.py` indexed 14 changed files, skipped 0, and increased the vector store to 1196 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4332 nodes and 7053 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` Phase 1b onboarding/empty-state local verification passed before docs/index refresh: `pnpm.cmd --filter @workspace/database generate`, `pnpm.cmd --filter @workspace/database exec prisma validate`, `pnpm.cmd --filter @workspace/database build`, `pnpm.cmd --filter @workspace/types build`, `pnpm.cmd --filter api_v2 test` passed with 45 files and 252 tests, `pnpm.cmd --filter api_v2 typecheck`, `pnpm.cmd --filter api_v2 lint`, `pnpm.cmd build --filter api_v2`, targeted and full `web_v2` tests passed with 9 files and 36 tests, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`, and `pnpm.cmd build --filter web_v2` passed. The `web_v2` build completed with an existing Next/Turbopack warning about querying metadata for `.next/diagnostics/route-bundle-stats.json`.
- `web_v2` Phase 1b index refresh passed: `python scripts/update-indexes.py` indexed 16 changed files, skipped 0, and increased the vector store to 1207 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4356 nodes and 7103 edges; semantic extraction remains skipped because it requires Claude.
- Clerk inbound webhook fix verification passed: `pnpm.cmd --filter api_v2 test -- --run modules/webhooks modules/users` passed with 45 files and 256 tests, `pnpm.cmd --filter api_v2 typecheck` passed, `pnpm.cmd --filter api_v2 lint` passed, and `pnpm.cmd build --filter api_v2` passed.
- `pnpm.cmd audit --prod --json` refreshed: 64 repo-wide advisories (`low:3`, `moderate:34`, `high:26`, `critical:4`), with 0 advisories matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`. Affected root paths were legacy/admin/widget/tooling paths: `apps__admin`, `apps__api`, `packages__opencode-mcp-server`, and `packages__widget`.
- `pnpm.cmd audit --json` refreshed: 99 repo-wide advisories (`low:6`, `moderate:45`, `high:50`, `critical:6`), with 0 advisories matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`. Affected root paths were `apps__admin`, `apps__api`, `packages__opencode-mcp-server`, `packages__ui`, and `packages__widget`.
- `web_v2` hydration/refresh-stability pass verification passed: `pnpm.cmd --filter web_v2 format`, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`, full `cd apps/web_v2 && pnpm.cmd test` with 9 files and 36 tests passing, and `pnpm.cmd build --filter web_v2`.
- `web_v2` hydration/refresh-stability index refresh passed: `python scripts/update-indexes.py` indexed 29 changed files, skipped 0, and raised the vector store to 1230 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4376 nodes and 7154 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` hydration policy follow-up verification passed: `pnpm.cmd --filter web_v2 format`, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`, full `cd apps/web_v2 && pnpm.cmd test` with 10 files and 38 tests passing, and `pnpm.cmd build --filter web_v2`.
- `web_v2` hydration policy follow-up index refresh passed: `python scripts/update-indexes.py` indexed 14 changed files, skipped 0, and raised the vector store to 1234 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4386 nodes and 7173 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` API-only control-plane wiring verification passed: targeted tests (`pnpm.cmd --filter web_v2 test -- tests/semblia-api-control-plane.test.ts tests/hooks/use-api-control-plane.test.tsx`) passed with 12 files and 47 tests, then the organization-hook targeted rerun passed with 12 files and 48 tests; `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed; `cd apps/web_v2 && pnpm.cmd exec prettier --check .\app\ .\components\ .\hooks\ .\lib\ .\tests\` passed; `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed; full `cd apps/web_v2 && pnpm.cmd test` passed with 12 files and 48 tests; and `pnpm.cmd build --filter web_v2` passed. The build formatter reported existing dirty UI files as unchanged.
- `web_v2` API-only control-plane wiring index refresh passed: `python scripts/update-indexes.py` indexed 3 changed files, skipped 0, and raised the vector store to 1259 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4461 nodes and 7288 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` live notification hook follow-up verification passed: focused notification test run (`pnpm.cmd --filter web_v2 test -- tests/notifications/live-notifications.test.tsx`) completed with 13 files and 50 tests passing; notification files no longer match `mock-data`, `MOCK_NOTIFICATIONS`, or `getUnreadNotificationCount`; targeted Prettier check passed for the touched notification files; `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed; `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed; full `pnpm.cmd --filter web_v2 test` passed with 13 files and 50 tests; and `pnpm.cmd build --filter web_v2` passed.
- `web_v2` live notification hook follow-up index refresh passed: `python scripts/update-indexes.py` indexed 5 changed files, skipped 0, and raised the vector store to 1265 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4469 nodes and 7303 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` Developers area verification passed: `pnpm.cmd --filter web_v2 format` clean, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` clean after a `.next/` purge to regenerate route validators, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` clean (after fixing three new react-hooks/unused-vars warnings in the agent surfaces), full `pnpm.cmd --filter web_v2 test` passed with 15 files and 63 tests, and `pnpm.cmd build --filter web_v2` passed with the new `/projects/[slug]/developers`, `/developers/keys[/:keyId]`, `/developers/agents[/:keyId]`, `/developers/docs`, and `/developers/sdk` routes registered.
- `web_v2` Developers area index refresh passed: `python scripts/update-indexes.py` indexed 31 changed files, skipped 0, and raised the vector store to 1332 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4619 nodes and 7638 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` Settings rebuild verification passed: `pnpm --filter @workspace/types build` clean (V2ProjectMemberRole widened), `pnpm --filter web_v2 format` clean, `cd apps/web_v2 && pnpm exec tsc --noEmit` clean, `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx` clean, full `pnpm --filter web_v2 test` passed with 15 files and 65 tests, and `pnpm build --filter web_v2` passed with the new `/projects/[slug]/settings`, `/settings/branding`, `/settings/visibility`, `/settings/social`, `/settings/hosts`, `/settings/trust`, `/settings/members`, and `/settings/danger` routes registered.
- `web_v2` Settings rebuild index refresh passed: `python scripts/update-indexes.py` refreshed the AST graph and the merged graph now reports 4696 nodes and 7803 edges. `python scripts/rebuild-graphify.py` passed; semantic extraction remains skipped because it requires Claude.
- Codex Task 1 (host listing endpoint) verification passed: `pnpm --filter @workspace/database generate`, `pnpm --filter @workspace/types build`, `pnpm --filter api_v2 typecheck`, `pnpm --filter api_v2 lint`, `pnpm --filter api_v2 test -- --run modules/projects` reported 47 files and 283 tests passing, `pnpm build --filter api_v2`, `cd apps/web_v2 && pnpm exec tsc --noEmit`, `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`, `pnpm --filter web_v2 format`, `pnpm --filter web_v2 test` reported 15 files and 65 tests passing, and `pnpm build --filter web_v2 --filter api_v2` passed. Index refresh raised the merged graph to 4703 nodes and 7817 edges; semantic extraction remains skipped because it requires Claude.
- Codex Task 2 (invite-by-email) verification passed: `pnpm --filter @workspace/database generate`, `pnpm --filter @workspace/database exec prisma validate`, `pnpm --filter @workspace/types build`, `pnpm --filter api_v2 typecheck`, `pnpm --filter api_v2 lint`, `pnpm --filter api_v2 test -- --run modules/projects` reported 47 files and 297 tests passing, `pnpm build --filter api_v2`, `cd apps/web_v2 && pnpm exec tsc --noEmit`, `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`, `pnpm --filter web_v2 format`, `pnpm --filter web_v2 test` reported 15 files and 65 tests passing, and `pnpm build --filter web_v2 --filter api_v2` passed. Index refresh raised the merged graph to 4732 nodes and 7866 edges; semantic extraction remains skipped because it requires Claude.
- Billing Phase B1 verification passed (commit `191bb0e`): `pnpm --filter @workspace/database generate` and `prisma validate` clean after the `Plan.type @unique` constraint plus dedup migration `20260524_plan_type_unique`; `pnpm --filter @workspace/types build` clean; `pnpm --filter api_v2 typecheck` clean; `pnpm --filter api_v2 lint` clean; `pnpm --filter api_v2 test` reported 50 files and 314 tests passing (up from 297) — covering the new `env.spec.ts`, `seed.spec.ts`, and `billing.service.spec.ts` cases; `pnpm build --filter api_v2` clean. `python scripts/update-indexes.py` indexed 7 changed files and left the merged graph at 4975 nodes and 8298 edges; semantic extraction remains skipped because it requires Claude.
- Billing Phase B2 verification passed (commit `81faee2`): `pnpm --filter @workspace/types build` clean (new `V2SubscriptionCheckoutDTO`); `pnpm --filter api_v2 typecheck` and `lint` clean; `pnpm --filter api_v2 test` reported 50 files and 318 tests passing (+4 for B2 — happy path, FREE rejection, plan-not-configured 503, idempotent re-call). `python scripts/update-indexes.py` left the merged graph at 4983 nodes and 8314 edges.
- Billing Phase B3 verification passed (commit `43d54c5`): `pnpm --filter api_v2 typecheck` and `lint` clean; `pnpm --filter api_v2 test` reported 50 files and 327 tests passing (+9 for B3 — covers activated/charged/cancelled/completed transitions, payment.captured idempotency, payment.failed, invoice.paid upsert by externalInvoiceId, unknown-event ignored, processing-error failed/rethrow). `python scripts/update-indexes.py` left the merged graph at 5010 nodes and 8380 edges.
- Billing Phase B4 verification passed: `pnpm --filter @workspace/database generate`, `pnpm --filter @workspace/database exec prisma validate`, `pnpm --filter @workspace/types build`, `pnpm --filter api_v2 typecheck`, `pnpm --filter api_v2 lint`, `pnpm --filter api_v2 test` reported 50 files and 340 tests passing (+13 for B4 — cancel happy/FREE-reject/no-active-reject, switch happy/FREE-reject/same-plan-reject/expired-period-reject/prior-scheduled-cleanup, scheduled-id webhook activation promotion, and scheduled-pending suppression of FREE downgrade on cancelled/completed), `pnpm build --filter api_v2` clean. `python scripts/update-indexes.py` indexed the changed files and left the merged graph at 5013 nodes and 8390 edges; semantic extraction remains skipped because it requires Claude.
- Billing Phase B5 verification passed: `corepack.cmd pnpm --filter @workspace/types build` clean; `corepack.cmd pnpm --filter api_v2 typecheck` clean; `corepack.cmd pnpm --filter api_v2 lint` clean; `corepack.cmd pnpm --filter api_v2 test` reported 50 files and 350 tests passing (+10 net for B5 after removing the set-default payment-method mutator test); `pnpm build --filter api_v2` clean. `python scripts/update-indexes.py` indexed the changed files and left the merged graph at 5021 nodes and 8410 edges; semantic extraction remains skipped because it requires Claude.
- Billing Phase B6 verification passed: `pnpm --filter @workspace/types build` clean; `pnpm --filter web_v2 format` clean; `cd apps/web_v2 && pnpm exec tsc --noEmit` clean; `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx` clean; `pnpm --filter web_v2 test` reported 21 files and 79 tests passing (+14 net for B6 — plan-switcher branches, payment-methods read-only render, razorpay-checkout launcher, useCreateCheckoutSession, and the trimmed semblia-api control-plane surface); `pnpm build --filter web_v2` clean. `python scripts/update-indexes.py` indexed the changed files and left the merged graph at 5042 nodes and 8436 edges; semantic extraction remains skipped because it requires Claude.
- Billing Phase B7 verification passed (audit + final verification): one P0 fixed inline (new `UserActorGuard` rejects api_key/agent_key actors at the billing controller, 5 unit cases added); two P2s deferred to `docs/continuity/open-questions.md` (web_v2 CSP for `checkout.razorpay.com`, new `next` and `@prisma/*` advisories on V2 paths). `pnpm --filter @workspace/database generate`, `pnpm --filter @workspace/database exec prisma validate`, `pnpm --filter @workspace/types build`, `pnpm --filter api_v2 typecheck`, `pnpm --filter api_v2 lint`, `pnpm --filter api_v2 test` reported 51 files and 355 tests passing, `pnpm build --filter api_v2`, `cd apps/web_v2 && pnpm exec tsc --noEmit`, `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`, `pnpm --filter web_v2 format`, `pnpm --filter web_v2 test` reported 21 files and 79 tests passing, and `pnpm build --filter web_v2` all clean. `python scripts/update-indexes.py` and `python scripts/rebuild-graphify.py` left the merged graph at 5047 nodes and 8439 edges; semantic extraction remains skipped because it requires Claude. Audit report: `docs/billing-security-audit-2026-05-26.md`.
- `pnpm.cmd --filter @workspace/database generate` passed after adding `PublicSubmitSurface.FORM`.
- `pnpm.cmd --filter @workspace/database exec prisma validate` passed.
- `pnpm.cmd --filter api_v2 lint` passed after removing one stale unused import warning in `projects.service.ts`.
- `pnpm.cmd --filter api_v2 test` passed: 34 files, 199 tests.
- `pnpm.cmd build --filter api_v2` passed: database package build plus Nest build succeeded.
- `python scripts/update-indexes.py` passed after the final source change: 2 changed files indexed, 1024 chunks total.
- `python scripts/rebuild-graphify.py` passed and refreshed `graphify-out/GRAPH_REPORT.md`. Semantic extraction remains skipped because the script reports it requires Claude.
- Control-plane Task 3 schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- Control-plane Task 3 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- Control-plane Task 3 API targeted verification passed: `pnpm.cmd --filter api_v2 test -- --run modules/submissions modules/testimonials modules/forms modules/agent-access common/authz` reported 36 test files and 206 tests passing.
- Control-plane Task 3 lint passed: `pnpm.cmd --filter api_v2 lint`.
- Control-plane Task 3 build passed: `pnpm.cmd build --filter api_v2`.
- Control-plane Task 3 index refresh passed: `python scripts/update-indexes.py` indexed 3 changed files, 1047 chunks total, and refreshed the graph incrementally.
- Control-plane Task 3 graph refresh passed: `python scripts/rebuild-graphify.py`; semantic extraction remains skipped because it requires Claude.
- Control-plane Task 4 database schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- Control-plane Task 4 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- Control-plane Task 4 dependency audit refresh passed for active V2 workspaces after the Hono override update: `pnpm.cmd audit --prod --json` reported 67 repo-wide advisories and 0 advisory paths matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`; `pnpm.cmd audit --json` reported 108 repo-wide advisories and 0 matching active V2 workspace paths.
- Control-plane Task 4 targeted API verification passed after webhook dispatch hardening: `pnpm.cmd --filter api_v2 test -- --run modules/outbound-webhooks modules/exports` reported 40 test files and 218 tests passing.
- Control-plane Task 4 full API tests passed after webhook dispatch hardening: `pnpm.cmd --filter api_v2 test` reported 40 test files and 218 tests passing.
- Control-plane Task 4 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- Control-plane Task 4 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- Control-plane Task 4 build passed: `pnpm.cmd build --filter api_v2`.
- Control-plane Task 4 index refresh passed: `python scripts/update-indexes.py` indexed the initial Task 4 changes, then was rerun successfully after the webhook dispatch hardening and docs refresh.
- Control-plane Task 4 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 199 changed files, and semantic extraction remains skipped because it requires Claude.
- Control-plane Task 5 database schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- Control-plane Task 5 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- Control-plane Task 5 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- Control-plane Task 5 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- Control-plane Task 5 full API tests passed: `pnpm.cmd --filter api_v2 test` reported 41 test files and 229 tests passing.
- Control-plane Task 5 build passed: `pnpm.cmd build --filter api_v2`.
- Control-plane Task 5 index refresh completed after the final source change, but vector embedding was skipped because Ollama was unreachable; `python scripts/update-indexes.py` reported 20 files skipped and kept the vector store at 1100 chunks while refreshing the AST knowledge graph.
- Control-plane Task 5 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 199 changed files, and semantic extraction remains skipped because it requires Claude.
- Control-plane Task 6 MCP package tests passed: `pnpm.cmd --filter @workspace/semblia-mcp-server test` reported 4 files and 9 tests passing.
- Control-plane Task 6 MCP package build passed: `pnpm.cmd --filter @workspace/semblia-mcp-server build`.
- Control-plane Task 6 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- Control-plane Task 6 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- Control-plane Task 6 full API tests passed: `pnpm.cmd --filter api_v2 test` reported 42 files and 233 tests passing.
- Control-plane Task 6 API build passed: `pnpm.cmd build --filter api_v2`.
- Control-plane Task 6 index refresh passed: `python scripts/update-indexes.py` indexed 8 changed files, skipped 0, and increased the vector store to 1156 chunks while refreshing the AST knowledge graph.
- Control-plane Task 6 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 478 changed files, and semantic extraction remains skipped because it requires Claude.
- Worker pool / email queue Phase 0 committed `6d4601b`: phased implementation plan for BullMQ worker split, Resend email delivery, cron maintenance, ops visibility, and verification.
- Worker pool / email queue Phase 1 committed `1710710`: API process remains queue producer-only; worker entrypoint owns outbound webhook, export, and native integration processors. Verification passed: worker-boundary/module tests, API typecheck, `pnpm.cmd build --filter api_v2`, index refresh, and graph refresh.
- Worker pool / email queue Phase 2 committed `b08c002`: shared queue lock and telemetry primitives landed. Verification passed: queueing tests, API typecheck, `pnpm.cmd build --filter api_v2`, index refresh, and graph refresh.
- Worker pool / email queue Phase 3 committed `bd1cb4c`: `EmailDelivery` persistence, Resend adapter, email queue processor, email env gates, queue telemetry email counts, and Prisma migration landed with `EMAIL_ENABLED=false` by default. Verification passed: `pnpm.cmd --filter @workspace/database generate`, `pnpm.cmd --filter @workspace/database exec prisma validate`, email/queue/env tests, API typecheck, `pnpm.cmd build --filter api_v2`, index refresh, and graph refresh.
- Worker pool / email queue Phase 4 committed `db5a0b7`: notification email fanout and project invite email outbox creation landed behind notification preferences and durable idempotency keys. Verification passed: notification/project tests, API typecheck, `pnpm.cmd build --filter api_v2`, index refresh, and graph refresh.
- Worker pool / email queue Phase 5 implementation added worker-only cron maintenance, ops-admin queue snapshot and dead-letter retry controls, exported alert recording, and fixed worker smoke bootstrap wiring with throttler config. Verification passed: `pnpm.cmd --filter @workspace/database generate`; `pnpm.cmd --filter @workspace/database exec prisma validate`; `pnpm.cmd --filter @workspace/types build`; `corepack.cmd pnpm --filter api_v2 typecheck`; `pnpm.cmd --filter api_v2 lint`; `corepack.cmd pnpm --filter api_v2 test` (62 files, 394 tests); `pnpm.cmd build --filter api_v2`; `pnpm.cmd --filter api_v2 smoke:worker`; `python scripts/update-indexes.py` (11 files indexed, 0 skipped, vector store 1582 chunks, graph merged 5211 nodes/8625 edges); `python scripts/rebuild-graphify.py` (graph merged 5211 nodes/8625 edges). Semantic extraction remains skipped because it requires Claude.
- Worker pool / email queue tooling note: `corepack.cmd pnpm --filter api_v2 add resend` updated the lockfile but failed during postinstall because Turbo invoked pnpm 11.1.3 while the repo requires pnpm 10.29.2. The dependency was completed with `pnpm.cmd --filter api_v2 add resend --ignore-scripts`, then database generation/build were run explicitly.
- Project ownership transfer recovery completed after an interrupted Claude handoff. The completed slice adds the approved two-party project ownership handoff plan, Prisma model/migration with a pending-transfer partial unique index, primary-owner access surfacing, primary-owner initiate/cancel API routes, recipient self-service accept/decline routes, audit/notification wiring, shared DTOs, React Query client hooks, danger-zone initiation/cancel UI, and incoming transfer review UI on the projects page.
- Project ownership transfer verification passed: `corepack.cmd pnpm --filter @workspace/database generate`; `corepack.cmd pnpm --filter @workspace/database exec prisma validate`; `corepack.cmd pnpm --filter @workspace/types build`; `corepack.cmd pnpm --filter @workspace/database build`; `corepack.cmd pnpm --filter api_v2 test -- src/modules/projects/projects.service.spec.ts src/modules/projects/projects.spec.ts src/common/authz/project-access.service.spec.ts src/common/authz/capability.guard.spec.ts src/modules/notifications/notifications.spec.ts` (full API suite ran: 72 files, 463 tests); `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm --filter api_v2 lint`; `pnpm.cmd --filter web_v2 test -- tests/search-placeholders.test.tsx tests/hooks/use-projects.test.tsx tests/semblia-api-control-plane.test.ts` (full web suite ran: 29 files, 113 tests); `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`; `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`; `pnpm.cmd build --filter api_v2`; `pnpm.cmd build --filter web_v2`; `python scripts/update-indexes.py` (vector store already current, AST graph refreshed to 5797 nodes/9955 edges); `python scripts/rebuild-graphify.py` (graph merged 5797 nodes/9955 edges). Semantic extraction remains skipped because it requires Claude.
- Project ownership transfer browser smoke note: local `web_v2` served on port 3002 and `/projects` correctly redirected to sign-in; the authenticated projects-page smoke stopped at the existing sign-in email step because submitting the repo test email did not advance and browser console logs had no errors. The throwaway dev server was stopped after the check.

## 2026-06-13 — Contained App Rails And Semblia Domain Verification

Status: the authenticated `web_v2` app now applies the `/projects` contained-rail pattern across the other regular app/account project pages, while keeping dense review/studio workflows full-lane where the task layout needs it.

Completed since last checkpoint:

- Added contained rails to shared `PageBody` and `PageToolbar`, documented the variant in the design-system showcase, and aligned account, project create/detail shells, analytics, collect, widgets, developers, settings, notifications, the analytics suspense skeleton, and the Forms v4 studio stub to the same centered app rail.
- Preserved deliberate exceptions: `/projects` keeps its existing manual rail implementation, responses review remains full-lane master-detail, and widget studio remains a full-screen tool surface.
- Removed leftover decorative copy treatments in the response empty state and welcome step frame so the product direction stays closer to Vercel's plainness plus Clerk's structured settings layout inside the Semblia visual system.
- Clerk production primary domain is verified on `semblia.com`; DNS is verified and SSL is issued. `app.semblia.com` resolves to Vercel and responds with Clerk auth headers.

Current work:

- None in flight for this UI/domain pass.

Next move:

- Create or migrate the Semblia-named Clerk dev test account (`test+clerk_test@semblia.com`) if local QA should stop depending on the older `test+clerk_test@tresta.app` development account.

Blockers or decisions:

- No product decision blocker. Authenticated local browser QA used sign-in only; the Semblia test email does not exist in the local Clerk development instance yet, so the existing older dev test account was used as a fallback.

Verification:

- `python scripts/codesearch.py query "web_v2 shared PageBody PageHeader PageToolbar contained layout project pages"` located the shared primitives and project surface.
- Structural JSX scan shows remaining non-contained `Page*` uses only in design showcase variants, the existing `/projects` manual rail, and responses master-detail review.
- Authenticated browser QA on `http://localhost:3002`: desktop `/projects`, `/projects/agency-portfolio/analytics`, `/collect`, `/widgets`, `/developers`, `/developers/keys`, `/settings`, `/account/profile`, `/account/security`, `/account/notifications`, and `/account/billing`; contained rails measured at 1152px where applicable. Mobile `/projects/agency-portfolio/settings` at 390px had no horizontal overflow and collapsed to 16px gutters.
- External checks: `https://app.semblia.com` returned HTTP 200 from Vercel with `X-Clerk-Auth-Status: signed-out`; public DNS has `app.semblia.com`, `clerk.semblia.com`, and `accounts.semblia.com` CNAMEs pointed at Vercel/Clerk; Clerk dashboard shows `semblia.com` Verified, DNS configuration Verified, and SSL certificates Issued.
- Repo gates passed: `python scripts/update-indexes.py` (rerun with longer timeout), `python scripts/rebuild-graphify.py`, `git diff --check`, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`, and `pnpm.cmd build --filter web_v2`.

Doc drift:

- No drift found for the rebrand: continuity docs explicitly say Semblia on `semblia.com` is the launch brand/domain and the previous prelaunch name is retired.

## 2026-06-10 — Hosted Forms Ground-Up Rebuild

Status: the public hosted form now renders the full Collect Studio design — layout (flow × container × hero), loader screen, success screen, conditional logic, rich controls, webfonts — replacing the old static single-card renderer.

Completed since last checkpoint:

- forms-core rebuild (commit `feat(forms-core): rebuild hosted form renderer from the ground up`): schema parity with the studio config (layout/loader/success/submitLabel/showIf/descriptions + atomic tokens), new SSR renderer (boxed/centered/fullbleed/split × top/side/floating heroes, star radios, NPS chips, emoji scale, choice cards, loader overlay with pure-CSS timed reveal, confetti success screen, Semblia watermark), inline client runtime (esbuild-bundled at `src/client/runtime.ts` → generated `src/generated/runtime-js.ts` with sha256 for CSP) implementing stepped/cards/conversational flows, per-step validation, Enter-to-advance, auto-advance, conditional questions, textarea auto-grow, and double-submit guard. Progressive enhancement: plain POST still works without JS. Webfonts referenced by token stacks (curated Google Fonts map in `src/fonts.ts`) now load on the hosted page.
- forms_runtime + api_v2 wiring (commit `e29d467`): CSP `script-src 'sha256-…'` (replaces `'none'`) + Google Fonts in style-src; mock services exercise stepped flow, loader, conditional follow-up, NPS, confetti success; `getRuntimeRedirectTo` honours the studio `config.success` shape with legacy `content.successAction` fallback.

Current work:

- None in flight; rebuild verified end to end.

Next move:

- Optional follow-ups: unify web_v2 `studio-token-css.ts` to re-export from forms-core (the implementations are now identical-shaped); real file-upload support on hosted forms (current behaviour posts the filename only, matching the previous renderer); studio preview could adopt the hosted runtime for true WYSIWYG.

Blockers or decisions:

- None. Watermark ("Powered by Semblia") added as a fixed chip on hosted forms — no config flag yet; revisit when plan tiers exist.

Verification:

- forms-core: build + 88 vitest tests green; forms_runtime: typecheck, lint, 19 tests green; api_v2 forms module: 48 tests green incl. new studio-redirect regression test, module lint green.
- Live walkthrough on the mock runtime (localhost:3007) via Playwright: loader → stepped flow with progress → star auto-advance → conditional question appears for rating ≤ 3 → required validation with inline error + shake → NPS chips → custom submit label → POST → confetti success screen. Zero console errors/CSP violations.
- Demos regenerated across five style × layout × flow personalities plus a success-screen artifact (`packages/forms-core/demo/`).

Doc drift:

- None found; this entry is the canonical record of the hosted-form renderer architecture change.

## 2026-07-22 — Inbound Imports and Migrations

Status: implementation and local/runtime verification are complete on `codex/inbound-imports`; PR #52 is in final hosted reconciliation, and provider activation remains an operator prerequisite rather than a code blocker.

Completed since last checkpoint:

- Added the project-scoped import center, API, BullMQ worker lifecycle, Prisma persistence/migrations, shared DTOs, and response provenance for manual, CSV/XLS/XLSX, constrained public URL, wall migration, and connected-provider imports.
- Added official connected reads for X, LinkedIn, Google Business Profile, YouTube comments, and Google Play reviews; credentials remain in Clerk and imported proof remains private and pending moderation.
- Added the public WordPress.com comments path and constrained migration profiles for Testimonial.to, Senja, Famewall, Endorsal, Trustmary, Shoutout, Feedspace, Boast, Vocal Video, WiserReview, Shapo, Walls.io, Taggbox, and EmbedSocial.
- Added honest manual/spreadsheet fallbacks for sources whose terms, commercial API access, deletion lifecycle, or account approval do not permit durable automated retrieval.
- Hardened spreadsheet signature and ZIP-budget checks, canonical identity/deduplication, rating-zero handling, provider pagination, LinkedIn OIDC profile resolution, organization access fencing, heartbeats, retry/failure transitions, scheduled-source authorization, S3 cancellation, and safe response referrers.
- Merged `origin/main` once at `d8be2537`, then reconciled the import UI with the root project routes at `cf877a35`.
- Updated `docs/api/inbound-imports.md`, the inbound design, durable decisions, and operator setup guidance to match the implemented HTTPS-only, catalog-profiled retrieval contract.

Current work:

- Push the final locally clean closeout head and drive PR #52's hosted checks and review threads to zero. The authenticated catalog remains the authority for the exact enabled source set.

Next move:

- Activate the required provider products/scopes and server credentials in Clerk/provider consoles when those automated sources should go live.

Blockers or decisions:

- No code blocker: X plan access, LinkedIn app/product approval, Google OAuth/API verification and resource permissions, and Vimeo token configuration are deployment/operator prerequisites. Trustpilot remains manual/spreadsheet only until official deletion reconciliation is implemented.
- Chrome file chooser automation could not transfer the local CSV fixture because the ChatGPT Chrome Extension lacks file-URL access. The product upload, parser, preview, mapping, and worker paths are covered by green API/web tests; enabling that extension permission permits the same final browser upload handoff.

Verification:

- Final focused reviewer verification passed: all 13 import files/167 tests, integrations 1 file/22 tests, web import flows 3 files/26 tests, and database 7 files/7 tests; API/web typechecks and touched-file lints passed.
- Final fresh clean-tree local gate passed: API 86 files/763 tests, `web_v2` 43 files/202 tests, forms runtime 6 files/72 tests, plus every package build, lint, typecheck, and remaining workspace test. The policy summary reported 128 changed files (72 source, 32 test), `blockers=0`, and one advisory because the PR exceeds CodeRabbit's observed 100-file hosted-review threshold.
- Disposable PostgreSQL 17 migration verification applied the original 38-migration chain; a disposable clone also accepted the new partial public-URL identity index, and the database migration/schema suite passes 7/7.
- Independent review found and regression-covered connected-access fencing, public-job heartbeat, YouTube pagination/cursor, destructive-dialog focus containment, and public-URL uniqueness-race defects. The exact two-revision `cs delta origin/main HEAD --error-on-warnings` check passed with zero warnings, the final full local CodeRabbit review completed with zero findings, and `git diff --check` passed.
- The large PR exposed the local policy gate's default 1 MiB Git output ceiling as `spawnSync git ENOBUFS`; the wrapper now uses a bounded 10 MiB buffer with regression coverage, and the canonical gate passes end to end.
- Authenticated browser QA passed on an isolated worktree stack (`web_v2` on 3004, API on 8101, dedicated worker): the catalog rendered all enabled/fallback sources; a manual import completed with `1 imported · 0 duplicate · 0 failed` and appeared as private/pending; X and LinkedIn rendered Clerk-backed authorization steps; Testimonial.to rendered the constrained migration form; the 1920px viewport had `scrollWidth === clientWidth`; no app-origin console errors were present. The isolated processes were stopped afterward without touching the main checkout services on 3002/8100.
- No indexing was run in this disposable worktree, as requested.

Doc drift:

- The inbound design, operator guide, and catalog are aligned. Older outbound-integration documentation remains intentionally outbound-only.

## Known Doc Drift

- `docs/plans/2026-05-08-web-v2-api-types-gap-inventory.md` was current after Control-plane Task 3, but is now stale for outbound webhooks, exports, native integrations, project access blocks, notifications, analytics event capture, public host resolution, OpenAPI/docs, Prisma models, and shared DTOs after the Task 4 through Task 7 implementations.
- `docs/plans/2026-05-02-api-surface-implementation-phases.md` has been annotated so its original starting point does not override this live ledger.
- `apps/api_v2/docs/orchestration/handoff.md` has been annotated so original-rebuild scope language does not override the current auxiliary-surface decisions.
- `memory/` and `docs/codex-claude-memory-migration.md` are historical context, not the live progress ledger.
- `docs/plans/2026-05-03-auth-integrations-agent-access-implementation-plan.md` is now historical implementation evidence. Current continuation is v2-only after the legacy app/package removal in `8e1f1a4`.

## Progress Report Format

Use this shape for future updates:

```markdown
Status: [one sentence]

Completed since last checkpoint:

- [phase/subphase, commit, result]

Current work:

- [phase/subphase, owner, scope]

Next move:

- [the next concrete action]

Blockers or decisions:

- [user-owned or technical blockers]

Verification:

- [commands run and result, or exact blocker]

Doc drift:

- [docs updated or stale docs found]
```

## 2026-08-07 — Import width + colour, settings measure, response record

Status: Six flagged UI defects fixed and verified in a live browser; the
response record now shows the whole submission and can answer its author.

Completed since last checkpoint:

- `a549d789` — import method pages full-bleed (they sat in a `max-w-2xl` rail
  while the rest of the app is full-bleed), source grid to five columns, tiles
  given room, standing context moved into an `xl` rail. `measure` keeps a
  readable width for the *form* steps only.
- `a549d789` — source marks carry colour: real brand colours where Phosphor
  ships a mark, assigned stable hues for the testimonial tools, which have no
  mark anywhere. Fixes the migrate grid reading as fourteen grey monograms and
  the Shoutout/Shapo collision (both monogram to "Sh"). Unavailable sources are
  dimmed, not desaturated.
- `a549d789` — Connect a platform stops reporting "Setup required" for a source
  this project already collects from. `availability` is a fact about Semblia's
  OAuth configuration, not about the project; a tile now leads with
  Collecting / Paused / Needs attention, and the project's live connections
  (resource, six-hour schedule, pause/sync/remove) lead the page. That is the
  answer to "where is my data coming from, and how often?", which previously
  existed only behind a drill-in.
- `a549d789` — spreadsheet preview named its sheet after the asset's full
  storage key, printing `private/projects/cmq…/imports/cms…` at the user.
  Fixed in the parser (basename), with a stale-sheet-name guard in
  `rowsFromSpreadsheet` so mappings saved before the change still import.
  Mapping and preview now sit side by side, each column labelled by where it
  is going.
- `a549d789` — `SettingsSection` had the same shape problem: the whole section
  capped at `max-w-2xl` with the title stacked above it. The measure now
  belongs to the body alone; title, description and actions move into a rail
  beside the fields at `lg`. `wide`/`flush` sections keep the stacked band.
- Response record: `GET .../responses/:id` returns `V2ResponseDetailDTO` —
  contact, media, thankYou, plus the answers the form marked private. Gated on
  `REVIEW_RESPONSES` inside the serializer, not on the route, because the route
  cannot require it without locking VIEWERs out of responses entirely. The list
  DTO is untouched, so display-safe rows never regain private submit metadata.
- Response detail UI: submitter's email under the name (mailto + copy), every
  question with its answer, private ones marked "private · never published",
  and attachments rendered with the control that plays them. An upload answer
  used to print its MediaAsset cuid as the answer text.
- New feature — thank a reviewer. `POST .../responses/:id/thanks` with
  DEFAULT / CUSTOM / INVITE, a new `EmailTemplateKey.RESPONSE_THANK_YOU`
  addressed in the project's name (the recipient has no Semblia account), a
  content-addressed idempotency key so a double click is one email, and the
  send recorded as a `thank-you` annotation.

Current work:

- None in flight. Branch `feat/ui-import-responses-settings-2026-08-06`.

Next move:

- Open the PR and drive it to mergeable per `pull-requests.md`.

Blockers or decisions:

- **Decision taken, worth confirming**: "automated by default from our side"
  was read as *Semblia composes the default message, a human sends it*. Nothing
  is emailed on a state change. Auto-send on approve was deliberately not
  built — a testimonial answered by an automatic email the owner never read is
  worse than silence, and it is not reversible.
- The list row was deliberately left display-safe. The submitter's email is on
  the record, not in the queue: a page of 25 rows would scatter contact
  addresses through a cached response.

Verification:

- `pnpm test` through bash: 1486 passed across 10 workspaces, 0 failed.
- `pnpm build --filter api_v2 --filter web_v2`: 8/8 tasks successful.
- `eslint` clean on both apps.
- Live browser (agent-browser, Clerk sign-in token, `agency-portfolio`):
  import/migrate + import/connect full-bleed with coloured marks; connect shows
  a live X connection as "Collecting" with its controls; settings two-column;
  a seeded FORM submission renders email, five answers with private markers, a
  video player, and the thank-you row. Sending the default thank-you wrote an
  `EmailDelivery` (RESPONSE_THANK_YOU, ENQUEUED, content-addressed key) and a
  `thank-you` annotation; the UI flipped to "Thank-you sent · just now".
  Light theme checked on both surfaces.

Doc drift:

- `packages/database/prisma/migrations/20260722010000_inbound_imports` has a
  drifted checksum, so `prisma migrate dev` demands a full dev-database reset.
  The thank-you enum migration was hand-authored, applied, and marked with
  `prisma migrate resolve --applied`. Worth repairing before the next schema
  change.

## 2026-08-08 (evening) — WS-F: the honesty batch

Status: Seven places the product lied to users or offered what cannot work
are fixed. The behavioural fixes — including the /design production 404 —
carry boundary regression tests; the pure removals (SSO bullet, docs-link
unification) are covered by typecheck/build alone.

Completed since last checkpoint:

- **ACCOUNT_DEFAULTS_LOGO write surface closed** (api_v2 + @workspace/types):
  the one upload purpose that skipped project scoping and capability checks
  is rejected at the contract boundary; the enum value stays in the Prisma
  schema for the scheduled DB-hygiene pass.
- **`/loader.js` retired** (forms_runtime): the public route that served a
  "Phase 8" TODO to anyone auditing the customer-facing domain now 404s;
  nothing in the product referenced it.
- **"SSO & SAML" removed** from the Business tier bullets — no SAML exists
  anywhere in the monorepo; selling it was a refund claim waiting to happen.
- **Notifications tell the truth on failure** (page + bell): both surfaces
  hand-rolled the exact state ladder `useDataState` exists to forbid and
  told users "No notifications yet" after a 500. Both now compose
  DataState; the bell gained a retry.
- **Bell dead link fixed**: a notification without a destination renders as
  a mark-read button, not an anchor to "#".
- **Import "Connect a platform" gated on availability**: all five connected
  providers are SETUP_REQUIRED, yet the Authorize button was live and
  failed inside Clerk with an opaque error. `setupUnavailable` now consults
  `source.availability` and states the catalog's reason in place — the same
  rule the Integrations picker already implemented.
- **Help/docs destinations unified**: one exported `EXTERNAL_DOCS_URL`
  everywhere; the Changelog menu item (no changelog exists) removed;
  `/design` (internal showcase) 404s in production.

Verification:

- api_v2 storage suite 29/29; forms_runtime 72/72; web notifications 7/7 and
  connected-import-dialog 11/11 (new: schema rejection, loader 404, error-
  vs-empty ×2, linkless-row, SETUP_REQUIRED gate); web tsc + eslint clean.
