# Inbound Imports and Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a project-scoped Import Center that ingests spreadsheet, manual, public-page, wall-migration, and connected-provider proof into private pending Semblia responses, with durable jobs, deduplication, moderation, auto-sync, and a production-grade frontend.

**Architecture:** A new `imports` module owns a stable source catalog, durable import jobs/connections, normalized adapter output, and one BullMQ processor. Imported responses use the existing immutable `FormResponse` domain with an explicit `IMPORT` origin and nullable form/version relations. Files travel through private object storage; public fetches are SSRF-safe and allowlisted; OAuth tokens remain in Clerk.

**Tech Stack:** NestJS, Prisma/PostgreSQL, BullMQ/Redis, Clerk connected accounts, SheetJS CE 0.20.3, Cheerio 1.2.0, Next.js 16, React 19, TanStack Query, Vitest, Testing Library, pnpm/Turborepo.

---

## File Map

### Database and contracts

- Modify `packages/database/prisma/schema.prisma` — import enums/models, nullable imported-response relations, import asset purpose.
- Create `packages/database/prisma/migrations/20260722000000_inbound_import_enum_values/migration.sql` — commit new enum labels before use.
- Create `packages/database/prisma/migrations/20260722010000_inbound_imports/migration.sql` — response provenance and import persistence.
- Create `packages/database/prisma/migrations/20260722020000_import_connection_resource_identity/migration.sql` — canonical connection resource identity.
- Modify `packages/types/src/v2.ts` — source catalog, job, item, connection, preview, and request DTOs; nullable response provenance.
- Modify `packages/types/src/index.ts` only if explicit exports are required by its current pattern.

### API and worker

- Create `apps/api_v2/src/modules/imports/imports.dto.ts` — Zod request/route validation.
- Create `apps/api_v2/src/modules/imports/import-source-catalog.ts` — single source-of-truth availability and policies.
- Create `apps/api_v2/src/modules/imports/import-normalization.ts` — candidate bounds, hashes, stored-answer/consent projection.
- Create `apps/api_v2/src/modules/imports/imports.service.ts` — job/connection orchestration, dedupe, response persistence.
- Create `apps/api_v2/src/modules/imports/imports.controller.ts` — authenticated project API.
- Create `apps/api_v2/src/modules/imports/imports.core.module.ts` and `imports.module.ts` — shared orchestration, HTTP providers, and queue.
- Create `apps/api_v2/src/modules/imports/imports.worker.module.ts` — worker providers and processor.
- Create `apps/api_v2/src/modules/imports/imports.processor.ts` — idempotent job execution.
- Create `apps/api_v2/src/modules/imports/import-queue-dispatcher.ts` and `import-source-cleanup.service.ts` — durable dispatch and private source cleanup.
- Create `apps/api_v2/src/modules/imports/spreadsheet-import.parser.ts` — bounded CSV/XLS/XLSX preview and row conversion.
- Create `apps/api_v2/src/modules/imports/safe-public-import-fetch.ts` — DNS-pinned bounded public fetch.
- Create `apps/api_v2/src/modules/imports/public-proof-extractor.ts` — JSON-LD/meta/wall extraction.
- Create `apps/api_v2/src/modules/imports/connected-import-policy.ts` and `connected-import-providers.ts` — Clerk provider policy and adapter selection.
- Create `apps/api_v2/src/modules/imports/providers/official-import-providers.ts` — X, LinkedIn, YouTube, Google Business, and Google Play adapters.
- Create `apps/api_v2/src/modules/imports/providers/official-url-import-providers.ts` — server-credential Vimeo adapter.
- Modify `apps/api_v2/src/app.module.ts` and `apps/api_v2/src/worker.module.ts` — register HTTP and worker modules.
- Modify `apps/api_v2/src/modules/storage/media.dto.ts`, `media.service.ts`, and `storage.service.ts` — private import asset upload and storage path.
- Modify `apps/api_v2/package.json` and `pnpm-lock.yaml` — SheetJS official tarball and Cheerio.

### Frontend

- Modify `apps/web_v2/lib/semblia-api.ts` — typed import calls.
- Create `apps/web_v2/hooks/api/use-imports-api.ts` and modify hook indexes/keys.
- Create `apps/web_v2/app/(app)/[slug]/responses/import/page.tsx`.
- Create `apps/web_v2/app/(app)/[slug]/responses/import/error.tsx`.
- Create `apps/web_v2/components/imports/import-center.tsx` — page composition, source catalog, navigation, and job history.
- Create `apps/web_v2/components/imports/spreadsheet-import-dialog.tsx` — upload, preview, mapping, and submit.
- Create `apps/web_v2/components/imports/direct-import-dialog.tsx` — manual, public URL, and migration workflows.
- Create `apps/web_v2/components/imports/connected-import-dialog.tsx` — Clerk authorization, resource selection, and sync settings.
- Modify `apps/web_v2/components/responses/responses-list.tsx` and `response-row.tsx` — entry action and imported provenance.

### Tests and docs

- Create focused API specs beside each imports unit.
- Create `apps/web_v2/tests/responses/import-center.test.tsx` and `apps/web_v2/tests/responses/import-route.test.tsx`.
- Modify `docs/continuity/progress.md`, `decisions.md`, and `open-questions.md`.
- Create `docs/api/inbound-imports.md` — provider setup, limits, operations, and manual verification.

## Task 1: Expand the response and import persistence contract

**Files:** database schema/migration, shared types, response service/tests, widget adapter/tests.

- [x] **Step 1: Write failing response-contract tests**

Add cases to `apps/api_v2/src/modules/responses/responses.phase6.service.spec.ts` proving an imported record serializes null `formId`, `versionId`, `version`, and `form`, retains safe import provenance, and does not expose arbitrary source metadata. Add a widget adapter case proving a null form ID remains null.

```ts
it("serializes imported proof without pretending it came from a form", () => {
  const dto = toResponseDto(
    makeResponse({
      origin: "IMPORT",
      trustMode: "IMPORT",
      formId: null,
      versionId: null,
      version: null,
      form: null,
      sourceMetadata: {
        source: "x",
        sourceUrl: "https://x.com/example/status/1",
        importJobId: "job_1",
        rawToken: "must-not-leak",
      },
    }),
  );
  expect(dto.form).toBeNull();
  expect(dto.sourceMetadata).toEqual({
    source: "x",
    sourceUrl: "https://x.com/example/status/1",
    importJobId: "job_1",
  });
});
```

- [x] **Step 2: Run the focused tests and confirm RED**

Run: `pnpm --filter api_v2 exec vitest run src/modules/responses/responses.phase6.service.spec.ts`

Expected: failure because `IMPORT` and nullable form relations are not supported.

- [x] **Step 3: Add Prisma enums/models and migration**

Add `FormResponseOrigin`, extend `FormResponseTrustMode`, make form/version fields nullable, add `IMPORT_SOURCE`, and create `ImportJob`, `ImportItem`, `ResponseImportIdentity`, and `ImportConnection`. Use string `sourceKey` plus `ImportConnectionAuthStrategy` so catalog expansion does not require a database enum migration. Define cascades so project deletion cleans all import state, response deletion removes its identity, and asset deletion sets `ImportJob.mediaAssetId` null.

- [x] **Step 4: Align shared and API response contracts**

Change only project response DTOs to nullable form/version fields; keep runtime submit DTOs non-null. Add `origin` and extend the safe source metadata projection with `sourceUrl`, `importJobId`, `sourceCreatedAt`, and `importedAt`.

- [x] **Step 5: Generate Prisma and verify GREEN**

Run:

```powershell
pnpm --filter @workspace/database generate
pnpm --filter @workspace/database build
pnpm --filter api_v2 exec vitest run src/modules/responses/responses.phase6.service.spec.ts
pnpm --filter web_v2 exec vitest run tests/lib/response-to-testimonial.test.ts
```

Expected: all focused tests pass; add the widget test file if it does not already exist.

- [x] **Step 6: Root review and checkpoint commit**

Inspect `git diff --check`, the SQL constraints/indexes, and generated-client status. Commit as `feat(imports): add durable import persistence`.

## Task 2: Add the source catalog, DTOs, job orchestration, and import persistence

**Files:** `imports.dto.ts`, `import-source-catalog.ts`, `import-normalization.ts`, `imports.service.ts`, controller/module/worker wiring, `imports.spec.ts`.

- [x] **Step 1: Write failing catalog and controller tests**

Cover the exact source keys/statuses in the design, route methods, capability decorators, URL and mapping bounds, required rights confirmation, and the fallback-safe DTO envelope.

```ts
expect(catalog.find((source) => source.key === "threads")).toMatchObject({
  availability: "MANUAL_ONLY",
  reasonCode: "PUBLIC_AUTOMATION_NOT_APPROVED",
});
expect(
  createManualImportBodySchema.safeParse({
    text: "Good",
    rightsConfirmed: false,
  }).success,
).toBe(false);
```

- [x] **Step 2: Run the imports spec and confirm RED**

Run: `pnpm --filter api_v2 exec vitest run src/modules/imports/imports.spec.ts`

Expected: module/files do not exist.

- [x] **Step 3: Implement the API-owned source catalog and DTOs**

Keep public fetch hosts and modes in immutable catalog records. Represent status/reason as machine identifiers and human labels. Reject a request whose source/mode is not allowed by the catalog.

- [x] **Step 4: Implement normalized imported-response projection**

Create `normalizeImportCandidate`, `candidateIdentityHash`, and `candidateToResponseData`. Enforce lengths/rating/date bounds, generate stable answer field IDs (`import-primary-text`, `import-rating`), set job-level attested consent, and avoid arbitrary provider keys.

- [x] **Step 5: Implement job creation/list/detail and queueing**

Create jobs transactionally, enqueue only `{ jobId }`, build the colon-free BullMQ ID from the `import-` prefix followed by `job.id`, and audit `import.job.created`. Add a single `IMPORT_QUEUE` constant and register it in both HTTP and worker modules.

- [x] **Step 6: Implement candidate persistence with unique identity reservation**

For each candidate, create identity, response, and item in one transaction. Convert the unique constraint race into `DUPLICATE`; never update the prior response. Enqueue moderation only after the transaction succeeds.

- [x] **Step 7: Verify RED→GREEN and worker boundary**

Run:

```powershell
pnpm --filter api_v2 exec vitest run src/modules/imports/imports.spec.ts
pnpm --filter api_v2 exec vitest run src/modules/worker-boundary.spec.ts
pnpm build --filter api_v2
```

Expected: all pass with the imports worker present only in `WorkerModule`.

- [x] **Step 8: Root review and checkpoint commit**

Review authorization, transaction order, audit metadata, and token/PII absence. Commit as `feat(imports): add import job orchestration`.

## Task 3: Add private source uploads and spreadsheet preview/import

**Files:** storage/media files, spreadsheet parser/spec/fixtures, imports service/processor/spec, API package dependencies.

- [x] **Step 1: Write failing media-purpose and parser tests**

Create CSV, XLS, and XLSX buffers in tests. Prove sheet/header/sample discovery, explicit mapping, formula-as-text behavior, date normalization, ignored empty rows, and each size/row/column/cell limit.

```ts
const preview = previewSpreadsheet(csvBuffer, "feedback.csv");
expect(preview).toMatchObject({
  sheets: [
    { name: "feedback", headers: ["quote", "name", "rating"], rowCount: 2 },
  ],
});
expect(rowsFromSpreadsheet(csvBuffer, mapping)[0]).toMatchObject({
  text: "Fast and thoughtful",
  authorName: "Ada",
  ratingValue: 5,
});
```

- [x] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter api_v2 exec vitest run src/modules/imports/spreadsheet-import.parser.spec.ts src/modules/storage/media.service.spec.ts`.

- [x] **Step 3: Add current dependencies**

From `apps/api_v2`, install:

```powershell
pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz cheerio@1.2.0
```

Do not install the stale public-registry `xlsx` package.

- [x] **Step 4: Implement private import upload intent**

Accept only catalogued spreadsheet content types/extensions and at most 10 MiB. Store under a private `projects/{projectId}/imports/{assetId}.{extension}` key. Confirming an import asset must not enqueue media optimization.

- [x] **Step 5: Implement parser and preview endpoint**

Use `XLSX.read(buffer, { dense: true, cellDates: true, raw: true, sheetRows: 2002 })` and `sheet_to_json(..., { header: 1, raw: true, defval: null })`. Never evaluate formulas. Return only bounded safe samples.

- [x] **Step 6: Implement spreadsheet worker path and cleanup**

Fetch the private object through a short-lived signed GET, enforce body length while reading, convert mapped rows to candidates, process partial success, and delete the object/asset on terminal completion.

- [x] **Step 7: Verify GREEN**

Run parser/media/import specs, then `pnpm --filter api_v2 build`. Expected: all pass and the lockfile references the official SheetJS tarball.

- [x] **Step 8: Root review and checkpoint commit**

Inspect fixtures, upload limits, formula handling, and asset cleanup. Commit as `feat(imports): support spreadsheet ingestion`.

## Task 4: Add safe public-page and wall migration imports

**Files:** safe fetch/extractor/profile files and specs, processor integration.

- [x] **Step 1: Write failing SSRF and extraction tests**

Test blocked hostnames/address literals, DNS names resolving to any private address, mapped IPv6, redirect revalidation, max redirects, timeout, content type, streamed body limit, and credentialed URLs. Add HTML fixtures for JSON-LD Review, Open Graph social post, Testimonial.to, Senja, Famewall, and a no-proof page.

```ts
await expect(
  fetchPublicImport("http://169.254.169.254/latest/meta-data"),
).rejects.toThrow("not allowed");
expect(extractProof(jsonLdReviewFixture, source)).toEqual([
  expect.objectContaining({
    text: "Worth every minute",
    authorName: "Mira",
    ratingValue: 5,
  }),
]);
expect(extractProof(marketingPageFixture, source)).toEqual([]);
```

- [x] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter api_v2 exec vitest run src/modules/imports/safe-public-import-fetch.spec.ts src/modules/imports/public-proof-extractor.spec.ts`.

- [x] **Step 3: Implement DNS-pinned safe fetch**

Port the proven `site-metadata-fetch` controls into an API-local server utility. Validate every redirect and stream at most 2 MiB. Use `AbortSignal.timeout(10_000)`, no cookies, and a Semblia import user agent.

- [x] **Step 4: Implement bounded structured extraction**

Parse with Cheerio without executing scripts. Normalize schema.org Review/SocialMediaPosting/CreativeWork nodes, provider-profile wall cards, and one credible OG description. Recursively inspect only known embedded JSON roots with depth/item/string caps.

- [x] **Step 5: Implement public URL, migration, and public auto-sync paths**

Validate source host against catalog policy before fetching. A migration may emit up to 2,000 candidates; a single public URL up to 20. Eligible public sources may create a `PUBLIC_URL` connection after a successful preview and use the same scheduler/dedupe path.

- [x] **Step 6: Verify GREEN**

Run all imports public-fetch/extractor/service specs and `pnpm --filter api_v2 build`.

- [x] **Step 7: Root security/spec review and checkpoint commit**

Review URL parsing, DNS rebinding, redirects, body cancellation, raw-data retention, and catalog legal flags. Commit as `feat(imports): add public and wall imports`.

## Task 5: Add connected X, LinkedIn, YouTube, and Google Business imports

**Files:** provider interface/implementations/specs, connection service/spec, Clerk token integration, scheduler behavior.

- [x] **Step 1: Write failing provider-envelope tests**

Mock external HTTP at the adapter boundary. Cover X tweet/user expansions and pagination; LinkedIn approved-member post envelopes and 403 reauthorization; YouTube comment threads/replies; Google account/location/review discovery; cursor propagation; timeouts; 429 retry metadata; and sanitized errors.

- [x] **Step 2: Run provider specs and confirm RED**

Run: `pnpm --filter api_v2 exec vitest run src/modules/imports/providers/*.spec.ts src/modules/imports/import-connections.spec.ts`.

- [x] **Step 3: Implement one provider port and four adapters**

Each adapter exposes `listResources(token, cursor?)` and `fetchCandidates(token, config, cursor?)`. Use the existing bounded integration HTTP client pattern, but keep inbound response parsing in provider-local functions.

- [x] **Step 4: Implement Clerk authorization/resource discovery**

Map providers to `oauth_x`, `oauth_linkedin`, and `oauth_google`; retrieve tokens through the existing connected-account token port; verify required scopes; persist only selected resource configuration.

- [x] **Step 5: Implement connection lifecycle and BullMQ scheduler**

Use `upsertJobScheduler("import-" + connectionId, { every: 21_600_000 }, template)` and `removeJobScheduler`. Sync now and scheduled sync both create durable jobs. Disable/revoke must stop future schedules before returning success.

- [x] **Step 6: Verify GREEN**

Run provider/connection/import specs and `pnpm --filter api_v2 build`.

- [x] **Step 7: Root review and checkpoint commit**

Review official-API-only claims, scope checks, token lifetime, provider pagination/rate limits, and schedule idempotency. Commit as `feat(imports): add connected source sync`.

## Task 6: Add typed web APIs, Import Center route, and core workbench UI

**Files:** shared types consumers, API client/hooks/keys, route/error boundary, import center/catalog/history, response entry point, frontend tests.

- [x] **Step 1: Write failing route and workbench tests**

Test project-not-found behavior, presence of the Responses action, canonical page primitives, four SectionNav groups, source availability labels, accessible busy/empty/error states, unknown-status fallback, and a null-form imported response row.

```tsx
render(<ImportCenter project={project} />);
expect(screen.getByRole("heading", { name: "Import proof" })).toBeTruthy();
expect(screen.getByRole("navigation", { name: "Import methods" })).toBeTruthy();
expect(screen.getByText("Manual only")).toBeTruthy();
```

- [x] **Step 2: Run focused web tests and confirm RED**

Run: `pnpm --filter web_v2 exec vitest run tests/responses/import-center.test.tsx tests/responses/import-route.test.tsx`.

- [x] **Step 3: Implement typed API functions and TanStack hooks**

Add catalog/job/preview/connection queries and mutations. Invalidate response/import job keys after job completion. Poll only queued/running jobs, with a bounded interval and no polling for terminal states.

- [x] **Step 4: Implement route, error boundary, and Responses action**

Await Next.js 16 params, server-fetch the project, call `notFound()` when absent, and delegate route errors to shared `RouteError`. Add one `Import proof` primary action beside the refresh state without displacing filters.

- [x] **Step 5: Implement the Measured Ink workbench shell**

Compose `PageHeader`, full-bleed `PageBody`, and `SectionNav`. Use compact rows and progressive disclosure; do not create nested card grids or modal workflows. Preserve keyboard focus, native file semantics, `aria-busy`, and responsive stacking.

- [x] **Step 6: Implement source catalog and job history**

Render API labels/statuses/reasons, search and group sources, and show exact imported/duplicate/failed counts. Keep provider errors bounded and actionable.

- [x] **Step 7: Verify GREEN**

Run focused tests, web typecheck, and web lint.

- [x] **Step 8: Root design/spec review and checkpoint commit**

Review against `.impeccable.md`, no-mock rules, shared primitives, mobile operation parity, and source-status honesty. Commit as `feat(web): add import center shell`.

## Task 7: Complete spreadsheet, direct, migration, and connected frontend workflows

**Files:** workflow components, import tests, Clerk authorization wiring.

- [x] **Step 1: Write failing interaction tests**

Cover spreadsheet file selection/upload/preview/mapping/submission, rights confirmation, public URL/migration validation, manual entry, Clerk create/reauthorize, resource selection, Sync now, auto-sync toggle, and partial completion.

- [x] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter web_v2 exec vitest run tests/responses/import-center.test.tsx`.

- [x] **Step 3: Implement spreadsheet upload and mapping**

Use the existing upload-intent/confirm contract with a spreadsheet-specific accessible dropzone. Require a text column; present optional mapping selects; submit the immutable mapping returned from preview.

- [x] **Step 4: Implement manual/public/migration workflows**

Keep one primary action per active panel. Require rights confirmation immediately before submission. Show provider policy/status before fetching and never offer automation for manual-only/blocked sources.

- [x] **Step 5: Implement connected authorization and sync settings**

Use `createExternalAccount` or `reauthorize` with additional scopes, preserve popup/full-page redirect safety, discover resources server-side, and create the connection only after selection.

- [x] **Step 6: Verify GREEN and UI static gates**

Run:

```powershell
pnpm --filter web_v2 exec vitest run tests/responses/import-center.test.tsx tests/responses/import-route.test.tsx
pnpm --filter web_v2 exec tsc --noEmit
pnpm --filter web_v2 exec eslint . --ext .ts,.tsx
pnpm build --filter web_v2
```

Expected: all exit zero. If the build formatter touches unrelated files, restore only those mechanical unrelated changes before committing.

- [x] **Step 7: Root polish/review and checkpoint commit**

Run a visual audit at desktop and narrow mobile widths, fix only on-system issues, rerun tests, and commit as `feat(web): complete import workflows`.

## Task 8: Close documentation, local runtime, full gates, and PR

**Files:** continuity ledger, runbook, environment examples only if new variables are actually introduced, PR evidence.

- [x] **Step 1: Write the operations runbook**

Document Clerk/provider setup, exact scopes, source statuses, import limits, worker/queue behavior, retries, cleanup, and the platform-side actions required after merge. Do not include secrets.

- [x] **Step 2: Update continuity**

Record shipped inbound scope and immutable/deduplicated import decisions in `progress.md`/`decisions.md`; retain LinkedIn product approval, X API plan/access, Google verification, and any live-provider gaps as explicit watch items.

- [x] **Step 3: Verify the real local stack**

Start Postgres/Redis, API, worker, and web. In a headed browser, authenticate with the repo test account and verify:

1. Responses → Import proof navigation;
2. CSV/XLS/XLSX upload preview and mapped job;
3. worker completion and exact job counts;
4. imported response appears private/pending with source provenance;
5. duplicate re-import is counted, not duplicated;
6. one public fixture URL or controlled local public endpoint is rejected/accepted according to policy;
7. connection setup-required and authorization states render correctly;
8. desktop and mobile screenshots show no overflow or compromised navigation.

Completed on the isolated worktree stack: the manual import completed with `1 imported · 0 duplicate · 0 failed`, appeared private/pending with provenance, and the catalog rendered setup-required/authorization states. Desktop QA at 1920px had `scrollWidth === clientWidth` and no app-origin console errors. CSV chooser automation was skipped because the ChatGPT Chrome Extension did not have file-URL permission; API/web coverage exercised the upload, parser, preview, mapping, and worker paths.

- [x] **Step 4: Run focused and full repository gates**

Run the exact build-first sequence:

```powershell
pnpm build
pnpm lint
pnpm typecheck
pnpm test
git fetch origin main
pnpm pr:gate:local -- --base origin/main
pnpm review:local:check
pnpm review:local -- --base origin/main
```

Completed: the full clean-tree local gate passed with API 85 files/737 tests, `web_v2` 43 files/198 tests, and forms runtime 6 files/72 tests; database tests passed 6 files/6 tests; the policy result was `blockers=0`, `warnings=0`. Disposable PostgreSQL 17 verification applied all 37 migrations. Hosted CodeRabbit passed. CodeScene remained pending at the time of review; final hosted-state reconciliation is owned by the root agent.

- [ ] **Step 5: Final diff/security review and commit**

Review `git diff origin/main...HEAD`, `git diff --check`, secret scan output, changed-file count, migration reversibility, import policy, and absence of raw provider data. Commit final documentation/fixes.

- [ ] **Step 6: Push and open the PR**

Push `codex/inbound-imports`, open an unmerged PR with screenshots and verification evidence, then wait for all hosted checks/reviewers.

- [ ] **Step 7: Drive hosted state to mergeable**

Fix real findings, disposition advisories, resolve every thread, update the branch if `BEHIND`, and rerun after the final push:

```powershell
$prNumber = gh pr view --json number --jq .number
pnpm pr:gate:hosted -- --pr $prNumber
```

Completion requires zero blockers and GitHub `CLEAN` or `UNSTABLE`; merging remains the user's decision.
