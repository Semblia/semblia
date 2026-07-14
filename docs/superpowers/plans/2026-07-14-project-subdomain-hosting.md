# Project Subdomain Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement immutable project-hosted forms and walls behind an authoritative database host registry, while leaving production DNS, provider-domain assignment, live backfill, and database contract activation for a separately approved rollout.

**Architecture:** `PublicSurfaceHost` is the only host-to-project authority. The API normalizes and resolves exact active hosts, signs runtime requests with a deployment credential bound to method, full request target, hostname, and body, and constrains all form and wall reads to the resolved project. `forms_runtime` remains the AWS-hosted form edge; `web_v2` remains the Vercel-hosted wall edge. This plan ships only the expand migration plus compatible code and a dry-run-first audit tool. The irreversible database contract and public-domain activation are isolated in `docs/superpowers/plans/2026-07-14-project-subdomain-hosting-activation.md`.

**Tech Stack:** TypeScript, Prisma 7/PostgreSQL, NestJS, Hono, Next.js 16 App Router/proxy, Redis, AWS CDK/CloudFront/Lambda/Secrets Manager, Vercel, Vitest, pnpm/Turborepo

## Global Constraints

- Work only in the existing `codex/subdomain-hosting` worktree. Preserve unrelated user/Claude changes.
- The approved design in `docs/superpowers/specs/2026-07-14-project-subdomain-hosting-design.md` is the contract.
- Do not create the contract migration in this implementation branch. `prisma migrate deploy` applies every pending migration, so bundling expand and contract would bypass the reviewed backfill gate.
- Do not mutate production DNS, ACM, CloudFront, Vercel domains, secrets, or production data. Repository code, synthesized templates, tests, and runbooks are in scope.
- Use test-first steps. Observe the named test fail for the intended reason before implementing the corresponding behavior.
- Never derive a tenant from a browser `projectId` on a wildcard host. Never fall back to a configured default project after host resolution fails.
- Keep direct customer-HMAC/explicit trusted-origin API compatibility separate from deployment-runtime HMAC. A partial or invalid runtime-header set must hard-reject without falling through.
- Include the query string in the signed request target. The temporary exact-host `projectId` parameter must be tamper-evident.
- Never log answers, consent values, uploaded bytes, raw signatures, signing inputs, secrets, or upstream response bodies.
- Forms are always `noindex, nofollow`. Walls are indexable only when the API says the rendered wall is eligible.
- The implementation must remain safe to deploy before wildcard activation: do not switch dashboard-generated links or the legacy wall canonical in this plan.
- Commit after each task with the exact commit subject shown. Do not push without the user's approval.

## Deployment Artifact Boundary

| Artifact                                                 | This plan | Activation plan              |
| -------------------------------------------------------- | --------- | ---------------------------- |
| Nullable `retiredAt` and `isPrimaryWall` fields          | Yes       | No                           |
| Compatible API/runtime/web code                          | Yes       | No                           |
| Dry-run-first audit/backfill executable                  | Yes       | Operate after approval       |
| Checks, partial unique indexes, `isPrimaryWall NOT NULL` | No        | Yes, only after clean audit  |
| CloudFront/Vercel/DNS/ACM mutations                      | No        | Yes, only after approval     |
| Dashboard link and legacy canonical switch               | No        | Yes, after host smoke passes |

## Dependency Map

| Gate                   | Tasks | Responsibility                                                                   |
| ---------------------- | ----- | -------------------------------------------------------------------------------- |
| Shared expand contract | 1     | Pure host/signature contract, DTOs, nullable schema, expand migration            |
| API authority          | 2–6   | Host lifecycle, resolver, runtime HMAC, form snapshot/submit/upload isolation    |
| Wall authority         | 7–8   | Serialized primary selection and host/project-bound public payload cache         |
| Data readiness         | 9     | Dry-run-first audit/backfill; no startup or production mutation                  |
| Forms edge             | 10–12 | Host request context, signed API client, noindex/cache behavior, secret-safe CDK |
| Wall edge              | 13–14 | Pre-Clerk host routing, no-store data, pages, SEO, robots, sitemap               |
| Closeout               | 15    | Runbook, disposable migration proof, local Host smoke, full gates, continuity    |

Tasks 10–12 and 13–14 may run in parallel only after Tasks 1–8 are green. Task 9 must use the final host and primary-wall policy from Tasks 2 and 7.

## Task 1: Add the Shared Host/Signature Contract and Expand-Only Schema

**Files:**

- Create: `packages/types/src/public-surface-contract.ts`
- Create: `packages/types/src/public-surface-contract.spec.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `packages/types/package.json`
- Modify: `packages/types/src/v2.ts`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260714000000_project_subdomain_hosting_expand/migration.sql`
- Modify: `apps/web_v2/tests/helpers/fixtures.ts`
- Modify: `apps/web_v2/tests/search-placeholders.test.tsx`
- Modify: `apps/web_v2/tests/hooks/use-projects.test.tsx`
- Modify: `apps/web_v2/tests/projects/projects-client.test.tsx`
- Modify: `apps/web_v2/tests/nav/project-shell.test.tsx`

- [ ] **Step 1: Write the failing shared-contract tests**

Cover lowercase/port/trailing-dot normalization, malformed and IPv6 input, deterministic query sorting, duplicate query values, and a fixed canonical signing vector:

```ts
expect(
  canonicalizeRuntimeRequest({
    timestampSeconds: 1_752_505_200,
    method: "post",
    requestTarget:
      "/v2/runtime/forms/contact/submissions?projectId=project_1&b=2&a=1",
    hostname: "https://Acme.Forms.Semblia.com.:443",
    bodySha256: "a".repeat(64),
  }),
).toBe(
  [
    "v1",
    "1752505200",
    "POST",
    "/v2/runtime/forms/contact/submissions?a=1&b=2&projectId=project_1",
    "acme.forms.semblia.com",
    "a".repeat(64),
  ].join("\n"),
);
```

Define the shared names exactly:

```ts
export const SEMBLIA_RUNTIME_HEADERS = {
  host: "x-semblia-runtime-host",
  timestamp: "x-semblia-runtime-timestamp",
  signature: "x-semblia-runtime-signature",
} as const;

// The header value is exactly `v1=` plus 64 lowercase hexadecimal characters.
export function formatRuntimeSignature(digest: Uint8Array): string;
export function parseRuntimeSignature(value: string): Uint8Array | null;
```

Run:

```powershell
pnpm.cmd --filter @workspace/types test -- src/public-surface-contract.spec.ts
```

Expected: FAIL because the contract module and test script do not exist.

- [ ] **Step 2: Implement the pure shared contract**

Implement:

```ts
export function normalizePublicHostname(value: string): string | null;

export function canonicalizeRuntimeRequest(input: {
  timestampSeconds: number;
  method: string;
  requestTarget: string;
  hostname: string;
  bodySha256: string;
}): string;
```

`normalizePublicHostname` strips a URL scheme, port, and one trailing dot; lowercases the result; and rejects credentials, paths, invalid DNS labels, and ambiguous malformed input. `canonicalizeRuntimeRequest` normalizes the hostname, uppercases the method, normalizes the pathname, sorts query entries by key then value, preserves duplicates, and joins the six fields with newlines. Runtime signatures use one wire representation only: `v1=<64 lowercase hex HMAC-SHA256 digest>`. The shared formatter/parser reject uppercase, missing prefixes, wrong lengths, and non-hex input so signer and verifier cannot drift.

Add `vitest` and a `test` script to `@workspace/types`, then export the module from `src/index.ts`.

- [ ] **Step 3: Add only expand-safe Prisma fields**

Change the models to:

```prisma
model PublicSurfaceHost {
  projectId String?
  retiredAt DateTime?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
}

model Widget {
  isPrimaryWall Boolean? @default(false)
}
```

Update shared DTOs so:

- `V2PublicSurfaceHostDTO.projectId` is `string | null`;
- `V2PublicSurfaceHostDTO.retiredAt` is `string | null`;
- `V2ProjectDTO.publicSurfaceHosts` is a required `V2PublicSurfaceHostDTO[]` containing the API-issued active/default hosts selected with the project;
- `V2WidgetListEntry` exposes required `isPrimaryWall: boolean` and `publicUrl: string | null`; `V2WidgetDTO` carries them through its `entry`;
- `V2PublicSurfaceWallResourceDTO` gains `isPrimaryWall` and `publicUrl`;
- `V2PublicSurfaceResolutionDTO` gains `requestedHostname`, `canonicalHostname`, and `isCanonical`.

Update every existing typed `V2ProjectDTO` fixture in the files above with `publicSurfaceHosts: []`. Run `rg -n "V2ProjectDTO" apps/web_v2/tests apps/api_v2/src --glob "*.ts" --glob "*.tsx"` and update any additional complete object literal found. Do the same audit for required widget fields; do not make the new fields optional merely to defer consumer fixes.

The migration must only:

```sql
ALTER TABLE "PublicSurfaceHost"
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "PublicSurfaceHost"
  DROP CONSTRAINT "PublicSurfaceHost_projectId_fkey";

ALTER TABLE "PublicSurfaceHost"
  ADD CONSTRAINT "PublicSurfaceHost_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Widget"
  ADD COLUMN "isPrimaryWall" BOOLEAN DEFAULT false;
```

Do not add checks, partial unique indexes, or `NOT NULL` in this migration.

- [ ] **Step 4: Verify the shared contract and expand schema**

```powershell
pnpm.cmd --filter @workspace/types test -- src/public-surface-contract.spec.ts
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter @workspace/database exec prisma format
pnpm.cmd --filter @workspace/database exec prisma validate
pnpm.cmd --filter @workspace/database generate
pnpm.cmd --filter @workspace/database build
Push-Location apps/web_v2
pnpm.cmd exec tsc --noEmit
Pop-Location
```

Expected: all PASS; generated Prisma types expose nullable host ownership and nullable primary-wall state.

- [ ] **Step 5: Commit**

```powershell
git add packages/types packages/database/prisma apps/web_v2/tests pnpm-lock.yaml
git commit -m "feat(public-hosts): add expand schema and shared contract"
```

## Task 2: Enforce Free-Host Naming and Project Lifecycle Invariants

**Files:**

- Create: `apps/api_v2/src/modules/public-surfaces/public-hostname.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/public-hostname.spec.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.dto.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.dto.spec.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.service.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [ ] **Step 1: Add failing hostname and lifecycle tests**

Test:

- 1–63 lowercase ASCII label rules, total DNS length, leading/trailing hyphens, ports, case, and trailing dots;
- the reserved set: `www`, `app`, `api`, `admin`, `assets`, `static`, `cdn`, `status`, `support`, `help`, `mail`, `autodiscover`, `forms`, `walls`;
- create rejects invalid/reserved initial labels;
- project update accepts a valid mutable route slug but never updates host rows;
- create performs two ordinary host creates with `resourceId = project.id`;
- a host P2002 aborts the whole transaction and returns a hosted-address `409` rather than “project slug exists”;
- deletion disables, demotes, timestamps, and detaches hosts before deleting the project;
- a tombstoned hostname collision cannot be silently reused;
- project responses expose API-issued active/default hosts instead of requiring client reconstruction.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-hostname.spec.ts `
  src/modules/projects/projects.dto.spec.ts `
  src/modules/projects/projects.service.spec.ts
```

Expected: FAIL on the new naming and transactional assertions.

- [ ] **Step 2: Implement one API-owned free-host policy**

Export:

```ts
export const SEMBLIA_FREE_HOST_RESERVED_LABELS: ReadonlySet<string>;
export function isValidDnsHostname(value: string): boolean;
export function isValidSembliaFreeHostLabel(value: string): boolean;
export function buildSembliaFreeHostnames(input: {
  label: string;
  formsBaseDomain: string;
}): { collection: string; wall: string };
```

Reuse `normalizePublicHostname` from `@workspace/types`. Project creation and the backfill in Task 9 must call this module, never duplicate the reserved set.

Use a DNS-safe route slug schema for updates and the stricter non-reserved free-host label for creation. This preserves mutable dashboard slugs without changing the immutable free host.

- [ ] **Step 3: Make project create/delete atomic**

Replace `createMany({ skipDuplicates: true })` with two awaited `tx.publicSurfaceHost.create` calls containing:

```ts
{
  projectId,
  feature: "COLLECTION",
  resourceType: "PROJECT",
  resourceId: projectId,
  hostname: hosts.collection,
  isDefault: true,
  status: "ACTIVE",
  verifiedAt,
}
```

and the equivalent wall row. Re-read the project with active/default hosts before returning the create response.

Delete in one transaction:

```ts
await tx.publicSurfaceHost.updateMany({
  where: { projectId: project.id },
  data: {
    status: "DISABLED",
    isDefault: false,
    retiredAt: now,
    projectId: null,
  },
});
await tx.project.delete({ where: { id: project.id } });
```

Inspect Prisma P2002 metadata for `hostname` separately from `slug`. Do not catch every unique error as a slug conflict.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-hostname.spec.ts `
  src/modules/projects/projects.dto.spec.ts `
  src/modules/projects/projects.service.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/public-surfaces apps/api_v2/src/modules/projects packages/types/src/v2.ts
git commit -m "feat(projects): make public hosts immutable and tombstoned"
```

## Task 3: Make the Public-Surface Resolver Authoritative

**Files:**

- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.dto.ts`
- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.controller.ts`
- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.service.ts`
- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.module.ts`
- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.spec.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/public-hosting-observability.service.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/public-hosting-observability.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [ ] **Step 1: Write failing resolver tests**

Cover required `feature`, exact normalized matching, wrong feature, pending/disabled/retired/unverified hosts, missing/inactive projects, inconsistent `PROJECT` resource IDs, FORM/WIDGET ownership mismatch, canonical alias resolution, default conflict fail-closed behavior, primary-wall selection, safe branding only, and opaque `404` equality across invalid states. Assert safe structured events for hit/miss and canonical/alias outcomes without resource payloads.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-surfaces.spec.ts `
  src/modules/public-surfaces/public-hosting-observability.service.spec.ts
```

Expected: FAIL because feature remains optional and canonical/default/resource checks are absent.

- [ ] **Step 2: Implement typed internal and public resolution**

Add:

```ts
export interface ResolvePublicSurfaceInput {
  hostname: string;
  feature: PublicSurfaceFeature;
}

export interface ResolvedPublicSurface {
  requestedHostname: string;
  canonicalHostname: string;
  canonicalUrl: string;
  isCanonical: boolean;
  projectId: string;
  feature: PublicSurfaceFeature;
  resourceType: PublicSurfaceResourceType;
  resourceId: string;
}

async resolveHost(
  input: ResolvePublicSurfaceInput,
): Promise<ResolvedPublicSurface>;
```

`resolveHost` requires `ACTIVE`, `retiredAt: null`, verified state, a live active project, exact feature, and consistent ownership. It then loads exactly one active/default row for the same project/feature/resource tuple. Zero or multiple defaults fail closed.

`resolve()` maps the internal result to `V2PublicSurfaceResolutionDTO`, adds safe project branding, and for walls returns structurally eligible active/published walls ordered by creation time with `isPrimaryWall` and API-issued `publicUrl`. Remove stale forms/responses endpoint strings. Export `PublicSurfacesService`.

Add one injectable observability boundary used by resolver, runtime trust, form operations, and wall operations. Emit single-line structured events with stable names (`public_host_resolution`, `public_host_cross_project_rejection`, `forms_runtime_signature_rejection`, `forms_runtime_legacy_use`, and `public_wall_missing_primary`), an outcome/reason enum, `metricValue: 1`, and only the relevant normalized hostname, project ID, feature, and request ID. These events are the source for provider log-based counters; never include form slugs, answers, body hashes, signature input/value, origin payloads, or upstream bodies. Unit tests assert both required fields and prohibited-field absence.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-surfaces.spec.ts `
  src/modules/public-surfaces/public-hosting-observability.service.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/public-surfaces packages/types/src/v2.ts
git commit -m "feat(public-hosts): enforce authoritative host resolution"
```

## Task 4: Add Deployment-Runtime HMAC Verification

**Files:**

- Create: `apps/api_v2/src/modules/public-surfaces/forms-runtime-trust.service.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/forms-runtime-trust.service.spec.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/forms-runtime-trust.http.spec.ts`
- Modify: `apps/api_v2/src/modules/public-surfaces/public-surfaces.module.ts`
- Modify: `apps/api_v2/src/config/env.spec.ts`

- [ ] **Step 1: Write failing fixed-vector and rejection tests**

Test a known signature produced from the Task 1 canonical vector. Mutating method, request target/query, hostname, timestamp, or body must fail. Also cover missing peers, malformed/non-hex/uppercase/wrong-length signatures, ±300-second expiry, constant-time compare length handling, wildcard plus legacy project rejection, the configured exact service host only for the four viewer route/method operations, unknown/retired/wrong-feature hosts, and a deployment secret different from project signing secrets. The HTTP-level test sends deliberately whitespace-sensitive JSON through a Nest test app with raw-body capture and proves a signature over the exact bytes passes while a signature over parsed/re-serialized JSON fails.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/forms-runtime-trust.service.spec.ts `
  src/modules/public-surfaces/forms-runtime-trust.http.spec.ts
```

Expected: FAIL because the verifier does not exist.

- [ ] **Step 2: Implement strict verification and host binding**

Use:

```ts
export type FormsRuntimeOperation =
  | "HOSTED_PAGE"
  | "EMBED_PAGE"
  | "SUBMISSION"
  | "UPLOAD_PRESIGN";

async verifyAndResolve(
  request: {
    method: string;
    originalUrl: string;
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer | string;
  },
  input: {
    operation: FormsRuntimeOperation;
    legacyProjectId?: string;
  },
): Promise<{
  hostname: string;
  projectId: string;
  canonicalHostname: string;
  isLegacyExactHost: boolean;
  principal: string;
}>;
```

Read `FORMS_RUNTIME_SIGNING_SECRET` through typed `ConfigService`. Hash `request.rawBody` (the exact bytes captured by the existing `NestFactory.create(..., { rawBody: true })` bootstrap; empty bytes for bodyless requests), canonicalize full `originalUrl` including sorted query entries, compute HMAC-SHA256, format it with the shared `v1=<lowercase hex>` helper, decode both digests to equal-length buffers, and compare with `timingSafeEqual`. Never hash `request.body` or re-serialized JSON. Preserve the bootstrap raw-body option and make the HTTP regression test a required gate.

Any present runtime header makes this verifier authoritative: missing or invalid peers return `401` and never fall through. Wildcard hosts resolve `COLLECTION` and reject legacy project IDs. The configured exact service host requires a legacy project ID and one of the four operations above. Snapshot requests carry a runtime-generated `surface=hosted|embed` query value inside the signed request target; the API maps that value to `HOSTED_PAGE` or `EMBED_PAGE`, while submission and presign map from their route/method. Record every rejection and successful exact-host compatibility use through `PublicHostingObservabilityService`, with a sanitized inbound request ID or a generated UUID.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/forms-runtime-trust.service.spec.ts `
  src/modules/public-surfaces/forms-runtime-trust.http.spec.ts `
  src/config/env.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/public-surfaces apps/api_v2/src/config/env.spec.ts
git commit -m "feat(runtime-trust): bind forms runtime requests to hosts"
```

## Task 5: Bind Every Runtime Snapshot Read to the Resolved Project

**Files:**

- Modify: `apps/api_v2/src/modules/forms/forms.dto.ts`
- Modify: `apps/api_v2/src/modules/forms/runtime-forms.controller.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.module.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.controller.spec.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.spec.ts`

- [ ] **Step 1: Add failing host-bound snapshot tests**

Test wildcard snapshot with no browser project ID; wildcard `projectId` rejection; required signed `surface=hosted|embed`; exact-host signed hosted compatibility; exact-host iframe compatibility only when the returned snapshot enables iframe delivery; same slug in two projects; removal of the unused global snapshot-ID runtime route; and invalid runtime headers hard-rejecting rather than becoming unsigned reads.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/forms/forms.controller.spec.ts `
  src/modules/forms/forms.service.spec.ts
```

Expected: FAIL because slug snapshots remain project-ID based and the global snapshot-ID runtime route still exists.

- [ ] **Step 2: Verify in controllers, constrain in services**

Make legacy `projectId` optional only on the slug snapshot query, add the signed `surface` discriminator, inject `@Req()`, and verify before access. Change the service signature:

```ts
getRuntimeSnapshotBySlug(
  params: RuntimeFormSnapshotParamsDto,
  projectId: string,
  delivery: "hosted" | "embed",
): Promise<Record<string, unknown>>;
```

Use `findFirst({ where: { projectId, slug, ...publishedState } })`, never a global slug lookup. For `EMBED_PAGE`, reject a snapshot whose public security payload does not enable iframe delivery. Remove `RuntimeSnapshotsController`, `getRuntimeSnapshotById`, its DTO/tests, and the dead `forms_runtime` service method in Task 10; the repository usage audit must show no live caller. If snapshot-ID delivery is needed later, it requires a new separately reviewed host/project-bound contract rather than a fifth exact-host compatibility operation.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/forms/forms.controller.spec.ts `
  src/modules/forms/forms.service.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/forms
git commit -m "fix(forms): scope runtime snapshots to signed hosts"
```

## Task 6: Bind Submission and Upload Trust Without Breaking Customer Trust

**Files:**

- Modify: `apps/api_v2/src/modules/responses/responses.dto.ts`
- Modify: `apps/api_v2/src/modules/responses/responses.controller.ts`
- Modify: `apps/api_v2/src/modules/responses/responses.service.ts`
- Modify: `apps/api_v2/src/modules/responses/responses.module.ts`
- Modify: `apps/api_v2/src/modules/responses/public-submit-trust.service.ts`
- Modify: `apps/api_v2/src/modules/responses/responses.phase6.spec.ts`
- Modify: `apps/api_v2/src/modules/responses/responses.phase6.service.spec.ts`
- Modify: `apps/api_v2/src/config/security.ts`
- Modify: `apps/api_v2/src/config/security.spec.ts`
- Modify: `apps/api_v2/src/main.ts`

- [ ] **Step 1: Write failing trust-branch and cross-project tests**

Cover valid deployment HMAC with null `signingSecretId`; stable runtime principal; distinct deployment/customer secrets; invalid runtime headers never falling through; exact raw request bytes reaching verification; wildcard query override rejection; direct no-runtime compatibility requiring existing customer HMAC or explicit DB trusted origin; removal of slug-derived hosted origins; cross-project form rejection for submit/presign; and safe cross-project observability events.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/responses/responses.phase6.spec.ts `
  src/modules/responses/responses.phase6.service.spec.ts `
  src/config/security.spec.ts
```

Expected: FAIL on deployment-runtime and stale-origin assertions.

- [ ] **Step 2: Implement an explicit trust decision tree**

```text
any runtime header present
  -> verify all runtime headers
  -> resolve signed host/project
  -> resolve form by that project
  -> record HMAC trust with signingSecretId null and runtime principal
no runtime headers
  -> require legacy projectId
  -> resolve form by that project
  -> run existing customer HMAC / explicit trusted-origin evaluation
```

The second branch preserves independent customer/API integrations; it is not a wildcard-host mechanism. Remove all slug-derived hosted-origin defaults from submit trust and public CORS. Hosted browser traffic is same-origin to `forms_runtime`. Pass `req.rawBody` unchanged into runtime verification, preserve `rawBody: true` in `main.ts`, and record cross-project rejections through the safe observability boundary.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/responses/responses.phase6.spec.ts `
  src/modules/responses/responses.phase6.service.spec.ts `
  src/config/security.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/responses apps/api_v2/src/config apps/api_v2/src/main.ts
git commit -m "fix(responses): separate runtime and customer submit trust"
```

## Task 7: Maintain One Serialized Primary Wall

**Files:**

- Create: `apps/api_v2/src/modules/widgets/primary-wall.service.ts`
- Create: `apps/api_v2/src/modules/widgets/primary-wall.service.spec.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.dto.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.controller.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.service.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.module.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.spec.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [ ] **Step 1: Write failing primary-wall lifecycle tests**

Test first eligible wall auto-primary; later walls do not steal primary; explicit idempotent selection; wrong-project/ineligible selection; primary deactivation, kind conversion, unpublish, and deletion promoting the earliest eligible wall; no eligible successor; per-project row locking; and list/detail DTOs always serializing `isPrimaryWall` as a boolean plus an API-issued nullable `publicUrl`.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/widgets/primary-wall.service.spec.ts `
  src/modules/widgets/widgets.spec.ts `
  src/modules/widgets/widgets.service.spec.ts
```

Expected: FAIL because `isPrimaryWall` is not maintained or exposed.

- [ ] **Step 2: Implement eligibility and per-project serialization**

Add:

```ts
export function isEligiblePrimaryWall(
  widget: Pick<
    Widget,
    "kind" | "isActive" | "wallSlug" | "publishedSnapshot"
  >,
): boolean;

async lockProject(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<void>;

async maintainPrimaryWall(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<string | null>;
```

`lockProject` issues the parameterized Prisma query below. Create, update, draft publish, deactivation/kind conversion, and delete lock, mutate, clear an ineligible primary in the same SQL update, and promote within one transaction.

```ts
await tx.$queryRaw`
  SELECT "id"
  FROM "Project"
  WHERE "id" = ${projectId}
  FOR UPDATE
`;
```

Retry generated wall-slug P2002 collisions by retrying the entire transaction. Never retry another statement inside an aborted PostgreSQL transaction.

- [ ] **Step 3: Add the selection operation**

Add:

```text
PUT /v2/projects/:slug/widgets/:widgetId/primary-wall
```

Require `Capability.MANAGE_PUBLISH_SURFACES`; reject cross-project or ineligible widgets; return the normal widget DTO. `toWidgetDto`/list serialization populate `entry.publicUrl` from the active default wall host: `/` for the primary wall, `/w/:slug` for another eligible wall, and `null` for non-wall or unhosted/ineligible widgets. Clients never reconstruct this value from a project slug.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/widgets/primary-wall.service.spec.ts `
  src/modules/widgets/widgets.spec.ts `
  src/modules/widgets/widgets.service.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/widgets packages/types/src/v2.ts
git commit -m "feat(walls): maintain a serialized primary wall"
```

## Task 8: Constrain Public Wall Reads and Redis Cache by Host

**Files:**

- Modify: `apps/api_v2/src/modules/widgets/widgets.dto.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.controller.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.service.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.module.ts`
- Modify: `apps/api_v2/src/modules/widgets/widgets.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [ ] **Step 1: Write failing wall-isolation/cache tests**

Test:

- `GET /v2/walls/:wallSlug?hostname=alpha.walls.semblia.com` constrains project and slug;
- another project's slug is an opaque `404`;
- no-host lookup remains the globally unique legacy adapter with a distinct key;
- alternating two hosts through warm Redis never crosses payloads;
- host keys are `v2:walls:public:<host>:<projectId>:<wallSlug>`;
- invalidation deletes old/new slug keys for every active wall alias;
- SEO eligibility is false for inactive/private/unpublished/empty output and true only with at least one actually rendered public testimonial;
- cross-project rejection and missing-primary events use safe structured fields only.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/widgets/widgets.spec.ts `
  src/modules/widgets/widgets.service.spec.ts
```

Expected: FAIL because lookup/cache uses only global wall slug.

- [ ] **Step 2: Resolve optional hostname before reading**

Add:

```ts
export const publicWallQuerySchema = z.object({
  hostname: z.string().trim().min(1).max(255).optional(),
});
```

With a hostname, resolve `WALL` and query `projectId + wallSlug + active + published`. Without it, retain the legacy adapter. Return:

```ts
seo: {
  indexable: boolean;
  canonicalUrl: string;
  reason:
    | "INDEXABLE"
    | "PROJECT_NOT_PUBLIC"
    | "WALL_NOT_PUBLISHED"
    | "NO_PUBLIC_TESTIMONIALS";
}
```

Canonical URLs use the active default wall host: primary is `/`; additional walls are `/w/:slug`.

When the WALL resolver finds no primary, return the valid root `404` state while leaving additional walls usable, and record `public_wall_missing_primary`. Record `public_host_cross_project_rejection` when a resolved host requests another project's wall. Both are log-based metric events from Task 3 and contain no wall payload or testimonial data.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/widgets/widgets.spec.ts `
  src/modules/widgets/widgets.service.spec.ts
pnpm.cmd --filter api_v2 typecheck
git add apps/api_v2/src/modules/widgets packages/types/src/v2.ts
git commit -m "fix(walls): bind public reads and cache to hosts"
```

## Task 9: Add the Dry-Run-First Audit and Backfill

**Files:**

- Create: `apps/api_v2/src/modules/public-surfaces/public-hosting-backfill.ts`
- Create: `apps/api_v2/src/modules/public-surfaces/public-hosting-backfill.spec.ts`
- Create: `apps/api_v2/src/scripts/backfill-public-hosting.ts`
- Modify: `apps/api_v2/package.json`

- [ ] **Step 1: Write failing planner/executor tests**

Cover dry-run zero writes, safe normalization, normalization collision, missing collection/wall hosts, `resourceId` fill, known legacy-default demotion without deletion, invalid slug manual resolution, verified Semblia-managed free-host classification, external/unrecognized unverified hosts left untouched for manual review, earliest eligible primary selection, zero-primary with an eligible successor, legitimate no-eligible-wall state, multiple-primary cleanup, safe logs, and second-apply `changed = 0`.

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-hosting-backfill.spec.ts
```

Expected: FAIL because the backfill does not exist.

- [ ] **Step 2: Implement a reusable idempotent executor**

Export:

```ts
export interface PublicHostingBackfillOptions {
  apply: boolean;
  formsBaseDomain: string;
  wallsBaseDomain: string;
  log(message: string): void;
}

export interface PublicHostingBackfillSummary {
  projectsScanned: number;
  missingCollectionHosts: number;
  missingWallHosts: number;
  invalidHostnames: number;
  normalizationConflicts: number;
  inconsistentResources: number;
  defaultConflicts: number;
  legacyHosts: number;
  unverifiedManagedFreeHosts: number;
  unverifiedExternalHosts: number;
  zeroPrimaryWithEligibleWallProjects: number;
  noEligibleWallProjects: number;
  multiplePrimaryWallProjects: number;
  manualResolutionRequired: number;
  changed: number;
}
```

Use Task 2 hostname rules. Refuse to invent labels for invalid/conflicting projects. A host is automatically verifiable only when it is exactly one valid free label beneath the configured Semblia forms/walls base, its feature matches that base, and its project/resource mapping is consistent. `--apply` may set `verifiedAt` for that managed class because Semblia controls the wildcard zone. Any other active row with `verifiedAt = NULL` increments `unverifiedExternalHosts`, remains unchanged, and requires manual resolution. Zero-primary projects block cleanup only when at least one eligible wall exists; projects with no eligible wall are informational and correctly retain root `404` behavior.

- [ ] **Step 3: Add the typechecked CLI**

Place the executable under `src/scripts` because the old top-level API scripts are excluded from normal typecheck/tests. Add `public-hosting:backfill`.

- default is dry-run;
- only `--apply` mutates;
- reject unknown flags and `--apply --dry-run`;
- exit nonzero while manual resolution remains;
- print counts and identifiers only.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter api_v2 exec vitest run `
  src/modules/public-surfaces/public-hosting-backfill.spec.ts
pnpm.cmd --filter api_v2 typecheck
pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run
git add apps/api_v2/src/modules/public-surfaces apps/api_v2/src/scripts apps/api_v2/package.json
git commit -m "feat(public-hosts): add audited hosting backfill"
```

The local CLI may report the exact database/config blocker; it must never write in this verification step.

## Task 10: Make `forms_runtime` Host-Authoritative and Sign the Full Request

**Files:**

- Modify: `apps/forms_runtime/src/types.ts`
- Modify: `apps/forms_runtime/src/request-context.ts`
- Modify: `apps/forms_runtime/src/request-context.spec.ts`
- Modify: `apps/forms_runtime/src/api-client.ts`
- Modify: `apps/forms_runtime/src/api-client.spec.ts`
- Modify: `apps/forms_runtime/src/api-services.ts`
- Modify: `apps/forms_runtime/src/api-services.spec.ts`
- Modify: `apps/forms_runtime/src/mock-services.ts`
- Modify: `apps/forms_runtime/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Write failing routing/signing/service tests**

Test a discriminated identity:

```ts
type RuntimeTenantRouting =
  | { kind: "hostname"; hostname: string }
  | {
      kind: "legacy-project";
      hostname: string;
      projectId: string;
    };
```

Cover original-host normalization, one-label wildcard matching, deeper/lookalike rejection, wildcard `projectId` rejection, exact-host compatibility only when hostname equals the normalized configured base domain and only for the four route/method pairs, iframe-disabled rejection, fixed HMAC vector and exact `v1=<lowercase hex>` wire value, mutation of every bound field, viewer trust-header stripping, resolver `feature=COLLECTION`, host-mode paths without `projectId`, legacy paths with it, removal of the unused snapshot-by-ID service method, and typed sanitized upstream errors. Add explicit regression cases where both `FORMS_RUNTIME_PROJECT_ID_BY_HOST` and `FORMS_RUNTIME_PROJECT_ID` are configured: an API-mode wildcard request must still never fall through to either bridge.

```powershell
pnpm.cmd --filter forms_runtime exec vitest run `
  src/request-context.spec.ts `
  src/api-client.spec.ts `
  src/api-services.spec.ts
```

Expected: FAIL on query-first identity and body-only HMAC.

- [ ] **Step 2: Refactor request context and services**

`RuntimeRequestContext` contains `routing`, normalized `host`, `slug`, `path`, and surface/route kind. Wildcard mode never contains a project ID. Legacy mode requires it and compares the normalized viewer host with `FORMS_RUNTIME_PUBLIC_BASE_DOMAIN`; no production hostname is hard-coded. Static/default project bridges are permitted only in explicit mock/local mode and are unreachable in API mode, even if their environment variables are present.

Add `@workspace/types: workspace:*` to `forms_runtime` dependencies so signer and verifier execute the same canonical-input code.

Add:

```ts
resolveCollectionHost(
  hostname: string,
): Promise<{
  requestedHostname: string;
  canonicalHostname: string;
  canonicalUrl: string;
  isCanonical: boolean;
  projectId: string;
  feature: "COLLECTION";
}>;
```

For every protected outbound call:

1. join API base and relative path;
2. canonicalize its actual pathname and query;
3. hash the exact raw body;
4. generate fresh runtime headers;
5. strip viewer-supplied old and new Semblia trust headers.

Snapshot-by-slug calls include the runtime-generated `surface=hosted|embed` query discriminator inside the signed target. Delete `getSnapshotById` from `FormsRuntimeServices`, API/mock services, and their tests; it has no app caller and is not part of the approved exact-host compatibility allowlist.

Introduce `RuntimeApiError` containing only a status class. Preserve 404/401/429; map network/timeout/5xx to 503 without exposing bodies.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter forms_runtime exec vitest run `
  src/request-context.spec.ts `
  src/api-client.spec.ts `
  src/api-services.spec.ts
pnpm.cmd --filter forms_runtime typecheck
git add apps/forms_runtime/src apps/forms_runtime/package.json pnpm-lock.yaml
git commit -m "feat(forms-runtime): resolve and sign by viewer host"
```

## Task 11: Integrate Host Resolution, Safe Caching, and Noindex in the Form App

**Files:**

- Modify: `apps/forms_runtime/src/app.ts`
- Modify: `apps/forms_runtime/src/app.spec.ts`
- Modify: `apps/forms_runtime/src/browser.ts` only if action attributes change

- [ ] **Step 1: Add failing app-level tests**

Test:

- alpha/beta hosts share a slug, alternate twice, and remain isolated after warm cache;
- wildcard `projectId` cannot alter routing;
- unknown/cross-project/API-down/bad-signature map to 404/404/503/401;
- safe GET alias gets 308 preserving path/query with `Cache-Control: private, no-store`;
- POST is never redirected;
- wildcard action/presign URLs omit `projectId`;
- cache keys include host/project/slug and caches have TTL plus max size;
- the full hosted document includes robots meta, while hosted and iframe responses both include `X-Robots-Tag: noindex, nofollow`;
- iframe output is `Cache-Control: private, no-store`;
- rate-limit keys include hostname.

```powershell
pnpm.cmd --filter forms_runtime exec vitest run src/app.spec.ts
```

Expected: FAIL on host-aware behavior.

- [ ] **Step 2: Resolve before snapshots and render same-host actions**

```text
validate viewer host
  -> resolve COLLECTION host
  -> canonical redirect when safe
  -> fetch project-bound snapshot
  -> render same-origin action URLs
```

The normalized configured exact service host skips public host resolution, requires project ID, and remains limited to the approved route enum. Production wildcard resolution fails closed; static/default project bridges remain mock/local-only. Canonical 308s preserve every viewer query parameter but are never publicly cacheable.

Do not claim full browser upload delivery: the browser currently submits filenames and does not consume `data-presign-url`.

- [ ] **Step 3: Verify and commit**

```powershell
pnpm.cmd --filter forms_runtime exec vitest run src/app.spec.ts
pnpm.cmd --filter forms_runtime typecheck
pnpm.cmd --filter forms_runtime lint
git add apps/forms_runtime/src
git commit -m "feat(forms-runtime): serve isolated noindex project hosts"
```

## Task 12: Secure the Lambda Secret and Synthesize Exact + Wildcard Aliases

**Files:**

- Create: `apps/forms_runtime/src/runtime-secret.ts`
- Create: `apps/forms_runtime/src/runtime-secret.spec.ts`
- Modify: `apps/forms_runtime/src/env.ts`
- Modify: `apps/forms_runtime/src/lambda.ts`
- Modify: `apps/forms_runtime/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/forms_runtime/infra/forms-runtime-stack.ts`
- Create: `apps/forms_runtime/infra/app.ts`
- Create: `apps/forms_runtime/infra/forms-runtime-stack.spec.ts`
- Modify: `apps/forms_runtime/cdk.json`

- [ ] **Step 1: Write failing secret-loader/CDK tests**

Test direct local/test secret versus Secrets Manager ARN exclusivity; cold-start retrieval and warm cache; malformed secret failure; synthesized Lambda environment contains only ARN; least-privilege read grant; exact plus wildcard aliases; deployed API-mode CDK requires certificate/secret ARNs; certificate ARN is `us-east-1`; viewer original-host copies are overwritten; viewer trust headers are not forwarded; only GET/HEAD cache; origin receives all viewer query parameters while the cache key contains only reviewed response-varying compatibility parameters; canonical redirects are private/no-store; custom-domain context still throws.

```powershell
pnpm.cmd --filter forms_runtime exec vitest run `
  src/runtime-secret.spec.ts `
  infra/forms-runtime-stack.spec.ts
```

Expected: FAIL because raw secret context and one alias remain.

- [ ] **Step 2: Load the credential from Secrets Manager**

Add `@aws-sdk/client-secrets-manager`. Local/test execution may use exactly one `FORMS_RUNTIME_SIGNING_SECRET`; deployed Lambda stacks may use only `FORMS_RUNTIME_SIGNING_SECRET_ARN`, resolve at cold start, validate at least 32 characters, and cache only in memory. The boundary is deployment environment, not `mode=api`: local `dev:api` remains valid with a raw local secret. Lazily initialize the Hono Lambda handler after resolution.

Never pass raw secret through CDK context, CloudFormation parameters, output, logs, or examples.

- [ ] **Step 3: Refactor and assert the stack**

Move executable `new cdk.App()` construction to `infra/app.ts`. Derive `forms.semblia.com` and `*.forms.semblia.com` from base domain. Keep provider mutations out of code.

Use separate CloudFront policies: forward all viewer query parameters to the origin so canonical redirects can preserve them, but include only reviewed response-varying parameters (`projectId` for exact-host compatibility and `submitted` for the hosted success state) in the cache key. Wildcard application code must reject `projectId`; the later compatibility cleanup removes it after observed use reaches zero. Set minimum TTL to zero. Every canonical 308 response sets `Cache-Control: private, no-store`, and the stack test proves CloudFront cannot cache a visitor-specific redirect containing unkeyed query values.

Iframe responses reflect CORS, so keep `/embed/:slug` no-store; do not rely on `Vary: Origin` with a cache key that omits Origin.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter forms_runtime exec vitest run `
  src/runtime-secret.spec.ts `
  infra/forms-runtime-stack.spec.ts
pnpm.cmd --filter forms_runtime test
pnpm.cmd --filter forms_runtime typecheck
pnpm.cmd --filter forms_runtime lint
pnpm.cmd --filter forms_runtime build
Push-Location apps/forms_runtime
pnpm.cmd cdk synth
Pop-Location
git add apps/forms_runtime pnpm-lock.yaml
git commit -m "fix(forms-infra): secure runtime secret and wildcard aliases"
```

Inspect the synthesized template and verify raw secret material is absent.

## Task 13: Route Wall Hosts Before Clerk and Fetch With No Next Cache

**Files:**

- Create: `apps/web_v2/lib/walls/host-routing.ts`
- Create: `apps/web_v2/tests/walls/host-routing.test.ts`
- Modify: `apps/web_v2/proxy.ts`
- Modify: `apps/web_v2/app/layout.tsx`
- Modify: `apps/web_v2/lib/walls/public-wall.ts`
- Create: `apps/web_v2/tests/walls/public-wall.test.ts`

- [ ] **Step 1: Write failing routing/data tests**

Test actual `Host` normalization, exact service host, exactly one wildcard label, deeper/lookalike rejection, ignoring `X-Forwarded-Host`, rewrites for `/`, `/w/:slug`, `/robots.txt`, and `/sitemap.xml` before the Clerk middleware function is invoked, query preservation, and no rewrite on control-plane hosts. Spy on the Clerk wrapper and prove valid wall-host requests never enter it and never receive Clerk headers or cookies.

Data tests prove every resolver/wall fetch sends normalized hostname, uses `cache: "no-store"`, distinguishes 404/503, and never uses project slug as identity. Response-boundary tests prove an upstream miss returns an opaque `404` and an unavailable resolver/wall endpoint returns `503` with `private, no-store`, rather than relying on a Server Component `error.tsx` response status.

```powershell
pnpm.cmd --filter web_v2 exec vitest run `
  tests/walls/host-routing.test.ts `
  tests/walls/public-wall.test.ts
```

Expected: FAIL because proxy auth and slug-only ISR are current behavior.

- [ ] **Step 2: Implement the hostname boundary**

Export the existing Clerk path as `authenticatedProxy = clerkMiddleware(...)`, then make the default top-level proxy inspect the wall hostname before it calls `authenticatedProxy` at all:

```text
/             -> /_wall-host
/w/:wallSlug  -> /_wall-host/w/:wallSlug
/robots.txt   -> /_wall-host/robots.txt
/sitemap.xml  -> /_wall-host/sitemap.xml
```

For HTML `/` and `/w/:slug` requests, the top-level wall branch performs an explicit no-store API availability/ownership preflight. It directly returns opaque `404` or `503` responses with `private, no-store`; only a successful preflight uses `NextResponse.rewrite(new URL(..., request.url))`. This deliberate boundary produces the promised status codes before rendering. Preserve query. Internal pages still re-resolve the actual host through API and remain fail-closed; `error.tsx` is a generic post-preflight race fallback, not the mechanism used to assert `503`.

Make `RootLayout` read actual host server-side and omit `ClerkProvider`/dashboard query providers on valid wall service/wildcard hosts as defense in depth. Keep wall theme/fonts. The top-level proxy split—not provider omission alone—is the proof that Clerk cannot bootstrap or create wall-host session cookies.

- [ ] **Step 3: Replace ISR with host-bound no-store fetches**

Delete `revalidate = 60` and `next: { revalidate: 60 }` from wall data. API/Redis is the only launch cache. Preserve opaque 404 and propagate upstream failures.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm.cmd --filter web_v2 exec vitest run `
  tests/walls/host-routing.test.ts `
  tests/walls/public-wall.test.ts
Push-Location apps/web_v2
pnpm.cmd exec tsc --noEmit
Pop-Location
git add apps/web_v2/proxy.ts apps/web_v2/app/layout.tsx apps/web_v2/lib/walls apps/web_v2/tests/walls
git commit -m "feat(walls-web): route project hosts before auth"
```

## Task 14: Add Dynamic Wall Pages, Safe SEO, Robots, and Sitemap

**Files:**

- Create: `apps/web_v2/components/walls/public-wall-page.tsx`
- Create: `apps/web_v2/lib/walls/wall-metadata.ts`
- Create: `apps/web_v2/app/_wall-host/page.tsx`
- Create: `apps/web_v2/app/_wall-host/w/[wallSlug]/page.tsx`
- Create: `apps/web_v2/app/_wall-host/not-found.tsx`
- Create: `apps/web_v2/app/_wall-host/error.tsx`
- Create: `apps/web_v2/app/_wall-host/robots.txt/route.ts`
- Create: `apps/web_v2/app/_wall-host/sitemap.xml/route.ts`
- Modify: `apps/web_v2/app/wall/[wallSlug]/page.tsx`
- Modify: `apps/web_v2/app/wall/[wallSlug]/not-found.tsx`
- Modify: `apps/web_v2/app/robots.ts`
- Create: `apps/web_v2/tests/walls/wall-metadata.test.ts`
- Create: `apps/web_v2/tests/walls/wall-pages.test.tsx`
- Create: `apps/web_v2/tests/walls/wall-route-handlers.test.ts`

- [ ] **Step 1: Write failing render/SEO/handler tests**

Cover root primary selection; additional ownership; no-primary and cross-project 404; `dynamic = "force-dynamic"`; alias canonical; eligible index/follow; empty/private/unpublished noindex; canonical Open Graph; JSON-LD with accurate `Organization`/`WebSite` only; no `AggregateRating`/`Review`; `<` escaping; host-aware robots; canonical-only sitemap; XML escaping; proxy/route-handler 404 and 503 responses; and alternating two root hosts without HTML leakage.

```powershell
pnpm.cmd --filter web_v2 exec vitest run `
  tests/walls/wall-metadata.test.ts `
  tests/walls/wall-pages.test.tsx `
  tests/walls/wall-route-handlers.test.ts
```

Expected: FAIL because the route tree and safe metadata builder do not exist.

- [ ] **Step 2: Extract rendering and metadata**

Move the wall shell and `widgets-core` fragment to `PublicWallPage`. Metadata accepts API-issued canonical URL and `seo.indexable`; it never derives host from project/wall slug.

Hosted routes read `headers()`, revalidate hostname through API, and use `notFound()` for opaque misses. `error.tsx` uses the shared `RouteError` for the narrow race after a successful proxy preflight; tests must not claim it changes Next's status to `503`.

The exact `walls.semblia.com` service host and direct requests to `/_wall-host` on non-wall hosts must never select a project; both return the service-level opaque not-found behavior.

- [ ] **Step 3: Implement dynamic robots and sitemap**

Both handlers are dynamic/no-store and resolve actual host independently.

- eligible host: allow `/`, advertise canonical sitemap;
- active host with no indexable walls: disallow `/`;
- unknown/retired: 404;
- resolver outage: 503;
- sitemap: canonical primary `/` and only canonical/indexable `/w/:slug`.

Build the sitemap from the resolver's structurally eligible wall list, then load each wall through the host-bound wall endpoint and include only payloads whose `seo.indexable` is true. Bound this fan-out to the resolver result; never discover walls by a global slug scan.

Keep control plane deny-all. While legacy apex walls render, allow the more-specific `/wall/` path so crawlers can observe their canonical.

- [ ] **Step 4: Convert apex wall to a safe legacy adapter**

Remove duplicated ISR and self-serving data. Reuse shared rendering with the existing apex canonical in this pre-activation release. Do not redirect or point at an unactivated wildcard.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm.cmd --filter web_v2 exec vitest run tests/walls
Push-Location apps/web_v2
pnpm.cmd exec tsc --noEmit
pnpm.cmd exec eslint . --ext .ts,.tsx
Pop-Location
git add apps/web_v2/app apps/web_v2/components/walls apps/web_v2/lib/walls apps/web_v2/tests/walls
git commit -m "feat(walls-web): add host pages and safe SEO"
```

## Task 15: Reconcile Contracts, Add the Runbook, and Close Verification

**Files:**

- Modify: `docs/api/public-surfaces.md`
- Modify: `apps/forms_runtime/deploy/README.md`
- Modify: `apps/forms_runtime/deploy/cloudfront-notes.md`
- Create: `deploy/production/public-surface-hosting.md`
- Modify: `deploy/production/README.md`
- Modify: `README.md`
- Modify: `docs/continuity/progress.md`
- Modify: `docs/continuity/decisions.md`
- Modify: `docs/continuity/open-questions.md`
- Create: `scripts/verify-public-hosting.ps1`

- [ ] **Step 1: Add a non-mutating runbook and smoke script**

Document exact/wildcard ACM SANs in `us-east-1`, Secrets Manager ARN injection, CloudFront aliases, DNS-only Cloudflare records, Vercel-reported wall records/challenges, activation order, rollback, and explicit approval.

`verify-public-hosting.ps1` accepts base URLs and two test hostnames; it contains no credentials and makes no provider mutations. Matrix: two valid tenants with same slug, unknown host, hostile cross-project slug, wildcard `projectId`, exact-host compatibility, robots, sitemap, canonical, Open Graph, cache headers, JSON-LD.

- [ ] **Step 2: Run focused and full package gates**

```powershell
pnpm.cmd --filter @workspace/types test
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter @workspace/database exec prisma format
pnpm.cmd --filter @workspace/database exec prisma validate
pnpm.cmd --filter @workspace/database generate
pnpm.cmd --filter @workspace/database build

pnpm.cmd --filter api_v2 typecheck
pnpm.cmd --filter api_v2 lint
pnpm.cmd --filter api_v2 test
pnpm.cmd build --filter api_v2

pnpm.cmd --filter forms_runtime typecheck
pnpm.cmd --filter forms_runtime lint
pnpm.cmd --filter forms_runtime test
pnpm.cmd --filter forms_runtime build
Push-Location apps/forms_runtime
pnpm.cmd cdk synth
Pop-Location

pnpm.cmd --filter web_v2 test
Push-Location apps/web_v2
pnpm.cmd exec tsc --noEmit
pnpm.cmd exec eslint . --ext .ts,.tsx
Pop-Location
pnpm.cmd build --filter web_v2
```

Expected: all PASS. Record exact file/test counts.

- [ ] **Step 3: Verify migration behavior on disposable PostgreSQL**

1. Apply migrations through expand to an empty disposable database.
2. Load valid, missing-host, conflicting-host, unverified managed/external host, zero-primary-with-eligible-wall, no-eligible-wall, and multiple-primary fixtures.
3. Run dry-run twice and prove zero writes.
4. Run `--apply` twice and prove the second reports `changed=0`.
5. Do not create/apply the contract migration in this branch.

- [ ] **Step 4: Run local host smoke and browser inspection**

Run API, forms runtime, and web locally with valid/hostile Host headers. Execute the smoke script. In a headed browser verify no Clerk bootstrap/wall-host cookie, form header/meta noindex, warm-host isolation, specified error status, and working legacy apex wall. Capture sanitized test events proving resolver miss, canonical/alias, cross-project rejection, signature failure with request ID, exact-host compatibility use, and missing-primary observability; confirm no prohibited payload fields appear.

- [ ] **Step 5: Refresh indexes and inspect final diff**

```powershell
python scripts/update-indexes.py
python scripts/rebuild-graphify.py
git diff --check
git status --short
git diff --stat
```

If index dependencies are unavailable, record the exact blocker; do not claim pass.

- [ ] **Step 6: Update continuity and commit closeout**

Record shipped behavior, exact counts, expand/contract boundary, and remaining activation.

```powershell
git add README.md docs/api/public-surfaces.md docs/continuity docs/superpowers apps/forms_runtime/deploy deploy/production scripts/verify-public-hosting.ps1
git commit -m "docs(public-hosts): document verified staged rollout"
```

## Completion Checklist

- [ ] New projects receive one immutable forms host and wall host atomically.
- [ ] Project name/slug updates leave free hosts unchanged.
- [ ] Deleted hosts survive as disabled tombstones and block reuse.
- [ ] Resolver feature/project/resource/canonical/retirement checks fail closed.
- [ ] Runtime signatures bind timestamp, method, full path/query, host, and body.
- [ ] Wildcard forms never accept `projectId` as tenant authority.
- [ ] Slug snapshots, submissions, uploads, and walls reject cross-project access; the unused global runtime snapshot-ID route is removed.
- [ ] Primary-wall lifecycle is serialized and deterministic.
- [ ] Forms are noindex and iframe CORS is not shared through cache.
- [ ] Wall pages are Next no-store and API cache keys are host-bound.
- [ ] Wall SEO uses accurate structured data and correct eligibility.
- [ ] Raw deployment secret is absent from CDK context and synth.
- [ ] Structured log-based metrics cover every approved hosting outcome without payload or secret leakage.
- [ ] No production mutation or contract migration is present in this branch.
- [ ] Activation plan is the only path to constraints, DNS/domains, and client URL switching.
