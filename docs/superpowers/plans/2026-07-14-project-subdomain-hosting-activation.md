# Project Subdomain Hosting Activation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the database contract, wildcard provider domains, DNS, and API-issued client links only after the compatible implementation is deployed and a target-environment audit proves the data is clean.

**Architecture:** This is the gated second artifact for `docs/superpowers/plans/2026-07-14-project-subdomain-hosting.md`. It converts expand-state data into enforced PostgreSQL invariants, activates one exact plus wildcard deployment per surface, proves cross-tenant isolation on real hosts, and only then changes generated links and legacy canonicals.

**Tech Stack:** Prisma 7/PostgreSQL, NestJS, Hono, Next.js/Vercel, AWS CDK/CloudFront/ACM/Secrets Manager, Cloudflare DNS, Vitest, PowerShell

## Global Constraints

- This plan is blocked until the implementation plan is complete and the user separately approves production/backfill/provider mutations.
- Never place the contract migration in the initial expand/API/backfill artifact.
- Never run `--apply`, `prisma migrate deploy`, `cdk deploy`, Vercel domain mutations, or DNS changes without confirming the exact target and approval in the active task.
- Capture aggregate counts and host/project identifiers only. Do not capture form answers, response content, consent, raw signatures, or secrets.
- The live target must report zero manual resolutions, zero invalid/inconsistent or unverified active hosts, zero default conflicts, zero multiple-primary conflicts, and zero projects that have an eligible wall but no selected primary before contract migration. A project with no eligible wall is a valid non-blocking root-404 state.
- Use the provider-reported Vercel verification records. Do not guess a CNAME or ACME target.
- Keep `forms.semblia.com` and `walls.semblia.com` as non-tenant service hosts.
- Roll back traffic by DNS/domain routing first. Do not down-migrate durable tombstones or uniqueness constraints on a live database.

## Task 1: Produce and Approve Target Audit Evidence

**Files:** None unless the implementation audit tool needs a separately reviewed bug fix.

- [ ] **Step 1: Confirm compatible code and expand migration are deployed**

Record deployed commit, API version, database target, forms runtime version, web deployment, and the operator identity. Confirm the contract migration directory is absent.

- [ ] **Step 2: Run dry-run twice**

```powershell
pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run
pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run
```

Expected: identical counts and no writes.

- [ ] **Step 3: Stop on manual-resolution state**

Do not continue if any of these are nonzero:

- invalid hostnames;
- normalization conflicts;
- inconsistent active resources;
- active default conflicts;
- unverified external/unrecognized active hosts;
- projects whose slug cannot safely seed missing free hosts;
- multiple primary walls;
- zero-primary projects that have at least one eligible wall.

The informational `noEligibleWallProjects` count may be nonzero. Resolve every blocking item through a separately reviewed data decision; rerun dry-run twice.

- [ ] **Step 4: Apply only after the user approves the reviewed counts**

```powershell
pnpm.cmd --filter api_v2 public-hosting:backfill -- --apply
pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run
```

Expected: apply succeeds, final dry-run reports `changed=0` and no manual resolution.

Save the sanitized summary and timestamp in the deployment record. Do not commit production identifiers to the repository.

## Task 2: Create the Contract Migration as a Separate Artifact

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260714010000_project_subdomain_hosting_contract/migration.sql`
- Create: `apps/api_v2/integration/public-hosting-contract.integration.ts`
- Create: `apps/api_v2/integration/public-hosting-contract-test-database.ts`
- Create: `apps/api_v2/vitest.public-hosting-contract.config.ts`
- Modify: `apps/api_v2/package.json`

- [ ] **Step 1: Write failing constraint verification**

Create a separate `test:public-hosting-contract` script/config. The normal API Vitest config includes only `src/**/*.spec.ts`; keep this integration suite under `integration/` so `pnpm --filter api_v2 test` can never touch a database. Before importing Prisma, the dedicated guard must require `PUBLIC_HOSTING_CONTRACT_TEST_DATABASE_URL`, parse it as PostgreSQL, reject known production/staging hosts, require a database name ending `_public_hosting_contract_test`, and map it to `DATABASE_URL` only inside the isolated test process. Reset/apply migrations only after that guard passes.

The disposable-PostgreSQL test must prove rejection of:

- two active defaults for one project/feature/resource tuple;
- a default pending/disabled/unverified/retired host;
- an active host without project/resource/verification;
- a PROJECT host whose live `resourceId` differs from `projectId`;
- a retired host that is active/default;
- two primary walls for one project;
- a primary widget that is inactive, non-wall, slugless, or unpublished.

It must also prove valid retired tombstones and valid active aliases remain allowed.

Run against the expand-only disposable schema:

```powershell
pnpm.cmd --filter api_v2 test:public-hosting-contract
```

Expected: FAIL because contract constraints do not exist.

- [ ] **Step 2: Update Prisma's final model**

Change `Widget.isPrimaryWall` to required:

```prisma
isPrimaryWall Boolean @default(false)
```

Represent partial unique indexes:

```prisma
@@unique(
  [projectId, feature, resourceType, resourceId],
  map: "public_surface_host_one_active_default",
  where: { isDefault: true, status: ACTIVE }
)
```

and:

```prisma
@@unique(
  [projectId],
  map: "widget_one_primary_wall_per_project",
  where: { isPrimaryWall: true }
)
```

CHECK constraints remain raw SQL because Prisma schema cannot represent them.

- [ ] **Step 3: Add the contract SQL**

Use these invariant names and semantics:

```sql
UPDATE "Widget"
SET "isPrimaryWall" = false
WHERE "isPrimaryWall" IS NULL;

ALTER TABLE "Widget"
  ALTER COLUMN "isPrimaryWall" SET NOT NULL;

ALTER TABLE "Widget"
  ADD CONSTRAINT "widget_primary_wall_eligible"
  CHECK (
    NOT "isPrimaryWall"
    OR (
      "kind" = 'WALL_OF_LOVE'::"WidgetType"
      AND "isActive" = true
      AND "wallSlug" IS NOT NULL
      AND "publishedSnapshot" IS NOT NULL
    )
  );

CREATE UNIQUE INDEX "widget_one_primary_wall_per_project"
  ON "Widget" ("projectId")
  WHERE "isPrimaryWall" = true;

ALTER TABLE "PublicSurfaceHost"
  ADD CONSTRAINT "public_surface_host_retired_state"
  CHECK (
    "retiredAt" IS NULL
    OR (
      "status" = 'DISABLED'::"PublicSurfaceHostStatus"
      AND "isDefault" = false
    )
  ),
  ADD CONSTRAINT "public_surface_host_default_state"
  CHECK (
    NOT "isDefault"
    OR (
      "status" = 'ACTIVE'::"PublicSurfaceHostStatus"
      AND "verifiedAt" IS NOT NULL
      AND "retiredAt" IS NULL
    )
  ),
  ADD CONSTRAINT "public_surface_host_active_state"
  CHECK (
    "status" <> 'ACTIVE'::"PublicSurfaceHostStatus"
    OR (
      "projectId" IS NOT NULL
      AND "resourceId" IS NOT NULL
      AND "verifiedAt" IS NOT NULL
      AND "retiredAt" IS NULL
    )
  ),
  ADD CONSTRAINT "public_surface_host_project_resource"
  CHECK (
    "resourceType" <> 'PROJECT'::"PublicSurfaceResourceType"
    OR "projectId" IS NULL
    OR "resourceId" = "projectId"
  );

CREATE UNIQUE INDEX "public_surface_host_one_active_default"
  ON "PublicSurfaceHost"
    ("projectId", "feature", "resourceType", "resourceId")
  WHERE "isDefault" = true
    AND "status" = 'ACTIVE'::"PublicSurfaceHostStatus";
```

Before finalizing SQL, inspect generated enum/table names in the disposable database. Preserve the named constraints/indexes from the approved design.

- [ ] **Step 4: Verify clean upgrade and fresh database**

```powershell
pnpm.cmd --filter @workspace/database exec prisma format
pnpm.cmd --filter @workspace/database exec prisma validate
pnpm.cmd --filter @workspace/database generate
pnpm.cmd --filter @workspace/database build
pnpm.cmd --filter api_v2 test:public-hosting-contract
```

Apply all migrations to an empty disposable database and to a sanitized expand/backfilled fixture database. Expected: both PASS; negative fixtures fail with the named invariant.

- [ ] **Step 5: Commit the contract artifact**

```powershell
git add packages/database/prisma apps/api_v2/integration apps/api_v2/vitest.public-hosting-contract.config.ts apps/api_v2/package.json
git commit -m "feat(public-hosts): enforce hosting database contract"
```

This commit must be reviewed/deployed separately from the expand artifact.

## Task 3: Deploy the Contract and Compatible Runtimes

**Files:** Deployment record only; repository changes require separate review.

- [ ] **Step 1: Re-run the target dry-run immediately before deploy**

Expected: `changed=0`, no manual resolution. Stop if state drifted.

- [ ] **Step 2: Apply the contract migration**

```powershell
pnpm.cmd --filter @workspace/database migrate:status
pnpm.cmd --filter @workspace/database migrate:deploy
pnpm.cmd --filter @workspace/database migrate:status
```

Expected: only the reviewed contract migration is newly applied.

- [ ] **Step 3: Deploy API, forms runtime, and web host-routing code**

Keep shared routes working. Do not publish new wildcard links yet.

- [ ] **Step 4: Run API/runtime pre-DNS smoke**

Use direct deployment endpoints plus controlled Host/original-host headers. Prove valid alpha/beta tenants, duplicate slug isolation, wildcard project override rejection, unknown host, and exact-host compatibility.

## Task 4: Activate Provider Domains and DNS

**Files:** No repository mutation.

- [ ] **Step 1: Prepare forms certificate and secret**

- ACM certificate is in `us-east-1`.
- SANs include both `forms.semblia.com` and `*.forms.semblia.com`.
- Secrets Manager contains the deployment runtime credential.
- API receives the same credential through its approved server secret injection.
- No raw secret appears in shell history or CDK context.

- [ ] **Step 2: Synthesize, inspect, and deploy forms stack**

```powershell
Push-Location apps/forms_runtime
pnpm.cmd build
pnpm.cmd cdk synth `
  -c formsRuntimeMode=api `
  -c formsRuntimeBaseDomain=forms.semblia.com `
  -c formsRuntimeApiBaseUrl=https://api.semblia.com/v2 `
  -c formsRuntimeSigningSecretArn=$env:FORMS_RUNTIME_SIGNING_SECRET_ARN `
  -c formsRuntimeCertificateArn=$env:FORMS_RUNTIME_CERTIFICATE_ARN
pnpm.cmd cdk deploy `
  -c formsRuntimeMode=api `
  -c formsRuntimeBaseDomain=forms.semblia.com `
  -c formsRuntimeApiBaseUrl=https://api.semblia.com/v2 `
  -c formsRuntimeSigningSecretArn=$env:FORMS_RUNTIME_SIGNING_SECRET_ARN `
  -c formsRuntimeCertificateArn=$env:FORMS_RUNTIME_CERTIFICATE_ARN
Pop-Location
```

Before deploy, inspect synth for both aliases and absence of secret value.

- [ ] **Step 3: Assign wall domains to the approved Vercel project**

After the user approves the exact `VERCEL_PROJECT` and `VERCEL_TEAM` values, use the authenticated CLI with explicit project/team scope. `domains inspect` alone does not assign a domain, so add both domains first, then inspect and strictly verify them. Stop if either domain is already owned by or assigned to an unexpected project. Use Vercel's returned challenge/routing records; do not hard-code a target from this plan.

```powershell
if ([string]::IsNullOrWhiteSpace($env:VERCEL_PROJECT)) { throw "VERCEL_PROJECT is required" }
if ([string]::IsNullOrWhiteSpace($env:VERCEL_TEAM)) { throw "VERCEL_TEAM is required" }

vercel domains add "walls.semblia.com" $env:VERCEL_PROJECT --scope $env:VERCEL_TEAM
vercel domains add "*.walls.semblia.com" $env:VERCEL_PROJECT --scope $env:VERCEL_TEAM
vercel domains inspect "walls.semblia.com" --scope $env:VERCEL_TEAM
vercel domains inspect "*.walls.semblia.com" --scope $env:VERCEL_TEAM
vercel domains verify "walls.semblia.com" --project $env:VERCEL_PROJECT --strict --scope $env:VERCEL_TEAM
vercel domains verify "*.walls.semblia.com" --project $env:VERCEL_PROJECT --strict --scope $env:VERCEL_TEAM
```

- [ ] **Step 4: Add DNS-only Cloudflare records**

- exact/wildcard forms point to the CloudFront distribution;
- exact/wildcard walls use Vercel-reported routing records;
- ACME challenge delegation/records match Vercel output;
- all nested public records remain DNS-only so TLS terminates at CloudFront/Vercel.

- [ ] **Step 5: Wait for provider verification without widening scope**

Verify certificates and domains. If verification fails, inspect only the reported record/CAA/challenge state. Do not purchase a new domain or enable paid Cloudflare nested TLS.

## Task 5: Prove Real-Host Isolation Before Switching Links

**Files:** No repository mutation unless a defect is fixed in a reviewed commit.

- [ ] **Step 1: Run the automated host matrix**

Use `scripts/verify-public-hosting.ps1` against real endpoints for two projects whose forms share a slug.

- [ ] **Step 2: Browser-check forms and walls**

Verify:

- form and iframe noindex header/meta;
- alpha/beta never cross after warm requests;
- POST and upload intent remain same-tenant;
- wall `/` selects only primary;
- `/w/:slug` rejects another project;
- robots/sitemap/canonical/Open Graph are correct;
- JSON-LD has no `AggregateRating` or `Review`;
- wall host has no Clerk bootstrap or broad session cookie.

- [ ] **Step 3: Record observability and rollback readiness**

Trigger and confirm the stable log-based metric events implemented in the first artifact: resolver miss, canonical/alias resolution, cross-project rejection, runtime signature failure with request ID, legacy exact-host use, and missing primary. Confirm provider log filters/counters can select each event and that sampled records contain no payload/signature/body fields. Confirm DNS/domain routing can be removed without deleting tombstones or database contract.

## Task 6: Switch Generated Links and Legacy Canonicals

**Files:**

- Modify: `apps/web_v2/lib/semblia-urls.ts`
- Modify: `apps/web_v2/tests/lib/semblia-urls.test.ts`
- Modify: `apps/web_v2/lib/project-utils.ts`
- Modify: `apps/web_v2/app/(standalone)/welcome/_welcome-flow.tsx`
- Modify: `apps/web_v2/components/forms/form-card.tsx`
- Modify: `apps/web_v2/components/forms/form-row.tsx`
- Modify: `apps/web_v2/components/forms/studio/form-studio.tsx`
- Modify: `apps/web_v2/components/forms/studio/form-canvas.tsx`
- Modify: `apps/web_v2/lib/widgets/widget-types.ts`
- Modify: `apps/web_v2/lib/widgets/dto-adapter.ts`
- Modify: `apps/web_v2/components/widgets/widget-card.tsx`
- Modify: `apps/web_v2/components/widgets/widget-row.tsx`
- Modify: `apps/web_v2/components/widgets/widget-empty-state.tsx`
- Modify: `apps/web_v2/components/widgets/studio/widget-studio-shell.tsx`
- Modify: `apps/web_v2/components/widgets/studio/widget-share-drawer.tsx`
- Modify: `apps/web_v2/components/widgets/studio/widget-canvas.tsx`
- Modify: `apps/web_v2/components/widgets/studio/controls-wall.tsx`
- Modify: `apps/web_v2/app/wall/[wallSlug]/page.tsx`

- [ ] **Step 1: Write failing API-issued URL tests**

Test `hostedFormLink(collectionHost.hostname, form.slug)` as `https://alpha.forms.semblia.com/f/contact`, embeds on the same API-issued hostname, primary walls as `V2WidgetListEntry.publicUrl` at the host root, and additional walls as the DTO's `publicUrl` under `/w/:slug`. Rename the project slug in the fixture and prove URLs do not change.

No helper may accept only a project slug and reconstruct a public host.

- [ ] **Step 2: Thread API-issued hosts/URLs through call sites**

Delete shared-host constants once every call site consumes `V2ProjectDTO.publicSurfaceHosts`, `V2PublicSurfaceHostDTO`, `V2WidgetListEntry.publicUrl`, or resolver wall `publicUrl`. The implementation artifact already added these API fields and serializers; this task only threads them through UI call sites. Onboarding uses the created project's returned collection host plus the default form slug, not the mutable project slug.

- [ ] **Step 3: Switch the apex legacy canonical**

After real-host smoke passes, point `/wall/:wallSlug` canonical/Open Graph at the API-issued project host. Keep rendering initially; a later evidence-backed cleanup may use 308 for safe GETs.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter web_v2 exec vitest run `
  tests/lib/semblia-urls.test.ts `
  tests/walls
pnpm.cmd --filter web_v2 test
Push-Location apps/web_v2
pnpm.cmd exec tsc --noEmit
pnpm.cmd exec eslint . --ext .ts,.tsx
Pop-Location
pnpm.cmd build --filter web_v2
git add apps/web_v2
git commit -m "feat(public-hosts): switch clients to immutable hosted URLs"
```

## Task 7: Close Activation and Monitor

- [ ] Run full API/forms/web/database gates and `git diff --check`.
- [ ] Refresh `scripts/update-indexes.py` and `scripts/rebuild-graphify.py`.
- [ ] Update continuity with exact deploy IDs, sanitized audit counts, test counts, and active DNS/domain state.
- [ ] Monitor resolver misses, cross-tenant rejections, runtime-signature failures, 4xx/5xx, wall crawl behavior, and exact-host compatibility usage.
- [ ] If traffic fails, remove wildcard routing/DNS and restore legacy generated links first; keep database tombstones and contract intact.
- [ ] Schedule removal of exact-host `projectId` compatibility only after access logs show zero legitimate use for the agreed observation window.
